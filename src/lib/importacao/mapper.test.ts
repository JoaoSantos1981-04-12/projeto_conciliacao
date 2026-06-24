import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseRazaoExcel } from '@/lib/parser/razao-excel'
import { mapImportacao, mapLancamento } from './mapper'
import { LancamentoRazao } from '@/lib/types/razao'

function lancamentoBase(): LancamentoRazao {
  return {
    dataLancamento: new Date(2026, 0, 2),
    documento: '1045',
    historicoPadrao: '001-001 - CR  BAIXA DE CLIENTES /',
    complemento: '   ',
    contaIntegracao: '',
    centroCusto: '',
    descCentroCusto: '',
    ficha: '',
    sequencia: 8,
    debito: 0,
    credito: 859250,
    saldo: 1701195.33,
    natureza: 'BAIXA_CLIENTE',
    tokens: {
      dupCr: '1045',
      parcela: '1',
      vencimento: new Date(2026, 0, 2),
      cnpjParceiro: '07.175.725/0010-50',
      nomeParceiro: 'WEG EQUIPAMENTOS',
      idBaixa: '2439',
    },
  }
}

describe('mapLancamento', () => {
  it('converte strings vazias/whitespace em null', () => {
    const m = mapLancamento(lancamentoBase())
    expect(m.complemento).toBeNull()
    expect(m.contaIntegracao).toBeNull()
    expect(m.ficha).toBeNull()
  })

  it('preserva tokens preenchidos e zera os ausentes', () => {
    const m = mapLancamento(lancamentoBase())
    expect(m.dupCr).toBe('1045')
    expect(m.cnpjParceiro).toBe('07.175.725/0010-50')
    expect(m.idBaixa).toBe('2439')
    expect(m.nrAdiantamento).toBeNull()
    expect(m.ordemFaturamento).toBeNull()
  })

  it('mantém valores monetários como number', () => {
    const m = mapLancamento(lancamentoBase())
    expect(m.credito).toBe(859250)
    expect(m.saldo).toBeCloseTo(1701195.33, 2)
  })
})

describe('mapImportacao (arquivo real)', () => {
  const buf = readFileSync(join(process.cwd(), 'fixtures/razao_exemplo.xlsx'))

  it('produz payload coerente com o razão de referência', () => {
    const dados = mapImportacao(parseRazaoExcel(buf), 'razao_exemplo.xlsx')
    expect(dados.empresa.length).toBeGreaterThan(0)
    expect(dados.cnpjEmpresa).toBe('13.150.810/0002-57')
    expect(dados.contas).toHaveLength(1)
    expect(dados.contas[0].codigo).toBe('1.1.02.0101.100005')
    expect(dados.linhasImportadas).toBe(165)
    expect(dados.totalLinhas).toBe(165)
    expect(dados.periodo.inicio).toMatch(/^2026-01-01/)
  })

  it('serializa o período como ISO string', () => {
    const dados = mapImportacao(parseRazaoExcel(buf), 'razao_exemplo.xlsx')
    expect(typeof dados.periodo.inicio).toBe('string')
    expect(typeof dados.periodo.fim).toBe('string')
  })
})
