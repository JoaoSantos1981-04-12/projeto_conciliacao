import type { PrismaClient } from '@prisma/client'
import { LancRelatorio, MetaRelatorio } from './relatorio'

export interface DadosRelatorio {
  lancamentos: LancRelatorio[]
  meta: MetaRelatorio
  referencia: Date
}

function periodoDe(valor: unknown): { inicio: string; fim: string } | null {
  if (valor && typeof valor === 'object' && 'inicio' in valor && 'fim' in valor) {
    const p = valor as { inicio: string; fim: string }
    return { inicio: p.inicio, fim: p.fim }
  }
  return null
}

/**
 * Carrega os lançamentos para o relatório. Se `importacaoId` for informado,
 * restringe a essa importação (e usa o fim do período como data-base do aging).
 */
export async function carregarDadosRelatorio(
  prisma: PrismaClient,
  importacaoId?: string,
): Promise<DadosRelatorio> {
  const importacao = importacaoId
    ? await prisma.importacaoRazao.findUnique({
        where: { id: importacaoId },
        select: { id: true, empresa: true, periodo: true },
      })
    : await prisma.importacaoRazao.findFirst({
        orderBy: { criadoEm: 'desc' },
        select: { id: true, empresa: true, periodo: true },
      })

  const periodo = importacao ? periodoDe(importacao.periodo) : null

  const rows = await prisma.lancamento.findMany({
    where: importacao ? { importacaoId: importacao.id } : undefined,
    select: {
      id: true,
      dataLancamento: true,
      documento: true,
      natureza: true,
      debito: true,
      credito: true,
      dupCr: true,
      parcela: true,
      nomeParceiro: true,
      statusConciliacao: true,
    },
  })

  const lancamentos: LancRelatorio[] = rows.map((r) => ({
    id: r.id,
    dataLancamento: r.dataLancamento,
    documento: r.documento,
    natureza: r.natureza,
    debito: Number(r.debito),
    credito: Number(r.credito),
    dupCr: r.dupCr,
    parcela: r.parcela,
    nomeParceiro: r.nomeParceiro,
    statusConciliacao: r.statusConciliacao,
  }))

  return {
    lancamentos,
    meta: {
      importacaoId: importacao?.id ?? null,
      empresa: importacao?.empresa ?? 'Todas as importações',
      periodo,
    },
    referencia: periodo ? new Date(periodo.fim) : new Date(),
  }
}

export async function listarImportacoesParaFiltro(prisma: PrismaClient) {
  return prisma.importacaoRazao.findMany({
    orderBy: { criadoEm: 'desc' },
    select: { id: true, empresa: true, nomeArquivo: true },
    take: 50,
  })
}
