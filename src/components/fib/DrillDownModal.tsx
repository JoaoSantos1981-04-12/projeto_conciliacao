'use client'

import React from 'react'
import { X } from 'lucide-react'
import { FibContaAgregada } from '@/lib/types/fib'

interface DrillDownModalProps {
  aberto: boolean
  onFechar: () => void
  titulo: string
  contas: FibContaAgregada[]
}

export function DrillDownModal({
  aberto,
  onFechar,
  titulo,
  contas,
}: DrillDownModalProps) {
  if (!aberto) return null

  const totalSaldo = contas.reduce((sum, c) => sum + c.saldo, 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden
        border border-slate-700/50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50
          bg-gradient-to-r from-slate-800 to-slate-900">
          <h2 className="text-lg font-semibold text-white">{titulo}</h2>
          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6">
          <div className="space-y-3">
            {contas.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma conta encontrada</p>
            ) : (
              <>
                {contas.map((conta) => (
                  <div
                    key={conta.codigo}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50
                      hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-emerald-400 text-sm font-mono">
                            {conta.codigo}
                          </code>
                          <p className="text-slate-200 text-sm">{conta.nome}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                          <span>
                            Percentual: {conta.percentualDaClasse.toFixed(1)}%
                          </span>
                          {conta.variacao !== 0 && (
                            <span
                              className={
                                conta.variacao > 0
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }
                            >
                              {conta.variacao > 0 ? '+' : ''}
                              {conta.variacao.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-lg font-semibold ${
                            conta.saldo >= 0
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          R$ {conta.saldo.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-emerald-400">Total</p>
                    <p className="text-lg font-bold text-emerald-400">
                      R$ {totalSaldo.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/50 flex justify-end">
          <button
            onClick={onFechar}
            className="px-6 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm font-medium
              transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
