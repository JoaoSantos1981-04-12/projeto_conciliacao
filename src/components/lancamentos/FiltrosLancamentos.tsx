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
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emeraldBlue-500 focus:ring-1 focus:ring-emeraldBlue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Importação</label>
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
        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Conta contábil</label>
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
        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Natureza</label>
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
        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</label>
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
        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">De</label>
        <input type="date" className={selectCls} defaultValue={val('de')} onBlur={(e) => aplicar({ de: e.target.value })} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Até</label>
        <input type="date" className={selectCls} defaultValue={val('ate')} onBlur={(e) => aplicar({ ate: e.target.value })} />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Busca (documento, duplicata, parceiro)</label>
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
