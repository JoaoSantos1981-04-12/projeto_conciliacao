'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
      className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      title={estado === 'erro' ? 'Falha ao conciliar — tente novamente' : undefined}
    >
      {estado === 'rodando' ? 'Conciliando…' : estado === 'erro' ? 'Erro — repetir' : label}
    </button>
  )
}
