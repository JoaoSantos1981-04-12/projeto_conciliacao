'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Estado = { fase: 'idle' } | { fase: 'rodando'; acao: string } | { fase: 'erro'; msg: string }

/** Ações do book: revalidar amarração e disparar análise LLM (assíncrona, B4). */
export function AcoesBook({ bookId }: { bookId: string }) {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>({ fase: 'idle' })

  async function executar(acao: 'validar' | 'analisar-llm', rotulo: string) {
    setEstado({ fase: 'rodando', acao: rotulo })
    try {
      const res = await fetch(`/api/book/${bookId}/${acao}`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setEstado({ fase: 'erro', msg: body?.erro ?? `Erro ${res.status}` })
        return
      }
      setEstado({ fase: 'idle' })
      router.refresh()
    } catch {
      setEstado({ fase: 'erro', msg: 'Falha de rede.' })
    }
  }

  const rodando = estado.fase === 'rodando'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => executar('validar', 'Validando amarração')}
        disabled={rodando}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {rodando && estado.acao.startsWith('Validando') ? 'Validando…' : 'Validar amarração'}
      </button>
      <button
        type="button"
        onClick={() => executar('analisar-llm', 'Analisando')}
        disabled={rodando}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {rodando && estado.acao === 'Analisando' ? 'Analisando…' : 'Analisar divergências (IA)'}
      </button>
      {estado.fase === 'erro' && <span className="text-sm text-red-600">{estado.msg}</span>}
    </div>
  )
}
