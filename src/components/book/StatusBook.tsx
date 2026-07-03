'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Lock, ArrowRight } from 'lucide-react'
import { BookStatus } from '@/lib/types/book'
import {
  TRANSICOES,
  rotuloAcao,
  podeExcluirBook,
} from '@/lib/book/book-workflow'
import { BookStatusBadge } from './BookStatusBadge'

/**
 * Controle de status do book: badge atual, botões de transição do workflow de
 * validação e exclusão (apenas quando o book está em edição/revisão).
 */
export function StatusBook({
  bookId,
  status,
}: {
  bookId: string
  status: BookStatus
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const proximos = TRANSICOES[status]
  const excluivel = podeExcluirBook(status)

  async function mudarStatus(novo: BookStatus) {
    setBusy(true)
    setErro(null)
    try {
      const res = await fetch(`/api/book/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novo }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setErro(b?.erro ?? `Erro ${res.status}`)
        return
      }
      router.refresh()
    } catch {
      setErro('Falha de rede.')
    } finally {
      setBusy(false)
    }
  }

  async function excluir() {
    setBusy(true)
    setErro(null)
    try {
      const res = await fetch(`/api/book/${bookId}`, { method: 'DELETE' })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setErro(b?.erro ?? `Erro ${res.status}`)
        setBusy(false)
        return
      }
      router.push('/book')
      router.refresh()
    } catch {
      setErro('Falha de rede.')
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Status:
          </span>
          <BookStatusBadge status={status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Transições do workflow */}
          {proximos.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => mudarStatus(p)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {rotuloAcao(status, p)}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ))}

          {/* Exclusão (somente em edição/revisão) */}
          {excluivel ? (
            confirmando ? (
              <span className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm dark:border-red-900/40 dark:bg-red-950/20">
                <span className="text-red-700 dark:text-red-300">Excluir?</span>
                <button
                  type="button"
                  onClick={excluir}
                  disabled={busy}
                  className="font-semibold text-red-700 hover:underline disabled:opacity-50 dark:text-red-300"
                >
                  {busy ? 'Excluindo…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={busy}
                  className="text-slate-500 hover:underline dark:text-slate-400"
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir Book
              </button>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              Book reportado — exclusão bloqueada
            </span>
          )}
        </div>
      </div>

      {erro && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{erro}</p>}
    </div>
  )
}
