import { parse, isValid } from 'date-fns'

/**
 * Utilitários compartilhados pelos parsers de PDF (razão, balancete, relatórios).
 */

/** Converte "1.046.071,39" → 1046071.39 e "(825.633,42)" → -825633.42. */
export function parseMoney(raw: string): number {
  const s = raw.trim()
  if (!s) return 0
  const negativo = /^\(.*\)$/.test(s)
  const limpo = s.replace(/[()]/g, '').replace(/\./g, '').replace(',', '.').trim()
  const n = parseFloat(limpo)
  if (Number.isNaN(n)) return 0
  return negativo ? -n : n
}

/** Converte "dd/MM/yyyy" → Date (ou null se inválida). */
export function parseDataBR(raw: string): Date | null {
  const d = parse(raw.trim(), 'dd/MM/yyyy', new Date())
  return isValid(d) ? d : null
}
