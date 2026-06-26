'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evita erro de hidratação esperando a montagem no cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80"
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? (
        <Sun className="h-4.5 w-4.5 text-amber-500 transition-transform hover:rotate-12" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-slate-500 hover:text-slate-700 transition-transform hover:-rotate-12" />
      )}
    </button>
  )
}
