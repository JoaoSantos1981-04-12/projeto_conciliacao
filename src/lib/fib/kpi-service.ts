import { Lancamento, ContaContabil } from '@prisma/client'
import {
  FibKpi,
  FibContaAgregada,
  ContaClassificacao,
  FibAlerta,
  FibSerieMensalPonto,
} from '@/lib/types/fib'

/**
 * Lançamento com a conta contábil relacionada carregada.
 * A classificação CPC depende do `codigo` da conta (ex.: "1.1.02..."),
 * NÃO do `contaContabilId` (que é um CUID).
 */
export type LancamentoComConta = Lancamento & {
  contaContabil: Pick<ContaContabil, 'codigo' | 'nome' | 'saldoAnterior'>
}

/**
 * Classifica contas contábeis baseado no primeiro dígito do código
 * CPC/IFRS: 1=Ativo, 2=Passivo, 3=Patrimônio, 4=Receita, 5+=Despesa
 */
export function classificarConta(codigo: string): ContaClassificacao {
  if (!codigo || codigo.length === 0) return ContaClassificacao.OUTRO
  const primeiroDigito = codigo.charAt(0)
  switch (primeiroDigito) {
    case '1':
      return ContaClassificacao.ATIVO
    case '2':
      return ContaClassificacao.PASSIVO
    case '3':
      return ContaClassificacao.PATRIMONIO
    case '4':
      return ContaClassificacao.RECEITA
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
      return ContaClassificacao.DESPESA
    default:
      return ContaClassificacao.OUTRO
  }
}

/**
 * Agregador de valores por conta (regra validada com o Contador Sênior — 2026-06-26).
 *
 * NÃO somar a coluna `saldo` (é o SALDO CORRENTE ACUMULADO/running balance linha
 * a linha — somá-lo não tem significado contábil). Em vez disso, por classe:
 *   - Posição (Ativo/Passivo/PL/Outro): `saldoAnterior + Σdébito − Σcrédito`.
 *     Isso reproduz o saldo final da conta (a mesma fórmula que o ERP usa para
 *     o running balance; reconciliação `saldo = anterior + déb − créd` fecha
 *     165/165 no arquivo real — ver CLAUDE.md).
 *   - Fluxo (Receita/Despesa): somar a MOVIMENTAÇÃO do período — Receita = Σcrédito,
 *     Despesa = Σdébito.
 *
 * ⚠️ Premissa: `saldoAnterior` é o saldo de abertura da conta. Logo, a posição
 * só fica exata quando o período cobre a conta desde o início. Para sub-períodos
 * arbitrários o saldo de abertura do recorte não é conhecido (limitação aceita
 * no MVP). Ver memória [[fib-implementation]].
 */
function agregasPorConta(lancamentos: LancamentoComConta[]): Map<
  string,
  { nome: string; saldo: number; natureza: ContaClassificacao }
> {
  // Acumula movimentação por conta + captura o saldo de abertura.
  const acc = new Map<
    string,
    {
      nome: string
      natureza: ContaClassificacao
      saldoAnterior: number
      debito: number
      credito: number
    }
  >()

  for (const lancamento of lancamentos) {
    // Classifica pelo código contábil (ex.: "1.1.02..."), não pelo CUID.
    const codigo = lancamento.contaContabil.codigo

    if (!acc.has(codigo)) {
      acc.set(codigo, {
        nome: lancamento.contaContabil.nome,
        natureza: classificarConta(codigo),
        saldoAnterior: Number(lancamento.contaContabil.saldoAnterior),
        debito: 0,
        credito: 0,
      })
    }

    const entrada = acc.get(codigo)!
    // Decimal do Prisma → number do domínio.
    entrada.debito += Number(lancamento.debito)
    entrada.credito += Number(lancamento.credito)
  }

  // Converte a movimentação acumulada no valor agregado conforme a classe.
  const mapa = new Map<
    string,
    { nome: string; saldo: number; natureza: ContaClassificacao }
  >()
  for (const [codigo, e] of acc) {
    let valor: number
    if (e.natureza === ContaClassificacao.RECEITA) {
      valor = e.credito
    } else if (e.natureza === ContaClassificacao.DESPESA) {
      valor = e.debito
    } else {
      // Posição: saldoAnterior + Σdébito − Σcrédito
      valor = e.saldoAnterior + e.debito - e.credito
    }
    mapa.set(codigo, { nome: e.nome, saldo: valor, natureza: e.natureza })
  }

  return mapa
}

