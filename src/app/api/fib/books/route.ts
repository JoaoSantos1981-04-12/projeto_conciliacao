import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Lista os Books (balancetes) disponíveis para o seletor da TopBar do FIB.
 * Cada Book vira uma "fonte" no formato FibImportacaoResumo: o período é o mês
 * do Book (ano/mes) e o rótulo é "Balancete MM/AAAA".
 */
export async function GET(): Promise<NextResponse> {
  try {
    const books = await prisma.bookDigital.findMany({
      select: {
        id: true,
        empresaId: true,
        ano: true,
        mes: true,
        _count: { select: { fichas: true } },
      },
      orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
      take: 50,
    })

    const itens = books.map((b) => {
      const inicio = new Date(b.ano, b.mes - 1, 1)
      const fim = new Date(b.ano, b.mes, 0) // último dia do mês
      const mm = String(b.mes).padStart(2, '0')
      return {
        id: b.id,
        empresa: b.empresaId,
        nomeArquivo: `Balancete ${mm}/${b.ano} (${b._count.fichas} contas)`,
        periodoInicio: inicio.toISOString(),
        periodoFim: fim.toISOString(),
      }
    })

    return NextResponse.json({ books: itens })
  } catch (erro) {
    console.error('Erro ao listar books para FIB:', erro)
    return NextResponse.json(
      { erro: 'Erro ao listar books' },
      { status: 500 }
    )
  }
}
