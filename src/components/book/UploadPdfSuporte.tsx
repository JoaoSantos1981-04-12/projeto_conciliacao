'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ResultadoArquivo {
  nome: string
  tipo: string
  codigoConta?: string
  acao?: string
  itens?: number
  erro?: string
}

type Estado =
  | { fase: 'idle' }
  | { fase: 'enviando' }
  | { fase: 'ok'; processados: ResultadoArquivo[] }
  | { fase: 'erro'; mensagem: string }

const TIPO_LABEL: Record<string, string> = {
  RAZAO: 'Razão',
  BALANCETE: 'Balancete',
  CR_ABERTO: 'CR em aberto',
  CP_ABERTO: 'CP em aberto',
  EXTRATO_BANCARIO: 'Extrato bancário',
  DESCONHECIDO: 'Não reconhecido',
}

/** Dropzone multi-arquivo auto-roteado (U1 §12.1). Processamento no servidor. */
export function UploadPdfSuporte({ bookId }: { bookId: string }) {
  const [arquivos, setArquivos] = useState<File[]>([])
  const [estado, setEstado] = useState<Estado>({ fase: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function enviar() {
    if (arquivos.length === 0) return
    setEstado({ fase: 'enviando' })
    const form = new FormData()
    for (const f of arquivos) form.append('files', f)

    try {
      const res = await fetch(`/api/book/${bookId}/pdf-suporte`, {
        method: 'POST',
        body: form,
      })
      const body = await res.json()
      if (!res.ok) {
        setEstado({ fase: 'erro', mensagem: body?.erro ?? `Erro ${res.status}` })
        return
      }
      setEstado({ fase: 'ok', processados: body.processados ?? [] })
      router.refresh()
    } catch {
      setEstado({ fase: 'erro', mensagem: 'Falha de rede ao enviar os arquivos.' })
    }
  }

  function limpar() {
    setArquivos([])
    setEstado({ fase: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">PDFs de suporte</h2>
      <p className="mt-1 text-sm text-slate-600">
        Envie razões, balancete, CR/CP em aberto e extrato. O sistema detecta o tipo e a
        conta automaticamente.
      </p>

      <label
        htmlFor="pdf-files"
        className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center hover:border-brand"
      >
        <span className="text-sm font-medium text-slate-700">
          Clique para selecionar os PDFs
        </span>
        <span className="mt-1 text-xs text-slate-500">
          {arquivos.length > 0
            ? `${arquivos.length} arquivo(s) selecionado(s)`
            : 'Pode selecionar vários de uma vez'}
        </span>
        <input
          id="pdf-files"
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={estado.fase === 'enviando'}
          onChange={(e) => {
            setArquivos(Array.from(e.target.files ?? []))
            setEstado({ fase: 'idle' })
          }}
          className="sr-only"
        />
      </label>

      {arquivos.length > 0 && estado.fase !== 'ok' && (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {arquivos.map((f) => (
            <li key={f.name} className="truncate">
              • {f.name}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={enviar}
          disabled={arquivos.length === 0 || estado.fase === 'enviando'}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {estado.fase === 'enviando' ? 'Processando…' : 'Enviar e rotear'}
        </button>
        {(estado.fase === 'ok' || estado.fase === 'erro') && (
          <button
            type="button"
            onClick={limpar}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Novo envio
          </button>
        )}
      </div>

      {estado.fase === 'erro' && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {estado.mensagem}
        </div>
      )}

      {estado.fase === 'ok' && (
        <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
          <table className="w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Arquivo</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Conta</th>
                <th className="px-3 py-2 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {estado.processados.map((p) => (
                <tr key={p.nome}>
                  <td className="truncate px-3 py-2" title={p.nome}>
                    {p.nome}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{TIPO_LABEL[p.tipo] ?? p.tipo}</td>
                  <td className="px-3 py-2 font-mono text-slate-500">{p.codigoConta ?? '—'}</td>
                  <td className="px-3 py-2">
                    {p.erro ? (
                      <span className="text-red-600">{p.erro}</span>
                    ) : (
                      <span className="text-emerald-700">
                        {p.acao === 'SUBSTITUIR' ? 'Atualizado' : 'Importado'}
                        {typeof p.itens === 'number' ? ` · ${p.itens} item(ns)` : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
