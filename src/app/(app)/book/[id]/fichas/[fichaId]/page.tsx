import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { AnaliseLlm, StatusFicha } from '@/lib/types/book'
import { StatusBadge } from '@/components/book/StatusBadge'
import { PainelAmarracao } from '@/components/book/PainelAmarracao'
import { NotaLlm } from '@/components/book/NotaLlm'
import { TabelaItensRelatorio, ItemView } from '@/components/book/TabelaItensRelatorio'
import { ObservacaoFicha } from '@/components/book/ObservacaoFicha'

export const dynamic = 'force-dynamic'

export default async function FichaDetalhePage({
  params,
}: {
  params: { id: string; fichaId: string }
}) {
  const ficha = await prisma.fichaConciliacao.findFirst({
    where: { id: params.fichaId, bookId: params.id },
    include: {
      itens: { orderBy: { criadoEm: 'asc' } },
      pdfsSupporte: true,
    },
  })
  if (!ficha) notFound()

  const extracaoSuspeita = ficha.pdfsSupporte.some((p) => !p.parseConfiavel)

  const itens: ItemView[] = ficha.itens.map((i) => ({
    id: i.id,
    tipo: i.tipo as ItemView['tipo'],
    documento: i.documento,
    nome: i.nome,
    historico: i.observacao,
    dataVencimento: i.dataVencimento ? i.dataVencimento.toISOString() : null,
    diasAtraso: i.diasAtraso,
    valorAberto: i.valorAberto ? i.valorAberto.toNumber() : null,
    debito: i.debito ? i.debito.toNumber() : null,
    credito: i.credito ? i.credito.toNumber() : null,
    saldo: i.saldo ? i.saldo.toNumber() : null,
  }))

  const analise = (ficha.analiseLlm as AnaliseLlm | null) ?? null

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/book/${params.id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Voltar ao book
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-500">{ficha.codigoConta}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{ficha.nomeConta}</h1>
          </div>
          <StatusBadge status={ficha.statusConciliacao as StatusFicha} />
        </div>
      </div>

      {extracaoSuspeita && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="font-semibold">Conferir extração</strong> — o self-check de integridade
          de algum PDF não fechou. Os saldos podem estar incorretos.
        </div>
      )}

      <PainelAmarracao
        amarracao={{
          saldoRazao: ficha.saldoRazao.toNumber(),
          saldoBalancete: ficha.saldoBalancete.toNumber(),
          saldoRelatorio: ficha.saldoRelatorio.toNumber(),
          tieRazaoBalancete: ficha.tieRazaoBalancete,
          tieRazaoRelatorio: ficha.tieRazaoRelatorio,
        }}
      />

      <NotaLlm analise={analise} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Itens {itens.some((i) => i.tipo === 'ITEM_TRANSITO') ? 'em trânsito' : 'em aberto'}
        </h2>
        <TabelaItensRelatorio itens={itens} />
      </section>

      <ObservacaoFicha bookId={params.id} fichaId={ficha.id} inicial={ficha.observacao ?? ''} />
    </div>
  )
}
