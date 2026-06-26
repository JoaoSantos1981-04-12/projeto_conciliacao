'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { FibContextType, FibDashboardData } from '@/lib/types/fib'

const FibContext = createContext<FibContextType | undefined>(undefined)

export function FibProvider({ children }: { children: ReactNode }) {
  const [importacaoAtual, setImportacaoAtual] = useState<{
    id: string
    empresa: string
  } | null>(null)
  const [periodroSelecionado, setPeriodroSelecionado] = useState<{
    inicio: Date
    fim: Date
  } | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [dados, setDados] = useState<FibDashboardData | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const atualizarDados = useCallback(async () => {
    if (!importacaoAtual || !periodroSelecionado) {
      setErro('Importação e período devem estar selecionados')
      return
    }

    setCarregando(true)
    setErro(null)

    try {
      const query = new URLSearchParams({
        importacaoId: importacaoAtual.id,
        periodoInicio: periodroSelecionado.inicio.toISOString(),
        periodoFim: periodroSelecionado.fim.toISOString(),
      })

      const resposta = await fetch(`/api/fib/dashboard?${query}`)

      if (!resposta.ok) {
        throw new Error(`Erro ${resposta.status}: ${await resposta.text()}`)
      }

      const dados = (await resposta.json()) as FibDashboardData
      setDados(dados)
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err)
      setErro(mensagem)
      console.error('Erro ao carregar dashboard FIB:', err)
    } finally {
      setCarregando(false)
    }
  }, [importacaoAtual, periodroSelecionado])

  const valor: FibContextType = {
    importacaoAtual,
    periodosDisponiveis: [], // TODO: carregar do servidor
    periodroSelecionado,
    carregando,
    dados,
    erro,
    atualizarDados,
  }

  return (
    <FibContext.Provider value={valor}>
      {children}
    </FibContext.Provider>
  )
}

export function useFibContext() {
  const contexto = useContext(FibContext)
  if (contexto === undefined) {
    throw new Error('useFibContext deve estar dentro de FibProvider')
  }
  return contexto
}
