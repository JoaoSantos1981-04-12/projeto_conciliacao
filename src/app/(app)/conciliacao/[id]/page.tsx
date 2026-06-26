import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { carregarSessao } from '@/lib/conciliacao/consulta'
import { AprovacaoPar } from '@/components/conciliacao/AprovacaoPar'
import { BotaoConciliar } from '@/components/conciliacao/BotaoConciliar'
import { formatBRL, formatData, NATUREZA_LABEL } from '@/lib/format'
import { NaturezaLancamento } from '@/lib/types/razao'
import { ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle, FileText, ChevronRight } from 'lucide-react'

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
        <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">{formatData(l.dataLancamento)}</td>
          <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{l.documento}</td>
          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">
            {NATUREZA_LABEL[l.natureza as NaturezaLancamento]}
          </td>
          <td className="max-w-[18rem] truncate px-3 py-2 text-slate-600 dark:text-slate-450 font-medium" title={l.nomeParceiro ?? ''}>
            {l.nomeParceiro ?? '—'}
          </td>
          <td className="whitespace-nowrap px-3 py-2 text-slate-500 dark:text-slate-500">
            {l.dupCr ? `${l.dupCr}/${l.parcela ?? '-'}` : '—'}
          </td>
          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-800 dark:text-slate-200">
            {Number(l.debito) ? formatBRL(String(l.debito)) : '—'}
          </td>
          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-800 dark:text-slate-200">
            {Number(l.credito) ? formatBRL(String(l.credito)) : '—'}
          </td>
          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-500 font-medium">
            {formatBRL(String(l.saldo))}
          </td>
        </tr>
      ))}
    </>
  )
}

const CABECALHO = (
  <thead className="bg-slate-50/70 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
    <tr>
      <th className="px-3 py-2.5 font-semibold">Data</th>
      <th className="px-3 py-2.5 font-semibold">Documento</th>
      <th className="px-3 py-2.5 font-semibold">Natureza</th>
      <th className="px-3 py-2.5 font-semibold">Parceiro</th>
      <th className="px-3 py-2.5 font-semibold">Dup./Parc.</th>
      <th className="px-3 py-2.5 text-right font-semibold">Débito</th>
      <th className="px-3 py-2.5 text-right font-semibold">Crédito</th>
      <th className="px-3 py-2.5 text-right font-semibold">Saldo</th>
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
    { label: 'Pares Conciliados', valor: sessao.totalPares, bgIcon: 'bg-emeraldBlue-50 dark:bg-emeraldBlue-950/40 text-emeraldBlue-600 dark:text-emeraldBlue-400', Icon: CheckCircle2 },
    { label: 'Automáticos', valor: sessao.paresAutomatic, bgIcon: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450', Icon: CheckCircle2 },
    { label: 'Para Revisão', valor: sessao.paresManuais, bgIcon: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400', Icon: HelpCircle },
    { label: 'Divergências', valor: divergentes.length, cor: 'text-red-600 dark:text-red-400', bgIcon: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-450', Icon: AlertTriangle },
    { label: 'Pendentes', valor: pendentes.length, cor: 'text-amber-600 dark:text-amber-400', bgIcon: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400', Icon: HelpCircle },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/conciliacao" className="inline-flex items-center gap-1 text-xs font-semibold text-emeraldBlue-600 hover:text-emeraldBlue-700 dark:text-emeraldBlue-400 dark:hover:text-emeraldBlue-300 uppercase tracking-wider mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            Conciliação
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{sessao.importacao.empresa}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sessão de {formatData(sessao.criadoEm)} · status{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{sessao.status}</span>
          </p>
        </div>
        <div className="shrink-0">
          <BotaoConciliar importacaoId={sessao.importacao.id} label="Reconciliar" />
        </div>
      </div>

      {/* Cartões de Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {cards.map((c) => {
          const IconComp = c.Icon
          return (
            <div key={c.label} className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{c.label}</span>
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${c.bgIcon}`}>
                  <IconComp className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className={`text-2xl font-bold tracking-tight ${c.cor ?? 'text-slate-900 dark:text-white'}`}>{c.valor}</div>
            </div>
          )
        })}
      </div>

      {/* Pares conciliados */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">
          Pares Conciliados ({sessao.pares.length})
        </h2>
        {sessao.pares.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Nenhum par conciliado. Rode a conciliação automática.
          </div>
        ) : (
          <div className="space-y-4">
            {sessao.pares.map((par) => {
              const ref = par.lancamentos[0]
              const score = Math.round(par.scoreConfianca * 100)
              
              // Define a cor de fundo do cabeçalho com base no tipo de match
              let typeCls = 'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400'
              if (par.tipoMatch === 'AUTOMATICO_EXATO') {
                typeCls = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450'
              } else if (par.tipoMatch === 'AUTOMATICO_FUZZY') {
                typeCls = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
              }

              return (
                <div key={par.id} className="rounded-xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/50 dark:border-slate-800 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Duplicata {ref?.dupCr ?? '—'}/{ref?.parcela ?? '-'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${typeCls}`}>
                        {par.tipoMatch.replace('AUTOMATICO_', '')} · {score}%
                      </span>
                      {par.lancamentos.length > 2 && (
                        <span className="rounded-full bg-indigo-50 border border-indigo-200/30 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                          1:N · {par.lancamentos.length} lançamentos
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Débitos: <span className="font-semibold text-slate-700 dark:text-slate-350">{formatBRL(String(par.lancamentos.reduce((a, l) => a + Number(l.debito), 0)))}</span> ·
                        Créditos: <span className="font-semibold text-slate-700 dark:text-slate-350">{formatBRL(String(par.lancamentos.reduce((a, l) => a + Number(l.credito), 0)))}</span>
                        {Number(par.diferencaValor) !== 0 && (
                          <> · dif: <span className="font-semibold text-red-500">{formatBRL(String(par.diferencaValor))}</span></>
                        )}
                      </span>
                    </div>
                    <AprovacaoPar parId={par.id} status={par.statusAprovacao as Status} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      {CABECALHO}
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
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
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h2 className="font-display text-lg font-bold text-red-700 dark:text-red-400">
              Divergências Encontradas ({divergentes.length})
            </h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-red-200/60 bg-white dark:border-red-900/35 dark:bg-slate-900 shadow-sm transition-colors">
            <table className="w-full text-xs">
              {CABECALHO}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <LinhasLancamento lancs={divergentes as LancView[]} />
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Pendentes */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-amber-700 dark:text-amber-400">
          Pendentes ({pendentes.length})
        </h2>
        {pendentes.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Nenhum lançamento pendente de conciliação.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-colors">
            <table className="w-full text-xs">
              {CABECALHO}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <LinhasLancamento lancs={pendentes as LancView[]} />
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-300 bg-slate-50/70 font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 transition-colors">
                  <td colSpan={5} className="px-3 py-3 text-right uppercase tracking-wider text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    Saldo em Aberto (Σ Débito − Σ Crédito)
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800 dark:text-slate-200">{formatBRL(totDebitoPendente)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800 dark:text-slate-200">{formatBRL(totCreditoPendente)}</td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right tabular-nums font-bold ${saldoEmAberto >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-600 dark:text-red-400'}`}>
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
