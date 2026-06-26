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
      ? 'text-emerald-600 dark:text-emerald-400'
      : destaque === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : destaque === 'vermelho'
          ? 'text-red-600 dark:text-red-400'
          : 'text-slate-900 dark:text-white'
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{titulo}</div>
      <div className={`mt-1.5 text-2xl font-bold tracking-tight tabular-nums ${cor}`}>{valor}</div>
    </div>
  )
}

export function ResumoComparacao(props: ResumoComparacaoProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card titulo="Lançamentos Conta A" valor={String(props.totalA)} />
      <Card titulo="Lançamentos Conta B" valor={String(props.totalB)} />
      <Card titulo="Pares Encontrados" valor={String(props.paresEncontrados)} destaque="verde" />
      <Card titulo="Média de Confiança" valor={formatPercent(props.mediaConfianca)} />
      <Card titulo="Taxa de Match A" valor={formatPercent(props.taxaMatchA)} destaque="amber" />
      <Card titulo="Taxa de Match B" valor={formatPercent(props.taxaMatchB)} destaque="amber" />
      <Card titulo="Valor Sem Par A" valor={formatBRL(props.valorSemParA)} destaque="vermelho" />
      <Card titulo="Valor Sem Par B" valor={formatBRL(props.valorSemParB)} destaque="vermelho" />
    </div>
  )
}
