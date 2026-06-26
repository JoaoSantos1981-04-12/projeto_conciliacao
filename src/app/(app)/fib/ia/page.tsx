'use client'

import React, { useState } from 'react'
import { Sparkles, Send, RefreshCw } from 'lucide-react'
import { useFibContext } from '@/lib/fib/context'
import { useFibEstado } from '@/components/fib/FibGate'

interface Mensagem {
  tipo: 'usuario' | 'ia'
  conteudo: string
  timestamp: Date
}

export default function FibIaPage() {
  const { dados } = useFibContext()
  const estado = useFibEstado()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [gerando, setGerando] = useState(false)
  const [insightGerado, setInsightGerado] = useState(false)

  const gerarInsight = async () => {
    if (!dados || insightGerado) return

    setGerando(true)
    try {
      const resposta = await fetch('/api/fib/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardData: dados }),
      })

      if (!resposta.ok) {
        throw new Error('Erro ao gerar insights')
      }

      const resultado = (await resposta.json()) as { insight: string }
      setMensagens((prev) => [
        ...prev,
        {
          tipo: 'ia',
          conteudo: resultado.insight,
          timestamp: new Date(),
        },
      ])
      setInsightGerado(true)
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro desconhecido'
      setMensagens((prev) => [
        ...prev,
        {
          tipo: 'ia',
          conteudo: `Erro ao gerar insights: ${mensagem}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setGerando(false)
    }
  }

  if (estado) return <>{estado}</>
  if (!dados) return null // já coberto por `estado`; narrow para o TS

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] gap-6">
      {/* Interface de Chat */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-800 to-slate-900
        border border-slate-700/50 rounded-lg overflow-hidden">

        {/* Histórico de Mensagens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
              <p className="text-slate-400 mb-2">Sumário Executivo de IA</p>
              <p className="text-sm text-slate-500 max-w-sm">
                Clique em "Gerar Análise de IA" para receber insights personalizados sobre os
                indicadores financeiros da sua empresa.
              </p>
            </div>
          ) : (
            <>
              {mensagens.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-lg rounded-lg p-4 ${
                      msg.tipo === 'usuario'
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100'
                        : 'bg-slate-700/50 border border-slate-600/50 text-slate-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                    <p className="text-xs opacity-50 mt-2">
                      {msg.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {gerando && (
                <div className="flex justify-start">
                  <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input de IA */}
        <div className="border-t border-slate-700/50 p-4 bg-slate-900/50">
          <button
            onClick={gerarInsight}
            disabled={gerando || insightGerado}
            className="w-full px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700
              disabled:bg-slate-600 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 font-medium transition-colors"
          >
            {gerando ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Análise de IA
              </>
            )}
          </button>
          {insightGerado && (
            <button
              onClick={() => {
                setMensagens([])
                setInsightGerado(false)
              }}
              className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600
                text-sm transition-colors"
            >
              Nova Análise
            </button>
          )}
        </div>
      </div>

      {/* Documentação de Uso */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20
        border border-violet-500/30">
        <h3 className="font-semibold text-white mb-3">Como Usar o Sumário de IA</h3>
        <ul className="text-sm text-slate-200 space-y-2">
          <li>✓ <strong>Análise Executiva:</strong> receba um resumo dos principais indicadores financeiros</li>
          <li>✓ <strong>Pontos de Atenção:</strong> identifique riscos e áreas críticas</li>
          <li>✓ <strong>Oportunidades:</strong> descubra potenciais de crescimento e otimização</li>
          <li>✓ <strong>Recomendações:</strong> obtenha sugestões estratégicas personalizadas</li>
        </ul>
        <p className="text-xs text-slate-400 mt-3 italic">
          💡 Dica: Esta análise é baseada em dados financeiros agregados. Para recomendações mais
          detalhadas, consulte um analista financeiro profissional.
        </p>
      </div>

      {/* Informações sobre a IA */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
        <p>
          Powered by <span className="font-semibold text-emerald-400">Gemini 2.5 Flash API</span>
          {' '}| Última atualização: {dados.cacheTimestamp.toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  )
}
