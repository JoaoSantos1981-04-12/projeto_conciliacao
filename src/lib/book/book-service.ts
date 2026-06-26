import { createHash } from 'crypto'
import type { PrismaClient } from '@prisma/client'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { classificarPdf, detectarCodigoConta, TipoPdf } from '@/lib/parser/pdf-router'
import { parseRazaoTexto } from '@/lib/parser/razao-pdf'
import { parseBalanceteTexto } from '@/lib/parser/balancete-pdf'
import { parseRelatorioSuporteTexto } from '@/lib/parser/relatorio-suporte-pdf'
import { validarAmarracao, detectarInteraxa } from '@/lib/engine/book-validator'
import { analisarFicha, precisaAnaliseLlm } from '@/lib/llm/book-analyzer'
import {
  TipoConta,
  TipoRelatorio,
  ItemRelatorioParsed,
  AnaliseLlm,
} from '@/lib/types/book'

/**
 * Serviço do Book Digital (Etapa 7). Orquestra parsers + engine + LLM e
 * persiste via Prisma. Idempotência por hash SHA-256 do arquivo (§11.1):
 * re-upload do mesmo PDF SUBSTITUI os itens (não duplica).
 */

// ─── hash / decisão de idempotência (puro, testável) ─────────────────────────

export function hashArquivo(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export type AcaoUpload = 'INSERIR' | 'SUBSTITUIR'

/** Se já existe PdfSuporte com (fichaId, hash) → substitui itens; senão insere. */
export function decidirAcaoUpload(pdfExistenteId: string | null): AcaoUpload {
  return pdfExistenteId ? 'SUBSTITUIR' : 'INSERIR'
}

// ─── criação / consulta de book ──────────────────────────────────────────────

export interface CriarBookInput {
  empresaId: string
  ano: number
  mes: number
  elaboradoPor: string
}

export async function criarBook(prisma: PrismaClient, input: CriarBookInput) {
  return prisma.bookDigital.create({ data: input })
}

// ─── upload multi-arquivo com auto-roteamento (U1 §12.1) ─────────────────────

export interface ArquivoUpload {
  nome: string
  buffer: Buffer
}

export interface ResultadoUploadArquivo {
  nome: string
  tipo: TipoPdf | 'DESCONHECIDO'
  codigoConta?: string
  fichaId?: string
  acao?: AcaoUpload
  itens?: number
  erro?: string
}

export interface ResumoUploadSuporte {
  bookId: string
  processados: ResultadoUploadArquivo[]
}

// Ordem de processamento: razão (cria fichas) → balancete → relatórios.
const PRIORIDADE: Record<TipoPdf, number> = {
  RAZAO: 0,
  BALANCETE: 1,
  CR_ABERTO: 2,
  CP_ABERTO: 2,
  EXTRATO_BANCARIO: 2,
  OUTROS: 3,
}

function tipoContaPorCodigo(codigo: string, nome: string): TipoConta {
  const n = nome.toUpperCase()
  if (/C\/C|CITIBANK|BANCO|EXTRATO/.test(n)) return 'ATIVO_BANCO'
  if (codigo.startsWith('1')) return 'ATIVO_CIRCULANTE'
  if (codigo.startsWith('2')) return 'PASSIVO_CIRCULANTE'
  return 'OUTROS'
}

export async function processarUploadSuporte(
  prisma: PrismaClient,
  bookId: string,
  arquivos: ArquivoUpload[],
): Promise<ResumoUploadSuporte> {
  // Extrai texto e classifica uma vez; ordena por prioridade (evita race §12.1).
  const comTexto = await Promise.all(
    arquivos.map(async (a) => {
      const { text } = await pdf(a.buffer)
      return { ...a, text, hash: hashArquivo(a.buffer), tipo: classificarPdf(text) }
    }),
  )
  comTexto.sort((a, b) => PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo])

  const processados: ResultadoUploadArquivo[] = []
  for (const arq of comTexto) {
    try {
      processados.push(await processarArquivo(prisma, bookId, arq))
    } catch (e) {
      console.error(`[book] falha ao processar ${arq.nome}:`, e)
      processados.push({ nome: arq.nome, tipo: arq.tipo, erro: String(e) })
    }
  }
  return { bookId, processados }
}

