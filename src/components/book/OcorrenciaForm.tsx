'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusOcorrencia, ResponsavelArea } from '@/lib/types/book'

export interface OcorrenciaView {
  id: string
  descricao: string
  status: StatusOcorrencia
  responsavel: ResponsavelArea | null
  acaoCorretiva: string | null
  prazo: string | null
  nettingFlag: boolean
}

const STATUS: StatusOcorrencia[] = ['ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA', 'CANCELADA']
const RESPONSAVEIS: ResponsavelArea[] = ['CONTABILIDADE', 'FINANCEIRO', 'FISCAL', 'CLIENTE', 'AUDITORIA']

const STATUS_CLS: Record<StatusOcorrencia, string> = {
  ABERTA: 'border-red-200 bg-red-50 text-red-800',
  EM_ANDAMENTO: 'border-amber-200 bg-amber-50 text-amber-800',
  RESOLVIDA: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CANCELADA: 'border-slate-200 bg-slate-100 text-slate-600',
}

/** Edição de uma ocorrência: status, responsável, ação e prazo (§12.5). */
export function OcorrenciaForm({ bookId, ocorrencia }: { bookId: string; ocorrencia: OcorrenciaView }) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusOcorrencia>(ocorrencia.status)
  const [responsavel, setResponsavel] = useState<ResponsavelArea | ''>(ocorrencia.responsavel ?? '')
  const [acaoCorretiva, setAcao] = useState(ocorrencia.acaoCorretiva ?? '')
  const [prazo, setPrazo] = useState(ocorrencia.prazo ? ocorrencia.prazo.slice(0, 10) : '')
  const [estado, setEstado] = useState<'idle' | 'salvando' | 'salvo' | 'erro'>('idle')

  async function salvar() {
    setEstado('salvando')
    try {
      const res = await fetch(`/api/book/${bookId}/ocorrencias/${ocorrencia.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status,
          responsavel: responsavel || undefined,
          acaoCorretiva,
          prazo: prazo ? new Date(prazo).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        setEstado('erro')
        return
      }
      setEstado('salvo')
      router.refresh()
    } catch {
      setEstado('erro')
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{ocorrencia.descricao}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[status]}`}>
          {status.replace('_', ' ')}
        </span>
      </div>
      {ocorrencia.nettingFlag && (
        <p className="mt-2 inline-block rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
          Netting intercompany (passivo × ativo da mesma contraparte)
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusOcorrencia)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-600">Responsável</label>
          <select
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value as ResponsavelArea | '')}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">—</option>
            {RESPONSAVEIS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-600">Prazo</label>
          <input
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-600">Ação corretiva</label>
        <textarea
          value={acaoCorretiva}
          onChange={(e) => setAcao(e.target.value)}
          rows={2}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={estado === 'salvando'}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 active:translate-y-px disabled:opacity-50"
        >
          {estado === 'salvando' ? 'Salvando…' : 'Salvar'}
        </button>
        {estado === 'salvo' && <span className="text-sm text-emerald-600">Salvo.</span>}
        {estado === 'erro' && <span className="text-sm text-red-600">Falha ao salvar.</span>}
      </div>
    </div>
  )
}
