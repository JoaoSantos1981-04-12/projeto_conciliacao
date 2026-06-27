import { describe, it, expect } from 'vitest'
import {
  classificarConta,
  calcularKpis,
  agregarContas,
  calcularSerieMensal,
  gerarAlertas,
  classificarContaBalancete,
  agregarContasBalancete,
  calcularKpisBalancete,
  type LancamentoComConta,
  type ContaBalancete,
} from './kpi-service'
import { ContaClassificacao, FibKpi } from '@/lib/types/fib'

// Factory mínimo: as funções leem dataLancamento, débito/crédito e a conta
// (código/nome/saldoAnterior). `saldo` (running balance) não é mais usado.
function lanc(
  codigo: string,
  mov: { debito?: number; credito?: number; saldoAnterior?: number },
  data = '2026-01-15',
  nome = codigo
): LancamentoComConta {
  return {
    dataLancamento: new Date(data),
    debito: mov.debito ?? 0,
    credito: mov.credito ?? 0,
    saldo: 0,
    contaContabil: { codigo, nome, saldoAnterior: mov.saldoAnterior ?? 0 },
  } as unknown as LancamentoComConta
}

const periodo = {
  inicio: new Date('2026-01-01'),
  fim: new Date('2026-05-31'),
}

describe('classificarConta', () => {
  it('mapeia o primeiro dígito para a classe CPC', () => {
    expect(classificarConta('1.1.02')).toBe(ContaClassificacao.ATIVO)
    expect(classificarConta('2.1.01')).toBe(ContaClassificacao.PASSIVO)
    expect(classificarConta('3.0')).toBe(ContaClassificacao.PATRIMONIO)
    expect(classificarConta('4.1')).toBe(ContaClassificacao.RECEITA)
    expect(classificarConta('5.0')).toBe(ContaClassificacao.DESPESA)
    expect(classificarConta('9.9')).toBe(ContaClassificacao.DESPESA)
  })

  it('retorna OUTRO para código vazio', () => {
    expect(classificarConta('')).toBe(ContaClassificacao.OUTRO)
  })

  it('regressão: CUID (começa com letra) cai em OUTRO, não em classe válida', () => {
    // O bug original classificava pelo contaContabilId (CUID 'clxxx...'),
    // o que zerava todos os KPIs. Garantir que letra não vira classe.
    expect(classificarConta('clqug7ow80001')).toBe(ContaClassificacao.OUTRO)
  })
})

describe('agregarContas', () => {
  it('agrega posição por saldoAnterior + Σdébito − Σcrédito e calcula o percentual', () => {
    const lancs = [
      // conta 1.1.01: abertura 100, +60 débito, −10 crédito => 150
      lanc('1.1.01', { saldoAnterior: 100, debito: 60 }),
      lanc('1.1.01', { credito: 10 }),
      // conta 1.2.01: abertura 50 => 50
      lanc('1.2.01', { saldoAnterior: 50 }),
      // receita: Σcrédito = 200
      lanc('4.1.01', { credito: 200 }),
    ]
    const r = agregarContas(lancs)

    expect(r[ContaClassificacao.ATIVO]).toHaveLength(2)
    const conta1 = r[ContaClassificacao.ATIVO].find((c) => c.codigo === '1.1.01')
    expect(conta1?.saldo).toBe(150)
    // 150 de 200 (150+50) na classe ATIVO = 75%
    expect(conta1?.percentualDaClasse).toBeCloseTo(75, 1)
    expect(r[ContaClassificacao.RECEITA]).toHaveLength(1)
    expect(r[ContaClassificacao.RECEITA][0].saldo).toBe(200)
  })

  it('aplica a convenção de sinal por natureza da conta', () => {
    const r = agregarContas([
      // Ativo (devedora): 1000 + 200 déb − 50 créd = 1150
      lanc('1.1.01', { saldoAnterior: 1000, debito: 200, credito: 50 }),
      // Passivo (credora): 1000 + 500 créd − 100 déb = 1400
      lanc('2.1.01', { saldoAnterior: 1000, credito: 500, debito: 100 }),
      // PL (credora): 2000 + 300 créd − 0 = 2300
      lanc('3.1.01', { saldoAnterior: 2000, credito: 300 }),
      // Receita (credora, líquida): 300 créd − 50 déb = 250
      lanc('4.1.01', { credito: 300, debito: 50 }),
      // Despesa (devedora, líquida): 200 déb − 20 créd = 180
      lanc('5.1.01', { debito: 200, credito: 20 }),
    ])

    expect(r[ContaClassificacao.ATIVO][0].saldo).toBe(1150)
    expect(r[ContaClassificacao.PASSIVO][0].saldo).toBe(1400)
    expect(r[ContaClassificacao.PATRIMONIO][0].saldo).toBe(2300)
    expect(r[ContaClassificacao.RECEITA][0].saldo).toBe(250)
    expect(r[ContaClassificacao.DESPESA][0].saldo).toBe(180)
  })

  it('ordena contas por saldo absoluto decrescente', () => {
    const r = agregarContas([
      lanc('1.1.01', { saldoAnterior: 30 }),
      lanc('1.2.01', { saldoAnterior: 90 }),
    ])
    expect(r[ContaClassificacao.ATIVO][0].codigo).toBe('1.2.01')
  })
})

