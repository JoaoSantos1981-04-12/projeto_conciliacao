import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { validarBook } from '@/lib/book/book-service'

export const runtime = 'nodejs'

// POST /api/book/[id]/validar — reprocessa amarração de todas as fichas.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const book = await prisma.bookDigital.findUnique({ where: { id: params.id } })
  if (!book) {
    return NextResponse.json({ erro: 'Book não encontrado.' }, { status: 404 })
  }
  try {
    const resultado = await validarBook(prisma, params.id)
    return NextResponse.json(resultado)
  } catch (e) {
    console.error('[validar] falha:', e)
    return NextResponse.json({ erro: 'Falha ao validar o book.' }, { status: 500 })
  }
}
