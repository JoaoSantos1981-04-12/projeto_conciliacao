import { describe, it, expect } from 'vitest'
import { compararContas, REGRAS_PADRAO } from './comparador'
import { ConfiguracaoComparacao, LancamentoComparavel as Lct } from '@/lib/types/comparacao'
import { subDays } from 'date-fns'

const config: ConfiguracaoComparacao = {
  contaOrigemId: 'conta-fornecedores',
  contaDestinoId: 'conta-banco',
  cenario: 'FORNECEDORES_BANCO',
  nomeDescritivo: 'Teste Fornecedores × Banco',
  periodoInicio: new Date('2026-01-01'),
  periodoFim: new Date('2026-05-31'),
  toleranciaValor: 1.0,
  toleranciaDias: 5,
  regrasPrioridade: REGRAS_PADRAO.FORNECEDORES_BANCO,
}

function makeLct(overrides: Partial<Lct> & { id: string }): Lct {
  return {
    dataLancamento: new Date('2026-02-11'),
    documento: '9593',
    historicoPadrao: 'CR BAIXA DE FORNECEDORES',
    complemento: '',
    contaIntegracao: '11211001',
    centroCusto: '103067',
    descCentroCusto: 'HBR-OS25256',
    ficha: '5005',
    sequencia: 5,
    debito: 0,
    credito: 69166944.0,
    saldo: 75606.0,
    natureza: 'BAIXA_FORNECEDOR',
    tokens: {
      dupCr: '9593',
      parcela: '1',
      cnpjParceiro: '13.536.632/0017-83',
      nomeParceiro: 'NORDEX ENERGY BRASIL',
      idBaixa: '2447',
      doctoBaixa: '30092908',
      bancoBaixa: '341',
      ordemFaturamento: '8647',
    },
    ...overrides,
  }
}

describe('compararContas — FORNECEDORES_BANCO', () => {
  it('pareia por doctoBaixa exato', () => {
    const a: Lct[] = [makeLct({ id: 'a1', credito: 69166944.0 })]
    const b: Lct[] = [makeLct({ id: 'b1', debito: 69166944.0, credito: 0 })]

    const result = compararContas(a, b, config)

    expect(result.pares).toHaveLength(1)
    expect(result.pares[0].score).toBeGreaterThan(0.9)
    expect(result.pares[0].diferencaValor).toBe(0)
    expect(result.semParA).toHaveLength(0)
    expect(result.semParB).toHaveLength(0)
  })

  it('não pareia quando valor excede tolerância', () => {
    const a: Lct[] = [makeLct({ id: 'a1', credito: 100.0 })]
    const b: Lct[] = [makeLct({ id: 'b1', debito: 102.0, credito: 0 })]

    const result = compararContas(a, b, config)

    expect(result.pares).toHaveLength(0)
    expect(result.semParA).toHaveLength(1)
    expect(result.semParB).toHaveLength(1)
  })

  it('não pareia por data quando a defasagem excede a tolerância em dias', () => {
    const a: Lct[] = [makeLct({ id: 'a1', credito: 100.0, tokens: {} })]
    const b: Lct[] = [
      makeLct({
        id: 'b1',
        debito: 100.0,
        credito: 0,
        tokens: {},
        dataLancamento: subDays(new Date('2026-02-11'), 10),
      }),
    ]

    const result = compararContas(a, b, { ...config, toleranciaDias: 5 })

    // Sem tokens, só a regra "Valor + data próxima" poderia casar — e ela é rejeitada
    // pela defasagem de 10 dias (> 5).
    expect(result.pares).toHaveLength(0)
  })

  it('calcula resumo corretamente', () => {
    const a: Lct[] = [
      makeLct({ id: 'a1', credito: 100.0 }),
      makeLct({
        id: 'a2',
        documento: '9999',
        credito: 200.0,
        tokens: { dupCr: '9999', idBaixa: '9999', doctoBaixa: '9999' },
      }),
    ]
    const b: Lct[] = [makeLct({ id: 'b1', debito: 100.0, credito: 0 })]

    const result = compararContas(a, b, config)

    expect(result.resumo.totalA).toBe(2)
    expect(result.resumo.totalB).toBe(1)
    expect(result.resumo.paresEncontrados).toBe(1)
    expect(result.resumo.taxaMatchA).toBeCloseTo(0.5, 2)
    expect(result.resumo.taxaMatchB).toBeCloseTo(1.0, 2)
    expect(result.semParA).toHaveLength(1)
    expect(result.resumo.valorSemParA).toBe(200.0)
  })

  it('filtra lançamentos fora do período', () => {
    const fora = makeLct({ id: 'a-fora', dataLancamento: new Date('2025-12-31'), credito: 500.0 })
    const a: Lct[] = [fora]
    const b: Lct[] = [makeLct({ id: 'b1', debito: 500.0, credito: 0 })]

    const result = compararContas(a, b, config)

    expect(result.resumo.totalA).toBe(0)
    expect(result.pares).toHaveLength(0)
  })
})

describe('compararContas — INTERCOMPANY', () => {
  const configIC: ConfiguracaoComparacao = {
    ...config,
    cenario: 'INTERCOMPANY',
    regrasPrioridade: REGRAS_PADRAO.INTERCOMPANY,
  }

  it('pareia por documento espelho', () => {
    const a: Lct[] = [
      makeLct({
        id: 'a1',
        credito: 28489004.0,
        documento: '9562',
        tokens: { ordemFaturamento: '8611', cnpjParceiro: '13.536.632/0017-83' },
      }),
    ]
    const b: Lct[] = [
      makeLct({
        id: 'b1',
        debito: 28489004.0,
        credito: 0,
        documento: '9562',
        tokens: { ordemFaturamento: '8611', cnpjParceiro: '13.536.632/0017-83' },
      }),
    ]

    const result = compararContas(a, b, configIC)

    expect(result.pares).toHaveLength(1)
    expect(result.pares[0].regraQueAplicou).toBe('Documento espelho exato')
  })
})