describe('calcularKpis', () => {
  it('deriva receitas, despesas, EBITDA e margem', () => {
    const lancs = [
      lanc('4.1.01', { credito: 1000 }), // receita = Σcrédito
      lanc('5.1.01', { debito: 400 }), // despesa = Σdébito
      lanc('1.1.01', { saldoAnterior: 5000 }), // ativo (posição)
      lanc('2.1.01', { saldoAnterior: 2000 }), // passivo (posição)
    ]
    const kpis = calcularKpis(lancs, 'imp1', periodo)

    expect(kpis.totalReceitas).toBe(1000)
    expect(kpis.totalDespesas).toBe(400)
    expect(kpis.ebitda).toBe(600)
    expect(kpis.lucroLiquido).toBe(600)
    expect(kpis.margemLiquida).toBeCloseTo(0.6, 5)
    expect(kpis.ativoTotal).toBe(5000)
    expect(kpis.passivoTotal).toBe(2000)
    expect(kpis.endividamento).toBeCloseTo(0.4, 5)
  })

  it('evita divisão por zero quando não há receitas', () => {
    const kpis = calcularKpis(
      [lanc('1.1.01', { saldoAnterior: 100 })],
      'imp1',
      periodo
    )
    expect(kpis.margemLiquida).toBe(0)
    expect(kpis.roi).toBe(0)
  })
})

describe('calcularSerieMensal', () => {
  it('agrupa por mês de competência e ordena cronologicamente', () => {
    const lancs = [
      lanc('4.1', { credito: 100 }, '2026-03-10'),
      lanc('4.1', { credito: 50 }, '2026-01-20'),
      lanc('5.1', { debito: 30 }, '2026-01-25'),
    ]
    const serie = calcularSerieMensal(lancs)

    expect(serie.map((p) => p.mes)).toEqual(['01/2026', '03/2026'])
    expect(serie[0].receitas).toBe(50)
    expect(serie[0].despesas).toBe(30)
    expect(serie[0].lucro).toBe(20)
    expect(serie[1].receitas).toBe(100)
  })
})

