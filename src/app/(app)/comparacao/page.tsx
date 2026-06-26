import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { listarSessoesComparacao } from '@/lib/comparacao/consulta'
import { CENARIO_LABEL, formatBRL, formatData } from '@/lib/format'
import { ArrowLeftRight, Calendar, AlertTriangle, Eye, Plus } from 'lucide-react'

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Comparação entre Contas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Concilie lançamentos de duas contas distintas — Fornecedores × Banco, Clientes × Banco ou
            Intercompany — e revise pares, divergências e lançamentos sem contrapartida.
          </p>
        </div>
        <Link
          href="/comparacao/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-emeraldBlue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px dark:bg-emeraldBlue-600 dark:hover:bg-emeraldBlue-500 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nova Comparação
        </Link>
      </div>

      {erroDb ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            Não foi possível consultar o banco de dados. Verifique o PostgreSQL e as migrations.
          </div>
        </div>
      ) : sessoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 transition-colors">
          <ArrowLeftRight className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600 mb-4" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nenhuma comparação iniciada</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Crie sua primeira comparação entre duas contas contábeis para encontrar correspondências automáticas.
          </p>
          <Link
            href="/comparacao/nova"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emeraldBlue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px"
          >
            Nova Comparação
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-colors">
          <table className="w-full text-xs">
            <thead className="bg-slate-50/70 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Descrição</th>
                <th className="px-4 py-3.5 font-semibold">Cenário</th>
                <th className="px-4 py-3.5 font-semibold">Contas</th>
                <th className="px-4 py-3.5 text-right font-semibold">Pares</th>
                <th className="px-4 py-3.5 text-right font-semibold">Sem par A/B</th>
                <th className="px-4 py-3.5 text-right font-semibold">Valor Diverg.</th>
                <th className="px-4 py-3.5 font-semibold">Criada em</th>
                <th className="px-4 py-3.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sessoes.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{s.nomeDescritivo}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{CENARIO_LABEL[s.cenario] ?? s.cenario}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-slate-500 dark:text-slate-500">
                    {s.contaOrigem.codigo} → {s.contaDestino.codigo}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-450">{s.paresEncontrados}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
                    {s.semParA} / {s.semParB}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-red-600 dark:text-red-400">
                    {Number(s.valorDivergente) ? formatBRL(Number(s.valorDivergente)) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatData(s.criadoEm)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/comparacao/${s.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
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
