import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { listarImportacoesComStatus } from '@/lib/conciliacao/consulta'
import { BotaoConciliar } from '@/components/conciliacao/BotaoConciliar'
import { formatData } from '@/lib/format'
import { FileSpreadsheet, Calendar, AlertTriangle, ChevronRight, Eye } from 'lucide-react'

export const metadata = { title: 'Conciliação · Conciliação Contábil' }
export const dynamic = 'force-dynamic'

export default async function ConciliacaoPage() {
  let importacoes: Awaited<ReturnType<typeof listarImportacoesComStatus>> = []
  let erroDb = false
  try {
    importacoes = await listarImportacoesComStatus(prisma)
  } catch {
    erroDb = true
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Conciliação</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Execute a conciliação automática de cada importação e abra o painel para revisar
          pares, divergências e lançamentos pendentes.
        </p>
      </div>

      {erroDb ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            Não foi possível consultar o banco de dados. Verifique o PostgreSQL e as migrations.
          </div>
        </div>
      ) : importacoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 transition-colors">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600 mb-4" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nenhum razão importado</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Importe seu primeiro arquivo de razão contábil em Excel para iniciar o processo de conciliação.
          </p>
          <Link 
            href="/importacao" 
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emeraldBlue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px"
          >
            Importar Razão
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-colors">
          <table className="w-full text-xs">
            <thead className="bg-slate-50/70 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Empresa / Arquivo</th>
                <th className="px-4 py-3.5 font-semibold">Importado em</th>
                <th className="px-4 py-3.5 text-right font-semibold">Lançamentos</th>
                <th className="px-4 py-3.5 text-right font-semibold">Progresso</th>
                <th className="px-4 py-3.5 text-right font-semibold">Conciliados</th>
                <th className="px-4 py-3.5 text-right font-semibold">Pendentes</th>
                <th className="px-4 py-3.5 text-right font-semibold">Divergentes</th>
                <th className="px-4 py-3.5 font-semibold">Última sessão</th>
                <th className="px-4 py-3.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {importacoes.map((imp) => {
                const total = imp._count.lancamentos || 1
                const conciliados = imp.conciliados || 0
                const pct = Math.round((conciliados / total) * 100)

                return (
                  <tr key={imp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emeraldBlue-50 text-emeraldBlue-600 dark:bg-emeraldBlue-950/40 dark:text-emeraldBlue-400">
                          <FileSpreadsheet className="h-4.5 w-4.5" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{imp.empresa || imp.nomeArquivo}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{imp.nomeArquivo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatData(imp.criadoEm)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-700 dark:text-slate-300">{imp._count.lancamentos}</td>
                    
                    {/* Barra de Progresso do Match */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div 
                            className="h-full rounded-full bg-emeraldBlue-500 dark:bg-emeraldBlue-400" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{pct}%</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{imp.conciliados}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">{imp.pendentes}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-red-600 dark:text-red-400">{imp.divergentes}</td>
                    
                    <td className="whitespace-nowrap px-4 py-3 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {imp.sessao ? (
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-bold tracking-wide
                          ${imp.sessao.status === 'CONCLUIDA' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                          }
                        `}>
                          {imp.sessao.status} · {imp.sessao.totalPares} p.
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {imp.sessao && (
                          <Link
                            href={`/conciliacao/${imp.sessao.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Abrir
                          </Link>
                        )}
                        <BotaoConciliar 
                          importacaoId={imp.id} 
                          label={imp.sessao ? 'Reconciliar' : 'Conciliar'} 
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
