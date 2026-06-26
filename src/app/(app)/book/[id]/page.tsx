import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { StatusFicha } from '@/lib/types/book'
import { FichaCard } from '@/components/book/FichaCard'
import { UploadPdfSuporte } from '@/components/book/UploadPdfSuporte'
import { AcoesBook } from '@/components/book/AcoesBook'

export const dynamic = 'force-dynamic'

const MES_LABEL = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default async function BookDashboardPage({ params }: { params: { id: string } }) {
  const book = await prisma.bookDigital.findUnique({
    where: { id: params.id },
    include: {
      fichas: { orderBy: { codigoConta: 'asc' } },
      _count: { select: { ocorrencias: true } },
    },
  })
  if (!book) notFound()

  const fichas = book.fichas.map((f) => ({
    id: f.id,
    codigoConta: f.codigoConta,
    nomeConta: f.nomeConta,
    status: f.statusConciliacao as StatusFicha,
    saldoRazao: f.saldoRazao.toNumber(),
    saldoBalancete: f.saldoBalancete.toNumber(),
    saldoRelatorio: f.saldoRelatorio.toNumber(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/book" className="text-sm text-slate-500 hover:text-slate-700">
            ← Books
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{book.empresaId}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {MES_LABEL[book.mes]} / {book.ano} · elaborado por {book.elaboradoPor}
          </p>
        </div>
        <Link
          href={`/book/${book.id}/ocorrencias`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:translate-y-px"
        >
          Ocorrências ({book._count.ocorrencias})
        </Link>
      </div>

      <UploadPdfSuporte bookId={book.id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Fichas</h2>
        <AcoesBook bookId={book.id} />
      </div>

      {fichas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-sm text-slate-500">
            Nenhuma ficha ainda. Envie os PDFs do razão acima — cada conta vira uma ficha
            automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fichas.map((f) => (
            <FichaCard key={f.id} bookId={book.id} ficha={f} />
          ))}
        </div>
      )}
    </div>
  )
}
