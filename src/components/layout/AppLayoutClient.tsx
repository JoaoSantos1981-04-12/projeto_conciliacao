'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'

export function AppLayoutClient({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail?: string | null
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  useEffect(() => {
    // Carrega o estado inicial do localStorage
    const saved = localStorage.getItem('sidebar-collapsed')
    setIsCollapsed(saved === 'true')
    
    const handleToggle = () => {
      const val = localStorage.getItem('sidebar-collapsed')
      setIsCollapsed(val === 'true')
    }
    
    window.addEventListener('storage', handleToggle)
    window.addEventListener('sidebar-toggle', handleToggle)
    
    return () => {
      window.removeEventListener('storage', handleToggle)
      window.removeEventListener('sidebar-toggle', handleToggle)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <Sidebar userEmail={userEmail} />
      <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