describe('gerarAlertas', () => {
  const base: FibKpi = {
    id: 'k',
    importacaoId: 'i',
    periodo,
    totalReceitas: 0,
    totalDespesas: 0,
    ebitda: 0,
    lucroLiquido: 0,
    margemBruta: 0,
    margemOperacional: 0,
    margemLiquida: 0,
    ativoTotal: 0,
    passivoTotal: 0,
    patrimonioLiquido: 0,
    entradaCaixa: 0,
    saidaCaixa: 0,
    saldoCaixa: 0,
    liquidezGeral: 2,
    liquidezCorrente: 2,
    endividamento: 0,
    roi: 0,
    criadoEm: new Date(),
  }

  it('dispara alerta de liquidez crítica quando corrente < 1', () => {
    const alertas = gerarAlertas({ ...base, liquidezCorrente: 0.5 })
    expect(alertas.some((a) => a.titulo.includes('Liquidez'))).toBe(true)
  })

  it('dispara alerta de endividamento quando > 0.7', () => {
    const alertas = gerarAlertas({ ...base, endividamento: 0.8 })
    expect(alertas.some((a) => a.titulo.includes('Endividamento'))).toBe(true)
  })

  it('dispara alerta de prejuízo quando margem líquida < 0', () => {
    const alertas = gerarAlertas({ ...base, margemLiquida: -0.1 })
    expect(alertas.some((a) => a.tipo === 'RISCO' && a.titulo.includes('Prejuízo'))).toBe(true)
  })

  it('não gera alertas de risco quando os indicadores estão saudáveis', () => {
    const alertas = gerarAlertas(base)
    expect(alertas.every((a) => a.tipo !== 'RISCO')).toBe(true)
  })
})

// ─── Fonte balancete (Book Digital) ──────────────────────────────────────────

describe('classificarContaBalancete', () => {
  it('classifica pelo 1º dígito do plano do Book', () => {
    expect(classificarContaBalancete('100006')).toBe(ContaClassificacao.ATIVO)
    expect(classificarContaBalancete('200003')).toBe(ContaClassificacao.PASSIVO)
    expect(classificarContaBalancete('300001')).toBe(ContaClassificacao.RECEITA)
    expect(classificarContaBalancete('400001')).toBe(ContaClassificacao.DESPESA)
    expect(classificarContaBalancete('500001')).toBe(ContaClassificacao.PROVISAO)
    expect(classificarContaBalancete('')).toBe(ContaClassificacao.OUTRO)
  })
})

describe('agregarContasBalancete / calcularKpisBalancete', () => {
  const contas: ContaBalancete[] = [
    { codigoConta: '100006', nomeConta: 'Clientes', saldo: 29637147.22, tipoConta: 'ATIVO_CIRCULANTE' },
    { codigoConta: '100003', nomeConta: 'Citibank', saldo: 131384.2, tipoConta: 'ATIVO_BANCO' },
    { codigoConta: '200003', nomeConta: 'Fornecedores', saldo: 1046071.39, tipoConta: 'PASSIVO_CIRCULANTE' },
    { codigoConta: '300001', nomeConta: 'Vendas', saldo: 500000, tipoConta: 'RESULTADO' },
    { codigoConta: '400001', nomeConta: 'Custos', saldo: 200000, tipoConta: 'RESULTADO' },
  ]

  it('agrupa por classe usando saldoBalancete', () => {
    const r = agregarContasBalancete(contas)
    expect(r[ContaClassificacao.ATIVO]).toHaveLength(2)
    expect(r[ContaClassificacao.PASSIVO]).toHaveLength(1)
    expect(r[ContaClassificacao.RECEITA][0].saldo).toBe(500000)
    expect(r[ContaClassificacao.DESPESA][0].saldo).toBe(200000)
    // Clientes domina a classe ATIVO
    expect(r[ContaClassificacao.ATIVO][0].codigo).toBe('100006')
  })

  it('calcula KPIs: ativo/passivo/PL, caixa (ATIVO_BANCO) e lucro', () => {
    const kpis = calcularKpisBalancete(contas, 'book1', {
      inicio: new Date('2026-04-01'),
      fim: new Date('2026-04-30'),
    })
    expect(kpis.ativoTotal).toBeCloseTo(29768531.42, 2)
    expect(kpis.passivoTotal).toBeCloseTo(1046071.39, 2)
    expect(kpis.patrimonioLiquido).toBeCloseTo(28722460.03, 2)
    expect(kpis.saldoCaixa).toBeCloseTo(131384.2, 2) // só a conta ATIVO_BANCO
    expect(kpis.totalReceitas).toBe(500000)
    expect(kpis.totalDespesas).toBe(200000)
    expect(kpis.lucroLiquido).toBe(300000)
    expect(kpis.margemLiquida).toBeCloseTo(0.6, 5)
  })
})
