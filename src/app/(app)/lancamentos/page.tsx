import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import {
  parseFiltros,
  listarLancamentos,
  carregarOpcoesFiltro,
} from '@/lib/importacao/consulta'
import { FiltrosLancamentos } from '@/components/lancamentos/FiltrosLancamentos'
import { formatBRL, formatData, NATUREZA_LABEL, STATUS_LABEL } from '@/lib/format'
import { NaturezaLancamento } from '@/lib/types/razao'

export const metadata = { title: 'Lançamentos · Conciliação Contábil' }
export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const filtros = parseFiltros(searchParams)

  let dados:
    | {
        items: Awaited<ReturnType<typeof listarLancamentos>>['items']
        total: number
        opcoes: Awaited<ReturnType<typeof carregarOpcoesFiltro>>
      }
    | null = null
  let erroDb = false

  try {
    const [res, opcoes] = await Promise.all([
      listarLancamentos(prisma, filtros),
      carregarOpcoesFiltro(prisma),
    ])
    dados = { items: res.items, total: res.total, opcoes }
  } catch {
    erroDb = true
  }

  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / filtros.pageSize)) : 1

  function linkPagina(p: number) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string') q.set(k, v)
      else if (Array.isArray(v) && v[0]) q.set(k, v[0])
    }
    q.set('page', String(p))
    return `/lancamentos?${q.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lançamentos</h1>
          <p className="mt-1 text-sm text-slate-600">
            {dados ? `${dados.total} lançamento(s)` : 'Lançamentos importados'} · página {filtros.page} de {totalPaginas}
          </p>
        </div>
        <Link href="/importacao" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Nova importação
        </Link>
      </div>

      {erroDb ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível consultar o banco de dados. Verifique se o PostgreSQL está ativo e se as
          migrations foram aplicadas (<code>npx prisma migrate dev</code>).
        </div>
      ) : (
        <>
          <FiltrosLancamentos importacoes={dados!.opcoes.importacoes} contas={dados!.opcoes.contas} />

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full table-fixed divide-y divide-slate-200 text-xs">
              <colgroup>
                <col className="w-[5.5rem]" />
                <col className="w-[5.5rem]" />
                <col className="w-[8rem]" />
                <col />
                <col className="w-[6rem]" />
                <col className="w-[7rem]" />
                <col className="w-[7rem]" />
                <col className="w-[7.5rem]" />
                <col className="w-[6rem]" />
              </colgroup>
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Data</th>
                  <th className="px-2 py-2 font-medium">Documento</th>
                  <th className="px-2 py-2 font-medium">Natureza</th>
                  <th className="px-2 py-2 font-medium">Parceiro</th>
                  <th className="px-2 py-2 font-medium">Dup./Parc.</th>
                  <th className="px-2 py-2 text-right font-medium">Débito</th>
                  <th className="px-2 py-2 text-right font-medium">Crédito</th>
                  <th className="px-2 py-2 text-right font-medium">Saldo</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dados!.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-10 text-center text-slate-400">
                      Nenhum lançamento encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  dados!.items.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-2 py-2">{formatData(l.dataLancamento)}</td>
                      <td className="truncate px-2 py-2 font-medium" title={l.documento}>
                        {l.documento}
                      </td>
                      <td className="truncate px-2 py-2 text-slate-600">
                        {NATUREZA_LABEL[l.natureza as NaturezaLancamento]}
                      </td>
                      <td className="truncate px-2 py-2 text-slate-600" title={l.nomeParceiro ?? ''}>
                        {l.nomeParceiro ?? '—'}
                      </td>
                      <td className="truncate px-2 py-2 text-slate-500">
                        {l.dupCr ? `${l.dupCr}/${l.parcela ?? '-'}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                        {Number(l.debito) ? formatBRL(String(l.debito)) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                        {Number(l.credito) ? formatBRL(String(l.credito)) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-slate-600">
                        {formatBRL(String(l.saldo))}
                      </td>
                      <td className="px-2 py-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          {STATUS_LABEL[l.statusConciliacao] ?? l.statusConciliacao}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando até {filtros.pageSize} por página
            </span>
            <div className="flex gap-2">
              {filtros.page > 1 && (
                <Link href={linkPagina(filtros.page - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
                  Anterior
                </Link>
              )}
              {filtros.page < totalPaginas && (
                <Link href={linkPagina(filtros.page + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
                  Próxima
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
