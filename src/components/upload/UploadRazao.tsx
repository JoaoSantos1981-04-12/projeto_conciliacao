'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

interface ResumoConta {
  codigo: string
  nome: string
  lancamentos: number
}

interface Resumo {
  importacaoId: string
  empresa: string
  cnpjEmpresa: string
  totalLinhas: number
  linhasImportadas: number
  totalErros: number
  contas: ResumoConta[]
}

type Estado =
  | { fase: 'idle' }
  | { fase: 'enviando'; progresso: number }
  | { fase: 'ok'; resumo: Resumo }
  | { fase: 'erro'; mensagem: string }

export function UploadRazao() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>({ fase: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  function enviar() {
    if (!arquivo) return
    setEstado({ fase: 'enviando', progresso: 0 })

    const form = new FormData()
    form.append('file', arquivo)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setEstado({ fase: 'enviando', progresso: Math.round((e.loaded / e.total) * 100) })
      }
    }

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          setEstado({ fase: 'ok', resumo: body as Resumo })
        } else {
          setEstado({ fase: 'erro', mensagem: body?.erro ?? `Erro ${xhr.status}` })
        }
      } catch {
        setEstado({ fase: 'erro', mensagem: `Resposta inválida do servidor (${xhr.status}).` })
      }
    }

    xhr.onerror = () => setEstado({ fase: 'erro', mensagem: 'Falha de rede ao enviar o arquivo.' })
    xhr.send(form)
  }

  function reiniciar() {
    setArquivo(null)
    setEstado({ fase: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700">Arquivo do razão (.xlsx)</label>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          disabled={estado.fase === 'enviando'}
          onChange={(e) => {
            setArquivo(e.target.files?.[0] ?? null)
            setEstado({ fase: 'idle' })
          }}
          className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-teal-700"
        />

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={enviar}
            disabled={!arquivo || estado.fase === 'enviando'}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {estado.fase === 'enviando' ? 'Enviando…' : 'Importar razão'}
          </button>
          {(estado.fase === 'ok' || estado.fase === 'erro') && (
            <button
              type="button"
              onClick={reiniciar}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Nova importação
            </button>
          )}
        </div>

        {estado.fase === 'enviando' && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-brand transition-all"
                style={{ width: `${estado.progresso}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">{estado.progresso}% — processando no servidor…</p>
          </div>
        )}
      </div>

      {estado.fase === 'erro' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {estado.mensagem}
        </div>
      )}

      {estado.fase === 'ok' && (
        <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <div>
            <h2 className="text-base font-semibold text-emerald-900">Importação concluída</h2>
            <p className="text-sm text-emerald-800">
              {estado.resumo.empresa} ({estado.resumo.cnpjEmpresa})
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Lançamentos importados</dt>
              <dd className="text-lg font-semibold text-slate-900">{estado.resumo.linhasImportadas}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Contas</dt>
              <dd className="text-lg font-semibold text-slate-900">{estado.resumo.contas.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Erros</dt>
              <dd className="text-lg font-semibold text-slate-900">{estado.resumo.totalErros}</dd>
            </div>
          </dl>
          <Link
            href={`/lancamentos?importacaoId=${estado.resumo.importacaoId}`}
            className="inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Ver lançamentos
          </Link>
        </div>
      )}
    </div>
  )
}
