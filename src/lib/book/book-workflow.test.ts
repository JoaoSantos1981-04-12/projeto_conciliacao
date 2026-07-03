import { describe, it, expect } from 'vitest'
import {
  transicaoValida,
  podeExcluirBook,
  TRANSICOES,
} from './book-workflow'

describe('book-workflow — transições', () => {
  it('permite o caminho feliz do workflow', () => {
    expect(transicaoValida('RASCUNHO', 'EM_REVISAO')).toBe(true)
    expect(transicaoValida('EM_REVISAO', 'APROVADO')).toBe(true)
    expect(transicaoValida('APROVADO', 'FECHADO')).toBe(true)
  })

  it('permite reaberturas controladas (um passo atrás)', () => {
    expect(transicaoValida('EM_REVISAO', 'RASCUNHO')).toBe(true)
    expect(transicaoValida('APROVADO', 'EM_REVISAO')).toBe(true)
  })

  it('FECHADO (reportado) é terminal', () => {
    expect(TRANSICOES.FECHADO).toEqual([])
    expect(transicaoValida('FECHADO', 'APROVADO')).toBe(false)
    expect(transicaoValida('FECHADO', 'RASCUNHO')).toBe(false)
  })

  it('rejeita pulos inválidos', () => {
    expect(transicaoValida('RASCUNHO', 'APROVADO')).toBe(false)
    expect(transicaoValida('RASCUNHO', 'FECHADO')).toBe(false)
    expect(transicaoValida('EM_REVISAO', 'FECHADO')).toBe(false)
  })
})

describe('book-workflow — exclusão', () => {
  it('permite excluir apenas antes da aprovação/reporte', () => {
    expect(podeExcluirBook('RASCUNHO')).toBe(true)
    expect(podeExcluirBook('EM_REVISAO')).toBe(true)
  })

  it('proíbe excluir book aprovado ou reportado', () => {
    expect(podeExcluirBook('APROVADO')).toBe(false)
    expect(podeExcluirBook('FECHADO')).toBe(false)
  })
})
