import type { PrismaClient } from '@prisma/client'
import { compararContas, REGRAS_PADRAO } from '@/lib/engine/comparador'
import {
  ConfiguracaoComparacao,
  CenarioComparacao,
  LancamentoComparavel,
  ResumoComparacao,
} from '@/lib/types/comparacao'
import { LancamentoRazao } from '@/lib/types/razao'

export interface EntradaComparacao {
  contaOrigemId: string
  contaDestinoId: string
  cenario: CenarioComparacao
  nomeDescritivo: string
  periodoInicio: Date
  periodoFim: Date
  toleranciaValor: number
  toleranciaDias: number
}

const SELECT_LANCAMENTO = {
  id: true,
  dataLancamento: true,
  documento: true,
  historicoPadrao: true,
  complemento: true,
  contaIntegracao: true,
  centroCusto: true,
  descCentroCusto: true,
  ficha: true,
  sequencia: true,
  debito: true,
  credito: true,
  saldo: true,
  natureza: true,
  dupCr: true,
  parcela: true,
  vencimento: true,
  cnpjParceiro: true,
  nomeParceiro: true,
  idDupCr: true,
  ordemFaturamento: true,
  doctoBaixa: true,
  bancoBaixa: true,
  ccBaixa: true,
  idBaixa: true,
  nrAdiantamento: true,
} as const

type LancamentoRow = {
  id: string
  dataLancamento: Date
  documento: string
  historicoPadrao: string
  complemento: string | null
  contaIntegracao: string | null
  centroCusto: string | null
  descCentroCusto: string | null
  ficha: string | null
  sequencia: number | null
  debito: unknown
  credito: unknown
  saldo: unknown
  natureza: LancamentoRazao['natureza']
  dupCr: string | null
  parcela: string | null
  vencimento: Date | null
  cnpjParceiro: string | null
  nomeParceiro: string | null
  idDupCr: string | null
  ordemFaturamento: string | null
  doctoBaixa: string | null
  bancoBaixa: string | null
  ccBaixa: string | null
  idBaixa: string | null
  nrAdiantamento: string | null
}

/** Adapta uma linha do Prisma para o lançamento consumido pelo engine. */
function toLct(l: LancamentoRow): LancamentoComparavel {
  return {
    id: l.id,
    dataLancamento: l.dataLancamento,
    documento: l.documento,
    historicoPadrao: l.historicoPadrao,
    complemento: l.complemento ?? '',
    contaIntegracao: l.contaIntegracao ?? '',
    centroCusto: l.centroCusto ?? '',
    descCentroCusto: l.descCentroCusto ?? '',
    ficha: l.ficha ?? '',
    sequencia: l.sequencia ?? 0,
    debito: Number(l.debito),
    credito: Number(l.credito),
    saldo: Number(l.saldo),
    natureza: l.natureza,
    tokens: {
      dupCr: l.dupCr ?? undefined,
      parcela: l.parcela ?? undefined,
      vencimento: l.vencimento ?? undefined,
      cnpjParceiro: l.cnpjParceiro ?? undefined,
      nomeParceiro: l.nomeParceiro ?? undefined,
      idDupCr: l.idDupCr ?? undefined,
      ordemFaturamento: l.ordemFaturamento ?? undefined,
      doctoBaixa: l.doctoBaixa ?? undefined,
      bancoBaixa: l.bancoBaixa ?? undefined,
      ccBaixa: l.ccBaixa ?? undefined,
      idBaixa: l.idBaixa ?? undefined,
      nrAdiantamento: l.nrAdiantamento ?? undefined,
    },
  }
}

/**
 * Carrega os lançamentos das duas contas no período, roda o engine de comparação
 * e persiste a sessão com seus pares. Retorna o id da sessão e o resumo.
 */
export async function executarComparacao(
  prisma: PrismaClient,
  entrada: EntradaComparacao,
): Promise<{ sessaoId: string; resumo: ResumoComparacao }> {
  const { contaOrigemId, contaDestinoId, periodoInicio, periodoFim } = entrada

  const [linhasA, linhasB] = await Promise.all([
    prisma.lancamento.findMany({
      where: {
        contaContabilId: contaOrigemId,
        dataLancamento: { gte: periodoInicio, lte: periodoFim },
      },
      select: SELECT_LANCAMENTO,
    }),
    prisma.lancamento.findMany({
      where: {
        contaContabilId: contaDestinoId,
        dataLancamento: { gte: periodoInicio, lte: periodoFim },
      },
      select: SELECT_LANCAMENTO,
    }),
  ])

  const config: ConfiguracaoComparacao = {
    contaOrigemId,
    contaDestinoId,
    cenario: entrada.cenario,
    nomeDescritivo: entrada.nomeDescritivo,
    periodoInicio,
    periodoFim,
    toleranciaValor: entrada.toleranciaValor,
    toleranciaDias: entrada.toleranciaDias,
    regrasPrioridade: REGRAS_PADRAO[entrada.cenario] ?? REGRAS_PADRAO.FORNECEDORES_BANCO,
  }

  const resultado = compararContas(linhasA.map(toLct), linhasB.map(toLct), config)

  const sessao = await prisma.sessaoComparacao.create({
    data: {
      contaOrigemId,
      contaDestinoId,
      cenario: entrada.cenario,
      nomeDescritivo: entrada.nomeDescritivo,
      periodoInicio,
      periodoFim,
      status: 'CONCLUIDA',
      totalParesA: resultado.resumo.totalA,
      totalParesB: resultado.resumo.totalB,
      paresEncontrados: resultado.resumo.paresEncontrados,
      semParA: resultado.semParA.length,
      semParB: resultado.semParB.length,
      valorDivergente: resultado.resumo.valorSemParA + resultado.resumo.valorSemParB,
      concluidoEm: new Date(),
      pares: {
        create: resultado.pares.map((p) => ({
          lancamentoAId: p.lancamentoA.id,
          lancamentoBId: p.lancamentoB.id,
          tipoMatch: p.score >= 0.9 ? ('AUTOMATICO_EXATO' as const) : ('AUTOMATICO_FUZZY' as const),
          scoreConfianca: p.score,
          diferencaValor: p.diferencaValor,
          diferencaDias: p.diferencaDias,
          status: 'PENDENTE' as const,
        })),
      },
    },
    select: { id: true },
  })

  return { sessaoId: sessao.id, resumo: resultado.resumo }
}
