import {
  AnaliseLlm,
  StatusFicha,
  TipoConta,
  RiscoNivel,
  RiscoFiscal,
  Materialidade,
  ResponsavelArea,
} from '@/lib/types/book'

/**
 * Integração com a Claude API para análise contábil de divergências (§10).
 *
 * Correções da SPEC v2.0:
 *  - B1: headers x-api-key + anthropic-version (sem eles → 401).
 *  - B2: max_tokens 2000 (1000 truncava o JSON).
 *  - B4: assíncrono e fora do path do upload — acionado SÓ para TOLERANCIA/
 *        DIVERGENTE (ver `precisaAnaliseLlm`), nunca no upload síncrono.
 *
 * Saída: contrato JSON §10.3 (AnaliseLlm).
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT_CONTADOR = `Você é um Contador Sênior especialista em conciliação contábil e auditoria, analisando uma divergência de amarração de saldos (Balancete = Razão = Σ relatório em aberto) de uma conta patrimonial.

Analise os dados recebidos e responda com linguagem técnica e executiva, em português brasileiro.

Responda EXCLUSIVAMENTE com um objeto JSON válido (sem texto antes ou depois, sem markdown), com EXATAMENTE estas chaves:
{
  "naturezaDivergencia": "descrição objetiva da provável causa da diferença",
  "riscoContabil": "ALTO" | "MEDIO" | "BAIXO",
  "riscoFiscal": "ALTO" | "MEDIO" | "BAIXO" | "NENHUM",
  "acaoCorretiva": "ação concreta recomendada",
  "responsavel": "CONTABILIDADE" | "FINANCEIRO" | "FISCAL" | "CLIENTE" | "AUDITORIA",
  "materialidade": "ALTA" | "MEDIA" | "BAIXA",
  "notaParaRevisao": "nota em linguagem executiva para o papel de trabalho"
}

Considere que diferenças de até R$ 0,05 são tipicamente arredondamento (risco baixo), enquanto diferenças maiores ou recorrentes exigem investigação. Use apenas os valores de enum listados.`

const RISCOS: readonly RiscoNivel[] = ['ALTO', 'MEDIO', 'BAIXO']
const RISCOS_FISCAIS: readonly RiscoFiscal[] = ['ALTO', 'MEDIO', 'BAIXO', 'NENHUM']
const MATERIALIDADES: readonly Materialidade[] = ['ALTA', 'MEDIA', 'BAIXA']
const RESPONSAVEIS: readonly ResponsavelArea[] = [
  'CONTABILIDADE',
  'FINANCEIRO',
  'FISCAL',
  'CLIENTE',
  'AUDITORIA',
]

/** Payload enviado ao modelo para uma ficha. */
export interface PayloadAnaliseFicha {
  codigoConta: string
  nomeConta: string
  tipoConta: TipoConta
  status: StatusFicha
  saldoRazao: number
  saldoBalancete: number
  saldoRelatorio: number
  diferencaBalancete: number
  diferencaRelatorio: number
  alertas?: string[]
}

/** B4: a análise LLM só roda para TOLERANCIA e DIVERGENTE (§10.2). */
export function precisaAnaliseLlm(status: StatusFicha): boolean {
  return status === 'TOLERANCIA' || status === 'DIVERGENTE'
}

// ─── parsing defensivo da resposta ───────────────────────────────────────────

function extrairTextoResposta(data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Resposta da Claude API sem corpo de objeto.')
  }
  const content = (data as { content?: unknown }).content
  if (!Array.isArray(content) || content.length === 0) {
    const err = (data as { error?: { message?: string } }).error
    throw new Error(`Resposta da Claude API sem content. ${err?.message ?? ''}`.trim())
  }
  const primeiro = content[0]
  const texto =
    typeof primeiro === 'object' && primeiro !== null
      ? (primeiro as { text?: unknown }).text
      : undefined
  if (typeof texto !== 'string') {
    throw new Error('Bloco de conteúdo da Claude API sem campo text.')
  }
  return texto
}

function coagir<T extends string>(
  valor: unknown,
  permitidos: readonly T[],
  padrao: T,
): T {
  return typeof valor === 'string' && (permitidos as readonly string[]).includes(valor)
    ? (valor as T)
    : padrao
}

function parseAnalise(texto: string): AnaliseLlm {
  const limpo = texto.replace(/```json|```/g, '').trim()
  let bruto: unknown
  try {
    bruto = JSON.parse(limpo)
  } catch {
    throw new Error(`JSON inválido retornado pelo modelo: ${limpo.slice(0, 200)}`)
  }
  const o = bruto as Record<string, unknown>
  return {
    naturezaDivergencia: String(o.naturezaDivergencia ?? '').trim(),
    riscoContabil: coagir(o.riscoContabil, RISCOS, 'BAIXO'),
    riscoFiscal: coagir(o.riscoFiscal, RISCOS_FISCAIS, 'NENHUM'),
    acaoCorretiva: String(o.acaoCorretiva ?? '').trim(),
    responsavel: coagir(o.responsavel, RESPONSAVEIS, 'CONTABILIDADE'),
    materialidade: coagir(o.materialidade, MATERIALIDADES, 'BAIXA'),
    notaParaRevisao: String(o.notaParaRevisao ?? '').trim(),
  }
}

/**
 * Chama a Claude API e retorna a análise estruturada (§10.3).
 * Lança erro se a chave estiver ausente ou a API responder com falha.
 */
export async function analisarFicha(payload: PayloadAnaliseFicha): Promise<AnaliseLlm> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY ausente — configure no .env.')
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0,
      system: SYSTEM_PROMPT_CONTADOR,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    }),
  })

  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    throw new Error(`Claude API retornou ${res.status}: ${corpo.slice(0, 200)}`)
  }

  const data: unknown = await res.json()
  return parseAnalise(extrairTextoResposta(data))
}
