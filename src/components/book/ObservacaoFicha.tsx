'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Observação do contador na ficha (PATCH /fichas/[fichaId]). */
export function ObservacaoFicha({
  bookId,
  fichaId,
  inicial,
}: {
  bookId: string
  fichaId: string
  inicial: string
}) {
  const router = useRouter()
  const [texto, setTexto] = useState(inicial)
  const [estado, setEstado] = useState<'idle' | 'salvando' | 'salvo' | 'erro'>('idle')

  async function salvar() {
    setEstado('salvando')
    try {
      const res = await fetch(`/api/book/${bookId}/fichas/${fichaId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ observacao: texto }),
      })
      setEstado(res.ok ? 'salvo' : 'erro')
      if (res.ok) router.refresh()
    } catch {
      setEstado('erro')
    }
  }

  return (
    <section className="space-y-2">
      <label htmlFor="observacao" className="text-sm font-semibold text-slate-900">
        Observação do contador
      </label>
      <textarea
        id="observacao"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setEstado('idle')
        }}
        rows={3}
        placeholder="Notas, justificativas e premissas desta ficha…"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={estado === 'salvando'}
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:translate-y-px disabled:opacity-50"
        >
          {estado === 'salvando' ? 'Salvando…' : 'Salvar observação'}
        </button>
        {estado === 'salvo' && <span className="text-sm text-emerald-600">Salvo.</span>}
        {estado === 'erro' && <span className="text-sm text-red-600">Falha ao salvar.</span>}
      </div>
    </section>
  )
}
