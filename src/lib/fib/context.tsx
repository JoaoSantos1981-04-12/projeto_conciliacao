'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react'
import {
  FibContextType,
  FibDashboardData,
  FibImportacaoResumo,
} from '@/lib/types/fib'

const FibContext = createContext<FibContextType | undefined>(undefined)

export function FibProvider({ children }: { children: ReactNode }) {
  const [importacoesDisponiveis, setImportacoesDisponiveis] = useState<
    FibImportacaoResumo[]
  >([])
  const [importacaoAtual, setImportacaoAtual] =
    useState<FibImportacaoResumo | null>(null)
  const [periodoSelecionado, setPeriodoSelecionado] = useState<{
    inicio: Date
    fim: Date
  } | null>(null)
  const [carregandoImportacoes, setCarregandoImportacoes] = useState(true)
  const [carregando, setCarregando] = useState(false)
  const [dados, setDados] = useState<FibDashboardData | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Carrega as importações disponíveis na montagem e auto-seleciona a primeira.
  useEffect(() => {
    let ativo = true
    async function carregarBooks() {
      setCarregandoImportacoes(true)
      try {
        // Fonte do FIB: balancetes (Books). Ver /api/fib/books.
        const resposta = await fetch('/api/fib/books')
        if (!resposta.ok) {
          throw new Error(`Erro ${resposta.status} ao listar balancetes`)
        }
        const json = (await resposta.json()) as {
          books: FibImportacaoResumo[]
        }
        if (!ativo) return
        setImportacoesDisponiveis(json.books)
        if (json.books.length > 0) {
          aplicarImportacao(json.books[0])
        }
      } catch (err) {
        if (!ativo) return
        const mensagem = err instanceof Error ? err.message : String(err)
        setErro(mensagem)
        console.error('Erro ao carregar balancetes FIB:', err)
      } finally {
        if (ativo) setCarregandoImportacoes(false)
      }
    }
    carregarBooks()
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Aplica uma importação como atual e deriva o período a partir dela.
  function aplicarImportacao(imp: FibImportacaoResumo) {
    setImportacaoAtual(imp)
    if (imp.periodoInicio && imp.periodoFim) {
      setPeriodoSelecionado({
        inicio: new Date(imp.periodoInicio),
        fim: new Date(imp.periodoFim),
      })
    } else {
      setPeriodoSelecionado(null)
    }
  }

  const selecionarImportacao = useCallback(
    (id: string) => {
      const imp = importacoesDisponiveis.find((i) => i.id === id)
      if (imp) aplicarImportacao(imp)
    },
    [importacoesDisponiveis]
  )

  const definirPeriodo = useCallback(
    (inicio: Date | null, fim: Date | null) => {
      setPeriodoSelecionado((atual) => {
        const novoInicio = inicio ?? atual?.inicio
        const novoFim = fim ?? atual?.fim
        if (!novoInicio || !novoFim) return atual
        return { inicio: novoInicio, fim: novoFim }
      })
    },
    []
  )

  const atualizarDados = useCallback(async () => {
    if (!importacaoAtual || !periodoSelecionado) {
      // Sem seleção ainda — não é erro, apenas aguarda escolha do usuário.
      setDados(null)
      return
    }

    setCarregando(true)
    setErro(null)

    try {
      // A fonte do FIB é o balancete de um Book (bookId). O período vem do mês
      // do Book; o backend ignora datas (o balancete é o mês inteiro).
      const query = new URLSearchParams({ bookId: importacaoAtual.id })

      const resposta = await fetch(`/api/fib/dashboard?${query}`)

      if (!resposta.ok) {
        throw new Error(`Erro ${resposta.status}: ${await resposta.text()}`)
      }

      const json = (await resposta.json()) as FibDashboardData
      setDados(json)
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err)
      setErro(mensagem)
      console.error('Erro ao carregar dashboard FIB:', err)
    } finally {
      setCarregando(false)
    }
  }, [importacaoAtual, periodoSelecionado])

  // Recarrega os dados sempre que a importação ou o período mudarem.
  useEffect(() => {
    atualizarDados()
  }, [atualizarDados])

  const valor: FibContextType = {
    importacoesDisponiveis,
    importacaoAtual,
    selecionarImportacao,
    periodoSelecionado,
    definirPeriodo,
    carregandoImportacoes,
    carregando,
    dados,
    erro,
    atualizarDados,
  }

  return <FibContext.Provider value={valor}>{children}</FibContext.Provider>
}

export function useFibContext() {
  const contexto = useContext(FibContext)
  if (contexto === undefined) {
    throw new Error('useFibContext deve estar dentro de FibProvider')
  }
  return contexto
}
