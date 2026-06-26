'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Banknote,
  Sparkles,
  Download,
  FileJson,
  Home,
} from 'lucide-react'
import { useFibContext } from '@/lib/fib/context'
import { exportarDashboardPdf, exportarKpisExcel } from '@/lib/fib/export'

const abas = [
  { label: 'Geral', href: '/fib/geral', icon: Home },
  { label: 'CEO', href: '/fib/ceo', icon: TrendingUp },
  { label: 'CFO', href: '/fib/cfo', icon: DollarSign },
  { label: 'Fiscal', href: '/fib/fiscal', icon: Banknote },
  { label: 'IA', href: '/fib/ia', icon: Sparkles },
]

/** Converte Date -> "yyyy-MM-dd" para inputs de data. */
function paraInputDate(d: Date | null | undefined): string {
  if (!d) return ''
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function FibTopBar() {
  const pathname = usePathname()
  const {
    importacoesDisponiveis,
    importacaoAtual,
    selecionarImportacao,
    periodoSelecionado,
    definirPeriodo,
    carregandoImportacoes,
    dados,
  } = useFibContext()

  const [exportando, setExportando] = React.useState<null | 'pdf' | 'excel'>(
    null
  )

  const exportarPDF = async () => {
    const elemento = document.getElementById('fib-export-root')
    if (!elemento) return
    setExportando('pdf')
    try {
      await exportarDashboardPdf(elemento, importacaoAtual?.empresa)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
    } finally {
      setExportando(null)
    }
  }

  const exportarExcel = async () => {
    if (!dados) return
    setExportando('excel')
    try {
      await exportarKpisExcel(dados, importacaoAtual?.empresa)
    } catch (err) {
      console.error('Erro ao exportar Excel:', err)
    } finally {
      setExportando(null)
    }
  }

  return (
    <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo e Título */}
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-emerald-500" />
            <h1 className="text-lg font-semibold">Inteligência Financeira</h1>
          </div>

          {/* Filtros */}
          <div className="flex-1 flex items-center gap-4 justify-center">
            <select
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm
                hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500
                disabled:opacity-50 max-w-xs"
              aria-label="Selecione empresa/importação"
              value={importacaoAtual?.id ?? ''}
              onChange={(e) => selecionarImportacao(e.target.value)}
              disabled={carregandoImportacoes || importacoesDisponiveis.length === 0}
            >
              {carregandoImportacoes ? (
                <option value="">Carregando…</option>
              ) : importacoesDisponiveis.length === 0 ? (
                <option value="">Nenhuma importação</option>
              ) : (
                importacoesDisponiveis.map((imp) => (
                  <option key={imp.id} value={imp.id}>
                    {imp.empresa} — {imp.nomeArquivo}
                  </option>
                ))
              )}
            </select>

            <input
              type="date"
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm
                hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Data inicial"
              value={paraInputDate(periodoSelecionado?.inicio)}
              onChange={(e) =>
                definirPeriodo(
                  e.target.value ? new Date(`${e.target.value}T00:00:00`) : null,
                  null
                )
              }
            />

            <span className="text-slate-500">até</span>

            <input
              type="date"
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm
                hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Data final"
              value={paraInputDate(periodoSelecionado?.fim)}
              onChange={(e) =>
                definirPeriodo(
                  null,
                  e.target.value
                    ? new Date(`${e.target.value}T23:59:59.999`)
                    : null
                )
              }
            />
          </div>

          {/* Botões de Exportação */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportarPDF}
              disabled={exportando !== null || !dados}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700
                flex items-center gap-2 text-sm transition-colors disabled:opacity-50
                disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {exportando === 'pdf' ? 'Gerando…' : 'PDF'}
            </button>

            <button
              onClick={exportarExcel}
              disabled={exportando !== null || !dados}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700
                flex items-center gap-2 text-sm transition-colors disabled:opacity-50
                disabled:cursor-not-allowed"
            >
              <FileJson className="w-4 h-4" />
              {exportando === 'excel' ? 'Gerando…' : 'Excel'}
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mt-4 border-t border-slate-700/50 pt-4">
          {abas.map((aba) => {
            const IconComponent = aba.icon
            const ativo = pathname === aba.href
            return (
              <Link
                key={aba.href}
                href={aba.href}
                className={`px-4 py-2 rounded-t text-sm font-medium flex items-center gap-2
                  transition-all duration-200
                  ${
                    ativo
                      ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }
                `}
              >
                <IconComponent className="w-4 h-4" />
                {aba.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
