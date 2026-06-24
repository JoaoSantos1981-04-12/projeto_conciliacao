import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { carregarSessao } from '@/lib/conciliacao/consulta'
import { AprovacaoPar } from '@/components/conciliacao/AprovacaoPar'
import { BotaoConciliar } from '@/components/conciliacao/BotaoConciliar'
import { formatBRL, formatData, NATUREZA_LABEL } from '@/lib/format'
import { NaturezaLancamento } from '@/lib/types/razao'

export const metadata = { title: 'Workspace · Conciliação' }
export const dynamic = 'force-dynamic'

type Status = 'APROVADO' | 'REJEITADO' | 'PENDENTE'

interface LancView {
  id: string
  dataLancamento: Date
  documento: string
  natureza: string
  debito: unknown
  credito: unknown
  saldo: unknown
  dupCr: string | null
  parcela: string | null
  nomeParceiro: string | null
}

function LinhasLancamento({ lancs }: { lancs: LancView[] }) {
  return (
    <>
      {lancs.map((l) => (
        <tr key={l.id} className="hover:bg-slate-50">
          <td className="whitespace-nowrap px-3 py-1.5">{formatData(l.dataLancamento)}</td>
          <td className="px-3 py-1.5 font-medium">{l.documento}</td>
          <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
            {NATUREZA_LABEL[l.natureza as NaturezaLancamento]}
          </td>
          <td className="max-w-[18rem] truncate px-3 py-1.5 text-slate-600" title={l.nomeParceiro ?? ''}>
            {l.nomeParceiro ?? '—'}
          </td>
          <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">
            {l.dupCr ? `${l.dupCr}/${l.parcela ?? '-'}` : '—'}
          </td>
          <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
            {Number(l.debito) ? formatBRL(String(l.debito)) : '—'}
          </td>
          <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
            {Number(l.credito) ? formatBRL(String(l.credito)) : '—'}
          </td>
          <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-500">
            {formatBRL(String(l.saldo))}
          </td>
        </tr>
      ))}
    </>
  )
}

const CABECALHO = (
  <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
    <tr>
      <th className="px-3 py-2 font-medium">Data</th>
      <th className="px-3 py-2 font-medium">Documento</th>
      <th className="px-3 py-2 font-medium">Natureza</th>
      <th className="px-3 py-2 font-medium">Parceiro</th>
      <th className="px-3 py-2 font-medium">Dup./Parc.</th>
      <th className="px-3 py-2 text-right font-medium">Débito</th>
      <th className="px-3 py-2 text-right font-medium">Crédito</th>
      <th className="px-3 py-2 text-right font-medium">Saldo</th>
    </tr>
  </thead>
)

export default async function WorkspacePage({ params }: { params: { id: string } }) {
  const dados = await carregarSessao(prisma, params.id)
  if (!dados) notFound()
  const { sessao, divergentes, pendentes } = dados

  const totDebitoPendente = pendentes.reduce((acc, l) => acc + Number(l.debito), 0)
  const totCreditoPendente = pendentes.reduce((acc, l) => acc + Number(l.credito), 0)
  const saldoEmAberto = totDebitoPendente - totCreditoPendente

  const cards = [
    { label: 'Pares', valor: sessao.totalPares },
    { label: 'Automáticos', valor: sessao.paresAutomatic },
    { label: 'Para revisão', valor: sessao.paresManuais },
    { label: 'Divergências', valor: divergentes.length, cor: 'text-red-700' },
    { label: 'Pendentes', valor: pendentes.length, cor: 'text-amber-700' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/conciliacao" className="text-sm text-brand hover:underline">
            ← Conciliação
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{sessao.importacao.empresa}</h1>
          <p className="text-sm text-slate-500">
            Sessão de {formatData(sessao.criadoEm)} · status {sessao.status}
          </p>
        </div>
        <BotaoConciliar importacaoId={sessao.importacao.id} label="Reconciliar" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className={`text-2xl font-semibold ${c.cor ?? 'text-slate-900'}`}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* Pares conciliados */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Pares conciliados ({sessao.pares.length})</h2>
        {sessao.pares.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum par. Rode a conciliação.</p>
        ) : (
          <div className="space-y-3">
            {sessao.pares.map((par) => {
              const ref = par.lancamentos[0]
              const score = Math.round(par.scoreConfianca * 100)
              return (
                <div key={par.id} className="rounded-lg border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-semibold text-slate-800">
                        Duplicata {ref?.dupCr ?? '—'}/{ref?.parcela ?? '-'}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {par.tipoMatch} · {score}%
                      </span>
                      {par.lancamentos.length > 2 && (
                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] text-indigo-700">
                          1:N · {par.lancamentos.length} lançtos
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        Σ déb {formatBRL(String(par.lancamentos.reduce((a, l) => a + Number(l.debito), 0)))} ·
                        Σ créd {formatBRL(String(par.lancamentos.reduce((a, l) => a + Number(l.credito), 0)))} ·
                        dif {formatBRL(String(par.diferencaValor))}
                      </span>
                    </div>
                    <AprovacaoPar parId={par.id} status={par.statusAprovacao as Status} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      {CABECALHO}
                      <tbody className="divide-y divide-slate-100">
                        <LinhasLancamento lancs={par.lancamentos as LancView[]} />
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Divergências */}
      {divergentes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-red-700">Divergências ({divergentes.length})</h2>
          <div className="overflow-x-auto rounded-lg border border-red-200 bg-white">
            <table className="w-full text-sm">
              {CABECALHO}
              <tbody className="divide-y divide-slate-100">
                <LinhasLancamento lancs={divergentes as LancView[]} />
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Pendentes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-amber-700">Pendentes ({pendentes.length})</h2>
        {pendentes.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum lançamento pendente.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              {CABECALHO}
              <tbody className="divide-y divide-slate-100">
                <LinhasLancamento lancs={pendentes as LancView[]} />
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-800">
                  <td colSpan={5} className="px-3 py-2 text-right">
                    Saldo em aberto (Σ débito − Σ crédito)
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatBRL(totDebitoPendente)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatBRL(totCreditoPendente)}</td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${saldoEmAberto >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatBRL(saldoEmAberto)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
