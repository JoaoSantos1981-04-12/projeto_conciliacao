import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import {
  parseFiltros,
  listarLancamentos,
  carregarOpcoesFiltro,
} from '@/lib/importacao/consulta'
import { FiltrosLancamentos } from '@/components/lancamentos/FiltrosLancamentos'
import { formatBRL, formatData, NATUREZA_LABEL, STATUS_LABEL } from '@/lib/format'
import { NaturezaLancamento } from '@/lib/types/razao'
import { FileUp, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

export const metadata = { title: 'Lançamentos · Conciliação Contábil' }
export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const filtros = parseFiltros(searchParams)

  let dados:
    | {
        items: Awaited<ReturnType<typeof listarLancamentos>>['items']
        total: number
        opcoes: Awaited<ReturnType<typeof carregarOpcoesFiltro>>
      }
    | null = null
  let erroDb = false

  try {
    const [res, opcoes] = await Promise.all([
      listarLancamentos(prisma, filtros),
      carregarOpcoesFiltro(prisma),
    ])
    dados = { items: res.items, total: res.total, opcoes }
  } catch {
    erroDb = true
  }

  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / filtros.pageSize)) : 1

  function linkPagina(p: number) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string') q.set(k, v)
      else if (Array.isArray(v) && v[0]) q.set(k, v[0])
    }
    q.set('page', String(p))
    return `/lancamentos?${q.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Lançamentos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {dados ? `${dados.total} lançamento(s)` : 'Lançamentos importados'} · página {filtros.page} de {totalPaginas}
          </p>
        </div>
        <Link 
          href="/importacao" 
          className="inline-flex items-center gap-2 rounded-lg bg-emeraldBlue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px dark:bg-emeraldBlue-600 dark:hover:bg-emeraldBlue-500"
        >
          <FileUp className="h-4 w-4" />
          Nova Importação
        </Link>
      </div>

      {erroDb ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            Não foi possível consultar o banco de dados. Verifique se o PostgreSQL está ativo e se as
            migrations foram aplicadas (<code>npx prisma migrate dev</code>).
          </div>
        </div>
      ) : (
        <>
          <FiltrosLancamentos importacoes={dados!.opcoes.importacoes} contas={dados!.opcoes.contas} />

          <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-colors">
            <table className="w-full table-fixed divide-y divide-slate-200/50 dark:divide-slate-800 text-xs">
              <colgroup>
                <col className="w-[5.5rem]" />
                <col className="w-[5.5rem]" />
                <col className="w-[8rem]" />
                <col className="w-[14rem]" />
                <col className="w-[6rem]" />
                <col className="w-[7rem]" />
                <col className="w-[7rem]" />
                <col className="w-[7.5rem]" />
                <col className="w-[6.5rem]" />
              </colgroup>
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
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {dados!.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-slate-400 dark:text-slate-500">
                      Nenhum lançamento encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  dados!.items.map((l) => {
                    // Determina cor do badge com base no status de conciliação
                    let badgeCls = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    if (l.statusConciliacao === 'CONCILIADO') {
                      badgeCls = 'bg-emerald-50 text-emerald-700 border border-emerald-200/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                    } else if (l.statusConciliacao === 'PENDENTE') {
                      badgeCls = 'bg-amber-50 text-amber-700 border border-amber-200/40 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                    } else if (l.statusConciliacao === 'DIVERGENCIA') {
                      badgeCls = 'bg-red-50 text-red-700 border border-red-200/40 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
                    } else if (l.statusConciliacao === 'IGNORADO') {
                      badgeCls = 'bg-slate-100 text-slate-500 border border-slate-200/30 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800/30'
                    }

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">{formatData(l.dataLancamento)}</td>
                        <td className="truncate px-3 py-2 font-medium text-slate-900 dark:text-slate-100" title={l.documento}>
                          {l.documento}
                        </td>
                        <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-400">
                          {NATUREZA_LABEL[l.natureza as NaturezaLancamento]}
                        </td>
                        <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-400 font-medium" title={l.nomeParceiro ?? ''}>
                          {l.nomeParceiro ?? '—'}
                        </td>
                        <td className="truncate px-3 py-2 text-slate-500 dark:text-slate-500">
                          {l.dupCr ? `${l.dupCr}/${l.parcela ?? '-'}` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-800 dark:text-slate-200">
                          {Number(l.debito) ? formatBRL(String(l.debito)) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-800 dark:text-slate-200">
                          {Number(l.credito) ? formatBRL(String(l.credito)) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">
                          {formatBRL(String(l.saldo))}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badgeCls}`}>
                            {STATUS_LABEL[l.statusConciliacao] ?? l.statusConciliacao}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              Mostrando até {filtros.pageSize} por página
            </span>
            <div className="flex gap-2">
              {filtros.page > 1 ? (
                <Link 
                  href={linkPagina(filtros.page - 1)} 
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-300 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
              )}
              {filtros.page < totalPaginas ? (
                <Link 
                  href={linkPagina(filtros.page + 1)} 
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-300 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
