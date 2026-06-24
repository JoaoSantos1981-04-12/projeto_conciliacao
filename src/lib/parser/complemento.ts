import { ComplementoTokens } from '@/lib/types/razao'
import { parse, isValid } from 'date-fns'

/**
 * Extrai pares CHAVE:VALOR do campo COMPLEMENTO HISTÓRICO.
 *
 * As chaves reais contêm letras, pontos e barras (ex.: `DUP.CR.`, `ID.DUP.CR`,
 * `CNPJ/CPF`, `DOCTO.BAIXA`). O valor vai até o início da próxima chave
 * (precedida por espaço) ou o fim da string — por isso valores podem conter
 * espaços, barras e hífens (ex.: CNPJ + razão social, datas, contas correntes).
 *
 * Observação: o regex sugerido no CLAUDE.md (`/([A-Z_.]+...):([^/]+?).../`)
 * não casava `CNPJ/CPF` (a classe de chave não inclui `/`) e truncava valores
 * no primeiro `/` (datas e CNPJs). Este padrão corrige ambos os casos.
 */
const TOKEN_REGEX = /([A-Z][A-Z0-9_./]*):\s*(.*?)(?=\s+[A-Z][A-Z0-9_./]*:|$)/g

export function parseComplemento(texto: string): ComplementoTokens {
  if (!texto) return {}

  const tokens: Record<string, string> = {}
  let match: RegExpExecArray | null
  TOKEN_REGEX.lastIndex = 0
  while ((match = TOKEN_REGEX.exec(texto)) !== null) {
    const chave = match[1].trim()
    const valor = match[2].trim()
    if (valor) tokens[chave] = valor
  }

  const cnpjRaw = tokens['CNPJ/CPF'] ?? ''
  const [cnpj, ...nomePartes] = cnpjRaw.split(' - ')

  const vctoStr = tokens['VCTO']
  let vencimento: Date | undefined
  if (vctoStr) {
    const d = parse(vctoStr, 'dd/MM/yyyy', new Date())
    if (isValid(d)) vencimento = d
  }

  return {
    dupCr: tokens['DUP.CR.'] ?? tokens['DUP.CR'] ?? tokens['DUP'],
    parcela: tokens['PARC'],
    vencimento,
    cnpjParceiro: cnpj?.trim() || undefined,
    nomeParceiro: nomePartes.join(' - ').trim() || undefined,
    idDupCr: tokens['ID.DUP.CR'],
    ordemFaturamento: tokens['OF'],
    doctoBaixa: tokens['DOCTO.BAIXA'],
    bancoBaixa: tokens['BCO.BAIXA'],
    ccBaixa: tokens['CC.BAIXA'],
    idBaixa: tokens['ID.BAIXA'],
    nrAdiantamento: tokens['NR.ADTO'],
  }
}
