import type { Prisma, PrismaClient } from '@prisma/client'
import { NaturezaLancamento } from '@/lib/types/razao'

export const NATUREZAS: readonly NaturezaLancamento[] = [
  'BAIXA_CLIENTE',
  'BAIXA_FORNECEDOR',
  'NF_SAIDA',
  'NF_ENTRADA',
  'CONTRAPARTIDA_BAIXA_FORNECEDOR',
  'CONTRAPARTIDA_NF_SAIDA',
  'OUTRO',
]

export const STATUS_CONCILIACAO = ['PENDENTE', 'CONCILIADO', 'DIVERGENCIA', 'IGNORADO'] as const
export type StatusConciliacao = (typeof STATUS_CONCILIACAO)[number]

export const PAGE_SIZE = 50

export interface FiltroLancamentos {
  importacaoId?: string
  contaContabilId?: string
  natureza?: NaturezaLancamento
  status?: StatusConciliacao
  q?: string
  de?: string // yyyy-MM-dd
  ate?: string // yyyy-MM-dd
  page: number
  pageSize: number
}

type ParamMap = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  const t = s?.trim()
  return t ? t : undefined
}

/** Converte os searchParams da página em um filtro validado e seguro. */
export function parseFiltros(params: ParamMap): FiltroLancamentos {
  const naturezaRaw = first(params.natureza)
  const statusRaw = first(params.status)
  const pageRaw = Number(first(params.page))

  return {
    importacaoId: first(params.importacaoId),
    contaContabilId: first(params.contaContabilId),
    natureza: NATUREZAS.includes(naturezaRaw as NaturezaLancamento)
      ? (naturezaRaw as NaturezaLancamento)
      : undefined,
    status: STATUS_CONCILIACAO.includes(statusRaw as StatusConciliacao)
      ? (statusRaw as StatusConciliacao)
      : undefined,
    q: first(params.q),
    de: first(params.de),
    ate: first(params.ate),
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
    pageSize: PAGE_SIZE,
  }
}

/** Monta o `where` do Prisma a partir do filtro (função pura, testável). */
export function buildWhereLancamento(f: FiltroLancamentos): Prisma.LancamentoWhereInput {
  const where: Prisma.LancamentoWhereInput = {}

  if (f.importacaoId) where.importacaoId = f.importacaoId
  if (f.contaContabilId) where.contaContabilId = f.contaContabilId
  if (f.natureza) where.natureza = f.natureza
  if (f.status) where.statusConciliacao = f.status

  if (f.de || f.ate) {
    const data: Prisma.DateTimeFilter = {}
    if (f.de) data.gte = new Date(`${f.de}T00:00:00`)
    if (f.ate) data.lte = new Date(`${f.ate}T23:59:59.999`)
    where.dataLancamento = data
  }

  if (f.q) {
    where.OR = [
      { documento: { contains: f.q, mode: 'insensitive' } },
      { dupCr: { contains: f.q, mode: 'insensitive' } },
      { nomeParceiro: { contains: f.q, mode: 'insensitive' } },
      { cnpjParceiro: { contains: f.q, mode: 'insensitive' } },
    ]
  }

  return where
}

export async function listarLancamentos(prisma: PrismaClient, f: FiltroLancamentos) {
  const where = buildWhereLancamento(f)
  const [items, total] = await Promise.all([
    prisma.lancamento.findMany({
      where,
      include: { contaContabil: { select: { codigo: true, nome: true } } },
      orderBy: [{ dataLancamento: 'asc' }, { sequencia: 'asc' }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
    prisma.lancamento.count({ where }),
  ])
  return { items, total }
}

/** Opções para os dropdowns de filtro (importações e contas). */
export async function carregarOpcoesFiltro(prisma: PrismaClient) {
  const [importacoes, contas] = await Promise.all([
    prisma.importacaoRazao.findMany({
      select: { id: true, nomeArquivo: true, empresa: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    }),
    prisma.contaContabil.findMany({
      select: { id: true, codigo: true, nome: true },
      orderBy: { codigo: 'asc' },
    }),
  ])
  return { importacoes, contas }
}
