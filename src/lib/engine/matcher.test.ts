import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseRazaoExcel } from '@/lib/parser/razao-excel'
import { CONFIG_PADRAO, LancamentoConciliavel, avaliarPar, regra1, regra3 } from './rules'
import { conciliar, conciliavelDeRazao } from './matcher'

function lanc(p: Partial<LancamentoConciliavel> & { id: string }): LancamentoConciliavel {
  return {
    dataLancamento: new Date(2026, 2, 19),
    documento: 'doc',
    debito: 0,
    credito: 0,
    natureza: 'OUTRO',
    ...p,
  }
}

// Par real observado: duplicata 1070 (NF débito × baixa crédito), R$ 1.280,50, OF 8807.
const nf = lanc({ id: 'nf', debito: 1280.5, dupCr: '1070', parcela: '1', ordemFaturamento: '8807', cnpjParceiro: 'X', dataLancamento: new Date(2026, 2, 19) })
const baixa = lanc({ id: 'baixa', credito: 1280.5, dupCr: '1070', parcela: '1', ordemFaturamento: '8807', cnpjParceiro: 'X', idBaixa: '2459', dataLancamento: new Date(2026, 2, 26) })

describe('regras unitárias', () => {
  it('Regra 1 casa duplicata+parcela, direções opostas e valor igual', () => {
    const r = regra1(nf, baixa, CONFIG_PADRAO)
    expect(r?.regra).toBe('REGRA_1_DUPLICATA')
    expect(r?.score).toBe(1.0)
    expect(r?.diferencaValor).toBeCloseTo(0, 2)
  })

  it('Regra 1 rejeita quando o valor difere mais que a tolerância', () => {
    const baixaDif = lanc({ id: 'b2', credito: 1290.0, dupCr: '1070', parcela: '1' })
    expect(regra1(nf, baixaDif, CONFIG_PADRAO)).toBeNull()
  })

  it('Regra 1 rejeita mesma direção (dois débitos)', () => {
    const outroDebito = lanc({ id: 'd2', debito: 1280.5, dupCr: '1070', parcela: '1' })
    expect(regra1(nf, outroDebito, CONFIG_PADRAO)).toBeNull()
  })

  it('Regra 3 casa por OF dentro de 30 dias', () => {
    const r = regra3(nf, baixa, CONFIG_PADRAO) // 7 dias de diferença
    expect(r?.regra).toBe('REGRA_3_OF')
  })

  it('Regra 3 rejeita fora da janela de 30 dias', () => {
    const baixaLonge = lanc({ id: 'bl', credito: 1280.5, ordemFaturamento: '8807', dataLancamento: new Date(2026, 5, 1) })
    expect(regra3(nf, baixaLonge, CONFIG_PADRAO)).toBeNull()
  })

  it('avaliarPar prioriza a Regra 1 sobre OF/CNPJ', () => {
    expect(avaliarPar(nf, baixa)?.regra).toBe('REGRA_1_DUPLICATA')
  })
})

describe('conciliar', () => {
  it('forma o grupo exato e aprova automaticamente', () => {
    const r = conciliar([nf, baixa])
    expect(r.grupos).toHaveLength(1)
    expect(r.grupos[0].ids.sort()).toEqual(['baixa', 'nf'])
    expect(r.grupos[0].aprovacao).toBe('APROVADO')
    expect(r.resumo.conciliados).toBe(2)
    expect(r.pendentes).toHaveLength(0)
  })

  it('concilia 1:N — um título quitado por duas baixas parciais (caso dup 1078)', () => {
    const titulo = lanc({ id: 't', debito: 3841.5, dupCr: '1078', parcela: '1' })
    const baixaA = lanc({ id: 'ba', credito: 2733.59, dupCr: '1078', parcela: '1' })
    const baixaB = lanc({ id: 'bb', credito: 1107.91, dupCr: '1078', parcela: '1' })
    const r = conciliar([titulo, baixaA, baixaB])
    expect(r.grupos).toHaveLength(1)
    expect(r.grupos[0].ids).toHaveLength(3)
    expect(r.grupos[0].diferencaValor).toBeCloseTo(0, 2)
    expect(r.divergencias).toHaveLength(0)
  })

  it('deixa lançamento sem contrapartida como PENDENTE', () => {
    const orfao = lanc({ id: 'orf', debito: 500, dupCr: '9999', parcela: '1' })
    const r = conciliar([nf, baixa, orfao])
    expect(r.pendentes).toContain('orf')
    expect(r.resumo.divergencias).toBe(0)
  })

  it('detecta divergência quando Σdébito ≠ Σcrédito na mesma duplicata', () => {
    const tituloA = lanc({ id: 'tA', debito: 1000, dupCr: '2000', parcela: '1' })
    const baixaB = lanc({ id: 'bB', credito: 1050, dupCr: '2000', parcela: '1' })
    const r = conciliar([tituloA, baixaB])
    expect(r.grupos).toHaveLength(0)
    expect(r.divergencias).toHaveLength(1)
    expect(r.divergencias[0].motivo).toBe('VALOR_DIVERGENTE')
    expect(r.pendentes).toHaveLength(0)
  })
})

describe('conciliar (arquivo real)', () => {
  it('concilia o razão da HAILO de forma íntegra', () => {
    const buf = readFileSync(join(process.cwd(), 'fixtures/razao_exemplo.xlsx'))
    const parsed = parseRazaoExcel(buf)
    const lancs = parsed.contas[0].lancamentos.map((l, i) => conciliavelDeRazao(l, `L${i}`))

    const r = conciliar(lancs)

    // Integridade: todo lançamento é conciliado, divergente ou pendente — exatamente uma vez.
    const totalClassificado =
      r.grupos.reduce((a, g) => a + g.ids.length, 0) +
      r.divergencias.reduce((a, d) => a + d.ids.length, 0) +
      r.pendentes.length
    expect(totalClassificado).toBe(lancs.length)
    expect(r.resumo.total).toBe(165)

    // As 63 duplicatas com os dois lados devem virar grupos conciliados (Regra 1).
    expect(r.grupos.length).toBeGreaterThanOrEqual(60)

    // Todo grupo fecha: Σdébito ≈ Σcrédito dentro da tolerância.
    for (const g of r.grupos) {
      expect(Math.abs(g.totalDebito - g.totalCredito)).toBeLessThanOrEqual(
        CONFIG_PADRAO.toleranciaValor + 1e-9,
      )
      expect(g.ids.length).toBeGreaterThanOrEqual(2)
    }
  })
})
