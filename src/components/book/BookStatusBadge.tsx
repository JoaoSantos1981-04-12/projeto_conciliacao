import { BookStatus } from '@/lib/types/book'
import { STATUS_LABEL } from '@/lib/book/book-workflow'

const CORES: Record<BookStatus, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  EM_REVISAO: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  APROVADO: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  FECHADO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
}

/** Pílula de status do book (usável em server e client components). */
export function BookStatusBadge({ status }: { status: BookStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CORES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
