import pdf from 'pdf-parse/lib/pdf-parse.js'
import { parseMoney } from './pdf-utils'
import { BalanceteParseResult, BalanceteConta, ParseErroPdf } from '@/lib/types/book'

/**
 * Parser do Balancete Contábil em PDF do NetCorp (NSQP1106).
 *
 * É a ÂNCORA oficial da amarração tripla (§8.1): o saldo atual de cada conta-folha
 * deve bater com o saldo final do razão e com o Σ do relatório em aberto.
 *
 * Layout por conta-folha (texto achatado):
 *   <NOME>\n <SALDO_ATUAL> <CRÉDITO> <SALDO_ANTERIOR>\n  <código>.<NNNNNN>\n <DÉBITO>
 *
 * Validado nos dados reais: 100006 → 29.637.147,22; 200003 → 1.046.071,39;
 * 100003 → 131.384,20 (todos = saldo final do razão correspondente).
 */

// Captura: saldoAtual, crédito, saldoAnterior, código COMPLETO (hierárquico
// + leaf de 6 díg., ex.: "1.01.01.01.100006"), débito.
const RE_CONTA =
  /([\d.]+,\d{2}) ([\d.]+,\d{2}) ([\d.]+,\d{2})\n\s*([\d.]+\.\d{6})\n\s*([\d.]+,\d{2})/g

export async function parseBalancete(buffer: Buffer): Promise<BalanceteParseResult> {
  const { text } = await pdf(buffer)
  return parseBalanceteTexto(text)
}

export function parseBalanceteTexto(text: string): BalanceteParseResult {
  const erros: ParseErroPdf[] = []
  const contas: BalanceteConta[] = []
  const porCodigo: Record<string, BalanceteConta> = {}

  let m: RegExpExecArray | null
  RE_CONTA.lastIndex = 0
  while ((m = RE_CONTA.exec(text)) !== null) {
    const codigoCompleto = m[4] // ex.: "1.01.01.01.100006"
    const codigoConta = codigoCompleto.slice(-6) // leaf de 6 dígitos (chave de amarração)
    const conta: BalanceteConta = {
      codigoConta,
      codigoCompleto,
      saldoAtual: parseMoney(m[1]),
      totalCredito: parseMoney(m[2]),
      saldoAnterior: parseMoney(m[3]),
      totalDebito: parseMoney(m[5]),
    }
    contas.push(conta)
    porCodigo[conta.codigoConta] = conta
  }

  if (contas.length === 0) {
    erros.push({
      contexto: 'balancete',
      trecho: '',
      mensagem: 'Nenhuma conta-folha encontrada (layout inesperado).',
    })
  }

  return { contas, porCodigo, erros }
}
