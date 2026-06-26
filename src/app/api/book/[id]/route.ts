import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'

// GET /api/book/[id] — detalhe do book com fichas.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const book = await prisma.bookDigital.findUnique({
    where: { id: params.id },
    include: {
      fichas: { orderBy: { codigoConta: 'asc' } },
      _count: { select: { ocorrencias: true } },
    },
  })
  if (!book) {
    return NextResponse.json({ erro: 'Book não encontrado.' }, { status: 404 })
  }
  return NextResponse.json(book)
}
