import { NaturezaLancamento } from '@/lib/types/razao'

export type TipoMatch = 'AUTOMATICO_EXATO' | 'AUTOMATICO_FUZZY' | 'MANUAL'

/**
 * Forma mínima de um lançamento para o engine de conciliação. Independente de
 * Prisma/parser — adaptadores convertem para esta estrutura.
 */
export interface LancamentoConciliavel {
  id: string
  dataLancamento: Date
  documento: string
  debito: number // em reais
  credito: number // em reais
  natureza: NaturezaLancamento
  dupCr?: string | null
  parcela?: string | null
  idBaixa?: string | null
  doctoBaixa?: string | null
  ordemFaturamento?: string | null
  cnpjParceiro?: string | null
}

export interface ConfigMatching {
  /** Tolerância única de diferença de valor (R$). Validada com o Contador: 0,02. */
  toleranciaValor: number
  /** Janela máxima entre datas de lançamento na Regra 3 (dias). */
  maxDiasOF: number
}

export const CONFIG_PADRAO: ConfigMatching = {
  toleranciaValor: 0.02,
  maxDiasOF: 30,
}

export interface AvaliacaoMatch {
  regra: string
  tipo: TipoMatch
  score: number
  diferencaValor: number
}

const EPSILON = 1e-9
const MS_POR_DIA = 86_400_000

/** Valor absoluto do lançamento (lado preenchido). */
export function valorLancamento(l: LancamentoConciliavel): number {
  return l.debito > 0 ? l.debito : l.credito
}

/** Um é débito e o outro é crédito. */
export function direcoesOpostas(a: LancamentoConciliavel, b: LancamentoConciliavel): boolean {
  return (a.debito > 0 && b.credito > 0) || (a.credito > 0 && b.debito > 0)
}

function difValor(a: LancamentoConciliavel, b: LancamentoConciliavel): number {
  return Math.abs(valorLancamento(a) - valorLancamento(b))
}

function dentroTolerancia(diff: number, cfg: ConfigMatching): boolean {
  return diff <= cfg.toleranciaValor + EPSILON
}

function difDias(a: LancamentoConciliavel, b: LancamentoConciliavel): number {
  return Math.abs(a.dataLancamento.getTime() - b.dataLancamento.getTime()) / MS_POR_DIA
}

function mesmaCompetencia(a: LancamentoConciliavel, b: LancamentoConciliavel): boolean {
  return (
    a.dataLancamento.getFullYear() === b.dataLancamento.getFullYear() &&
    a.dataLancamento.getMonth() === b.dataLancamento.getMonth()
  )
}

// ---- Regras (peso decrescente) ----

/** Regra 1 — Duplicata exata (peso 1.0). */
export function regra1(
  a: LancamentoConciliavel,
  b: LancamentoConciliavel,
  cfg: ConfigMatching,
): AvaliacaoMatch | null {
  if (!a.dupCr || a.dupCr !== b.dupCr) return null
  if ((a.parcela ?? '') !== (b.parcela ?? '')) return null
  if (!direcoesOpostas(a, b)) return null
  const diff = difValor(a, b)
  if (!dentroTolerancia(diff, cfg)) return null
  return { regra: 'REGRA_1_DUPLICATA', tipo: 'AUTOMATICO_EXATO', score: 1.0, diferencaValor: diff }
}

/** Regra 2 — ID de baixa (peso 0.95). */
export function regra2(
  a: LancamentoConciliavel,
  b: LancamentoConciliavel,
  cfg: ConfigMatching,
): AvaliacaoMatch | null {
  if (!a.idBaixa || a.idBaixa !== b.idBaixa) return null
  if (!a.doctoBaixa || a.doctoBaixa !== b.doctoBaixa) return null
  if (!direcoesOpostas(a, b)) return null
  const diff = difValor(a, b)
  if (!dentroTolerancia(diff, cfg)) return null
  return { regra: 'REGRA_2_ID_BAIXA', tipo: 'AUTOMATICO_EXATO', score: 0.95, diferencaValor: diff }
}

/** Regra 3 — OF + valor + data (peso 0.85). */
export function regra3(
  a: LancamentoConciliavel,
  b: LancamentoConciliavel,
  cfg: ConfigMatching,
): AvaliacaoMatch | null {
  if (!a.ordemFaturamento || a.ordemFaturamento !== b.ordemFaturamento) return null
  if (!direcoesOpostas(a, b)) return null
  const diff = difValor(a, b)
  if (!dentroTolerancia(diff, cfg)) return null
  if (difDias(a, b) > cfg.maxDiasOF) return null
  return { regra: 'REGRA_3_OF', tipo: 'AUTOMATICO_FUZZY', score: 0.85, diferencaValor: diff }
}

/** Regra 4 — CNPJ + valor + competência (peso 0.70, revisão manual). */
export function regra4(
  a: LancamentoConciliavel,
  b: LancamentoConciliavel,
  cfg: ConfigMatching,
): AvaliacaoMatch | null {
  if (!a.cnpjParceiro || a.cnpjParceiro !== b.cnpjParceiro) return null
  if (!direcoesOpostas(a, b)) return null
  const diff = difValor(a, b)
  if (!dentroTolerancia(diff, cfg)) return null
  if (!mesmaCompetencia(a, b)) return null
  return { regra: 'REGRA_4_CNPJ', tipo: 'MANUAL', score: 0.7, diferencaValor: diff }
}

export const REGRAS = [regra1, regra2, regra3, regra4] as const

/** Avalia um par aplicando as regras em ordem; a primeira que casar vence. */
export function avaliarPar(
  a: LancamentoConciliavel,
  b: LancamentoConciliavel,
  cfg: ConfigMatching = CONFIG_PADRAO,
): AvaliacaoMatch | null {
  for (const regra of REGRAS) {
    const r = regra(a, b, cfg)
    if (r) return r
  }
  return null
}
