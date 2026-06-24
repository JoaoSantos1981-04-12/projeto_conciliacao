import { prisma } from '@/lib/db/prisma'
import { carregarDadosRelatorio, listarImportacoesParaFiltro } from '@/lib/relatorios/consulta'
import { montarRelatorio } from '@/lib/relatorios/relatorio'
import { SeletorImportacao } from '@/components/relatorios/SeletorImportacao'
import { formatBRL, formatData, NATUREZA_LABEL } from '@/lib/format'
import { NaturezaLancamento } from '@/lib/types/razao'

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Relatórios</h1>
          <p className="mt-1 text-sm text-slate-600">
            {conteudo ? conteudo.rel.meta.empresa : 'Posição de conciliação e títulos em aberto'}
            {conteudo?.rel.meta.periodo && (
              <> · {formatData(conteudo.rel.meta.periodo.inicio)} a {formatData(conteudo.rel.meta.periodo.fim)}</>
            )}
          </p>
        </div>
        {conteudo && (
          <div className="flex items-center gap-2">
            <SeletorImportacao opcoes={conteudo.opcoes} atual={conteudo.rel.meta.importacaoId} />
            <a href={csvHref} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
              Exportar CSV
            </a>
          </div>
        )}
      </div>

      {erroDb ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível consultar o banco. Verifique o PostgreSQL e as migrations.
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
              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="mb-1 text-lg font-semibold text-slate-800">Títulos a receber em aberto</h2>
                <p className="mb-3 text-sm text-slate-500">
                  Total em aberto: <span className="font-semibold text-slate-800">{formatBRL(conteudo.rel.valores.abertoDebito)}</span>
                </p>
                <div className="space-y-2">
                  {conteudo.rel.aging.map((f) => (
                    <div key={f.faixa} className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 text-slate-600">{f.faixa}</span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                        <div className="h-full rounded bg-brand" style={{ width: `${(f.valor / maxAging) * 100}%` }} />
                      </div>
                      <span className="w-32 shrink-0 text-right tabular-nums text-slate-700">{formatBRL(f.valor)}</span>
                      <span className="w-10 shrink-0 text-right text-xs text-slate-400">{f.quantidade}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Top parceiros */}
              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-lg font-semibold text-slate-800">Maiores parceiros em aberto</h2>
                {conteudo.rel.topParceirosAberto.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum título em aberto.</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {conteudo.rel.topParceirosAberto.map((p) => (
                        <tr key={p.parceiro}>
                          <td className="max-w-[16rem] truncate py-1.5 pr-2 text-slate-700" title={p.parceiro}>{p.parceiro}</td>
                          <td className="py-1.5 pr-2 text-right text-xs text-slate-400">{p.quantidade}</td>
                          <td className="py-1.5 text-right tabular-nums text-slate-800">{formatBRL(p.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>

            {/* Por natureza */}
            <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Natureza</th>
                    <th className="px-3 py-2 text-right font-medium">Qtde</th>
                    <th className="px-3 py-2 text-right font-medium">Débito</th>
                    <th className="px-3 py-2 text-right font-medium">Crédito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conteudo.rel.porNatureza.map((n) => (
                    <tr key={n.natureza} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{NATUREZA_LABEL[n.natureza as NaturezaLancamento] ?? n.natureza}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{n.quantidade}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{n.debito ? formatBRL(n.debito) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{n.credito ? formatBRL(n.credito) : '—'}</td>
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
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold ${cor ?? 'text-slate-900'}`}>{valor}</div>
    </div>
  )
}
