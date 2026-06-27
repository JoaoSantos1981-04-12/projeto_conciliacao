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
 * Agregador de valores por conta (convenção de sinal validada — 2026-06-26).
 *
 * NÃO somar a coluna `saldo` (é o SALDO CORRENTE ACUMULADO/running balance linha
 * a linha — somá-lo não tem significado contábil). O valor de cada conta segue a
 * NATUREZA contábil (saldo na direção credora/devedora é positivo):
 *   - Ativo (devedora):        saldoAnterior + Σdébito − Σcrédito
 *   - Passivo / PL (credora):  saldoAnterior + Σcrédito − Σdébito
 *   - Receita (credora):       Σcrédito − Σdébito   (resultado: sem saldo de abertura)
 *   - Despesa/Custo (devedora):Σdébito − Σcrédito   (resultado: sem saldo de abertura)
 *   - Outro:                   saldoAnterior + Σdébito − Σcrédito (default devedor)
 *
 * ⚠️ Premissas: (1) `saldoAnterior` é o saldo de abertura na natureza da conta —
 * a posição só fica exata quando o período cobre a conta desde o início (sub-
 * períodos não conhecem o saldo de abertura do recorte; limitação do MVP).
 * (2) Contas de resultado não usam `saldoAnterior` (zeram a cada exercício).
 * Ver memória [[fib-implementation]].
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
    switch (e.natureza) {
      case ContaClassificacao.PASSIVO:
      case ContaClassificacao.PATRIMONIO:
        // Credora: saldoAnterior + Σcrédito − Σdébito
        valor = e.saldoAnterior + e.credito - e.debito
        break
      case ContaClassificacao.RECEITA:
        // Resultado credor: Σcrédito − Σdébito (sem saldo de abertura)
        valor = e.credito - e.debito
        break
      case ContaClassificacao.DESPESA:
        // Resultado devedor: Σdébito − Σcrédito (sem saldo de abertura)
        valor = e.debito - e.credito
        break
      case ContaClassificacao.ATIVO:
      case ContaClassificacao.OUTRO:
      default:
        // Devedora: saldoAnterior + Σdébito − Σcrédito
        valor = e.saldoAnterior + e.debito - e.credito
        break
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
 * Usa a movimentação líquida do mês, na natureza de cada conta (mesma convenção
 * de `agregasPorConta`): Receita = Σcrédito − Σdébito, Despesa = Σdébito − Σcrédito.
 * O `ativo` mensal é a movimentação líquida devedora (Σdébito − Σcrédito) das
 * contas de ativo no mês — um delta de posição, não o saldo acumulado.
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

    if (classe === ContaClassificacao.RECEITA) ponto.receitas += credito - debito
    else if (classe === ContaClassificacao.DESPESA) ponto.despesas += debito - credito
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

// ─── Fonte: Balancete do Book Digital ────────────────────────────────────────
//
// O FIB consome o saldo de fechamento por conta (`FichaConciliacao.saldoBalancete`)
// de um BookDigital (empresa/mês). Diferente do razão, o balancete JÁ traz o saldo
// final por conta — não há running balance para agregar.

/** Conta do balancete normalizada (saldo em reais). */
export interface ContaBalancete {
  codigoConta: string // leaf de 6 dígitos
  codigoCompleto?: string | null // hierárquico (ex.: "1.01.01.01.100006")
  nomeConta: string
  saldo: number // saldoBalancete
  tipoConta: string // enum TipoConta do Book (p/ detectar caixa: ATIVO_BANCO)
}

/**
 * Subgrupo patrimonial pelos 2 PRIMEIROS NÍVEIS do código hierárquico
 * (níveis separados por ponto, ex.: "1.01.01.01.100006"):
 *   1.01=Ativo Circulante, 1.02=Ativo Não Circulante,
 *   2.01=Passivo Circulante, 2.02=Passivo Não Circulante, 2.03=Patrimônio Líquido.
 * Resultado/provisão seguem o 1º nível (3=Receita, 4=Despesa, 5=Provisão).
 * Sem código completo, faz fallback pelo 1º dígito do leaf.
 */
export type SubgrupoConta =
  | 'ATIVO_CIRCULANTE'
  | 'ATIVO_NAO_CIRCULANTE'
  | 'PASSIVO_CIRCULANTE'
  | 'PASSIVO_NAO_CIRCULANTE'
  | 'PATRIMONIO_LIQUIDO'
  | 'RECEITA'
  | 'DESPESA'
  | 'PROVISAO'
  | 'OUTRO'

export function subgrupoConta(
  codigoCompleto: string | null | undefined,
  codigoLeaf?: string
): SubgrupoConta {
  const niveis = (codigoCompleto ?? '').split('.')
  const n1 = niveis[0]
  // Nível 2 numérico: tolera "1" e "01" (formato real usa 1 dígito: "1.1").
  const l2 = niveis[1] !== undefined ? parseInt(niveis[1], 10) : NaN

  if (n1 && !Number.isNaN(l2)) {
    if (n1 === '1' && l2 === 1) return 'ATIVO_CIRCULANTE'
    if (n1 === '1' && l2 === 2) return 'ATIVO_NAO_CIRCULANTE'
    if (n1 === '2' && l2 === 1) return 'PASSIVO_CIRCULANTE'
    if (n1 === '2' && l2 === 2) return 'PASSIVO_NAO_CIRCULANTE'
    if (n1 === '2' && l2 === 3) return 'PATRIMONIO_LIQUIDO'
  }

  // Fallback: 1º nível do código completo, ou 1º dígito do leaf.
  const primeiro = n1 || (codigoLeaf ?? '').charAt(0)
  switch (primeiro) {
    case '1': return 'ATIVO_CIRCULANTE'
    case '2': return 'PASSIVO_CIRCULANTE'
    case '3': return 'RECEITA'
    case '4': return 'DESPESA'
    case '5': return 'PROVISAO'
    default: return 'OUTRO'
  }
}

/** Classe FIB (consolidada) da conta do balancete. */
export function classificarContaBalancete(
  codigoCompleto: string | null | undefined,
  codigoLeaf?: string
): ContaClassificacao {
  switch (subgrupoConta(codigoCompleto, codigoLeaf)) {
    case 'ATIVO_CIRCULANTE':
    case 'ATIVO_NAO_CIRCULANTE':
      return ContaClassificacao.ATIVO
    case 'PASSIVO_CIRCULANTE':
    case 'PASSIVO_NAO_CIRCULANTE':
      return ContaClassificacao.PASSIVO // exigível (PL é separado)
    case 'PATRIMONIO_LIQUIDO':
      return ContaClassificacao.PATRIMONIO
    case 'RECEITA':
      return ContaClassificacao.RECEITA
    case 'DESPESA':
      return ContaClassificacao.DESPESA
    case 'PROVISAO':
      return ContaClassificacao.PROVISAO
    default:
      return ContaClassificacao.OUTRO
  }
}

/** Agrupa as contas do balancete por classificação (saldo = saldoBalancete). */
export function agregarContasBalancete(
  contas: ContaBalancete[]
): Record<ContaClassificacao, FibContaAgregada[]> {
  const porClasse = Object.fromEntries(
    Object.values(ContaClassificacao).map((c) => [c, []])
  ) as unknown as Record<ContaClassificacao, FibContaAgregada[]>

  const totaisPorClasse = new Map<ContaClassificacao, number>()
  for (const c of contas) {
    const classe = classificarContaBalancete(c.codigoCompleto, c.codigoConta)
    totaisPorClasse.set(
      classe,
      (totaisPorClasse.get(classe) ?? 0) + Math.abs(c.saldo)
    )
  }

  for (const c of contas) {
    const classe = classificarContaBalancete(c.codigoCompleto, c.codigoConta)
    const totalClasse = totaisPorClasse.get(classe) ?? 1
    porClasse[classe].push({
      codigo: c.codigoConta,
      nome: c.nomeConta || c.codigoConta,
      classificacao: classe,
      saldo: c.saldo,
      variacao: 0,
      percentualDaClasse:
        totalClasse > 0 ? (Math.abs(c.saldo) / totalClasse) * 100 : 0,
    })
  }

  for (const classe of Object.values(ContaClassificacao)) {
    porClasse[classe].sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo))
  }
  return porClasse
}