interface ArquivoClassificado extends ArquivoUpload {
  text: string
  hash: string
  tipo: TipoPdf
}

async function processarArquivo(
  prisma: PrismaClient,
  bookId: string,
  arq: ArquivoClassificado,
): Promise<ResultadoUploadArquivo> {
  switch (arq.tipo) {
    case 'RAZAO':
      return processarRazao(prisma, bookId, arq)
    case 'BALANCETE':
      return processarBalancete(prisma, bookId, arq)
    case 'CR_ABERTO':
    case 'CP_ABERTO':
    case 'EXTRATO_BANCARIO':
      return processarRelatorio(prisma, bookId, arq)
    default:
      return { nome: arq.nome, tipo: 'DESCONHECIDO', erro: 'Tipo de PDF não reconhecido.' }
  }
}

/** Razão define a ficha (saldoRazao). Upsert por (bookId, codigoConta). */
async function processarRazao(
  prisma: PrismaClient,
  bookId: string,
  arq: ArquivoClassificado,
): Promise<ResultadoUploadArquivo> {
  const r = parseRazaoTexto(arq.text)
  if (!r.codigoConta) {
    return { nome: arq.nome, tipo: 'RAZAO', erro: 'Conta do razão não identificada.' }
  }

  const ficha = await prisma.fichaConciliacao.upsert({
    where: { bookId_codigoConta: { bookId, codigoConta: r.codigoConta } },
    create: {
      bookId,
      codigoConta: r.codigoConta,
      nomeConta: r.nomeConta,
      tipoConta: r.tipoConta,
      saldoRazao: r.saldoFinal,
    },
    update: { nomeConta: r.nomeConta, tipoConta: r.tipoConta, saldoRazao: r.saldoFinal },
  })

  await upsertPdfSuporte(prisma, ficha.id, arq, 'OUTROS', {
    parseConfiavel: r.parseConfiavel,
    deltaIntegridade: r.deltaIntegridade,
    saldoAnterior: r.saldoAnterior,
    saldoFinal: r.saldoFinal,
  })

  return {
    nome: arq.nome,
    tipo: 'RAZAO',
    codigoConta: r.codigoConta,
    fichaId: ficha.id,
    acao: 'INSERIR',
  }
}

/** Balancete (âncora): atualiza saldoBalancete das fichas existentes do book. */
async function processarBalancete(
  prisma: PrismaClient,
  bookId: string,
  arq: ArquivoClassificado,
): Promise<ResultadoUploadArquivo> {
  const bal = parseBalanceteTexto(arq.text)
  const fichas = await prisma.fichaConciliacao.findMany({ where: { bookId } })
  let atualizadas = 0
  for (const ficha of fichas) {
    const conta = bal.porCodigo[ficha.codigoConta]
    if (!conta) continue
    await prisma.fichaConciliacao.update({
      where: { id: ficha.id },
      data: { saldoBalancete: conta.saldoAtual },
    })
    await upsertPdfSuporte(prisma, ficha.id, arq, 'BALANCETE', {
      parseConfiavel: bal.erros.length === 0,
      saldoFinal: conta.saldoAtual,
      saldoAnterior: conta.saldoAnterior,
    })
    atualizadas++
  }
  return { nome: arq.nome, tipo: 'BALANCETE', itens: atualizadas, acao: 'INSERIR' }
}

/** CR/CP/extrato: total → saldoRelatorio; itens em trânsito (extrato). */
async function processarRelatorio(
  prisma: PrismaClient,
  bookId: string,
  arq: ArquivoClassificado,
): Promise<ResultadoUploadArquivo> {
  const rel = parseRelatorioSuporteTexto(arq.text)
  const ficha = await resolverFicha(prisma, bookId, rel.tipoRelatorio, rel.codigoConta, arq.text)
  if (!ficha) {
    return {
      nome: arq.nome,
      tipo: arq.tipo,
      codigoConta: rel.codigoConta,
      erro: 'Ficha correspondente não encontrada (envie o razão da conta primeiro).',
    }
  }

  await prisma.fichaConciliacao.update({
    where: { id: ficha.id },
    data: { saldoRelatorio: rel.total },
  })

  const { acao, itens } = await upsertPdfSuporteComItens(
    prisma,
    ficha.id,
    arq,
    rel.tipoRelatorio,
    rel.itens,
    { parseConfiavel: rel.parseConfiavel, saldoFinal: rel.total },
  )

  // C4 (§8.3): escala INTERAXA do CP para ocorrência (idempotente no re-upload).
  if (rel.tipoRelatorio === 'CP_ABERTO') {
    await escalarInteraxa(prisma, bookId, ficha.id, arq.text)
  }

  return {
    nome: arq.nome,
    tipo: arq.tipo,
    codigoConta: ficha.codigoConta,
    fichaId: ficha.id,
    acao,
    itens,
  }
}

