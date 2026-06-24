'use client'

import { useRouter } from 'next/navigation'

interface Opcao {
  id: string
  empresa: string
  nomeArquivo: string
}

export function SeletorImportacao({ opcoes, atual }: { opcoes: Opcao[]; atual: string | null }) {
  const router = useRouter()
  return (
    <select
      value={atual ?? ''}
      onChange={(e) => {
        const v = e.target.value
        router.push(v ? `/relatorios?importacaoId=${v}` : '/relatorios')
      }}
      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
    >
      <option value="">Todas as importações</option>
      {opcoes.map((o) => (
        <option key={o.id} value={o.id}>
          {o.empresa || o.nomeArquivo}
        </option>
      ))}
    </select>
  )
}
