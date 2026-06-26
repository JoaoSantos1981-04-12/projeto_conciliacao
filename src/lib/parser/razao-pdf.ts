import pdf from 'pdf-parse/lib/pdf-parse.js'
import { parse, isValid } from 'date-fns'
import { toCents, fromCents, somaCents } from '@/lib/money'
import { parseMoney, parseDataBR } from './pdf-utils'
import {
  RazaoPdfParseResult,
  LancamentoRazaoPdf,
  RazaoPdfTokens,
  TipoConta,
  ParseErroPdf,
} from '@/lib/types/book'

/**
 * Parser do Razão Contábil em PDF do NetCorp (relatório NSQP1105L).
 *
 * Correções da SPEC v2.0 aplicadas:
 *  - B3: import de "pdf-parse/lib/pdf-parse.js".
 *  - P1: classificação débito/crédito pelo DELTA de saldo × sinal da conta
 *        (ativo +1 / passivo −1), não pelo "valor não-zero" (§7.1).
 *  - P2: self-check de integridade contra o rodapé "TOTAL DA CONTA"
 *        (Σdébitos, Σcréditos, saldoFinal) — §7.2.
 *  - C3: regex de CNPJ E CPF (§7.3).
 *  - §7.4: saldo negativo em parênteses; pares espelhados; variante DUP:.
 *
 * Toda soma é feita em CENTAVOS inteiros (money.ts §5).
 */

// Tolerância do self-check: R$ 0,01 em centavos.
const TOL_CENTS = 1

// ─── extração de tokens do complemento (§7.5) ────────────────────────────────

// C3 (§7.3): cobre CNPJ (XX.XXX.XXX/XXXX-XX) e CPF (XXX.XXX.XXX-XX). O prefixo
// "CNPJ/CPF:" é opcional — registros ET da 200003 trazem o CNPJ sem rótulo
// (ex.: "NF.306 - 18.273.744/0001-45 - VOLT/AG"), senão perderíamos o favorecido.
const RE_CNPJ_CPF =
  /(?:CNPJ\/CPF:\s*)?(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})/

function extrairTokens(complemento: string): RazaoPdfTokens {
  const t = complemento.replace(/\s+/g, ' ').trim()
  const tokens: RazaoPdfTokens = {}

  // DUP.CR.: ou DUP: (variante bare na 100006) → dupCr. NÃO casa DUP.CP.:
  const mDupCr = t.match(/DUP(?:\.CR\.)?:\s*(\d+)/)
  if (mDupCr) tokens.dupCr = mDupCr[1]

  // DUP.CP.: ou BAIXA DUP.CP.: → dupCp
  const mDupCp = t.match(/DUP\.CP\.:\s*(\d+)/)
  if (mDupCp) tokens.dupCp = mDupCp[1]

  // Acp: / BAIXA ACP: (case-insensitive)
  const mAcp = t.match(/ACP:\s*(\d+)/i)
  if (mAcp) tokens.acp = mAcp[1]

  const mIdDupCp = t.match(/ID\.DUP\.CP:\s*(\d+)/)
  if (mIdDupCp) tokens.idDupCp = mIdDupCp[1]

  const mParc = t.match(/PARC:\s*(\d+)/)
  if (mParc) tokens.parcela = mParc[1]

  const mVcto = t.match(/VCTO:\s*(\d{2}\/\d{2}\/\d{4})/)
  if (mVcto) {
    const d = parse(mVcto[1], 'dd/MM/yyyy', new Date())
    if (isValid(d)) tokens.vencimento = d
  }

  const mDoc = t.match(RE_CNPJ_CPF)
  if (mDoc) {
    tokens.cnpj = mDoc[1]
    // Nome do parceiro: trecho após o documento, separado por " - ".
    const resto = t.slice((mDoc.index ?? 0) + mDoc[0].length)
    const mNome = resto.match(/-\s*([A-ZÀ-Ú][^-]*?)\s*$/)
    if (mNome) tokens.nome = mNome[1].replace(/\s+/g, ' ').trim()
  }

  const mIdFra = t.match(/ID\.FRA:\s*(\S+)/)
  if (mIdFra) tokens.idFra = mIdFra[1]

  const mBco = t.match(/BCO:\s*(\S+)\s+CC:\s*(\S+)/)
  if (mBco) tokens.bancoConta = `${mBco[1]}/${mBco[2]}`

  const mProt = t.match(/PROTOCOLO:\s*(\S+)/)
  if (mProt) tokens.protocolo = mProt[1]

  return tokens
}

