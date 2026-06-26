'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Play, Loader2, AlertCircle } from 'lucide-react'

export function BotaoConciliar({
  importacaoId,
  label = 'Conciliar',
}: {
  importacaoId: string
  label?: string
}) {
  const router = useRouter()
  const [estado, setEstado] = useState<'idle' | 'rodando' | 'erro'>('idle')

  async function conciliar() {
    setEstado('rodando')
    try {
      const res = await fetch('/api/conciliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importacaoId }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setEstado('idle')
      router.refresh()
    } catch {
      setEstado('erro')
    }
  }

  return (
    <button
      type="button"
      onClick={conciliar}
      disabled={estado === 'rodando'}
      className="inline-flex items-center gap-1.5 rounded-lg bg-emeraldBlue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px disabled:opacity-50 dark:bg-emeraldBlue-600 dark:hover:bg-emeraldBlue-500"
      title={estado === 'erro' ? 'Falha ao conciliar — tente novamente' : undefined}
    >
      {estado === 'rodando' ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Conciliando…
        </>
      ) : estado === 'erro' ? (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-red-100" />
          Erro — repetir
        </>
      ) : (
        <>
          <Play className="h-3 w-3 fill-current" />
          {label}
        </>
      )}
    </button>
  )
}
