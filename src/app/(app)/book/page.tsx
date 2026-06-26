import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Book Digital</h1>
          <p className="mt-1 text-sm text-slate-600">
            Fichas de conciliação por conta, a partir dos PDFs do razão e relatórios de suporte.
          </p>
        </div>
        <Link
          href="/book/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 active:translate-y-px"
        >
          Novo book
        </Link>
      </div>

      {erroDb ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível consultar o banco. Verifique o PostgreSQL e as migrations
          (<code>npx prisma migrate deploy</code>).
        </div>
      ) : books && books.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <h2 className="text-base font-semibold text-slate-800">Nenhum book ainda</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Crie o primeiro book do mês para começar a enviar os PDFs do razão e dos relatórios de
            suporte.
          </p>
          <Link
            href="/book/novo"
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 active:translate-y-px"
          >
            Criar book
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books!.map((b) => (
            <Link
              key={b.id}
              href={`/book/${b.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand hover:shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {MES_LABEL[b.mes]} / {b.ano}
              </p>
              <h3 className="mt-1 truncate font-semibold text-slate-900" title={b.empresaId}>
                {b.empresaId}
              </h3>
              <p className="mt-1 text-xs text-slate-500">Elaborado por {b.elaboradoPor}</p>
              <div className="mt-4 flex gap-4 text-sm text-slate-600">
                <span>
                  <span className="font-semibold text-slate-900">{b._count.fichas}</span> ficha(s)
                </span>
                <span>
                  <span className="font-semibold text-slate-900">{b._count.ocorrencias}</span>{' '}
                  ocorrência(s)
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
