import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'

// GET /api/book/[id]/ocorrencias — lista ocorrências do book.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const ocorrencias = await prisma.ocorrenciaBook.findMany({
    where: { bookId: params.id },
    orderBy: { criadoEm: 'desc' },
  })
  return NextResponse.json(ocorrencias)
}
