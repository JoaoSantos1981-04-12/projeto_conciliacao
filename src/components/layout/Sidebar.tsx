'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  FileUp, 
  Database, 
  CheckCircle2, 
  ArrowLeftRight, 
  BookOpen, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { href: '/importacao', label: 'Importação', Icon: FileUp },
  { href: '/lancamentos', label: 'Lançamentos', Icon: Database },
  { href: '/conciliacao', label: 'Conciliação', Icon: CheckCircle2 },
  { href: '/comparacao', label: 'Comparação', Icon: ArrowLeftRight },
  { href: '/book', label: 'Book Digital', Icon: BookOpen },
  { href: '/relatorios', label: 'Relatórios', Icon: BarChart3 },
]

interface SidebarProps {
  userEmail?: string | null
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Recarrega o estado de colapso do localStorage se houver
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapse = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('sidebar-collapsed', String(nextState))
    window.dispatchEvent(new Event('sidebar-toggle'))
  }

  return (
    <>
      {/* Botão de Menu Mobile */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <span className="font-display text-lg font-bold bg-gradient-to-r from-emeraldBlue-600 to-emeraldBlue-400 bg-clip-text text-transparent">
          Conciliação Contábil
        </span>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Overlay do Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed bottom-0 top-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900
          ${isMobileOpen ? 'left-0 w-64' : '-left-64 lg:left-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Cabeçalho / Logo */}
        <div className={`flex h-16 items-center border-b border-slate-200/50 dark:border-slate-800/50 relative ${(mounted && isCollapsed) ? 'justify-center' : 'justify-between px-4'}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emeraldBlue-500 to-emeraldBlue-700 text-white shadow-md shadow-emeraldBlue-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            {!(mounted && isCollapsed) && (
              <span className="font-display font-bold text-slate-800 dark:text-white truncate text-base">
                Conciliação
              </span>
            )}
          </div>
          
          {/* Botão de Fechar Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Botão de Colapsar Desktop */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden absolute -right-3.5 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 shadow-sm z-50 lg:flex items-center justify-center"
          >
            {(mounted && isCollapsed) ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.Icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group relative
                  ${isActive 
                    ? 'bg-emeraldBlue-50 text-emeraldBlue-700 dark:bg-emeraldBlue-950/40 dark:text-emeraldBlue-400' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-100'
                  }
                `}
              >
                <Icon className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-emeraldBlue-600 dark:text-emeraldBlue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {(!isCollapsed || isMobileOpen) ? (
                  <span className="truncate">{item.label}</span>
                ) : (
                  <span className="absolute left-16 z-50 ml-2 hidden rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-md dark:bg-slate-800 group-hover:block whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé / Switcher + Usuário */}
        <div className="border-t border-slate-200/50 p-4 space-y-4 dark:border-slate-800/50 bg-slate-50/40 dark:bg-slate-900/20">
          <div className="flex items-center justify-between gap-2">
            {(!isCollapsed || isMobileOpen) && <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Aparência</span>}
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-display font-semibold text-sm">
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {userEmail || 'Usuário'}
                </p>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  type="button"
                  className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <LogOut className="h-3 w-3" />
                  Sair
                </button>
              </div>
            )}
            {isCollapsed && !isMobileOpen && (
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                title="Sair"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
