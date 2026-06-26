'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  FileSpreadsheet 
} from 'lucide-react'

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
  const [isDragActive, setIsDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setArquivo(e.dataTransfer.files[0])
      setEstado({ fase: 'idle' })
    }
  }

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
      <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
          Arquivo do razão (.xlsx)
        </label>
        
        {/* Zona de Drop */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 group
            ${isDragActive 
              ? 'border-emeraldBlue-500 bg-emeraldBlue-50/50 dark:border-emeraldBlue-400 dark:bg-emeraldBlue-950/10' 
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:border-slate-700'
            }
          `}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emeraldBlue-50 text-emeraldBlue-600 dark:bg-emeraldBlue-950/50 dark:text-emeraldBlue-400 mb-4 transition-transform group-hover:scale-110">
            {arquivo ? (
              <FileSpreadsheet className="h-6 w-6" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>
          
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-md">
            {arquivo ? (
              <span className="font-semibold text-emeraldBlue-600 dark:text-emeraldBlue-400">{arquivo.name}</span>
            ) : (
              'Arraste seu arquivo do razão aqui ou clique para selecionar'
            )}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Formatos aceitos: Microsoft Excel (.xlsx, .xls)
          </p>
          
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            disabled={estado.fase === 'enviando'}
            onChange={(e) => {
              setArquivo(e.target.files?.[0] ?? null)
              setEstado({ fase: 'idle' })
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={enviar}
            disabled={!arquivo || estado.fase === 'enviando'}
            className="inline-flex items-center gap-2 rounded-lg bg-emeraldBlue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emeraldBlue-600 dark:hover:bg-emeraldBlue-500"
          >
            {estado.fase === 'enviando' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              'Importar Razão'
            )}
          </button>
          
          {(estado.fase === 'ok' || estado.fase === 'erro') && (
            <button
              type="button"
              onClick={reiniciar}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Nova importação
            </button>
          )}
        </div>

        {estado.fase === 'enviando' && (
          <div className="mt-6 space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emeraldBlue-500 to-emeraldBlue-700 transition-all duration-300"
                style={{ width: `${estado.progresso}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{estado.progresso}% finalizado</span>
              <span className="animate-pulse">processando lançamentos no servidor...</span>
            </div>
          </div>
        )}
      </div>

      {estado.fase === 'erro' && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 dark:text-red-300">
            <span className="font-semibold">Erro no processamento:</span> {estado.mensagem}
          </div>
        </div>
      )}

      {estado.fase === 'ok' && (
        <div className="space-y-5 rounded-xl border border-emeraldBlue-200 bg-emeraldBlue-50/50 p-6 dark:border-emeraldBlue-900/30 dark:bg-emeraldBlue-950/15">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emeraldBlue-600 dark:text-emeraldBlue-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Importação concluída com sucesso</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {estado.resumo.empresa} (CNPJ: {estado.resumo.cnpjEmpresa})
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 border-y border-slate-200/50 py-4 dark:border-slate-800">
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Lançamentos</dt>
              <dd className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{estado.resumo.linhasImportadas}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contas lidas</dt>
              <dd className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{estado.resumo.contas.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Erros</dt>
              <dd className={`mt-1 text-2xl font-bold ${estado.resumo.totalErros > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                {estado.resumo.totalErros}
              </dd>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Link
              href={`/lancamentos?importacaoId=${estado.resumo.importacaoId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emeraldBlue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emeraldBlue-700 transition active:translate-y-px dark:bg-emeraldBlue-600 dark:hover:bg-emeraldBlue-500"
            >
              Visualizar lançamentos
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
