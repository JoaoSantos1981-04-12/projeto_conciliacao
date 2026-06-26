import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Lista as importações disponíveis para alimentar o seletor da TopBar do FIB.
 * O período (Json `{ inicio, fim }`) é normalizado para ISO string e serve de
 * default ao selecionar uma importação.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const importacoes = await prisma.importacaoRazao.findMany({
      where: { status: 'CONCLUIDA' },
      select: {
        id: true,
        nomeArquivo: true,
        empresa: true,
        periodo: true,
        criadoEm: true,
      },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    })

    const itens = importacoes.map((imp) => {
      const periodo = (imp.periodo ?? {}) as { inicio?: string; fim?: string }
      return {
        id: imp.id,
        empresa: imp.empresa,
        nomeArquivo: imp.nomeArquivo,
        periodoInicio: periodo.inicio ?? null,
        periodoFim: periodo.fim ?? null,
      }
    })

    return NextResponse.json({ importacoes: itens })
  } catch (erro) {
    console.error('Erro ao listar importações para FIB:', erro)
    return NextResponse.json(
      { erro: 'Erro ao listar importações' },
      { status: 500 }
    )
  }
}
