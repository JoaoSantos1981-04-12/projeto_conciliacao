import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'

// GET /api/book/[id]/fichas/[fichaId] — detalhe: itens + validação + análise.
export async function GET(
  _req: Request,
  { params }: { params: { id: string; fichaId: string } },
): Promise<NextResponse> {
  const ficha = await prisma.fichaConciliacao.findFirst({
    where: { id: params.fichaId, bookId: params.id },
    include: {
      itens: { orderBy: { criadoEm: 'asc' } },
      pdfsSupporte: true,
      ocorrencias: true,
    },
  })
  if (!ficha) {
    return NextResponse.json({ erro: 'Ficha não encontrada.' }, { status: 404 })
  }
  return NextResponse.json(ficha)
}

// PATCH /api/book/[id]/fichas/[fichaId] — atualiza observação do contador.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; fichaId: string } },
): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 })
  }
  const { observacao } = (body ?? {}) as Record<string, unknown>
  if (typeof observacao !== 'string') {
    return NextResponse.json({ erro: 'Campo "observacao" (string) obrigatório.' }, { status: 400 })
  }

  const ficha = await prisma.fichaConciliacao.findFirst({
    where: { id: params.fichaId, bookId: params.id },
  })
  if (!ficha) {
    return NextResponse.json({ erro: 'Ficha não encontrada.' }, { status: 404 })
  }

  const atualizada = await prisma.fichaConciliacao.update({
    where: { id: params.fichaId },
    data: { observacao },
  })
  return NextResponse.json(atualizada)
}
