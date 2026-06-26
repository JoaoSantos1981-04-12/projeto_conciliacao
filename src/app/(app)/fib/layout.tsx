'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { FibProvider } from '@/lib/fib/context'
import Link from 'next/link'
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

const abas = [
  { label: 'Geral', href: '/fib/geral', icon: Home },
  { label: 'CEO', href: '/fib/ceo', icon: TrendingUp },
  { label: 'CFO', href: '/fib/cfo', icon: DollarSign },
  { label: 'Fiscal', href: '/fib/fiscal', icon: Banknote },
  { label: 'IA', href: '/fib/ia', icon: Sparkles },
]

export default function FibLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [exportando, setExportando] = useState(false)

  const exportarPDF = async () => {
    setExportando(true)
    try {
      // Implementar exportação PDF
      console.log('Exportando PDF...')
    } finally {
      setExportando(false)
    }
  }

  const exportarExcel = async () => {
    setExportando(true)
    try {
      // Implementar exportação Excel
      console.log('Exportando Excel...')
    } finally {
      setExportando(false)
    }
  }

  return (
    <FibProvider>
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
        {/* TopBar */}
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
                    hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Selecione empresa/importação"
                >
                  <option value="">Importação</option>
                </select>

                <input
                  type="date"
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm
                    hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <span className="text-slate-500">até</span>

                <input
                  type="date"
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm
                    hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Botões de Exportação */}
              <div className="flex items-center gap-2">
                <button
                  onClick={exportarPDF}
                  disabled={exportando}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700
                    flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>

                <button
                  onClick={exportarExcel}
                  disabled={exportando}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700
                    flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                >
                  <FileJson className="w-4 h-4" />
                  Excel
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

        {/* Conteúdo */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          {children}
        </div>
      </div>
    </FibProvider>
  )
}
