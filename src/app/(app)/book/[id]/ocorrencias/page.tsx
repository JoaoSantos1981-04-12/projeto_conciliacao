import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { OcorrenciaForm, OcorrenciaView } from '@/components/book/OcorrenciaForm'
import { StatusOcorrencia, ResponsavelArea } from '@/lib/types/book'

export const dynamic = 'force-dynamic'

export default async function OcorrenciasPage({ params }: { params: { id: string } }) {
  const book = await prisma.bookDigital.findUnique({
    where: { id: params.id },
    include: { ocorrencias: { orderBy: { criadoEm: 'desc' } } },
  })
  if (!book) notFound()

  const ocorrencias: OcorrenciaView[] = book.ocorrencias.map((o) => ({
    id: o.id,
    descricao: o.descricao,
    status: o.status as StatusOcorrencia,
    responsavel: (o.responsavel as ResponsavelArea | null) ?? null,
    acaoCorretiva: o.acaoCorretiva,
    prazo: o.prazo ? o.prazo.toISOString() : null,
    nettingFlag: o.nettingFlag,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/book/${params.id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Voltar ao book
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Ocorrências</h1>
        <p className="mt-1 text-sm text-slate-600">
          Inconsistências escaladas — defina responsável, ação e prazo.
        </p>
      </div>

      {ocorrencias.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-sm text-slate-500">
            Nenhuma ocorrência. Itens como INTERAXA são escalados automaticamente ao processar o CP.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ocorrencias.map((o) => (
            <OcorrenciaForm key={o.id} bookId={params.id} ocorrencia={o} />
          ))}
        </div>
      )}
    </div>
  )
}