async function escalarInteraxa(
  prisma: PrismaClient,
  bookId: string,
  fichaId: string,
  cpText: string,
): Promise<void> {
  const oc = detectarInteraxa(cpText)
  // Re-upload: remove ocorrências INTERAXA anteriores desta ficha e regrava.
  await prisma.ocorrenciaBook.deleteMany({
    where: { fichaId, descricao: { startsWith: 'INTERAXA' } },
  })
  if (!oc) return
  await prisma.ocorrenciaBook.create({
    data: {
      bookId,
      fichaId,
      descricao: oc.descricao,
      acaoCorretiva: oc.acaoCorretiva,
      responsavel: oc.responsavel,
      nettingFlag: oc.nettingFlag,
      status: oc.status,
    },
  })
}

/** Resolve a ficha: por código (CR/CP) ou pela única ATIVO_BANCO (extrato). */
async function resolverFicha(
  prisma: PrismaClient,
  bookId: string,
  tipo: TipoRelatorio,
  codigoConta: string | undefined,
  _text: string,
) {
  if (codigoConta) {
    return prisma.fichaConciliacao.findUnique({
      where: { bookId_codigoConta: { bookId, codigoConta } },
    })
  }
  if (tipo === 'EXTRATO_BANCARIO') {
    const bancos = await prisma.fichaConciliacao.findMany({
      where: { bookId, tipoConta: 'ATIVO_BANCO' },
    })
    return bancos.length === 1 ? bancos[0] : null
  }
  return null
}

// ─── persistência idempotente de PdfSuporte ──────────────────────────────────

interface SaldosPdf {
  parseConfiavel?: boolean
  deltaIntegridade?: number
  saldoAnterior?: number
  saldoFinal?: number
  totalDebitos?: number
  totalCreditos?: number
}

async function upsertPdfSuporte(
  prisma: PrismaClient,
  fichaId: string,
  arq: ArquivoClassificado,
  tipoRelatorio: TipoRelatorio,
  saldos: SaldosPdf,
): Promise<{ id: string; acao: AcaoUpload }> {
  const existente = await prisma.pdfSuporte.findUnique({
    where: { fichaId_hash: { fichaId, hash: arq.hash } },
  })
  const acao = decidirAcaoUpload(existente?.id ?? null)
  const data = {
    nomeArquivo: arq.nome,
    tipoRelatorio,
    parseStatus: 'CONCLUIDO' as const,
    parseConfiavel: saldos.parseConfiavel ?? true,
    deltaIntegridade: saldos.deltaIntegridade ?? 0,
    saldoAnterior: saldos.saldoAnterior,
    saldoFinal: saldos.saldoFinal,
    totalDebitos: saldos.totalDebitos,
    totalCreditos: saldos.totalCreditos,
  }
  const pdf = await prisma.pdfSuporte.upsert({
    where: { fichaId_hash: { fichaId, hash: arq.hash } },
    create: { fichaId, hash: arq.hash, ...data },
    update: data,
  })
  return { id: pdf.id, acao }
}

