import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { FibDashboardData } from '@/lib/types/fib'

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { erro: 'API key do Gemini não configurada' },
        { status: 500 }
      )
    }

    const { dashboardData } = await req.json() as { dashboardData: FibDashboardData }

    if (!dashboardData) {
      return NextResponse.json(
        { erro: 'dashboardData é obrigatório' },
        { status: 400 }
      )
    }

    // Preparar prompt com contexto financeiro
    const prompt = formatarPrompt(dashboardData)

    // Chamar Gemini API
    const resposta = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!resposta.ok) {
      const erro = await resposta.text()
      console.error('Erro Gemini API:', erro)
      return NextResponse.json(
        { erro: 'Erro ao chamar API de IA' },
        { status: 500 }
      )
    }

    const resultado = await resposta.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string
          }>
        }
      }>
    }

    const insight = resultado.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return NextResponse.json({
      insight,
      timestamp: new Date(),
    })
  } catch (erro) {
    console.error('Erro ao gerar insights de IA:', erro)
    return NextResponse.json(
      { erro: 'Erro ao gerar insights' },
      { status: 500 }
    )
  }
}

/**
 * Formata os dados do dashboard em um prompt para o Gemini
 */
function formatarPrompt(dados: FibDashboardData): string {
  const { kpis, alertas } = dados

  return `Você é um analista financeiro executivo experiente. Analise os seguintes indicadores financeiros e forneça um sumário executivo conciso (máximo 5 pontos-chave) em português brasileiro:

**Indicadores Principais:**
- Faturamento: R$ ${kpis.totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Despesas: R$ ${kpis.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- EBITDA: R$ ${kpis.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Lucro Líquido: R$ ${kpis.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Margem Líquida: ${(kpis.margemLiquida * 100).toFixed(1)}%

**Posição Financeira:**
- Ativo Total: R$ ${kpis.ativoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Passivo Total: R$ ${kpis.passivoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Patrimônio Líquido: R$ ${kpis.patrimonioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

**Índices de Liquidez e Endividamento:**
- Liquidez Corrente: ${kpis.liquidezCorrente.toFixed(2)}x
- Liquidez Geral: ${kpis.liquidezGeral.toFixed(2)}x
- Endividamento: ${(kpis.endividamento * 100).toFixed(1)}%

**Alertas Identificados:**
${alertas.map((a) => `- [${a.severidade}] ${a.titulo}: ${a.descricao}`).join('\n')}

Com base nesses dados, forneça:
1. Um resumo executivo (2-3 frases)
2. Os 3 principais pontos de atenção ou preocupações
3. 2 oportunidades ou pontos positivos
4. Uma recomendação estratégica concisa

Seja direto, objetivo e baseado apenas nos números fornecidos.`
}
