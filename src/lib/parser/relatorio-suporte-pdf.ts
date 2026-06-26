import pdf from 'pdf-parse/lib/pdf-parse.js'
import { parseMoney, parseDataBR } from './pdf-utils'
import { detectarTipoRelatorio, detectarCodigoConta } from './pdf-router'
import {
  RelatorioParseResult,
  ItemRelatorioParsed,
  TipoRelatorio,
  ParseErroPdf,
} from '@/lib/types/book'

/**
 * Parser dos relatórios de suporte do NetCorp (§6.2):
 *  - CR em aberto (NSQ2208d)   → total amarra com razão 100006
 *  - CP em aberto (NSQ2109ac)  → total amarra com razão 200003 (dif. R$ 0,01)
 *  - Extrato bancário (NSQP2302) → saldo final amarra com razão 100003
 *
 * O TOTAL retornado é o total impresso do próprio relatório (Σ itens em aberto
 * para CR/CP; saldo final corrente para o extrato), que é o usado na amarração
 * tripla (§8.1). A extração detalhada de títulos CR/CP (tabela da UI) será
 * endereçada na Etapa 8; aqui o extrato já popula itens em trânsito (§8.2).
 */

/** Extrai o total impresso conforme o tipo de relatório. */
function extrairTotal(text: string, tipo: TipoRelatorio): number | null {
  switch (tipo) {
    case 'CR_ABERTO': {
      // Grand total: "TOTAL :" (só espaços antes do ':') seguido do valor.
      const m = text.match(/\nTOTAL\s+:\s*\n\s*([\d.]+,\d{2})/)
      return m ? parseMoney(m[1]) : null
    }
    case 'CP_ABERTO': {
      // "Total da Conta NNNNNN:" + 3 valores; o 3º é o T. Aberto (grand total).
      const m = text.match(
        /Total\s+d[ao]\s+Conta\s+\d{6}:\s*\n\s*[\d.]+,\d{2}\s*\n\s*[\d.]+,\d{2}\s*\n\s*([\d.]+,\d{2})/,
      )
      return m ? parseMoney(m[1]) : null
    }
    case 'EXTRATO_BANCARIO': {
      // Saldo final = saldo da última transação (seguida de "<cód><HISTÓRICO>",
      // não da linha "Total:"). Cada transação: " <valor> <saldo>\n<cód><HIST>".
      const matches = [
        ...text.matchAll(/\n ([\d.]+,\d{2}) (\(?[\d.]+,\d{2}\)?)\n\d+[A-ZÀ-Ú]/g),
      ]
      const ultima = matches.at(-1)
      return ultima ? parseMoney(ultima[2]) : null
    }
    default:
      return null
  }
}

/** Extrai transações do extrato como itens em trânsito (§8.2). */
function extrairItensExtrato(text: string): ItemRelatorioParsed[] {
  const itens: ItemRelatorioParsed[] = []
  const re = /\n ([\d.]+,\d{2}) (\(?[\d.]+,\d{2}\)?)\n(\d+)([A-ZÀ-Ú][^\n]*)/g
  let m: RegExpExecArray | null
  let saldoAnterior: number | null = null
  while ((m = re.exec(text)) !== null) {
    const valor = parseMoney(m[1])
    const saldo = parseMoney(m[2])
    // Direção pelo delta do saldo (entrada sobe; saída desce).
    let debito: number | undefined
    let credito: number | undefined
    if (saldoAnterior !== null) {
      const delta = saldo - saldoAnterior
      if (delta >= 0) credito = valor
      else debito = valor
    }
    itens.push({
      tipo: 'ITEM_TRANSITO',
      historico: m[4].replace(/\s+/g, ' ').trim(),
      debito,
      credito,
      saldo,
    })
    saldoAnterior = saldo
  }
  return itens
}

/**
 * Títulos em aberto do CR (NSQ2208d). Cada título:
 *   <doc(9)>-<favorecido…> <vcto><emissão> <juros>[<dias>] <Val.Aberto> …
 * O "dias de atraso" pode vir colado ao juros nos títulos a vencer (ex.: "0,00-20").
 * Val.Aberto = 1º valor após o campo de dias. Σ ≈ total impresso (validado).
 */
function extrairItensCR(text: string): ItemRelatorioParsed[] {
  const re =
    /(\d{9})-([\s\S]*?)(\d{2}\/\d{2}\/\d{4})(\d{2}\/\d{2}\/\d{4})\s+[\d.]+,\d{2}\s*(-?\d+)\s+([\d.]+,\d{2})/g
  const itens: ItemRelatorioParsed[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    itens.push({
      tipo: 'TITULO_ABERTO',
      documento: m[1],
      nome: m[2].replace(/\s+/g, ' ').trim(),
      dataVencimento: parseDataBR(m[3]) ?? undefined,
      dataEmissao: parseDataBR(m[4]) ?? undefined,
      diasAtraso: Number(m[5]),
      valorAberto: parseMoney(m[6]),
    })
  }
  return itens
}

/**
 * Títulos do CP (NSQ2109ac), agrupado por favorecido. Âncora na linha de datas
 * "<vcto><emissão>"; a linha anterior traz os valores e o 1º é o Val. Aberto do
 * título (vencido + a vencer). Σ = total impresso (validado, dif. R$ 0,00).
 * O favorecido vem na linha seguinte.
 */
function extrairItensCP(text: string): ItemRelatorioParsed[] {
  const linhas = text.split('\n')
  const itens: ItemRelatorioParsed[] = []
  for (let i = 1; i < linhas.length; i++) {
    const dm = linhas[i].match(/^(\d{2}\/\d{2}\/\d{4})(\d{2}\/\d{2}\/\d{4})$/)
    if (!dm) continue
    const moneys = (linhas[i - 1].match(/[\d.]+,\d{2}/g) ?? []).map(parseMoney)
    if (moneys.length < 1) continue
    const valorAberto = moneys[0] // Val. Aberto (vencido + a vencer do título)
    if (valorAberto <= 0) continue // ignora títulos sem saldo em aberto
    const nome = (linhas[i + 1] ?? '').trim()
    itens.push({
      tipo: 'TITULO_ABERTO',
      nome: nome.slice(0, 120),
      dataVencimento: parseDataBR(dm[1]) ?? undefined,
      dataEmissao: parseDataBR(dm[2]) ?? undefined,
      valorAberto,
    })
  }
  return itens
}

export async function parseRelatorioSuporte(buffer: Buffer): Promise<RelatorioParseResult> {
  const { text } = await pdf(buffer)
  return parseRelatorioSuporteTexto(text)
}

export function parseRelatorioSuporteTexto(text: string): RelatorioParseResult {
  const erros: ParseErroPdf[] = []

  const tipoRelatorio = detectarTipoRelatorio(text)
  const codigoConta = detectarCodigoConta(text, tipoRelatorio)
  const total = extrairTotal(text, tipoRelatorio)

  let itens: ItemRelatorioParsed[] = []
  if (tipoRelatorio === 'EXTRATO_BANCARIO') itens = extrairItensExtrato(text)
  else if (tipoRelatorio === 'CR_ABERTO') itens = extrairItensCR(text)
  else if (tipoRelatorio === 'CP_ABERTO') itens = extrairItensCP(text)

  if (total === null) {
    erros.push({
      contexto: 'total',
      trecho: tipoRelatorio,
      mensagem: 'Total impresso não localizado para o tipo detectado.',
    })
  }

  return {
    tipoRelatorio,
    codigoConta,
    total: total ?? 0,
    itens,
    parseConfiavel: total !== null && tipoRelatorio !== 'OUTROS',
    erros,
  }
}
