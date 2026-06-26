import Link from 'next/link'
import { formatBRL } from '@/lib/format'
import { StatusFicha } from '@/lib/types/book'
import { StatusBadge } from './StatusBadge'

export interface FichaResumo {
  id: string
  codigoConta: string
  nomeConta: string
  status: StatusFicha
  saldoRazao: number
  saldoBalancete: number
  saldoRelatorio: number
}

/** Cartão de ficha com semáforo acessível: razão × balancete × relatório (§12.5). */
export function FichaCard({ bookId, ficha }: { bookId: string; ficha: FichaResumo }) {
  return (
    <Link
      href={`/book/${bookId}/fichas/${ficha.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">{ficha.codigoConta}</p>
          <h3 className="truncate font-semibold text-slate-900" title={ficha.nomeConta}>
            {ficha.nomeConta}
          </h3>
        </div>
        <StatusBadge status={ficha.status} />
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Razão</dt>
          <dd className="tabular-nums text-slate-900">{formatBRL(ficha.saldoRazao)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Balancete</dt>
          <dd className="tabular-nums text-slate-900">{formatBRL(ficha.saldoBalancete)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Relatório</dt>
          <dd className="tabular-nums text-slate-900">{formatBRL(ficha.saldoRelatorio)}</dd>
        </div>
      </dl>
    </Link>
  )
}
