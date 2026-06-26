import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { criarBook } from '@/lib/book/book-service'

export const runtime = 'nodejs'

// POST /api/book — cria book. Body: { empresaId, ano, mes, elaboradoPor }
export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 })
  }

  const { empresaId, ano, mes, elaboradoPor } = (body ?? {}) as Record<string, unknown>
  if (
    typeof empresaId !== 'string' ||
    typeof elaboradoPor !== 'string' ||
    typeof ano !== 'number' ||
    typeof mes !== 'number' ||
    mes < 1 ||
    mes > 12
  ) {
    return NextResponse.json(
      { erro: 'Campos obrigatórios: empresaId (string), ano (int), mes (1-12), elaboradoPor (string).' },
      { status: 400 },
    )
  }

  try {
    const book = await criarBook(prisma, { empresaId, ano, mes, elaboradoPor })
    return NextResponse.json(book, { status: 201 })
  } catch (e) {
    // @@unique([empresaId, ano, mes]) → book do mês já existe.
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { erro: 'Já existe um book para esta empresa/ano/mês.' },
        { status: 409 },
      )
    }
    console.error('[book] falha ao criar book:', e)
    return NextResponse.json({ erro: 'Falha ao criar o book.' }, { status: 500 })
  }
}

// GET /api/book — lista books. Query: ?empresaId=&ano=&mes=
export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url)
  const empresaId = url.searchParams.get('empresaId') ?? undefined
  const anoStr = url.searchParams.get('ano')
  const mesStr = url.searchParams.get('mes')

  const books = await prisma.bookDigital.findMany({
    where: {
      empresaId,
      ano: anoStr ? Number(anoStr) : undefined,
      mes: mesStr ? Number(mesStr) : undefined,
    },
    orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
    include: { _count: { select: { fichas: true, ocorrencias: true } } },
  })
  return NextResponse.json(books)
}
