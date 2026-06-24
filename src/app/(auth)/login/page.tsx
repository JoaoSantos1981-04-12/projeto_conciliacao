import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = { title: 'Entrar · Conciliação Contábil' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-brand">Conciliação Contábil</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Entre para acessar o sistema.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
