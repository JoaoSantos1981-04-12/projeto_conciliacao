'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Status = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'IGNORADO'

const BADGE: Record<Status, string> = {
  PENDENTE: 'bg-amber-100 text-amber-700',
  APROVADO: 'bg-emerald-100 text-emerald-700',
  REJEITADO: 'bg-red-100 text-red-700',
  IGNORADO: 'bg-slate-100 text-slate-600',
}

const LABEL: Record<Status, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  IGNORADO: 'Ignorado',
}

export function AprovacaoParComparacao({ parId, status }: { parId: string; status: Status }) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)

  async function atualizar(novo: Status) {
    if (novo === status || salvando) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/pares-comparacao/${parId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novo }),
      })
      if (res.ok) router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[status]}`}>
        {LABEL[status]}
      </span>
      <button
        type="button"
        onClick={() => atualizar('APROVADO')}
        disabled={salvando || status === 'APROVADO'}
        className="rounded border border-emerald-300 px-2 py-0.5 text-[11px] text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
      >
        Aprovar
      </button>
      <button
        type="button"
        onClick={() => atualizar('REJEITADO')}
        disabled={salvando || status === 'REJEITADO'}
        className="rounded border border-red-300 px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-40"
      >
        Rejeitar
      </button>
      <button
        type="button"
        onClick={() => atualizar('IGNORADO')}
        disabled={salvando || status === 'IGNORADO'}
        className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      >
        Ignorar
      </button>
    </div>
  )
}
