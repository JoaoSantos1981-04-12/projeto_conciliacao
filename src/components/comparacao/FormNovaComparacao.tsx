'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CenarioComparacao } from '@/lib/types/comparacao'
import { CENARIO_LABEL } from '@/lib/format'

interface ContaOpcao {
  id: string
  codigo: string
  nome: string
  lancamentos: number
}

// Defaults de tolerância por cenário (ver CLAUDE/FEATURE seção 10).
const DEFAULTS: Record<CenarioComparacao, { valor: number; dias: number }> = {
  FORNECEDORES_BANCO: { valor: 1.0, dias: 5 },
  CLIENTES_BANCO: { valor: 1.0, dias: 3 },
  INTERCOMPANY: { valor: 0.01, dias: 1 },
  PERSONALIZADO: { valor: 1.0, dias: 5 },
}

const CENARIOS = Object.keys(CENARIO_LABEL) as CenarioComparacao[]

export function FormNovaComparacao({ contas }: { contas: ContaOpcao[] }) {
  const router = useRouter()
  const [contaOrigemId, setContaOrigemId] = useState('')
  const [contaDestinoId, setContaDestinoId] = useState('')
  const [cenario, setCenario] = useState<CenarioComparacao>('FORNECEDORES_BANCO')
  const [nomeDescritivo, setNomeDescritivo] = useState('')
  const [periodoInicio, setPeriodoInicio] = useState('2026-01-01')
  const [periodoFim, setPeriodoFim] = useState('2026-05-31')
  const [toleranciaValor, setToleranciaValor] = useState(DEFAULTS.FORNECEDORES_BANCO.valor)
  const [toleranciaDias, setToleranciaDias] = useState(DEFAULTS.FORNECEDORES_BANCO.dias)
  const [estado, setEstado] = useState<'idle' | 'rodando'>('idle')
  const [erro, setErro] = useState<string | null>(null)

  const contasOk = contas.length >= 2
  const mesmaConta = contaOrigemId !== '' && contaOrigemId === contaDestinoId

  const podeEnviar = useMemo(
    () =>
      contaOrigemId !== '' &&
      contaDestinoId !== '' &&
      !mesmaConta &&
      nomeDescritivo.trim() !== '' &&
      periodoInicio !== '' &&
      periodoFim !== '' &&
      estado === 'idle',
    [contaOrigemId, contaDestinoId, mesmaConta, nomeDescritivo, periodoInicio, periodoFim, estado],
  )

  function aoTrocarCenario(novo: CenarioComparacao) {
    setCenario(novo)
    setToleranciaValor(DEFAULTS[novo].valor)
    setToleranciaDias(DEFAULTS[novo].dias)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!podeEnviar) return
    setEstado('rodando')
    setErro(null)
    try {
      const res = await fetch('/api/comparacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contaOrigemId,
          contaDestinoId,
          cenario,
          nomeDescritivo: nomeDescritivo.trim(),
          periodoInicio,
          periodoFim,
          toleranciaValor,
          toleranciaDias,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.erro ?? 'Falha ao iniciar a comparação.')
      router.push(`/comparacao/${data.sessaoId}`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao iniciar a comparação.')
      setEstado('idle')
    }
  }

  if (!contasOk) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        É necessário ter pelo menos duas contas contábeis importadas para comparar. Importe os razões
        das duas contas primeiro.
      </div>
    )
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand'

  return (
    <form onSubmit={enviar} className="max-w-2xl space-y-5 rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Conta A (origem)</span>
          <select
            value={contaOrigemId}
            onChange={(e) => setContaOrigemId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione…</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome} ({c.lancamentos})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Conta B (destino)</span>
          <select
            value={contaDestinoId}
            onChange={(e) => setContaDestinoId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione…</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome} ({c.lancamentos})
              </option>
            ))}
          </select>
        </label>
      </div>

      {mesmaConta && (
        <p className="text-xs text-red-600">As contas A e B devem ser diferentes.</p>
      )}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Cenário</span>
        <select
          value={cenario}
          onChange={(e) => aoTrocarCenario(e.target.value as CenarioComparacao)}
          className={inputClass}
        >
          {CENARIOS.map((c) => (
            <option key={c} value={c}>
              {CENARIO_LABEL[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Nome descritivo</span>
        <input
          type="text"
          value={nomeDescritivo}
          onChange={(e) => setNomeDescritivo(e.target.value)}
          placeholder="ex: Fornecedores × Banco - Maio/2026"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Início do período</span>
          <input
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Fim do período</span>
          <input
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Tolerância de valor (R$)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={toleranciaValor}
            onChange={(e) => setToleranciaValor(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Tolerância de dias</span>
          <input
            type="number"
            step="1"
            min="0"
            value={toleranciaDias}
            onChange={(e) => setToleranciaDias(Number(e.target.value))}
            className={inputClass}
          />
        </label>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        disabled={!podeEnviar}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {estado === 'rodando' ? 'Comparando…' : 'Iniciar comparação'}
      </button>
    </form>
  )
}
