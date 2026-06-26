'use client'

import React from 'react'
import { Inbox, AlertTriangle, Loader2 } from 'lucide-react'
import { useFibContext } from '@/lib/fib/context'

/**
 * Centraliza os estados de carregamento/erro/vazio do FIB.
 * Retorna o nó de estado a renderizar, ou `null` quando há dados prontos —
 * nesse caso a página segue e renderiza seu conteúdo. Evita repetir os
 * early-returns (e a mensagem genérica "Nenhum dado disponível") em cada aba.
 */
export function useFibEstado(): React.ReactNode | null {
  const {
    dados,
    carregando,
    erro,
    carregandoImportacoes,
    importacoesDisponiveis,
    importacaoAtual,
  } = useFibContext()

  if (carregandoImportacoes || carregando) {
    return (
      <Estado icone={<Loader2 className="w-8 h-8 animate-spin" />}>
        Carregando dados…
      </Estado>
    )
  }

  if (erro) {
    return (
      <Estado
        icone={<AlertTriangle className="w-8 h-8 text-red-400" />}
        cor="text-red-400"
      >
        {erro}
      </Estado>
    )
  }

  if (importacoesDisponiveis.length === 0) {
    return (
      <Estado icone={<Inbox className="w-8 h-8" />}>
        Nenhuma importação concluída disponível. Importe um razão para visualizar
        os indicadores.
      </Estado>
    )
  }

  if (!importacaoAtual) {
    return (
      <Estado icone={<Inbox className="w-8 h-8" />}>
        Selecione uma importação na barra acima para visualizar os indicadores.
      </Estado>
    )
  }

  if (!dados) {
    return (
      <Estado icone={<Inbox className="w-8 h-8" />}>
        Nenhum dado disponível para o período selecionado.
      </Estado>
    )
  }

  return null
}

function Estado({
  icone,
  cor = 'text-slate-400',
  children,
}: {
  icone: React.ReactNode
  cor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-3 text-center">
      <div className={cor}>{icone}</div>
      <p className={`max-w-sm ${cor}`}>{children}</p>
    </div>
  )
}
