'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { NATUREZAS, STATUS_CONCILIACAO } from '@/lib/importacao/consulta'
import { NATUREZA_LABEL, STATUS_LABEL } from '@/lib/format'

interface OpcaoImportacao {
  id: string
  nomeArquivo: string
  empresa: string
}
interface OpcaoConta {
  id: string
  codigo: string
  nome: string
}

interface Props {
  importacoes: OpcaoImportacao[]
  contas: OpcaoConta[]
}

export function FiltrosLancamentos({ importacoes, contas }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const val = (k: string) => params.get(k) ?? ''

  const aplicar = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      next.delete('page') // qualquer mudança de filtro volta à página 1
      router.push(`/lancamentos?${next.toString()}`)
    },
    [params, router],
  )

  const selectCls =
    'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand focus:outline-none'

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Importação</label>
        <select className={selectCls} value={val('importacaoId')} onChange={(e) => aplicar({ importacaoId: e.target.value })}>
          <option value="">Todas</option>
          {importacoes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.empresa || i.nomeArquivo}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Conta contábil</label>
        <select className={selectCls} value={val('contaContabilId')} onChange={(e) => aplicar({ contaContabilId: e.target.value })}>
          <option value="">Todas</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Natureza</label>
        <select className={selectCls} value={val('natureza')} onChange={(e) => aplicar({ natureza: e.target.value })}>
          <option value="">Todas</option>
          {NATUREZAS.map((n) => (
            <option key={n} value={n}>
              {NATUREZA_LABEL[n]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
        <select className={selectCls} value={val('status')} onChange={(e) => aplicar({ status: e.target.value })}>
          <option value="">Todos</option>
          {STATUS_CONCILIACAO.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">De</label>
        <input type="date" className={selectCls} defaultValue={val('de')} onBlur={(e) => aplicar({ de: e.target.value })} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Até</label>
        <input type="date" className={selectCls} defaultValue={val('ate')} onBlur={(e) => aplicar({ ate: e.target.value })} />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">Busca (documento, duplicata, parceiro)</label>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            aplicar({ q: String(fd.get('q') ?? '') })
          }}
        >
          <input name="q" defaultValue={val('q')} placeholder="Ex.: 1045, WEG, 07.175…" className={selectCls} />
        </form>
      </div>
    </div>
  )
}
