import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { StatusOcorrencia, ResponsavelArea } from '@/lib/types/book'

export const runtime = 'nodejs'

const STATUS: readonly StatusOcorrencia[] = ['ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA', 'CANCELADA']
const RESPONSAVEIS: readonly ResponsavelArea[] = [
  'CONTABILIDADE',
  'FINANCEIRO',
  'FISCAL',
  'CLIENTE',
  'AUDITORIA',
]

// PATCH /api/book/[id]/ocorrencias/[ocId] — atualiza status/ação/responsável/prazo.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; ocId: string } },
): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 })
  }
  const { status, acaoCorretiva, responsavel, prazo } = (body ?? {}) as Record<string, unknown>

  const data: Record<string, unknown> = {}
  if (status !== undefined) {
    if (typeof status !== 'string' || !(STATUS as readonly string[]).includes(status)) {
      return NextResponse.json({ erro: 'status inválido.' }, { status: 400 })
    }
    data.status = status
  }
  if (responsavel !== undefined) {
    if (
      typeof responsavel !== 'string' ||
      !(RESPONSAVEIS as readonly string[]).includes(responsavel)
    ) {
      return NextResponse.json({ erro: 'responsavel inválido.' }, { status: 400 })
    }
    data.responsavel = responsavel
  }
  if (acaoCorretiva !== undefined) {
    if (typeof acaoCorretiva !== 'string') {
      return NextResponse.json({ erro: 'acaoCorretiva deve ser string.' }, { status: 400 })
    }
    data.acaoCorretiva = acaoCorretiva
  }
  if (prazo !== undefined) {
    if (typeof prazo !== 'string' || Number.isNaN(Date.parse(prazo))) {
      return NextResponse.json({ erro: 'prazo deve ser uma data ISO.' }, { status: 400 })
    }
    data.prazo = new Date(prazo)
  }

  const ocorrencia = await prisma.ocorrenciaBook.findFirst({
    where: { id: params.ocId, bookId: params.id },
  })
  if (!ocorrencia) {
    return NextResponse.json({ erro: 'Ocorrência não encontrada.' }, { status: 404 })
  }

  const atualizada = await prisma.ocorrenciaBook.update({
    where: { id: params.ocId },
    data,
  })
  return NextResponse.json(atualizada)
}
