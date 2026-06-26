'use client'

import React from 'react'
import { FibProvider } from '@/lib/fib/context'
import { FibTopBar } from '@/components/fib/FibTopBar'

export default function FibLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FibProvider>
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
        <FibTopBar />

        {/* Conteúdo (id usado como alvo da exportação PDF) */}
        <div
          id="fib-export-root"
          className="flex-1 max-w-7xl w-full mx-auto px-6 py-8"
        >
          {children}
        </div>
      </div>
    </FibProvider>
  )
}
