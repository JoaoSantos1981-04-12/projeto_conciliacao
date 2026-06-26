import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { analisarBookLlm } from '@/lib/book/book-service'

// §2.4 / B4: análise LLM assíncrona, fora do path do upload.
export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/book/[id]/analisar-llm — dispara LLM nas fichas TOLERANCIA/DIVERGENTE.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const book = await prisma.bookDigital.findUnique({ where: { id: params.id } })
  if (!book) {
    return NextResponse.json({ erro: 'Book não encontrado.' }, { status: 404 })
  }
  try {
    const resultado = await analisarBookLlm(prisma, params.id)
    return NextResponse.json(resultado)
  } catch (e) {
    console.error('[analisar-llm] falha:', e)
    return NextResponse.json(
      { erro: 'Falha ao analisar as fichas via LLM.' },
      { status: 500 },
    )
  }
}