/**
 * Calcula KPIs financeiros a partir dos lançamentos
 */
export function calcularKpis(
  lancamentos: LancamentoComConta[],
  importacaoId: string,
  periodo: { inicio: Date; fim: Date }
): FibKpi {
  const agregado = agregasPorConta(lancamentos)

  // Classificar e somar por classe
  const porClasse = new Map<ContaClassificacao, number>()
  for (const [_, { saldo, natureza }] of agregado) {
    const total = porClasse.get(natureza) ?? 0
    porClasse.set(natureza, total + saldo)
  }

  // Extrair valores principais
  const ativoTotal = porClasse.get(ContaClassificacao.ATIVO) ?? 0
  const passivoTotal = porClasse.get(ContaClassificacao.PASSIVO) ?? 0
  const patrimonioLiquido = porClasse.get(ContaClassificacao.PATRIMONIO) ?? 0
  const totalReceitas = porClasse.get(ContaClassificacao.RECEITA) ?? 0
  const totalDespesas = porClasse.get(ContaClassificacao.DESPESA) ?? 0

  // Cálculos
  const lucroOperacional = totalReceitas - totalDespesas
  const ebitda = lucroOperacional // Simplificado: sem depreciação/amortização
  const lucroLiquido = ebitda // Simplificado: sem impostos modelados
  const margemBruta = totalReceitas > 0 ? lucroOperacional / totalReceitas : 0
  const margemOperacional = totalReceitas > 0 ? lucroOperacional / totalReceitas : 0
  const margemLiquida = totalReceitas > 0 ? lucroLiquido / totalReceitas : 0

  // Fluxo de caixa simplificado (baseado em banco)
  const bancos = agregado.get('1.1.02') ?? { saldo: 0 }
  const entradaCaixa = Math.max(0, bancos.saldo)
  const saidaCaixa = Math.max(0, -bancos.saldo)
  const saldoCaixa = bancos.saldo

  // Índices de liquidez
  const liquidezGeral =
    passivoTotal > 0 ? ativoTotal / passivoTotal : 0
  const liquidezCorrente =
    passivoTotal > 0 ? ativoTotal / passivoTotal : 0
  const endividamento =
    ativoTotal > 0 ? passivoTotal / ativoTotal : 0
  const roi =
    patrimonioLiquido > 0 ? lucroLiquido / patrimonioLiquido : 0

  return {
    id: `kpi-${importacaoId}-${Date.now()}`,
    importacaoId,
    periodo,
    totalReceitas,
    totalDespesas,
    ebitda,
    lucroLiquido,
    margemBruta,
    margemOperacional,
    margemLiquida,
    ativoTotal,
    passivoTotal,
    patrimonioLiquido,
    entradaCaixa,
    saidaCaixa,
    saldoCaixa,
    liquidezGeral,
    liquidezCorrente,
    endividamento,
    roi,
    criadoEm: new Date(),
  }
}

/**
 * Agrega contas por classificação para exibição no dashboard
 */
export function agregarContas(
  lancamentos: LancamentoComConta[]
): Record<ContaClassificacao, FibContaAgregada[]> {
  const agregado = agregasPorConta(lancamentos)
  const porClasse = Object.fromEntries(
    Object.values(ContaClassificacao).map((classe) => [classe, []])
  ) as unknown as Record<ContaClassificacao, FibContaAgregada[]>

  // Calcular total por classe para percentual
  const totaisPorClasse = new Map<ContaClassificacao, number>()
  for (const [_, { saldo, natureza }] of agregado) {
    const total = totaisPorClasse.get(natureza) ?? 0
    totaisPorClasse.set(natureza, total + Math.abs(saldo))
  }

  // Montar array de contas agregadas
  for (const [codigo, { nome, saldo, natureza }] of agregado) {
    const totalClasse = totaisPorClasse.get(natureza) ?? 1
    const conta: FibContaAgregada = {
      codigo,
      nome: nome || codigo,
      classificacao: natureza,
      saldo,
      variacao: 0, // TODO: calcular vs período anterior
      percentualDaClasse:
        totalClasse > 0 ? (Math.abs(saldo) / totalClasse) * 100 : 0,
    }
    porClasse[natureza].push(conta)
  }

  // Ordenar por saldo descendente dentro de cada classe
  for (const classe of Object.values(ContaClassificacao)) {
    porClasse[classe].sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo))
  }

  return porClasse
}

