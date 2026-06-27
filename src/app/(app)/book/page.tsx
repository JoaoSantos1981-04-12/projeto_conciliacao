import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { Plus, BookOpen, ChevronRight, FileText, AlertTriangle, Calendar, User } from 'lucide-react'
import { BookStatusBadge } from '@/components/book/BookStatusBadge'
import type { BookStatus } from '@/lib/types/book'

export const metadata = { title: 'Book Digital · Conciliação Contábil' }
export const dynamic = 'force-dynamic'

type BookComContagem = Prisma.BookDigitalGetPayload<{
  include: { _count: { select: { fichas: true; ocorrencias: true } } }
}>

const MES_LABEL = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default async function BookListPage() {
  let books: BookComContagem[] | null = null
  let erroDb = false

  try {
    books = await prisma.bookDigital.findMany({
      orderBy: [{ ano: 'desc' }, { mes: 'desc' }, { criadoEm: 'desc' }],
      include: { _count: { select: { fichas: true, ocorrencias: true } } },
    })
  } catch {
    erroDb = true
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Book Digital</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Fichas de conciliação por conta, a partir dos PDFs do razão e relatórios de suporte.
          </p>
        </div>
        <Link
          href="/book/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-emeraldBlue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px dark:bg-emeraldBlue-600 dark:hover:bg-emeraldBlue-500"
        >
          <Plus className="h-4 w-4" />
          Novo Book
        </Link>
      </div>

      {erroDb ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            Não foi possível consultar o banco de dados. Verifique o PostgreSQL e as migrations.
          </div>
        </div>
      ) : books && books.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 transition-colors">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600 mb-4" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nenhum book gerado</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Crie o primeiro book do mês para começar a anexar os PDFs do razão e dos relatórios de suporte.
          </p>
          <Link
            href="/book/novo"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emeraldBlue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px"
          >
            Criar Book
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books!.map((b) => (
            <Link
              key={b.id}
              href={`/book/${b.id}`}
              className="block rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm hover:border-emeraldBlue-500 hover:shadow-md dark:border-slate-850 dark:bg-slate-900 transition-all group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded bg-emeraldBlue-50 dark:bg-emeraldBlue-950/40 text-emeraldBlue-700 dark:text-emeraldBlue-400 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                  {MES_LABEL[b.mes]} / {b.ano}
                </span>
                <div className="flex items-center gap-2">
                  <BookStatusBadge status={b.status as BookStatus} />
                  <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
              
              <h3 className="mt-3 font-display font-bold text-slate-900 dark:text-white truncate text-base" title={b.empresaId}>
                {b.empresaId}
              </h3>
              
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <User className="h-3 w-3" />
                Elaborado por: {b.elaboradoPor}
              </div>
              
              <div className="mt-5 flex gap-4 text-xs border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-650 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-450" />
                  <strong className="text-slate-900 dark:text-white font-bold">{b._count.fichas}</strong> ficha(s)
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-slate-450" />
                  <strong className="text-slate-900 dark:text-white font-bold">{b._count.ocorrencias}</strong> ocorrência(s)
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
