import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import {
  calcularKpisBalancete,
  agregarContasBalancete,
  resumoMensalBalancete,
  gerarAlertas,
  type ContaBalancete,
} from '@/lib/fib/kpi-service'
import { FibDashboardData, FibSerieMensalPonto } from '@/lib/types/fib'
import { chaveCache, lerCache, gravarCache } from '@/lib/fib/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Mapeia fichas do Prisma para o shape de balancete do kpi-service. */
function mapearFichas(
  fichas: {
    codigoConta: string
    codigoCompleto: string | null
    nomeConta: string
    saldoBalancete: unknown
    tipoConta: string
  }[]
): ContaBalancete[] {
  return fichas.map((f) => ({
    codigoConta: f.codigoConta,
    codigoCompleto: f.codigoCompleto,
    nomeConta: f.nomeConta,
    saldo: Number(f.saldoBalancete),
    tipoConta: f.tipoConta,
  }))
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    // O FIB consome o balancete de um Book (param `bookId`).
    const { searchParams } = new URL(req.url)
    const bookId = searchParams.get('bookId') ?? searchParams.get('importacaoId')

    if (!bookId) {
      return NextResponse.json({ erro: 'bookId é obrigatório' }, { status: 400 })
    }

    const chave = chaveCache(bookId, 'balancete', null)
    const cacheHit = lerCache(chave)
    if (cacheHit) {
      return NextResponse.json(cacheHit, {
        headers: { 'Cache-Control': 'public, max-age=300', 'X-Fib-Cache': 'HIT' },
      })
    }

    const book = await prisma.bookDigital.findUnique({
      where: { id: bookId },
      include: {
        fichas: {
          select: {
            codigoConta: true,
            codigoCompleto: true,
            nomeConta: true,
            saldoBalancete: true,
            tipoConta: true,
          },
        },
      },
    })

    if (!book) {
      return NextResponse.json({ erro: 'Book não encontrado' }, { status: 404 })
    }

    const contas = mapearFichas(book.fichas)
    const periodoData = {
      inicio: new Date(book.ano, book.mes - 1, 1),
      fim: new Date(book.ano, book.mes, 0),
    }

    const kpis = calcularKpisBalancete(contas, bookId, periodoData)
    const contasPorClassificacao = agregarContasBalancete(contas)
    const alertas = gerarAlertas(kpis)

    // Série mensal = um ponto por Book da mesma empresa (ordem cronológica).
    const booksEmpresa = await prisma.bookDigital.findMany({
      where: { empresaId: book.empresaId },
      include: {
        fichas: {
          select: {
            codigoConta: true,
            codigoCompleto: true,
            nomeConta: true,
            saldoBalancete: true,
            tipoConta: true,
          },
        },
      },
      orderBy: [{ ano: 'asc' }, { mes: 'asc' }],
    })

    const serieMensal: FibSerieMensalPonto[] = booksEmpresa.map((b) => {
      const r = resumoMensalBalancete(mapearFichas(b.fichas))
      return {
        mes: `${String(b.mes).padStart(2, '0')}/${b.ano}`,
        receitas: r.receitas,
        despesas: r.despesas,
        lucro: r.receitas - r.despesas,
        ativo: r.ativo,
      }
    })

    const dados: FibDashboardData = {
      kpis,
      contasPorClassificacao,
      serieMensal,
      alertas,
      cacheTimestamp: new Date(),
    }

    gravarCache(chave, dados)

    return NextResponse.json(dados, {
      headers: { 'Cache-Control': 'public, max-age=300', 'X-Fib-Cache': 'MISS' },
    })
  } catch (erro) {
    console.error('Erro ao calcular dashboard FIB:', erro)
    return NextResponse.json(
      { erro: 'Erro ao calcular dashboard' },
      { status: 500 }
    )
  }
}
