'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** Criação de book (ano/mês). Label acima do input, erro inline (§12 / Rule 6). */
export function CriarBookForm() {
  const router = useRouter()
  const agora = new Date()
  const [empresaId, setEmpresaId] = useState('')
  const [ano, setAno] = useState(agora.getFullYear())
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [elaboradoPor, setElaboradoPor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!empresaId.trim() || !elaboradoPor.trim()) {
      setErro('Informe a empresa e quem está elaborando.')
      return
    }
    setEnviando(true)
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ empresaId: empresaId.trim(), ano, mes, elaboradoPor: elaboradoPor.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        setErro(body?.erro ?? `Erro ${res.status}`)
        return
      }
      router.push(`/book/${body.id}`)
    } catch {
      setErro('Falha de rede ao criar o book.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={submeter} className="max-w-lg space-y-5 rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="empresaId" className="text-sm font-medium text-slate-700">
          Empresa / filial
        </label>
        <input
          id="empresaId"
          value={empresaId}
          onChange={(e) => setEmpresaId(e.target.value)}
          placeholder="Ex.: NICE SYSTEMS TECHNOLOGIES BRASIL LTDA"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="ano" className="text-sm font-medium text-slate-700">Ano</label>
          <input
            id="ano"
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="mes" className="text-sm font-medium text-slate-700">Mês</label>
          <select
            id="mes"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="elaboradoPor" className="text-sm font-medium text-slate-700">
          Elaborado por
        </label>
        <input
          id="elaboradoPor"
          value={elaboradoPor}
          onChange={(e) => setElaboradoPor(e.target.value)}
          placeholder="Seu nome"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {erro && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? 'Criando…' : 'Criar book'}
      </button>
    </form>
  )
}