/** PdfSuporte + itens, com REPLACE idempotente dos itens no re-upload (§11.1). */
async function upsertPdfSuporteComItens(
  prisma: PrismaClient,
  fichaId: string,
  arq: ArquivoClassificado,
  tipoRelatorio: TipoRelatorio,
  itens: ItemRelatorioParsed[],
  saldos: SaldosPdf,
): Promise<{ acao: AcaoUpload; itens: number }> {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.pdfSuporte.findUnique({
      where: { fichaId_hash: { fichaId, hash: arq.hash } },
    })
    const acao = decidirAcaoUpload(existente?.id ?? null)

    const data = {
      nomeArquivo: arq.nome,
      tipoRelatorio,
      parseStatus: 'CONCLUIDO' as const,
      parseConfiavel: saldos.parseConfiavel ?? true,
      saldoFinal: saldos.saldoFinal,
    }
    const pdf = await tx.pdfSuporte.upsert({
      where: { fichaId_hash: { fichaId, hash: arq.hash } },
      create: { fichaId, hash: arq.hash, ...data },
      update: data,
    })

    // Re-upload (mesmo hash): apaga itens antigos e regrava — não duplica.
    if (acao === 'SUBSTITUIR') {
      await tx.itemRelatorio.deleteMany({ where: { pdfSuporteId: pdf.id } })
    }

    if (itens.length > 0) {
      await tx.itemRelatorio.createMany({
        data: itens.map((i) => ({
          fichaId,
          pdfSuporteId: pdf.id,
          tipo: i.tipo,
          documento: i.documento,
          dupCr: i.dupCr,
          dupCp: i.dupCp,
          cnpj: i.cnpj,
          nome: i.nome,
          dataEmissao: i.dataEmissao,
          dataVencimento: i.dataVencimento,
          diasAtraso: i.diasAtraso,
          valorAberto: i.valorAberto,
          debito: i.debito,
          credito: i.credito,
          saldo: i.saldo,
          observacao: i.historico,
        })),
      })
    }

    return { acao, itens: itens.length }
  })
}

// ─── validação (amarração) e ocorrências (Etapa 5 → banco) ───────────────────

export async function validarBook(prisma: PrismaClient, bookId: string) {
  const fichas = await prisma.fichaConciliacao.findMany({ where: { bookId } })
  const resultados = []
  for (const ficha of fichas) {
    const amarr = validarAmarracao({
      codigoConta: ficha.codigoConta,
      tipoConta: ficha.tipoConta as TipoConta,
      saldoRazao: ficha.saldoRazao.toNumber(),
      saldoBalancete: ficha.saldoBalancete.toNumber(),
      saldoRelatorio: ficha.saldoRelatorio.toNumber(),
    })
    await prisma.fichaConciliacao.update({
      where: { id: ficha.id },
      data: {
        tieRazaoBalancete: amarr.tieRazaoBalancete,
        tieRazaoRelatorio: amarr.tieRazaoRelatorio,
        statusConciliacao: amarr.status,
      },
    })
    resultados.push({ codigoConta: ficha.codigoConta, status: amarr.status })
  }
  return { bookId, fichas: resultados }
}

// ─── análise LLM assíncrona (B4) ─────────────────────────────────────────────

export async function analisarBookLlm(prisma: PrismaClient, bookId: string) {
  const fichas = await prisma.fichaConciliacao.findMany({ where: { bookId } })
  const analisadas: Array<{ codigoConta: string; status: string }> = []
  for (const ficha of fichas) {
    if (!precisaAnaliseLlm(ficha.statusConciliacao as 'TOLERANCIA' | 'DIVERGENTE')) continue
    const analise: AnaliseLlm = await analisarFicha({
      codigoConta: ficha.codigoConta,
      nomeConta: ficha.nomeConta,
      tipoConta: ficha.tipoConta as TipoConta,
      status: ficha.statusConciliacao as 'TOLERANCIA' | 'DIVERGENTE',
      saldoRazao: ficha.saldoRazao.toNumber(),
      saldoBalancete: ficha.saldoBalancete.toNumber(),
      saldoRelatorio: ficha.saldoRelatorio.toNumber(),
      diferencaBalancete: ficha.saldoRazao.toNumber() - ficha.saldoBalancete.toNumber(),
      diferencaRelatorio: ficha.saldoRazao.toNumber() - ficha.saldoRelatorio.toNumber(),
    })
    await prisma.fichaConciliacao.update({
      where: { id: ficha.id },
      data: { analiseLlm: analise as unknown as object },
    })
    analisadas.push({ codigoConta: ficha.codigoConta, status: ficha.statusConciliacao })
  }
  return { bookId, analisadas }
}
