import pdf from 'pdf-parse/lib/pdf-parse.js'
import { TipoRelatorio, DeteccaoPdf } from '@/lib/types/book'

/**
 * Roteador de PDFs de suporte (U1 / §12.1).
 *
 * A partir do texto do PDF detecta o TIPO de relatório e o CÓDIGO da conta,
 * para casar automaticamente com a ficha. Detecção por conta pode falhar
 * (ex.: extrato bancário não carrega o código contábil) — nesse caso o
 * auto-roteamento usa a ficha de banco (única ATIVO_BANCO) e `fichaId` manual
 * é o fallback final.
 */

/** Tipo de PDF aceito no upload do book: razão (define a ficha) ou suporte. */
export type TipoPdf = 'RAZAO' | TipoRelatorio

/** Classifica o PDF entre razão e os tipos de relatório de suporte. */
export function classificarPdf(text: string): TipoPdf {
  if (/RAZÃO CONT[ÁA]BIL/i.test(text)) return 'RAZAO'
  return detectarTipoRelatorio(text)
}

export function detectarTipoRelatorio(text: string): TipoRelatorio {
  if (/BALANCETE CONT[ÁA]BIL/i.test(text)) return 'BALANCETE'
  if (/CONTAS A RECEBER EM ABERTO/i.test(text)) return 'CR_ABERTO'
  if (/CONTAS [ÀA] PAGAR EM ABERTO/i.test(text)) return 'CP_ABERTO'
  if (/EXTRATO DE LAN[ÇC]AMENTOS BANC[ÁA]RIOS/i.test(text)) return 'EXTRATO_BANCARIO'
  return 'OUTROS'
}

function moda(valores: string[]): string | undefined {
  if (valores.length === 0) return undefined
  const cont = new Map<string, number>()
  for (const v of valores) cont.set(v, (cont.get(v) ?? 0) + 1)
  return [...cont.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export function detectarCodigoConta(
  text: string,
  tipo: TipoRelatorio,
): string | undefined {
  switch (tipo) {
    case 'CP_ABERTO': {
      // "Conta 200003:" / "Total da Conta 200003:"
      const m = text.match(/Conta\s+(\d{6})\s*:/)
      return m?.[1]
    }
    case 'CR_ABERTO': {
      // Cada título termina com " <conta>\n<seq>\n 999999"; usa a moda.
      const codigos = [...text.matchAll(/ (\d{6})\n\d+\n\s*999999/g)].map((x) => x[1])
      return moda(codigos)
    }
    // BALANCETE é multi-conta (âncora); EXTRATO não traz o código contábil.
    default:
      return undefined
  }
}

export async function detectarPdf(buffer: Buffer): Promise<DeteccaoPdf> {
  const { text } = await pdf(buffer)
  const tipoRelatorio = detectarTipoRelatorio(text)
  const codigoConta = detectarCodigoConta(text, tipoRelatorio)
  // Confiável quando o tipo foi reconhecido. Conta pode faltar no extrato.
  const confiavel = tipoRelatorio !== 'OUTROS'
  return { tipoRelatorio, codigoConta, confiavel }
}
