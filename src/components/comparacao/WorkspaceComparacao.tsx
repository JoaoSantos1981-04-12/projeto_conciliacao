'use client'

import { useState } from 'react'
import { formatBRL, formatData, formatPercent, NATUREZA_LABEL } from '@/lib/format'
import { AprovacaoParComparacao } from './AprovacaoParComparacao'

type StatusPar = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'IGNORADO'

export interface LancamentoView {
  id: string
  dataLancamento: string
  documento: string
  natureza: string
  valor: number
  dupCr: string | null
  doctoBaixa: string | null
  nomeParceiro: string | null
}

export interface ParView {
  id: string
  status: StatusPar
  score: number
  diferencaValor: number
  diferencaDias: number
  lancamentoA: LancamentoView | null
  lancamentoB: LancamentoView | null
}

export interface WorkspaceComparacaoProps {
  pares: ParView[]
  semParA: LancamentoView[]
  semParB: LancamentoView[]
}

type Aba = 'pares' | 'semParB' | 'semParA'

function natLabel(n: string): string {
  return NATUREZA_LABEL[n as keyof typeof NATUREZA_LABEL] ?? n
}

function LinhaLancamento({ l }: { l: LancamentoView }) {
  return (
    <div className="text-xs space-y-1 py-1">
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-slate-900 dark:text-slate-100">{l.documento || '—'}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({formatData(l.dataLancamento)})</span>
      </div>
      <div className="font-semibold text-slate-800 dark:text-slate-200">
        {formatBRL(l.valor)}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{natLabel(l.natureza)}</span>
        {l.dupCr && <span className="bg-emeraldBlue-50 dark:bg-emeraldBlue-950/20 text-emeraldBlue-600 dark:text-emeraldBlue-400 px-1 rounded">DUP: {l.dupCr}</span>}
        {l.doctoBaixa && <span>baixa: {l.doctoBaixa}</span>}
        {l.nomeParceiro && <span className="truncate max-w-[12rem]" title={l.nomeParceiro}>· {l.nomeParceiro}</span>}
      </div>
    </div>
  )
}

function TabelaSemPar({ itens, vazio }: { itens: LancamentoView[]; vazio: string }) {
  if (itens.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center text-slate-450 dark:border-slate-800 dark:bg-slate-900 transition-colors">
        {vazio}
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-colors">
      <table className="w-full text-xs">
        <thead className="bg-slate-50/70 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Data</th>
            <th className="px-4 py-3 font-semibold">Documento</th>
            <th className="px-4 py-3 font-semibold">Natureza</th>
            <th className="px-4 py-3 font-semibold">Parceiro</th>
            <th className="px-4 py-3 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {itens.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-slate-400">{formatData(l.dataLancamento)}</td>
              <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{l.documento || '—'}</td>
              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{natLabel(l.natureza)}</td>
              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-medium">{l.nomeParceiro ?? '—'}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-900 dark:text-white">{formatBRL(l.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WorkspaceComparacao({ pares, semParA, semParB }: WorkspaceComparacaoProps) {
  const [aba, setAba] = useState<Aba>('pares')

  const abas: { id: Aba; label: string; count: number }[] = [
    { id: 'pares', label: 'Pares encontrados', count: pares.length },
    { id: 'semParB', label: 'Sem par em B', count: semParB.length },
    { id: 'semParA', label: 'Sem par em A', count: semParA.length },
  ]

  return (
    <div className="space-y-4">
      {/* Abas */}
      <div className="flex gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-px">
        {abas.map((a) => {
          const isSelected = aba === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-t-lg
                ${isSelected
                  ? 'border-emeraldBlue-500 text-emeraldBlue-600 dark:text-emeraldBlue-400 dark:border-emeraldBlue-400 bg-emeraldBlue-50/10'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
                }
              `}
            >
              {a.label}
              <span className={`inline-flex items-center justify-center ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-colors
                ${isSelected 
                  ? 'bg-emeraldBlue-100 text-emeraldBlue-700 dark:bg-emeraldBlue-900/40 dark:text-emeraldBlue-300' 
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }
              `}>
                {a.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Conteúdo das Abas */}
      {aba === 'pares' &&
        (pares.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center text-slate-450 dark:border-slate-800 dark:bg-slate-900 transition-colors">
            Nenhum par encontrado entre as duas contas no período.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-colors">
            <table className="w-full text-xs">
              <thead className="bg-slate-50/70 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold w-[42%]">Conta A</th>
                  <th className="px-4 py-3 font-semibold w-[42%]">Conta B</th>
                  <th className="px-4 py-3 text-right font-semibold w-[8%]">Score</th>
                  <th className="px-4 py-3 text-right font-semibold">Δ Valor</th>
                  <th className="px-4 py-3 text-right font-semibold">Δ Dias</th>
                  <th className="px-4 py-3 text-right font-semibold w-[220px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {pares.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2">{p.lancamentoA ? <LinhaLancamento l={p.lancamentoA} /> : '—'}</td>
                    <td className="px-4 py-2">{p.lancamentoB ? <LinhaLancamento l={p.lancamentoB} /> : '—'}</td>
                    <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-350 tabular-nums">
                      {formatPercent(p.score)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-semibold tabular-nums ${p.diferencaValor > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                      {formatBRL(p.diferencaValor)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400 tabular-nums">{p.diferencaDias}</td>
                    <td className="px-4 py-2 text-right">
                      <AprovacaoParComparacao parId={p.id} status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {aba === 'semParB' && (
        <TabelaSemPar itens={semParB} vazio="Todos os lançamentos da conta A têm contrapartida em B." />
      )}
      {aba === 'semParA' && (
        <TabelaSemPar itens={semParA} vazio="Todos os lançamentos da conta B têm contrapartida em A." />
      )}
    </div>
  )
}
