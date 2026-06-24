import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { listarImportacoesComStatus } from '@/lib/conciliacao/consulta'
import { BotaoConciliar } from '@/components/conciliacao/BotaoConciliar'
import { formatData } from '@/lib/format'

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
        <h1 className="text-2xl font-semibold text-slate-900">Conciliação</h1>
        <p className="mt-1 text-sm text-slate-600">
          Execute a conciliação automática de cada importação e abra o workspace para revisar
          pares, divergências e pendentes.
        </p>
      </div>

      {erroDb ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível consultar o banco. Verifique o PostgreSQL e as migrations.
        </div>
      ) : importacoes.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          Nenhuma importação ainda. <Link href="/importacao" className="text-brand underline">Importe um razão</Link> para começar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Empresa / arquivo</th>
                <th className="px-3 py-2 font-medium">Importado em</th>
                <th className="px-3 py-2 text-right font-medium">Lançtos</th>
                <th className="px-3 py-2 text-right font-medium">Conciliados</th>
                <th className="px-3 py-2 text-right font-medium">Pendentes</th>
                <th className="px-3 py-2 text-right font-medium">Diverg.</th>
                <th className="px-3 py-2 font-medium">Última sessão</th>
                <th className="px-3 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {importacoes.map((imp) => (
                <tr key={imp.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{imp.empresa || imp.nomeArquivo}</div>
                    <div className="text-xs text-slate-400">{imp.nomeArquivo}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatData(imp.criadoEm)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{imp._count.lancamentos}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{imp.conciliados}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-700">{imp.pendentes}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">{imp.divergentes}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                    {imp.sessao ? `${imp.sessao.status} · ${imp.sessao.totalPares} pares` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      {imp.sessao && (
                        <Link
                          href={`/conciliacao/${imp.sessao.id}`}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          Abrir
                        </Link>
                      )}
                      <BotaoConciliar importacaoId={imp.id} label={imp.sessao ? 'Reconciliar' : 'Conciliar'} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
