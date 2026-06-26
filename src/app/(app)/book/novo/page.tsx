import Link from 'next/link'
import { CriarBookForm } from '@/components/book/CriarBookForm'

export const metadata = { title: 'Novo book · Conciliação Contábil' }

export default function NovoBookPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/book" className="text-sm text-slate-500 hover:text-slate-700">
          ← Voltar para os books
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Novo book</h1>
        <p className="mt-1 text-sm text-slate-600">
          Defina a empresa e a competência. Em seguida você envia os PDFs do razão e dos relatórios.
        </p>
      </div>
      <CriarBookForm />
    </div>
  )
}
