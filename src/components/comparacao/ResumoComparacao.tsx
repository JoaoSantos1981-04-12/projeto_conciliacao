import { formatBRL, formatPercent } from '@/lib/format'

export interface ResumoComparacaoProps {
  totalA: number
  totalB: number
  paresEncontrados: number
  taxaMatchA: number
  taxaMatchB: number
  valorSemParA: number
  valorSemParB: number
  mediaConfianca: number
}

function Card({
  titulo,
  valor,
  destaque,
}: {
  titulo: string
  valor: string
  destaque?: 'verde' | 'amber' | 'vermelho'
}) {
  const cor =
    destaque === 'verde'
      ? 'text-emerald-700'
      : destaque === 'amber'
        ? 'text-amber-700'
        : destaque === 'vermelho'
          ? 'text-red-700'
          : 'text-slate-900'
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${cor}`}>{valor}</div>
    </div>
  )
}

export function ResumoComparacao(props: ResumoComparacaoProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card titulo="Lançtos conta A" valor={String(props.totalA)} />
      <Card titulo="Lançtos conta B" valor={String(props.totalB)} />
      <Card titulo="Pares encontrados" valor={String(props.paresEncontrados)} destaque="verde" />
      <Card titulo="Média de confiança" valor={formatPercent(props.mediaConfianca)} />
      <Card titulo="Taxa de match A" valor={formatPercent(props.taxaMatchA)} destaque="amber" />
      <Card titulo="Taxa de match B" valor={formatPercent(props.taxaMatchB)} destaque="amber" />
      <Card titulo="Valor sem par A" valor={formatBRL(props.valorSemParA)} destaque="vermelho" />
      <Card titulo="Valor sem par B" valor={formatBRL(props.valorSemParB)} destaque="vermelho" />
    </div>
  )
}
