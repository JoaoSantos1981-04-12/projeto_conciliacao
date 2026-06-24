import type { PrismaClient } from '@prisma/client'

/** Importações com a contagem de status e a última sessão de conciliação. */
export async function listarImportacoesComStatus(prisma: PrismaClient) {
  const [importacoes, statusPorImportacao] = await Promise.all([
    prisma.importacaoRazao.findMany({
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        nomeArquivo: true,
        empresa: true,
        criadoEm: true,
        _count: { select: { lancamentos: true } },
        sessoesConciliacao: {
          orderBy: { criadoEm: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            totalPares: true,
            divergencias: true,
            criadoEm: true,
          },
        },
      },
    }),
    prisma.lancamento.groupBy({
      by: ['importacaoId', 'statusConciliacao'],
      _count: { _all: true },
    }),
  ])

  const contagem = new Map<string, Record<string, number>>()
  for (const linha of statusPorImportacao) {
    const atual = contagem.get(linha.importacaoId) ?? {}
    atual[linha.statusConciliacao] = linha._count._all
    contagem.set(linha.importacaoId, atual)
  }

  return importacoes.map((imp) => {
    const c = contagem.get(imp.id) ?? {}
    return {
      ...imp,
      sessao: imp.sessoesConciliacao[0] ?? null,
      conciliados: c.CONCILIADO ?? 0,
      pendentes: c.PENDENTE ?? 0,
      divergentes: c.DIVERGENCIA ?? 0,
    }
  })
}

const SELECT_LANCAMENTO = {
  id: true,
  dataLancamento: true,
  documento: true,
  natureza: true,
  debito: true,
  credito: true,
  saldo: true,
  dupCr: true,
  parcela: true,
  nomeParceiro: true,
} as const

/** Carrega uma sessão com seus pares (e lançamentos) + divergentes + pendentes. */
export async function carregarSessao(prisma: PrismaClient, sessaoId: string) {
  const sessao = await prisma.sessaoConciliacao.findUnique({
    where: { id: sessaoId },
    select: {
      id: true,
      status: true,
      totalPares: true,
      paresAutomatic: true,
      paresManuais: true,
      divergencias: true,
      criadoEm: true,
      importacao: { select: { id: true, empresa: true, nomeArquivo: true } },
      pares: {
        orderBy: [{ scoreConfianca: 'desc' }, { criadoEm: 'asc' }],
        select: {
          id: true,
          tipoMatch: true,
          scoreConfianca: true,
          diferencaValor: true,
          statusAprovacao: true,
          observacao: true,
          aprovadoPor: true,
          aprovadoEm: true,
          lancamentos: {
            orderBy: { debito: 'desc' },
            select: SELECT_LANCAMENTO,
          },
        },
      },
    },
  })

  if (!sessao) return null

  const importacaoId = sessao.importacao.id
  const [divergentes, pendentes] = await Promise.all([
    prisma.lancamento.findMany({
      where: { importacaoId, statusConciliacao: 'DIVERGENCIA' },
      orderBy: [{ dupCr: 'asc' }, { debito: 'desc' }],
      select: SELECT_LANCAMENTO,
    }),
    prisma.lancamento.findMany({
      where: { importacaoId, statusConciliacao: 'PENDENTE' },
      orderBy: { dataLancamento: 'asc' },
      select: SELECT_LANCAMENTO,
    }),
  ])

  return { sessao, divergentes, pendentes }
}
