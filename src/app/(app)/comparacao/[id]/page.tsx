import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { carregarSessaoComparacao } from '@/lib/comparacao/consulta'
import { ResumoComparacao } from '@/components/comparacao/ResumoComparacao'
import {
  WorkspaceComparacao,
  type LancamentoView,
  type ParView,
} from '@/components/comparacao/WorkspaceComparacao'
import { CENARIO_LABEL, formatData } from '@/lib/format'

export const metadata = { title: 'Comparação · Conciliação Contábil' }
export const dynamic = 'force-dynamic'

type LancamentoRow = {
  id: string
  dataLancamento: Date
  documento: string
  natureza: string
  debito: unknown
  credito: unknown
  dupCr: string | null
  doctoBaixa: string | null
  nomeParceiro: string | null
}

function valorEfetivo(debito: unknown, credito: unknown): number {
  const d = Number(debito)
  const c = Number(credito)
  return d > 0 ? d : c
}

function toView(l: LancamentoRow): LancamentoView {
  return {
    id: l.id,
    dataLancamento: l.dataLancamento.toISOString(),
    documento: l.documento,
    natureza: l.natureza,
    valor: valorEfetivo(l.debito, l.credito),
    dupCr: l.dupCr,
    doctoBaixa: l.doctoBaixa,
    nomeParceiro: l.nomeParceiro,
  }
}

export default async function SessaoComparacaoPage({ params }: { params: { id: string } }) {
  const resultado = await carregarSessaoComparacao(prisma, params.id)
  if (!resultado) notFound()

  const { sessao, semParA, semParB } = resultado

  const pares: ParView[] = sessao.pares.map((p) => ({
    id: p.id,
    status: p.status,
    score: p.scoreConfianca,
    diferencaValor: Number(p.diferencaValor),
    diferencaDias: p.diferencaDias,
    lancamentoA: p.lancamentoA ? toView(p.lancamentoA) : null,
    lancamentoB: p.lancamentoB ? toView(p.lancamentoB) : null,
  }))

  const semParAView = semParA.map(toView)
  const semParBView = semParB.map(toView)

  const mediaConfianca =
    pares.length > 0 ? pares.reduce((s, p) => s + p.score, 0) / pares.length : 0
  const valorSemParA = semParAView.reduce((s, l) => s + l.valor, 0)
  const valorSemParB = semParBView.reduce((s, l) => s + l.valor, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/comparacao" className="text-sm text-brand hover:underline">
          ← Voltar para comparações
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{sessao.nomeDescritivo}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {CENARIO_LABEL[sessao.cenario] ?? sessao.cenario} · {sessao.contaOrigem.codigo} (
          {sessao.contaOrigem.nome}) → {sessao.contaDestino.codigo} ({sessao.contaDestino.nome}) ·{' '}
          {formatData(sessao.periodoInicio)} a {formatData(sessao.periodoFim)}
        </p>
      </div>

      <ResumoComparacao
        totalA={sessao.totalParesA}
        totalB={sessao.totalParesB}
        paresEncontrados={sessao.paresEncontrados}
        taxaMatchA={sessao.totalParesA > 0 ? sessao.paresEncontrados / sessao.totalParesA : 0}
        taxaMatchB={sessao.totalParesB > 0 ? sessao.paresEncontrados / sessao.totalParesB : 0}
        valorSemParA={valorSemParA}
        valorSemParB={valorSemParB}
        mediaConfianca={mediaConfianca}
      />

      <WorkspaceComparacao pares={pares} semParA={semParAView} semParB={semParBView} />
    </div>
  )
}
