import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LogoutButton } from '@/components/auth/LogoutButton'

const navItens = [
  { href: '/importacao', label: 'Importação' },
  { href: '/lancamentos', label: 'Lançamentos' },
  { href: '/conciliacao', label: 'Conciliação' },
  { href: '/comparacao', label: 'Comparação' },
  { href: '/relatorios', label: 'Relatórios' },
  { href: '/fib/geral', label: 'Inteligência Financeira' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
          <span className="text-lg font-semibold text-brand">Conciliação Contábil</span>
          <nav className="flex gap-1">
            {navItens.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {session?.user?.email && (
              <span className="text-sm text-slate-500">{session.user.email}</span>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}
