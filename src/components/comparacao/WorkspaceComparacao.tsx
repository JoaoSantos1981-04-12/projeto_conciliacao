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
    <div className="text-xs text-slate-600">
      <span className="font-medium text-slate-800">{l.documento || '—'}</span>
      {' · '}
      {formatData(l.dataLancamento)} · {formatBRL(l.valor)}
      <div className="text-[11px] text-slate-400">
        {natLabel(l.natureza)}
        {l.dupCr ? ` · DUP ${l.dupCr}` : ''}
        {l.doctoBaixa ? ` · baixa ${l.doctoBaixa}` : ''}
        {l.nomeParceiro ? ` · ${l.nomeParceiro}` : ''}
      </div>
    </div>
  )
}

function TabelaSemPar({ itens, vazio }: { itens: LancamentoView[]; vazio: string }) {
  if (itens.length === 0) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">{vazio}</div>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Data</th>
            <th className="px-3 py-2 font-medium">Documento</th>
            <th className="px-3 py-2 font-medium">Natureza</th>
            <th className="px-3 py-2 font-medium">Parceiro</th>
            <th className="px-3 py-2 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {itens.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatData(l.dataLancamento)}</td>
              <td className="px-3 py-2 text-slate-800">{l.documento || '—'}</td>
              <td className="px-3 py-2 text-slate-600">{natLabel(l.natureza)}</td>
              <td className="px-3 py-2 text-slate-600">{l.nomeParceiro ?? '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatBRL(l.valor)}</td>
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
      <div className="flex gap-1 border-b border-slate-200">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              aba === a.id
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {a.label} <span className="text-xs text-slate-400">({a.count})</span>
          </button>
        ))}
      </div>

      {aba === 'pares' &&
        (pares.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            Nenhum par encontrado entre as duas contas no período.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Conta A</th>
                  <th className="px-3 py-2 font-medium">Conta B</th>
                  <th className="px-3 py-2 text-right font-medium">Score</th>
                  <th className="px-3 py-2 text-right font-medium">Δ Valor</th>
                  <th className="px-3 py-2 text-right font-medium">Δ Dias</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pares.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{p.lancamentoA ? <LinhaLancamento l={p.lancamentoA} /> : '—'}</td>
                    <td className="px-3 py-2">{p.lancamentoB ? <LinhaLancamento l={p.lancamentoB} /> : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatPercent(p.score)}</td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${p.diferencaValor > 0 ? 'text-amber-700' : 'text-slate-600'}`}
                    >
                      {formatBRL(p.diferencaValor)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{p.diferencaDias}</td>
                    <td className="px-3 py-2">
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
