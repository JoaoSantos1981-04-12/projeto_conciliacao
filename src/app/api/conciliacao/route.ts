import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { executarConciliacao } from '@/lib/conciliacao/executar'

export const runtime = 'nodejs'

export async function POST(req: Request): Promise<NextResponse> {
  let body: { importacaoId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido: envie JSON com "importacaoId".' }, { status: 400 })
  }

  const importacaoId = body.importacaoId?.trim()
  if (!importacaoId) {
    return NextResponse.json({ erro: 'Campo "importacaoId" é obrigatório.' }, { status: 400 })
  }

  const importacao = await prisma.importacaoRazao.findUnique({
    where: { id: importacaoId },
    select: { id: true },
  })
  if (!importacao) {
    return NextResponse.json({ erro: 'Importação não encontrada.' }, { status: 404 })
  }

  try {
    const resumo = await executarConciliacao(prisma, importacaoId)
    return NextResponse.json(resumo, { status: 201 })
  } catch (e) {
    console.error('[conciliacao] falha ao conciliar:', e)
    return NextResponse.json({ erro: 'Falha ao executar a conciliação.' }, { status: 500 })
  }
}
