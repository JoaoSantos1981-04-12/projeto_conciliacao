import { NaturezaLancamento } from '@/lib/types/razao'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatBRL(v: number | string | null | undefined): string {
  if (v == null) return '—'
  const n = typeof v === 'string' ? Number(v) : v
  if (!Number.isFinite(n)) return '—'
  return BRL.format(n)
}

export function formatData(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const data = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(data.getTime())) return '—'
  return DATA.format(data)
}

export const NATUREZA_LABEL: Record<NaturezaLancamento, string> = {
  BAIXA_CLIENTE: 'Baixa de cliente',
  BAIXA_FORNECEDOR: 'Baixa de fornecedor',
  NF_SAIDA: 'NF de saída',
  NF_ENTRADA: 'NF de entrada',
  CONTRAPARTIDA_BAIXA_FORNECEDOR: 'Contrap. baixa forn.',
  CONTRAPARTIDA_NF_SAIDA: 'Contrap. NF saída',
  OUTRO: 'Outro',
}

export const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  CONCILIADO: 'Conciliado',
  DIVERGENCIA: 'Divergência',
  IGNORADO: 'Ignorado',
}

const PERCENT = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/** Formata uma fração 0.0–1.0 como percentual (ex.: 0.5 → "50%"). */
export function formatPercent(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return PERCENT.format(v)
}

export const CENARIO_LABEL: Record<string, string> = {
  FORNECEDORES_BANCO: 'Fornecedores × Banco',
  CLIENTES_BANCO: 'Clientes × Banco',
  INTERCOMPANY: 'Intercompany',
  PERSONALIZADO: 'Personalizado',
}

export const STATUS_PAR_COMPARACAO_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  IGNORADO: 'Ignorado',
}
