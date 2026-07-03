import { BookStatus } from '@/lib/types/book'

/**
 * Workflow de validação do Book Digital.
 *
 * Estados: RASCUNHO (em edição) → EM_REVISAO → APROVADO → FECHADO (reportado).
 * Reaberturas controladas permitem voltar um passo enquanto não reportado.
 */

export const STATUS_LABEL: Record<BookStatus, string> = {
  RASCUNHO: 'Em edição',
  EM_REVISAO: 'Em revisão',
  APROVADO: 'Aprovado',
  FECHADO: 'Reportado',
}

/** Transições permitidas a partir de cada status. */
export const TRANSICOES: Record<BookStatus, BookStatus[]> = {
  RASCUNHO: ['EM_REVISAO'],
  EM_REVISAO: ['APROVADO', 'RASCUNHO'],
  APROVADO: ['FECHADO', 'EM_REVISAO'],
  FECHADO: [], // terminal: book reportado é imutável
}

/** Rótulo da ação de transição (de → para). */
export const ACAO_LABEL: Record<string, string> = {
  'RASCUNHO->EM_REVISAO': 'Enviar para revisão',
  'EM_REVISAO->APROVADO': 'Aprovar',
  'EM_REVISAO->RASCUNHO': 'Devolver para edição',
  'APROVADO->FECHADO': 'Reportar (fechar)',
  'APROVADO->EM_REVISAO': 'Reabrir revisão',
}

export function rotuloAcao(de: BookStatus, para: BookStatus): string {
  return ACAO_LABEL[`${de}->${para}`] ?? `Mudar para ${STATUS_LABEL[para]}`
}

export function transicaoValida(de: BookStatus, para: BookStatus): boolean {
  return TRANSICOES[de]?.includes(para) ?? false
}

/**
 * Exclusão só é permitida antes de o book ser aprovado/reportado.
 * Um book APROVADO ou FECHADO (reportado) jamais pode ser excluído —
 * garantia de segurança do processo.
 */
export function podeExcluirBook(status: BookStatus): boolean {
  return status === 'RASCUNHO' || status === 'EM_REVISAO'
}
