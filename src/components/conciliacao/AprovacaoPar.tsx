'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Status = 'APROVADO' | 'REJEITADO' | 'PENDENTE'

const BADGE: Record<Status, string> = {
  APROVADO: 'bg-emerald-50 text-emerald-700 border border-emerald-200/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
  REJEITADO: 'bg-red-50 text-red-700 border border-red-200/40 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
  PENDENTE: 'bg-amber-50 text-amber-700 border border-amber-200/40 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
}

export function AprovacaoPar({ parId, status }: { parId: string; status: Status }) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)

  async function atualizar(novo: Status) {
    if (novo === status || salvando) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/pares/${parId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusAprovacao: novo }),
      })
      if (res.ok) router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${BADGE[status]}`}>
        {status === 'APROVADO' ? 'Aprovado' : status === 'REJEITADO' ? 'Rejeitado' : 'Pendente'}
      </span>
      <button
        type="button"
        onClick={() => atualizar('APROVADO')}
        disabled={salvando || status === 'APROVADO'}
        className="rounded-lg border border-emerald-300 px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50/50 disabled:opacity-40 transition dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
      >
        Aprovar
      </button>
      <button
        type="button"
        onClick={() => atualizar('REJEITADO')}
        disabled={salvando || status === 'REJEITADO'}
        className="rounded-lg border border-red-300 px-2 py-0.5 text-[11px] font-bold text-red-700 hover:bg-red-50/50 disabled:opacity-40 transition dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        Rejeitar
      </button>
    </div>
  )
}