// ─── classificação da conta ──────────────────────────────────────────────────

function classificarTipoConta(codigo: string, nome: string): TipoConta {
  const n = nome.toUpperCase()
  if (/C\/C|CITIBANK|BANCO|EXTRATO/.test(n)) return 'ATIVO_BANCO'
  if (codigo.startsWith('1')) return 'ATIVO_CIRCULANTE'
  if (codigo.startsWith('2')) return 'PASSIVO_CIRCULANTE'
  return 'OUTROS'
}

/**
 * Sinal da conta para a equação saldo_i = saldo_{i-1} + s·(débito − crédito).
 * Ativo s=+1, passivo s=−1. Derivado do próprio rodapé (robusto); fallback no
 * 1º dígito do código (1=ativo, 2=passivo no plano de contas brasileiro).
 */
function sinalConta(
  codigo: string,
  saldoAntCents: number,
  saldoFinalCents: number,
  totalDebCents: number,
  totalCredCents: number,
): 1 | -1 {
  const denom = totalDebCents - totalCredCents
  if (Math.abs(denom) > TOL_CENTS) {
    const ratio = (saldoFinalCents - saldoAntCents) / denom
    return ratio >= 0 ? 1 : -1
  }
  return codigo.startsWith('2') ? -1 : 1
}

// ─── parsing do bloco de cabeçalho/rodapé ────────────────────────────────────

interface CabecalhoRodape {
  codigoConta: string
  nomeConta: string
  saldoAnterior: number
  totalDebito: number
  totalCredito: number
  saldoFinal: number
}

