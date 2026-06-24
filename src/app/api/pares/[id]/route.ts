import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['APROVADO', 'REJEITADO', 'PENDENTE'] as const
type StatusAprovacao = (typeof STATUS_VALIDOS)[number]

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  let body: { statusAprovacao?: string; observacao?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 })
  }

  const status = body.statusAprovacao
  if (!status || !STATUS_VALIDOS.includes(status as StatusAprovacao)) {
    return NextResponse.json(
      { erro: `statusAprovacao deve ser um de: ${STATUS_VALIDOS.join(', ')}.` },
      { status: 400 },
    )
  }
  const statusAprovacao = status as StatusAprovacao

  const par = await prisma.parConciliacao.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!par) {
    return NextResponse.json({ erro: 'Par de conciliação não encontrado.' }, { status: 404 })
  }

  try {
    // Rejeitar devolve os lançamentos para PENDENTE (mantendo o vínculo para reabertura).
    const statusLancamento = statusAprovacao === 'REJEITADO' ? 'PENDENTE' : 'CONCILIADO'
    await prisma.$transaction([
      prisma.parConciliacao.update({
        where: { id: params.id },
        data: {
          statusAprovacao,
          observacao: body.observacao?.trim() || null,
          aprovadoPor: statusAprovacao === 'APROVADO' ? 'usuario' : null,
          aprovadoEm: statusAprovacao === 'APROVADO' ? new Date() : null,
        },
      }),
      prisma.lancamento.updateMany({
        where: { parConciliadoId: params.id },
        data: { statusConciliacao: statusLancamento },
      }),
    ])
    return NextResponse.json({ id: params.id, statusAprovacao }, { status: 200 })
  } catch (e) {
    console.error('[pares] falha ao atualizar aprovação:', e)
    return NextResponse.json({ erro: 'Falha ao atualizar o par.' }, { status: 500 })
  }
}
