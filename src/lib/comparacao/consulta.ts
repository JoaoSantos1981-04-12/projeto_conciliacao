import type { PrismaClient } from '@prisma/client'

/** Contas contábeis importadas, com a contagem de lançamentos, para os selects do formulário. */
export async function listarContas(prisma: PrismaClient) {
  return prisma.contaContabil.findMany({
    orderBy: { codigo: 'asc' },
    select: {
      id: true,
      codigo: true,
      nome: true,
      _count: { select: { lancamentos: true } },
    },
  })
}

/** Sessões de comparação já executadas (mais recentes primeiro). */
export async function listarSessoesComparacao(prisma: PrismaClient) {
  return prisma.sessaoComparacao.findMany({
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      nomeDescritivo: true,
      cenario: true,
      status: true,
      periodoInicio: true,
      periodoFim: true,
      totalParesA: true,
      totalParesB: true,
      paresEncontrados: true,
      semParA: true,
      semParB: true,
      valorDivergente: true,
      criadoEm: true,
      contaOrigem: { select: { codigo: true, nome: true } },
      contaDestino: { select: { codigo: true, nome: true } },
    },
  })
}

const SELECT_LANCAMENTO_PAR = {
  id: true,
  dataLancamento: true,
  documento: true,
  natureza: true,
  debito: true,
  credito: true,
  dupCr: true,
  doctoBaixa: true,
  idBaixa: true,
  ordemFaturamento: true,
  nomeParceiro: true,
} as const

/** Carrega uma sessão de comparação com seus pares, contas e lançamentos sem par. */
export async function carregarSessaoComparacao(prisma: PrismaClient, sessaoId: string) {
  const sessao = await prisma.sessaoComparacao.findUnique({
    where: { id: sessaoId },
    select: {
      id: true,
      nomeDescritivo: true,
      cenario: true,
      status: true,
      periodoInicio: true,
      periodoFim: true,
      totalParesA: true,
      totalParesB: true,
      paresEncontrados: true,
      semParA: true,
      semParB: true,
      valorDivergente: true,
      criadoEm: true,
      contaOrigem: { select: { id: true, codigo: true, nome: true } },
      contaDestino: { select: { id: true, codigo: true, nome: true } },
      pares: {
        orderBy: [{ scoreConfianca: 'desc' }, { criadoEm: 'asc' }],
        select: {
          id: true,
          tipoMatch: true,
          scoreConfianca: true,
          diferencaValor: true,
          diferencaDias: true,
          status: true,
          observacao: true,
          lancamentoA: { select: SELECT_LANCAMENTO_PAR },
          lancamentoB: { select: SELECT_LANCAMENTO_PAR },
        },
      },
    },
  })

  if (!sessao) return null

  // IDs de lançamentos já pareados, para isolar os "sem par".
  const idsPareados = new Set<string>()
  for (const p of sessao.pares) {
    if (p.lancamentoA) idsPareados.add(p.lancamentoA.id)
    if (p.lancamentoB) idsPareados.add(p.lancamentoB.id)
  }

  const [lancamentosA, lancamentosB] = await Promise.all([
    prisma.lancamento.findMany({
      where: {
        contaContabilId: sessao.contaOrigem.id,
        dataLancamento: { gte: sessao.periodoInicio, lte: sessao.periodoFim },
      },
      orderBy: { dataLancamento: 'asc' },
      select: SELECT_LANCAMENTO_PAR,
    }),
    prisma.lancamento.findMany({
      where: {
        contaContabilId: sessao.contaDestino.id,
        dataLancamento: { gte: sessao.periodoInicio, lte: sessao.periodoFim },
      },
      orderBy: { dataLancamento: 'asc' },
      select: SELECT_LANCAMENTO_PAR,
    }),
  ])

  const semParA = lancamentosA.filter((l) => !idsPareados.has(l.id))
  const semParB = lancamentosB.filter((l) => !idsPareados.has(l.id))

  return { sessao, semParA, semParB }
}
