import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { listarSessoesComparacao } from '@/lib/comparacao/consulta'
import { CENARIO_LABEL, formatBRL, formatData } from '@/lib/format'

export const metadata = { title: 'Comparação · Conciliação Contábil' }
export const dynamic = 'force-dynamic'

export default async function ComparacaoPage() {
  let sessoes: Awaited<ReturnType<typeof listarSessoesComparacao>> = []
  let erroDb = false
  try {
    sessoes = await listarSessoesComparacao(prisma)
  } catch {
    erroDb = true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Comparação entre Contas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Concilie lançamentos de duas contas distintas — Fornecedores × Banco, Clientes × Banco ou
            Intercompany — e revise pares, divergências e lançamentos sem contrapartida.
          </p>
        </div>
        <Link
          href="/comparacao/nova"
          className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Nova comparação
        </Link>
      </div>

      {erroDb ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível consultar o banco. Verifique o PostgreSQL e as migrations.
        </div>
      ) : sessoes.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          Nenhuma comparação ainda.{' '}
          <Link href="/comparacao/nova" className="text-brand underline">
            Inicie uma comparação
          </Link>{' '}
          para começar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 font-medium">Cenário</th>
                <th className="px-3 py-2 font-medium">Contas</th>
                <th className="px-3 py-2 text-right font-medium">Pares</th>
                <th className="px-3 py-2 text-right font-medium">Sem par A/B</th>
                <th className="px-3 py-2 text-right font-medium">Valor diverg.</th>
                <th className="px-3 py-2 font-medium">Criada em</th>
                <th className="px-3 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessoes.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{s.nomeDescritivo}</td>
                  <td className="px-3 py-2 text-slate-600">{CENARIO_LABEL[s.cenario] ?? s.cenario}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {s.contaOrigem.codigo} → {s.contaDestino.codigo}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{s.paresEncontrados}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                    {s.semParA}/{s.semParB}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">{formatBRL(Number(s.valorDivergente))}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatData(s.criadoEm)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/comparacao/${s.id}`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Abrir
                    </Link>
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
