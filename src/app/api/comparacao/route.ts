import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { executarComparacao } from '@/lib/comparacao/executar'
import { carregarSessaoComparacao } from '@/lib/comparacao/consulta'
import { CenarioComparacao } from '@/lib/types/comparacao'

export const runtime = 'nodejs'

const CENARIOS_VALIDOS: CenarioComparacao[] = [
  'FORNECEDORES_BANCO',
  'CLIENTES_BANCO',
  'INTERCOMPANY',
  'PERSONALIZADO',
]

interface PostBody {
  contaOrigemId?: string
  contaDestinoId?: string
  cenario?: string
  nomeDescritivo?: string
  periodoInicio?: string
  periodoFim?: string
  toleranciaValor?: number
  toleranciaDias?: number
}

// POST /api/comparacao — inicia uma comparação entre duas contas.
export async function POST(req: Request): Promise<NextResponse> {
  let body: PostBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido: envie JSON.' }, { status: 400 })
  }

  const contaOrigemId = body.contaOrigemId?.trim()
  const contaDestinoId = body.contaDestinoId?.trim()
  const nomeDescritivo = body.nomeDescritivo?.trim()
  const cenario = body.cenario

  if (!contaOrigemId || !contaDestinoId) {
    return NextResponse.json(
      { erro: 'Campos "contaOrigemId" e "contaDestinoId" são obrigatórios.' },
      { status: 400 },
    )
  }
  if (contaOrigemId === contaDestinoId) {
    return NextResponse.json(
      { erro: 'As contas de origem e destino devem ser diferentes.' },
      { status: 400 },
    )
  }
  if (!cenario || !CENARIOS_VALIDOS.includes(cenario as CenarioComparacao)) {
    return NextResponse.json(
      { erro: `Campo "cenario" deve ser um de: ${CENARIOS_VALIDOS.join(', ')}.` },
      { status: 400 },
    )
  }
  if (!nomeDescritivo) {
    return NextResponse.json({ erro: 'Campo "nomeDescritivo" é obrigatório.' }, { status: 400 })
  }

  const periodoInicio = body.periodoInicio ? new Date(body.periodoInicio) : null
  const periodoFim = body.periodoFim ? new Date(body.periodoFim) : null
  if (!periodoInicio || Number.isNaN(periodoInicio.getTime()) || !periodoFim || Number.isNaN(periodoFim.getTime())) {
    return NextResponse.json(
      { erro: 'Campos "periodoInicio" e "periodoFim" devem ser datas válidas.' },
      { status: 400 },
    )
  }

  const [origem, destino] = await Promise.all([
    prisma.contaContabil.findUnique({ where: { id: contaOrigemId }, select: { id: true } }),
    prisma.contaContabil.findUnique({ where: { id: contaDestinoId }, select: { id: true } }),
  ])
  if (!origem || !destino) {
    return NextResponse.json({ erro: 'Conta de origem ou destino não encontrada.' }, { status: 404 })
  }

  try {
    const { sessaoId, resumo } = await executarComparacao(prisma, {
      contaOrigemId,
      contaDestinoId,
      cenario: cenario as CenarioComparacao,
      nomeDescritivo,
      periodoInicio,
      periodoFim,
      toleranciaValor: body.toleranciaValor ?? 1.0,
      toleranciaDias: body.toleranciaDias ?? 5,
    })
    return NextResponse.json({ sessaoId, resumo }, { status: 201 })
  } catch (e) {
    console.error('[comparacao] falha ao comparar:', e)
    return NextResponse.json({ erro: 'Erro ao processar comparação.' }, { status: 500 })
  }
}

// GET /api/comparacao?sessaoId=xxx — busca o resultado de uma sessão.
export async function GET(req: Request): Promise<NextResponse> {
  const sessaoId = new URL(req.url).searchParams.get('sessaoId')
  if (!sessaoId) {
    return NextResponse.json({ erro: 'sessaoId obrigatório.' }, { status: 400 })
  }

  const resultado = await carregarSessaoComparacao(prisma, sessaoId)
  if (!resultado) {
    return NextResponse.json({ erro: 'Sessão não encontrada.' }, { status: 404 })
  }

  return NextResponse.json(resultado)
}
