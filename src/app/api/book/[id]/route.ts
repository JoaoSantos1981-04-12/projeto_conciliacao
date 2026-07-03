import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { BookStatus } from '@/lib/types/book'
import {
  transicaoValida,
  podeExcluirBook,
  STATUS_LABEL,
} from '@/lib/book/book-workflow'

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

// PATCH /api/book/[id] — transição de status do workflow de validação.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  let body: { status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido (JSON).' }, { status: 400 })
  }

  const novoStatus = body.status as BookStatus | undefined
  if (!novoStatus || !(novoStatus in STATUS_LABEL)) {
    return NextResponse.json({ erro: 'Status inválido.' }, { status: 400 })
  }

  const book = await prisma.bookDigital.findUnique({
    where: { id: params.id },
    select: { status: true },
  })
  if (!book) {
    return NextResponse.json({ erro: 'Book não encontrado.' }, { status: 404 })
  }

  const atual = book.status as BookStatus
  if (atual === novoStatus) {
    return NextResponse.json({ erro: 'O book já está nesse status.' }, { status: 409 })
  }
  if (!transicaoValida(atual, novoStatus)) {
    return NextResponse.json(
      {
        erro: `Transição inválida: ${STATUS_LABEL[atual]} → ${STATUS_LABEL[novoStatus]}.`,
      },
      { status: 409 },
    )
  }

  const atualizado = await prisma.bookDigital.update({
    where: { id: params.id },
    data: { status: novoStatus },
    select: { id: true, status: true },
  })
  return NextResponse.json(atualizado)
}

// DELETE /api/book/[id] — exclui o book (cascateia fichas/ocorrências).
// Bloqueado para books aprovados/reportados (segurança do processo).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const book = await prisma.bookDigital.findUnique({
    where: { id: params.id },
    select: { status: true },
  })
  if (!book) {
    return NextResponse.json({ erro: 'Book não encontrado.' }, { status: 404 })
  }

  if (!podeExcluirBook(book.status as BookStatus)) {
    return NextResponse.json(
      {
        erro: `Book ${STATUS_LABEL[book.status as BookStatus]} não pode ser excluído. Apenas books em edição ou em revisão podem ser removidos.`,
      },
      { status: 409 },
    )
  }

  await prisma.bookDigital.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
