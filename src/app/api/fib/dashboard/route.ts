import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import {
  calcularKpis,
  agregarContas,
  calcularSerieMensal,
  gerarAlertas,
} from '@/lib/fib/kpi-service'
import { FibDashboardData } from '@/lib/types/fib'
import { chaveCache, lerCache, gravarCache } from '@/lib/fib/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Extrair parâmetros
    const { searchParams } = new URL(req.url)
    const importacaoId = searchParams.get('importacaoId')
    const periodoInicio = searchParams.get('periodoInicio')
    const periodoFim = searchParams.get('periodoFim')

    if (!importacaoId) {
      return NextResponse.json(
        { erro: 'importacaoId é obrigatório' },
        { status: 400 }
      )
    }

    // Cache em memória (importação + período); evita recalcular a cada request.
    const chave = chaveCache(importacaoId, periodoInicio, periodoFim)
    const cacheHit = lerCache(chave)
    if (cacheHit) {
      return NextResponse.json(cacheHit, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'X-Fib-Cache': 'HIT',
        },
      })
    }

    // Buscar importação
    const importacao = await prisma.importacaoRazao.findUnique({
      where: { id: importacaoId },
      include: {
        lancamentos: {
          where: {
            dataLancamento: {
              gte: periodoInicio ? new Date(periodoInicio) : undefined,
              lte: periodoFim ? new Date(periodoFim) : undefined,
            },
          },
          // Carrega o código/nome da conta para a classificação CPC.
          include: {
            contaContabil: { select: { codigo: true, nome: true } },
          },
        },
      },
    })

    if (!importacao) {
      return NextResponse.json(
        { erro: 'Importação não encontrada' },
        { status: 404 }
      )
    }

    // Calcular KPIs
    const periodoData = {
      inicio: periodoInicio ? new Date(periodoInicio) : new Date(importacao.criadoEm),
      fim: periodoFim ? new Date(periodoFim) : new Date(),
    }

    const kpis = calcularKpis(
      importacao.lancamentos,
      importacaoId,
      periodoData
    )

    // Agregar contas por classificação
    const contasPorClassificacao = agregarContas(importacao.lancamentos)

    // Série temporal (mês a mês) para os gráficos de crescimento
    const serieMensal = calcularSerieMensal(importacao.lancamentos)

    // Gerar alertas
    const alertas = gerarAlertas(kpis)

    const dados: FibDashboardData = {
      kpis,
      contasPorClassificacao,
      serieMensal,
      alertas,
      cacheTimestamp: new Date(),
    }

    gravarCache(chave, dados)

    return NextResponse.json(dados, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache por 5 minutos
        'X-Fib-Cache': 'MISS',
      },
    })
  } catch (erro) {
    console.error('Erro ao calcular dashboard FIB:', erro)
    return NextResponse.json(
      { erro: 'Erro ao calcular dashboard' },
      { status: 500 }
    )
  }
}
