'use client'

import { useState } from 'react'
import { AnaliseLlm } from '@/lib/types/book'

const RISCO_CLS: Record<string, string> = {
  ALTO: 'border-red-200 bg-red-50 text-red-800',
  MEDIO: 'border-amber-200 bg-amber-50 text-amber-800',
  BAIXO: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  NENHUM: 'border-slate-200 bg-slate-100 text-slate-600',
}

function Tag({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${RISCO_CLS[valor] ?? RISCO_CLS.NENHUM}`}>
      <span className="text-slate-500">{rotulo}:</span> {valor}
    </span>
  )
}

/** Nota da análise LLM, colapsável (§12.5). Estado vazio quando não analisada. */
export function NotaLlm({ analise }: { analise: AnaliseLlm | null }) {
  const [aberto, setAberto] = useState(true)

  if (!analise) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
        <p className="text-sm text-slate-500">
          Sem análise de IA. Use <span className="font-medium">Analisar divergências</span> para
          gerar a nota técnica (apenas tolerância/divergente).
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={aberto}
      >
        <span className="text-sm font-semibold text-slate-900">Análise de IA (contador)</span>
        <span className="text-slate-400" aria-hidden="true">{aberto ? '▲' : '▼'}</span>
      </button>

      {aberto && (
        <div className="space-y-4 border-t border-slate-100 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <Tag rotulo="Risco contábil" valor={analise.riscoContabil} />
            <Tag rotulo="Risco fiscal" valor={analise.riscoFiscal} />
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <span className="text-slate-500">Materialidade:</span> {analise.materialidade}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <span className="text-slate-500">Responsável:</span> {analise.responsavel}
            </span>
          </div>

          <Campo titulo="Natureza da divergência" texto={analise.naturezaDivergencia} />
          <Campo titulo="Ação corretiva" texto={analise.acaoCorretiva} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nota para revisão</p>
            <p className="mt-1 rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
              {analise.notaParaRevisao}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function Campo({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{texto || '—'}</p>
    </div>
  )
}
