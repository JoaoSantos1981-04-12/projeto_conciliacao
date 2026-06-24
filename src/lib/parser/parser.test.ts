import { describe, it, expect } from 'vitest'
import { parseComplemento } from './complemento'
import { parseRazaoExcel } from './razao-excel'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('parseComplemento', () => {
  it('extrai tokens de baixa de cliente', () => {
    const input = `DUP.CR.:1045   PARC:1   VCTO:02/01/2026   CNPJ/CPF:07.175.725/0010-50 - WEG EQUIPAMENTOS   ID.DUP.CR:107053   OF:8630   DOCTO.BAIXA:30092902   BCO.BAIXA:341   CC.BAIXA:53138-5   ID.BAIXA:2439`
    const result = parseComplemento(input)
    expect(result.dupCr).toBe('1045')
    expect(result.parcela).toBe('1')
    expect(result.cnpjParceiro).toBe('07.175.725/0010-50')
    expect(result.nomeParceiro).toBe('WEG EQUIPAMENTOS')
    expect(result.ordemFaturamento).toBe('8630')
    expect(result.idBaixa).toBe('2439')
  })

  it('extrai NR.ADTO para adiantamentos', () => {
    const input = `DUP.CR.:1051   PARC:1   VCTO:15/01/2026   CNPJ/CPF:18.379.944/0001-87 - G-WIND SOLUCOES EOLICAS LTDA   ID.DUP.CR:107160   OF:8664   NR.ADTO:1988`
    const result = parseComplemento(input)
    expect(result.nrAdiantamento).toBe('1988')
  })

  it('extrai data de vencimento como Date válida', () => {
    const result = parseComplemento('DUP.CR.:1045   VCTO:02/01/2026')
    expect(result.vencimento).toBeInstanceOf(Date)
    expect(result.vencimento?.getFullYear()).toBe(2026)
    expect(result.vencimento?.getMonth()).toBe(0)
    expect(result.vencimento?.getDate()).toBe(2)
  })

  it('retorna objeto vazio para complemento vazio', () => {
    expect(parseComplemento('')).toEqual({})
  })
})

describe('parseRazaoExcel', () => {
  const buf = () => readFileSync(join(process.cwd(), 'fixtures/razao_exemplo.xlsx'))

  it('processa o arquivo de referência sem erros críticos', () => {
    const result = parseRazaoExcel(buf())
    expect(result.metadados.empresa.length).toBeGreaterThan(0)
    expect(result.contas.length).toBeGreaterThan(0)
    expect(result.contas[0].lancamentos.length).toBeGreaterThan(0)
    expect(result.erros.length).toBe(0)
  })

  it('extrai saldo anterior da conta corretamente', () => {
    const result = parseRazaoExcel(buf())
    expect(result.contas[0].conta.saldoAnterior).toBeCloseTo(1709787.83, 2)
  })

  it('classifica naturezas corretamente', () => {
    const result = parseRazaoExcel(buf())
    const naturezas = result.contas[0].lancamentos.map((l) => l.natureza)
    expect(naturezas).toContain('BAIXA_CLIENTE')
    expect(naturezas).toContain('NF_SAIDA')
  })

  it('extrai período dos metadados', () => {
    const result = parseRazaoExcel(buf())
    expect(result.metadados.periodoInicio.getFullYear()).toBe(2026)
    expect(result.metadados.periodoFim.getMonth()).toBe(4) // maio
  })

  it('converte débito/crédito de centavos para reais (saldo permanece em reais)', () => {
    const result = parseRazaoExcel(buf())
    const lancs = result.contas[0].lancamentos
    // 1º lançamento: baixa WEG. Crédito real = R$ 8.592,50 (não 859.250,00).
    const weg = lancs.find((l) => l.documento === '1045')!
    expect(weg.credito).toBeCloseTo(8592.5, 2)
    expect(weg.debito).toBe(0)
    expect(weg.saldo).toBeCloseTo(1701195.33, 2)

    // A reconciliação fecha: saldo_anterior + débito − crédito === saldo
    const saldoAnterior = result.contas[0].conta.saldoAnterior
    expect(saldoAnterior + weg.debito - weg.credito).toBeCloseTo(weg.saldo, 2)
  })
})