/**
 * Agrupa os lançamentos por mês (competência) e agrega por classe, gerando a
 * série temporal usada nos gráficos de crescimento (CEO/CFO).
 *
 * Usa a movimentação do mês (mesma regra de fluxo de `agregasPorConta`):
 * Receita = Σcrédito, Despesa = Σdébito. O `ativo` mensal é a movimentação
 * líquida (Σdébito − Σcrédito) das contas de ativo no mês — um delta de
 * posição, não o saldo acumulado.
 */
export function calcularSerieMensal(
  lancamentos: LancamentoComConta[]
): FibSerieMensalPonto[] {
  const porMes = new Map<
    string,
    { receitas: number; despesas: number; ativo: number; ordem: number }
  >()

  for (const l of lancamentos) {
    const d = new Date(l.dataLancamento)
    const ano = d.getFullYear()
    const mes = d.getMonth() // 0-11
    const chave = `${String(mes + 1).padStart(2, '0')}/${ano}`
    const ordem = ano * 12 + mes

    if (!porMes.has(chave)) {
      porMes.set(chave, { receitas: 0, despesas: 0, ativo: 0, ordem })
    }
    const ponto = porMes.get(chave)!
    const classe = classificarConta(l.contaContabil.codigo)
    const debito = Number(l.debito)
    const credito = Number(l.credito)

    if (classe === ContaClassificacao.RECEITA) ponto.receitas += credito
    else if (classe === ContaClassificacao.DESPESA) ponto.despesas += debito
    else if (classe === ContaClassificacao.ATIVO) ponto.ativo += debito - credito
  }

  return Array.from(porMes.entries())
    .map(([mes, v]) => ({
      mes,
      receitas: v.receitas,
      despesas: v.despesas,
      lucro: v.receitas - v.despesas,
      ativo: v.ativo,
      ordem: v.ordem,
    }))
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ ordem: _ordem, ...resto }) => resto)
}

/**
 * Gera alertas baseado nos KPIs
 */
export function gerarAlertas(kpis: FibKpi): FibAlerta[] {
  const alertas: FibAlerta[] = []

  // Alerta: liquidez abaixo de 1
  if (kpis.liquidezCorrente < 1) {
    alertas.push({
      tipo: 'RISCO',
      severidade: 'ALTA',
      titulo: 'Liquidez corrente crítica',
      descricao: `A liquidez corrente está em ${kpis.liquidezCorrente.toFixed(2)}, abaixo de 1.0`,
      recomendacao:
        'Avaliar capacidade de pagamento de curto prazo e planejar fluxo de caixa',
    })
  }

  // Alerta: endividamento elevado
  if (kpis.endividamento > 0.7) {
    alertas.push({
      tipo: 'RISCO',
      severidade: 'MEDIA',
      titulo: 'Endividamento elevado',
      descricao: `Taxa de endividamento em ${(kpis.endividamento * 100).toFixed(1)}%`,
      recomendacao:
        'Considerar redução de dívidas ou aumento de patrimônio líquido',
    })
  }

  // Alerta: margem negativa
  if (kpis.margemLiquida < 0) {
    alertas.push({
      tipo: 'RISCO',
      severidade: 'ALTA',
      titulo: 'Prejuízo operacional',
      descricao: `Margem líquida negativa: ${(kpis.margemLiquida * 100).toFixed(1)}%`,
      recomendacao:
        'Realizar análise imediata de custos e receitas para reversão',
    })
  }

  // Oportunidade: saldo de caixa positivo
  if (kpis.saldoCaixa > 0) {
    alertas.push({
      tipo: 'OPORTUNIDADE',
      severidade: 'BAIXA',
      titulo: 'Caixa disponível',
      descricao: `Saldo de caixa positivo: R$ ${kpis.saldoCaixa.toFixed(2)}`,
      recomendacao:
        'Considerar aplicações conservadoras ou reinvestimento operacional',
    })
  }

  return alertas
}
