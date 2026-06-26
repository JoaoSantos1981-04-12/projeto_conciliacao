'use client'

import { useMemo, useState } from 'react'
import { formatBRL, formatData } from '@/lib/format'

export interface ItemView {
  id: string
  tipo: 'TITULO_ABERTO' | 'ITEM_TRANSITO'
  documento: string | null
  nome: string | null
  historico: string | null
  dataVencimento: string | null
  diasAtraso: number | null
  valorAberto: number | null
  debito: number | null
  credito: number | null
  saldo: number | null
}

const POR_PAGINA = 20

/** Tabela de itens em aberto OU em trânsito, com ordenação e paginação (§12.5). */
export function TabelaItensRelatorio({ itens }: { itens: ItemView[] }) {
  const ehTransito = itens.length > 0 && itens.every((i) => i.tipo === 'ITEM_TRANSITO')
  const [pagina, setPagina] = useState(1)
  const [asc, setAsc] = useState(false)

  const ordenados = useMemo(() => {
    const chave = (i: ItemView) => (ehTransito ? (i.saldo ?? 0) : (i.valorAberto ?? 0))
    return [...itens].sort((a, b) => (asc ? chave(a) - chave(b) : chave(b) - chave(a)))
  }, [itens, asc, ehTransito])

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA))
  const visiveis = ordenados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  if (itens.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-500">
          Nenhum item detalhado para esta conta. O total da conciliação usa o total impresso do
          relatório.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
            {ehTransito ? (
              <tr>
                <th className="px-3 py-2 font-medium">Histórico</th>
                <th className="px-3 py-2 text-right font-medium">Débito</th>
                <th className="px-3 py-2 text-right font-medium">Crédito</th>
                <th className="px-3 py-2 text-right font-medium">
                  <button type="button" onClick={() => setAsc((v) => !v)} className="hover:text-slate-700">
                    Saldo {asc ? '▲' : '▼'}
                  </button>
                </th>
              </tr>
            ) : (
              <tr>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Favorecido</th>
                <th className="px-3 py-2 font-medium">Vencimento</th>
                <th className="px-3 py-2 text-right font-medium">Atraso</th>
                <th className="px-3 py-2 text-right font-medium">
                  <button type="button" onClick={() => setAsc((v) => !v)} className="hover:text-slate-700">
                    Valor aberto {asc ? '▲' : '▼'}
                  </button>
                </th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visiveis.map((i) =>
              ehTransito ? (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="truncate px-3 py-2 text-slate-600" title={i.historico ?? ''}>
                    {i.historico ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {i.debito ? formatBRL(i.debito) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {i.credito ? formatBRL(i.credito) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                    {formatBRL(i.saldo)}
                  </td>
                </tr>
              ) : (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{i.documento ?? '—'}</td>
                  <td className="truncate px-3 py-2 text-slate-600" title={i.nome ?? ''}>
                    {i.nome ?? '—'}
                  </td>
                  <td className="px-3 py-2">{formatData(i.dataVencimento)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                    {i.diasAtraso ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatBRL(i.valorAberto)}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {ordenados.length} item(ns) · página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="rounded-md border border-slate-300 px-3 py-1 transition hover:bg-slate-100 active:translate-y-px disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="rounded-md border border-slate-300 px-3 py-1 transition hover:bg-slate-100 active:translate-y-px disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