/** Soma os saldos do balancete por classe (helper p/ KPIs e série). */
function somarPorClasseBalancete(
  contas: ContaBalancete[]
): Record<ContaClassificacao, number> {
  const soma = Object.fromEntries(
    Object.values(ContaClassificacao).map((c) => [c, 0])
  ) as Record<ContaClassificacao, number>
  for (const c of contas) {
    soma[classificarContaBalancete(c.codigoCompleto, c.codigoConta)] += c.saldo
  }
  return soma
}

/** Calcula KPIs a partir das contas do balancete. */
export function calcularKpisBalancete(
  contas: ContaBalancete[],
  bookId: string,
  periodo: { inicio: Date; fim: Date }
): FibKpi {
  // Soma por subgrupo patrimonial (2 primeiros níveis) — permite liquidez correta.
  let ativoCirculante = 0
  let ativoNaoCirculante = 0
  let passivoCirculante = 0
  let passivoNaoCirculante = 0
  let patrimonioLiquido = 0
  let totalReceitas = 0
  let totalDespesas = 0
  for (const c of contas) {
    switch (subgrupoConta(c.codigoCompleto, c.codigoConta)) {
      case 'ATIVO_CIRCULANTE': ativoCirculante += c.saldo; break
      case 'ATIVO_NAO_CIRCULANTE': ativoNaoCirculante += c.saldo; break
      case 'PASSIVO_CIRCULANTE': passivoCirculante += c.saldo; break
      case 'PASSIVO_NAO_CIRCULANTE': passivoNaoCirculante += c.saldo; break
      case 'PATRIMONIO_LIQUIDO': patrimonioLiquido += c.saldo; break
      case 'RECEITA': totalReceitas += c.saldo; break
      case 'DESPESA': totalDespesas += c.saldo; break
    }
  }

  const ativoTotal = ativoCirculante + ativoNaoCirculante
  const passivoExigivel = passivoCirculante + passivoNaoCirculante // sem PL
  const passivoTotal = passivoExigivel

  const lucroOperacional = totalReceitas - totalDespesas
  const ebitda = lucroOperacional
  const lucroLiquido = ebitda
  const margemBruta = totalReceitas > 0 ? lucroOperacional / totalReceitas : 0
  const margemOperacional = totalReceitas > 0 ? lucroOperacional / totalReceitas : 0
  const margemLiquida = totalReceitas > 0 ? lucroLiquido / totalReceitas : 0

  // Caixa = contas marcadas como ATIVO_BANCO no Book.
  const saldoCaixa = contas
    .filter((c) => c.tipoConta === 'ATIVO_BANCO')
    .reduce((s, c) => s + c.saldo, 0)

  // Liquidez corrente = Ativo Circulante / Passivo Circulante.
  // Liquidez geral = Ativo Total / Passivo Exigível (sem PL).
  const liquidezCorrente = passivoCirculante > 0 ? ativoCirculante / passivoCirculante : 0
  const liquidezGeral = passivoExigivel > 0 ? ativoTotal / passivoExigivel : 0
  const endividamento = ativoTotal > 0 ? passivoExigivel / ativoTotal : 0
  const roi = patrimonioLiquido > 0 ? lucroLiquido / patrimonioLiquido : 0

  return {
    id: `kpi-bal-${bookId}-${Date.now()}`,
    importacaoId: bookId,
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
    entradaCaixa: Math.max(0, saldoCaixa),
    saidaCaixa: Math.max(0, -saldoCaixa),
    saldoCaixa,
    liquidezGeral,
    liquidezCorrente,
    endividamento,
    roi,
    criadoEm: new Date(),
  }
}

/** Resumo de receita/despesa/ativo de um conjunto de contas (p/ série mensal). */
export function resumoMensalBalancete(contas: ContaBalancete[]): {
  receitas: number
  despesas: number
  ativo: number
} {
  const soma = somarPorClasseBalancete(contas)
  return {
    receitas: soma[ContaClassificacao.RECEITA],
    despesas: soma[ContaClassificacao.DESPESA],
    ativo: soma[ContaClassificacao.ATIVO],
  }
}
