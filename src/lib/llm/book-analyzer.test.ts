import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  analisarFicha,
  precisaAnaliseLlm,
  PayloadAnaliseFicha,
} from './book-analyzer'

const payloadBase: PayloadAnaliseFicha = {
  codigoConta: '200003',
  nomeConta: 'FORNECEDORES NACIONAIS',
  tipoConta: 'PASSIVO_CIRCULANTE',
  status: 'TOLERANCIA',
  saldoRazao: 1046071.39,
  saldoBalancete: 1046071.39,
  saldoRelatorio: 1046071.4,
  diferencaBalancete: 0,
  diferencaRelatorio: -0.01,
  alertas: ['arredondamento R$ 0,01'],
}

const respostaModelo = {
  content: [
    {
      type: 'text',
      text:
        '```json\n' +
        JSON.stringify({
          naturezaDivergencia: 'Diferença de arredondamento entre relatório CP e razão.',
          riscoContabil: 'BAIXO',
          riscoFiscal: 'NENHUM',
          acaoCorretiva: 'Documentar nota de arredondamento de R$ 0,01.',
          responsavel: 'CONTABILIDADE',
          materialidade: 'BAIXA',
          notaParaRevisao: 'Divergência imaterial de arredondamento; sem impacto fiscal.',
        }) +
        '\n```',
    },
  ],
}

describe('Etapa 6 — análise LLM (Claude API)', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // ── B4: só TOLERANCIA/DIVERGENTE ──
  it('precisaAnaliseLlm: só TOLERANCIA e DIVERGENTE acionam LLM', () => {
    expect(precisaAnaliseLlm('TOLERANCIA')).toBe(true)
    expect(precisaAnaliseLlm('DIVERGENTE')).toBe(true)
    expect(precisaAnaliseLlm('CONCILIADA')).toBe(false)
    expect(precisaAnaliseLlm('PENDENTE')).toBe(false)
  })

  // ── B1/B2: headers e parâmetros corretos da requisição ──
  it('monta a requisição com x-api-key, anthropic-version, modelo e max_tokens 2000', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      json: async () => respostaModelo,
    }))
    vi.stubGlobal('fetch', fetchMock)

    await analisarFicha(payloadBase)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    const headers = init.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('sk-test-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('claude-sonnet-4-6')
    expect(body.max_tokens).toBe(2000)
    expect(body.temperature).toBe(0)
  })

  // ── Contrato §10.3: JSON parseado (com fences removidas) ──
  it('retorna o JSON do contrato §10.3, removendo fences ```json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => respostaModelo })),
    )
    const analise = await analisarFicha(payloadBase)
    expect(analise.riscoContabil).toBe('BAIXO')
    expect(analise.riscoFiscal).toBe('NENHUM')
    expect(analise.responsavel).toBe('CONTABILIDADE')
    expect(analise.materialidade).toBe('BAIXA')
    expect(analise.naturezaDivergencia).toMatch(/arredondamento/i)
    expect(analise.notaParaRevisao.length).toBeGreaterThan(0)
  })

  // ── valores de enum inválidos são coagidos para um padrão seguro ──
  it('coage enums inválidos para padrão seguro', async () => {
    const respostaRuim = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            naturezaDivergencia: 'x',
            riscoContabil: 'CRÍTICO', // inválido
            riscoFiscal: 'TALVEZ', // inválido
            acaoCorretiva: 'y',
            responsavel: 'TI', // inválido
            materialidade: 'GIGANTE', // inválido
            notaParaRevisao: 'z',
          }),
        },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => respostaRuim })),
    )
    const a = await analisarFicha(payloadBase)
    expect(a.riscoContabil).toBe('BAIXO')
    expect(a.riscoFiscal).toBe('NENHUM')
    expect(a.responsavel).toBe('CONTABILIDADE')
    expect(a.materialidade).toBe('BAIXA')
  })

  // ── erros tratados (nunca silenciados) ──
  it('lança erro claro se a chave estiver ausente', async () => {
    delete process.env.ANTHROPIC_API_KEY
    await expect(analisarFicha(payloadBase)).rejects.toThrow(/ANTHROPIC_API_KEY/)
  })

  it('lança erro se a API responder com status de falha (ex.: 401)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => 'authentication_error',
      })),
    )
    await expect(analisarFicha(payloadBase)).rejects.toThrow(/401/)
  })
})
