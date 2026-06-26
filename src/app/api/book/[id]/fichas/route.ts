import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'

// GET /api/book/[id]/fichas — lista fichas com status.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const fichas = await prisma.fichaConciliacao.findMany({
    where: { bookId: params.id },
    orderBy: { codigoConta: 'asc' },
  })
  return NextResponse.json(fichas)
}
