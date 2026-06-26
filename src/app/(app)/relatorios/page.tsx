import { prisma } from '@/lib/db/prisma'
import { carregarDadosRelatorio, listarImportacoesParaFiltro } from '@/lib/relatorios/consulta'
import { montarRelatorio } from '@/lib/relatorios/relatorio'
import { SeletorImportacao } from '@/components/relatorios/SeletorImportacao'
import { formatBRL, formatData, NATUREZA_LABEL } from '@/lib/format'
import { NaturezaLancamento } from '@/lib/types/razao'
import { BarChart3, FileDown, AlertTriangle, Calendar, Users, DollarSign } from 'lucide-react'

export const metadata = { title: 'Relatórios · Conciliação Contábil' }
export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

export default async function RelatoriosPage({ searchParams }: { searchParams: SearchParams }) {
  const importacaoId = typeof searchParams.importacaoId === 'string' ? searchParams.importacaoId : undefined

  let conteudo: { rel: ReturnType<typeof montarRelatorio>; opcoes: Awaited<ReturnType<typeof listarImportacoesParaFiltro>> } | null = null
  let erroDb = false
  try {
    const [dados, opcoes] = await Promise.all([
      carregarDadosRelatorio(prisma, importacaoId),
      listarImportacoesParaFiltro(prisma),
    ])
    conteudo = { rel: montarRelatorio(dados.lancamentos, dados.meta, dados.referencia), opcoes }
  } catch {
    erroDb = true
  }

  const maxAging = conteudo ? Math.max(1, ...conteudo.rel.aging.map((f) => f.valor)) : 1
  const csvHref = `/api/relatorios?formato=csv${importacaoId ? `&importacaoId=${importacaoId}` : ''}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Relatórios</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {conteudo ? (
              <span className="font-semibold text-slate-700 dark:text-slate-350">{conteudo.rel.meta.empresa}</span>
            ) : (
              'Posição de conciliação e títulos em aberto'
            )}
            {conteudo?.rel.meta.periodo && (
              <> · {formatData(conteudo.rel.meta.periodo.inicio)} a {formatData(conteudo.rel.meta.periodo.fim)}</>
            )}
          </p>
        </div>
        {conteudo && (
          <div className="flex items-center gap-3">
            <SeletorImportacao opcoes={conteudo.opcoes} atual={conteudo.rel.meta.importacaoId} />
            <a 
              href={csvHref} 
              className="inline-flex items-center gap-1.5 rounded-lg bg-emeraldBlue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px"
            >
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </a>
          </div>
        )}
      </div>

      {erroDb ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            Não foi possível consultar o banco de dados. Verifique o PostgreSQL e as migrations.
          </div>
        </div>
      ) : (
        conteudo && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Kpi label="Lançamentos" valor={String(conteudo.rel.totais.lancamentos)} />
              <Kpi label="Conciliados" valor={`${conteudo.rel.totais.conciliados} (${conteudo.rel.totais.percentualConciliado}%)`} cor="text-emerald-700" />
              <Kpi label="Pendentes" valor={String(conteudo.rel.totais.pendentes)} cor="text-amber-700" />
              <Kpi label="Divergências" valor={String(conteudo.rel.totais.divergencias)} cor="text-red-700" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Aging */}
              <section className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-5 w-5 text-emeraldBlue-600 dark:text-emeraldBlue-400" />
                  <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">Títulos a receber em aberto</h2>
                </div>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  Total em aberto:{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{formatBRL(conteudo.rel.valores.abertoDebito)}</span>
                </p>
                <div className="space-y-3">
                  {conteudo.rel.aging.map((f) => {
                    const ratio = (f.valor / maxAging) * 100
                    return (
                      <div key={f.faixa} className="flex items-center gap-3 text-xs">
                        <span className="w-24 shrink-0 font-medium text-slate-600 dark:text-slate-400">{f.faixa}</span>
                        <div className="h-4.5 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                          <div 
                            className="h-full rounded bg-gradient-to-r from-emeraldBlue-500 to-emeraldBlue-600 dark:from-emeraldBlue-600 dark:to-emeraldBlue-400 transition-all duration-500" 
                            style={{ width: `${ratio}%` }} 
                          />
                        </div>
                        <span className="w-32 shrink-0 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-350">{formatBRL(f.valor)}</span>
                        <span className="w-10 shrink-0 text-right font-bold text-slate-400 dark:text-slate-500">{f.quantidade}</span>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Top parceiros */}
              <section className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-emeraldBlue-600 dark:text-emeraldBlue-400" />
                  <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">Maiores parceiros em aberto</h2>
                </div>
                {conteudo.rel.topParceirosAberto.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Nenhum título em aberto.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/70 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Parceiro</th>
                          <th className="px-3 py-2 text-right font-semibold">Títulos</th>
                          <th className="px-3 py-2 text-right font-semibold">Valor em Aberto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {conteudo.rel.topParceirosAberto.map((p) => (
                          <tr key={p.parceiro} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="max-w-[16rem] truncate px-3 py-2.5 font-medium text-slate-800 dark:text-slate-300" title={p.parceiro}>{p.parceiro}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-400 dark:text-slate-500">{p.quantidade}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900 dark:text-white">{formatBRL(p.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* Por natureza */}
            <section className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-colors">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/50 dark:border-slate-800">
                <DollarSign className="h-5 w-5 text-emeraldBlue-600 dark:text-emeraldBlue-400" />
                <h2 className="font-display text-base font-bold text-slate-800 dark:text-slate-200">Resumo por Natureza Contábil</h2>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50/70 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Natureza</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Qtde Lançamentos</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Débito</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Crédito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {conteudo.rel.porNatureza.map((n) => (
                    <tr key={n.natureza} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{NATUREZA_LABEL[n.natureza as NaturezaLancamento] ?? n.natureza}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{n.quantidade}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-800 dark:text-slate-200">{n.debito ? formatBRL(n.debito) : '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-800 dark:text-slate-200">{n.credito ? formatBRL(n.credito) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )
      )}
    </div>
  )
}

function Kpi({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  let textCor = 'text-slate-900 dark:text-white'
  if (cor === 'text-emerald-700') textCor = 'text-emerald-600 dark:text-emerald-400'
  else if (cor === 'text-amber-700') textCor = 'text-amber-600 dark:text-amber-400'
  else if (cor === 'text-red-700') textCor = 'text-red-600 dark:text-red-400'

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold tracking-tight ${textCor}`}>{valor}</div>
    </div>
  )
}
