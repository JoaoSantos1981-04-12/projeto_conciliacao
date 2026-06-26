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

// Provedor de LLM configurável (§10 usa Anthropic por padrão). Gemini é uma
// alternativa ativada via LLM_PROVIDER=gemini — útil quando a conta Anthropic
// está sem créditos. O contrato de saída (AnaliseLlm §10.3) é o mesmo.
const GEMINI_URL = (model: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

function provedorAtivo(): 'anthropic' | 'gemini' {
  return (process.env.LLM_PROVIDER ?? 'anthropic').toLowerCase() === 'gemini'
    ? 'gemini'
    : 'anthropic'
}

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

function extrairTextoGemini(data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Resposta da Gemini API sem corpo de objeto.')
  }
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates) || candidates.length === 0) {
    const err = (data as { error?: { message?: string } }).error
    throw new Error(`Resposta da Gemini API sem candidates. ${err?.message ?? ''}`.trim())
  }
  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content?.parts
  const primeiro = Array.isArray(parts) ? parts[0] : undefined
  const texto =
    typeof primeiro === 'object' && primeiro !== null
      ? (primeiro as { text?: unknown }).text
      : undefined
  if (typeof texto !== 'string') {
    throw new Error('Resposta da Gemini API sem texto na parte de conteúdo.')
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
 * Analisa uma ficha via LLM e retorna a estrutura §10.3.
 * Despacha para Anthropic (padrão) ou Gemini conforme LLM_PROVIDER.
 */
export async function analisarFicha(payload: PayloadAnaliseFicha): Promise<AnaliseLlm> {
  const texto =
    provedorAtivo() === 'gemini'
      ? await chamarGemini(payload)
      : await chamarAnthropic(payload)
  return parseAnalise(texto)
}

/** Claude API (§10.1): headers x-api-key + anthropic-version; max_tokens 2000. */
async function chamarAnthropic(payload: PayloadAnaliseFicha): Promise<string> {
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
  return extrairTextoResposta(data)
}

/** Gemini API (generateContent): chave no header x-goog-api-key; JSON na saída. */
async function chamarGemini(payload: PayloadAnaliseFicha): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ausente — configure no .env.')
  }
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

  const res = await fetch(GEMINI_URL(model), {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT_CONTADOR }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
        // Modelos Gemini 2.5 são "thinking": os tokens de raciocínio consomem
        // maxOutputTokens e truncam o JSON. Desligamos para saída estruturada.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })

  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    throw new Error(`Gemini API retornou ${res.status}: ${corpo.slice(0, 200)}`)
  }

  const data: unknown = await res.json()
  return extrairTextoGemini(data)
}
