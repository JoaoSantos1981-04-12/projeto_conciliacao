import { describe, it, expect } from 'vitest'
import { classificarFaixa, montarRelatorio, LancRelatorio, MetaRelatorio } from './relatorio'

describe('classificarFaixa', () => {
  it('classifica por dias em aberto', () => {
    expect(classificarFaixa(-5)).toBe('A vencer')
    expect(classificarFaixa(0)).toBe('0–30 dias')
    expect(classificarFaixa(30)).toBe('0–30 dias')
    expect(classificarFaixa(31)).toBe('31–60 dias')
    expect(classificarFaixa(75)).toBe('61–90 dias')
    expect(classificarFaixa(120)).toBe('90+ dias')
  })
})

const meta: MetaRelatorio = {
  importacaoId: 'imp1',
  empresa: 'NCC',
  periodo: { inicio: '2026-01-01', fim: '2026-05-31' },
}

function l(p: Partial<LancRelatorio> & { id: string }): LancRelatorio {
  return {
    dataLancamento: new Date(2026, 0, 1),
    documento: 'd',
    natureza: 'NF_SAIDA',
    debito: 0,
    credito: 0,
    dupCr: null,
    parcela: null,
    nomeParceiro: null,
    statusConciliacao: 'PENDENTE',
    ...p,
  }
}

describe('montarRelatorio', () => {
  const ref = new Date(2026, 4, 31) // 31/05/2026
  const lancs: LancRelatorio[] = [
    l({ id: 'a', debito: 1000, statusConciliacao: 'CONCILIADO', natureza: 'NF_SAIDA' }),
    l({ id: 'b', credito: 1000, statusConciliacao: 'CONCILIADO', natureza: 'BAIXA_CLIENTE' }),
    // aberto há ~120 dias (01/02) → 90+
    l({ id: 'c', debito: 500, dataLancamento: new Date(2026, 1, 1), nomeParceiro: 'WEG', statusConciliacao: 'PENDENTE' }),
    // aberto há ~16 dias (15/05) → 0–30
    l({ id: 'd', debito: 200, dataLancamento: new Date(2026, 4, 15), nomeParceiro: 'WEG', statusConciliacao: 'PENDENTE' }),
    l({ id: 'e', debito: 999, statusConciliacao: 'DIVERGENCIA' }),
  ]
  const r = montarRelatorio(lancs, meta, ref)

  it('totaliza status e percentual de conciliação', () => {
    expect(r.totais.lancamentos).toBe(5)
    expect(r.totais.conciliados).toBe(2)
    expect(r.totais.pendentes).toBe(2)
    expect(r.totais.divergencias).toBe(1)
    expect(r.totais.percentualConciliado).toBe(40)
  })

  it('calcula valores em aberto (só pendentes com débito)', () => {
    expect(r.valores.abertoDebito).toBe(700) // 500 + 200
  })

  it('faz o aging dos títulos em aberto', () => {
    const f90 = r.aging.find((f) => f.faixa === '90+ dias')!
    const f30 = r.aging.find((f) => f.faixa === '0–30 dias')!
    expect(f90.valor).toBe(500)
    expect(f30.valor).toBe(200)
    expect(r.aging).toHaveLength(5) // todas as faixas presentes
  })

  it('agrupa parceiros em aberto por valor', () => {
    expect(r.topParceirosAberto[0]).toEqual({ parceiro: 'WEG', quantidade: 2, valor: 700 })
  })
})
