import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { listarContas } from '@/lib/comparacao/consulta'
import { FormNovaComparacao } from '@/components/comparacao/FormNovaComparacao'

export const metadata = { title: 'Nova comparação · Conciliação Contábil' }
export const dynamic = 'force-dynamic'

export default async function NovaComparacaoPage() {
  let contas: Awaited<ReturnType<typeof listarContas>> = []
  let erroDb = false
  try {
    contas = await listarContas(prisma)
  } catch {
    erroDb = true
  }

  const opcoes = contas.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    nome: c.nome,
    lancamentos: c._count.lancamentos,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/comparacao" className="text-sm text-brand hover:underline">
          ← Voltar para comparações
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Nova comparação</h1>
        <p className="mt-1 text-sm text-slate-600">
          Selecione as duas contas, o cenário e o período. As tolerâncias de valor e dias têm padrões
          por cenário, mas podem ser ajustadas.
        </p>
      </div>

      {erroDb ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível consultar o banco. Verifique o PostgreSQL e as migrations.
        </div>
      ) : (
        <FormNovaComparacao contas={opcoes} />
      )}
    </div>
  )
}
