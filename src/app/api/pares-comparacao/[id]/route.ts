import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { StatusParComparacao } from '@/lib/types/comparacao'

export const runtime = 'nodejs'

const STATUS_VALIDOS: StatusParComparacao[] = ['PENDENTE', 'APROVADO', 'REJEITADO', 'IGNORADO']

// PATCH /api/pares-comparacao/[id] — aprova, rejeita ou ignora um par de comparação.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  let body: { status?: string; observacao?: string; motivoRejeicao?: string; aprovadoPor?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 })
  }

  const status = body.status
  if (!status || !STATUS_VALIDOS.includes(status as StatusParComparacao)) {
    return NextResponse.json(
      { erro: `status deve ser um de: ${STATUS_VALIDOS.join(', ')}.` },
      { status: 400 },
    )
  }
  const novoStatus = status as StatusParComparacao

  const par = await prisma.parComparacao.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!par) {
    return NextResponse.json({ erro: 'Par de comparação não encontrado.' }, { status: 404 })
  }

  try {
    const aprovado = novoStatus === 'APROVADO'
    await prisma.parComparacao.update({
      where: { id: params.id },
      data: {
        status: novoStatus,
        observacao: body.observacao?.trim() || null,
        motivoRejeicao: novoStatus === 'REJEITADO' ? body.motivoRejeicao?.trim() || null : null,
        aprovadoPor: aprovado ? body.aprovadoPor?.trim() || 'usuario' : null,
        aprovadoEm: aprovado ? new Date() : null,
      },
    })
    return NextResponse.json({ id: params.id, status: novoStatus }, { status: 200 })
  } catch (e) {
    console.error('[pares-comparacao] falha ao atualizar par:', e)
    return NextResponse.json({ erro: 'Falha ao atualizar o par.' }, { status: 500 })
  }
}
