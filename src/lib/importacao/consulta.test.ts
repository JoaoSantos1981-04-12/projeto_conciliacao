import { describe, it, expect } from 'vitest'
import { parseFiltros, buildWhereLancamento, PAGE_SIZE } from './consulta'

describe('parseFiltros', () => {
  it('aplica padrões para entrada vazia', () => {
    const f = parseFiltros({})
    expect(f.page).toBe(1)
    expect(f.pageSize).toBe(PAGE_SIZE)
    expect(f.natureza).toBeUndefined()
    expect(f.status).toBeUndefined()
  })

  it('descarta natureza e status inválidos', () => {
    const f = parseFiltros({ natureza: 'INVALIDA', status: 'XPTO' })
    expect(f.natureza).toBeUndefined()
    expect(f.status).toBeUndefined()
  })

  it('aceita natureza e status válidos', () => {
    const f = parseFiltros({ natureza: 'BAIXA_CLIENTE', status: 'PENDENTE' })
    expect(f.natureza).toBe('BAIXA_CLIENTE')
    expect(f.status).toBe('PENDENTE')
  })

  it('normaliza página inválida para 1 e ignora strings vazias', () => {
    expect(parseFiltros({ page: '0' }).page).toBe(1)
    expect(parseFiltros({ page: '-3' }).page).toBe(1)
    expect(parseFiltros({ page: '4' }).page).toBe(4)
    expect(parseFiltros({ q: '   ' }).q).toBeUndefined()
  })

  it('pega o primeiro valor de arrays de query', () => {
    expect(parseFiltros({ importacaoId: ['abc', 'def'] }).importacaoId).toBe('abc')
  })
})

describe('buildWhereLancamento', () => {
  it('retorna where vazio sem filtros', () => {
    expect(buildWhereLancamento(parseFiltros({}))).toEqual({})
  })

  it('filtra por importação, conta, natureza e status', () => {
    const where = buildWhereLancamento(
      parseFiltros({
        importacaoId: 'imp1',
        contaContabilId: 'conta1',
        natureza: 'NF_SAIDA',
        status: 'CONCILIADO',
      }),
    )
    expect(where.importacaoId).toBe('imp1')
    expect(where.contaContabilId).toBe('conta1')
    expect(where.natureza).toBe('NF_SAIDA')
    expect(where.statusConciliacao).toBe('CONCILIADO')
  })

  it('monta intervalo de datas inclusivo', () => {
    const where = buildWhereLancamento(parseFiltros({ de: '2026-01-01', ate: '2026-05-31' }))
    const data = where.dataLancamento as { gte: Date; lte: Date }
    expect(data.gte.getFullYear()).toBe(2026)
    expect(data.lte.getHours()).toBe(23)
  })

  it('busca textual cobre documento, dupCr e parceiro', () => {
    const where = buildWhereLancamento(parseFiltros({ q: '1045' }))
    expect(Array.isArray(where.OR)).toBe(true)
    expect(where.OR).toHaveLength(4)
  })
})