function parseCabecalhoRodape(texto: string, erros: ParseErroPdf[]): CabecalhoRodape | null {
  const mSaldoAnt = texto.match(/SALDO ANTERIOR\s*\n?\s*([\d.]+,\d{2})/)
  // Rodapé: "Σdéb  Σcréd  saldoFinal \nTOTAL DA CONTA"
  const mTotal = texto.match(
    /([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+(\(?[\d.]+,\d{2}\)?)\s*\nTOTAL DA CONTA/,
  )
  // Conta + descrição: "CLIENTES NACIONAIS100006" (descrição + 6 dígitos)
  const mConta = texto.match(/\n([A-ZÀ-Ú][^\n]*?)(\d{6})\n\d+\n/)

  if (!mSaldoAnt || !mTotal || !mConta) {
    erros.push({
      contexto: 'cabecalho/rodape',
      trecho: '',
      mensagem: `Faltam âncoras: saldoAnterior=${!!mSaldoAnt} total=${!!mTotal} conta=${!!mConta}`,
    })
    return null
  }

  return {
    codigoConta: mConta[2],
    nomeConta: mConta[1].replace(/\s+/g, ' ').trim(),
    saldoAnterior: parseMoney(mSaldoAnt[1]),
    totalDebito: parseMoney(mTotal[1]),
    totalCredito: parseMoney(mTotal[2]),
    saldoFinal: parseMoney(mTotal[3]),
  }
}

// ─── parsing de um registro de lançamento ────────────────────────────────────

const RE_DATA = /^\d{2}\/\d{2}\/\d{4}$/
const RE_VALOR_SALDO = /^\s*([\d.]+,\d{2})\s+(\(?[\d.]+,\d{2}\)?)\s*$/

interface RegistroBruto {
  complemento: string
  data: Date | null
  documento: string
  valor: number
  saldo: number
}

function parseRegistro(bloco: string): RegistroBruto | null {
  const linhas = bloco.split('\n')
  const idxData = linhas.findIndex((l) => RE_DATA.test(l.trim()))
  if (idxData === -1) return null

  const complemento = linhas
    .slice(0, idxData)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const data = parseDataBR(linhas[idxData])
  // O documento vem na linha seguinte à data; isola o 1º token
  // (ex.: "000000383 1 1" → "000000383"; "EXTRATO" → "EXTRATO").
  const documento = (linhas[idxData + 1] ?? '').trim().split(/\s+/)[0] ?? ''

  // Linha "valor  saldo" após o separador "/".
  const linhaValor = linhas.slice(idxData + 1).find((l) => RE_VALOR_SALDO.test(l))
  if (!linhaValor) return null
  const m = linhaValor.match(RE_VALOR_SALDO)
  if (!m) return null

  return {
    complemento,
    data,
    documento,
    valor: parseMoney(m[1]),
    saldo: parseMoney(m[2]),
  }
}

// ─── parser principal ────────────────────────────────────────────────────────

export async function parseRazaoPdf(buffer: Buffer): Promise<RazaoPdfParseResult> {
  const { text } = await pdf(buffer)
  return parseRazaoTexto(text)
}

export function parseRazaoTexto(text: string): RazaoPdfParseResult {
  const erros: ParseErroPdf[] = []

  const cab = parseCabecalhoRodape(text, erros)
  if (!cab) {
    return {
      codigoConta: '',
      nomeConta: '',
      tipoConta: 'OUTROS',
      saldoAnterior: 0,
      saldoFinal: 0,
      lancamentos: [],
      parseConfiavel: false,
      deltaIntegridade: 0,
      erros,
    }
  }

  const tipoConta = classificarTipoConta(cab.codigoConta, cab.nomeConta)
  const s = sinalConta(
    cab.codigoConta,
    toCents(cab.saldoAnterior),
    toCents(cab.saldoFinal),
    toCents(cab.totalDebito),
    toCents(cab.totalCredito),
  )

  // Divide o corpo em blocos de registro pelo prefixo de natureza no início do
  // histórico: " XX   ..." onde XX são 2 letras maiúsculas (CR, CP, BC, ET, …).
  // ET = entrada de NF fornecedor (§7.4), presente na 200003.
  const blocos = text.split(/\n (?=[A-Z]{2} {2,}[A-ZÀ-Ú])/)
  const lancamentos: LancamentoRazaoPdf[] = []
  let saldoAntCents = toCents(cab.saldoAnterior)

  for (const bloco of blocos) {
    if (!/^[A-Z]{2} {2,}[A-ZÀ-Ú]/.test(bloco.trim())) continue
    const reg = parseRegistro(bloco)
    if (!reg) continue

    const saldoCents = toCents(reg.saldo)
    const delta = saldoCents - saldoAntCents
    const x = s * delta // débito − crédito (em centavos)
    const debito = x >= 0 ? fromCents(x) : 0
    const credito = x < 0 ? fromCents(-x) : 0

    const tokens = extrairTokens(reg.complemento)
    lancamentos.push({
      dataLancamento: reg.data,
      documento: reg.documento,
      historico: reg.complemento.split(' / ')[0]?.trim() ?? '',
      complemento: reg.complemento,
      debito,
      credito,
      saldo: reg.saldo,
      tokens,
      dupCr: tokens.dupCr,
      dupCp: tokens.dupCp,
      acp: tokens.acp,
    })

    saldoAntCents = saldoCents
  }

  // Self-check de integridade (§7.2) contra o rodapé.
  const somaDebCents = somaCents(lancamentos.map((l) => l.debito))
  const somaCredCents = somaCents(lancamentos.map((l) => l.credito))
  const esperadoFinalCents = toCents(cab.saldoAnterior) + s * (somaDebCents - somaCredCents)
  const saldoFinalCents = toCents(cab.saldoFinal)

  const fechaSaldo = Math.abs(esperadoFinalCents - saldoFinalCents) <= TOL_CENTS
  const fechaDebito = Math.abs(somaDebCents - toCents(cab.totalDebito)) <= TOL_CENTS
  const fechaCredito = Math.abs(somaCredCents - toCents(cab.totalCredito)) <= TOL_CENTS
  const parseConfiavel = fechaSaldo && fechaDebito && fechaCredito

  if (!parseConfiavel) {
    erros.push({
      contexto: 'self-check',
      trecho: cab.codigoConta,
      mensagem:
        `Integridade não fechou: saldo=${fechaSaldo} ` +
        `débito(${fromCents(somaDebCents)}≈${cab.totalDebito})=${fechaDebito} ` +
        `crédito(${fromCents(somaCredCents)}≈${cab.totalCredito})=${fechaCredito}`,
    })
  }

  return {
    codigoConta: cab.codigoConta,
    nomeConta: cab.nomeConta,
    tipoConta,
    saldoAnterior: cab.saldoAnterior,
    saldoFinal: cab.saldoFinal,
    lancamentos,
    parseConfiavel,
    deltaIntegridade: fromCents(esperadoFinalCents - saldoFinalCents),
    erros,
  }
}
