import {
  ConfiguracaoComparacao,
  ParComparacaoResult,
  LancamentoSemPar,
  ResultadoComparacao,
  RegraMatchComparacao,
  LancamentoComparavel as Lct,
} from '@/lib/types/comparacao'
import { differenceInCalendarDays, isWithinInterval } from 'date-fns'

// ─── helpers ────────────────────────────────────────────────────────────────

function valorEfetivo(l: Lct): number {
  // Usa o lado com valor — nunca os dois são preenchidos ao mesmo tempo.
  return l.debito > 0 ? l.debito : l.credito
}

function diferencaPercentual(a: number, b: number): number {
  if (a === 0 && b === 0) return 0
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b))
}

// ─── regras padrão por cenário ───────────────────────────────────────────────

export const REGRAS_PADRAO: Record<string, RegraMatchComparacao[]> = {
  FORNECEDORES_BANCO: [
    { nome: 'Exato por documento de baixa', peso: 1.0, campos: ['doctoBaixa', 'valor'], ativa: true },
    { nome: 'ID de baixa + valor', peso: 0.95, campos: ['idBaixa', 'valor'], ativa: true },
    {
      nome: 'Documento + CNPJ + valor próximo',
      peso: 0.8,
      campos: ['documento', 'cnpjParceiro', 'valor'],
      ativa: true,
    },
    { nome: 'Valor + data próxima', peso: 0.65, campos: ['valor', 'data'], ativa: true },
  ],
  CLIENTES_BANCO: [
    { nome: 'Exato por documento de baixa', peso: 1.0, campos: ['doctoBaixa', 'valor'], ativa: true },
    { nome: 'DUP.CR + parcela + valor', peso: 0.95, campos: ['dupCr', 'valor'], ativa: true },
    { nome: 'ID de baixa', peso: 0.9, campos: ['idBaixa', 'valor'], ativa: true },
    { nome: 'CNPJ + valor + período', peso: 0.7, campos: ['cnpjParceiro', 'valor', 'data'], ativa: true },
  ],
  INTERCOMPANY: [
    { nome: 'Documento espelho exato', peso: 1.0, campos: ['documento', 'valor'], ativa: true },
    { nome: 'Ordem de faturamento + valor', peso: 0.9, campos: ['ordemFaturamento', 'valor'], ativa: true },
    { nome: 'CNPJ + valor + período', peso: 0.75, campos: ['cnpjParceiro', 'valor', 'data'], ativa: true },
  ],
  PERSONALIZADO: [],
}

// ─── score de um par candidato ───────────────────────────────────────────────

function calcularScore(
  a: Lct,
  b: Lct,
  regra: RegraMatchComparacao,
  config: ConfiguracaoComparacao,
): number {
  let score = regra.peso
  const penalidades: number[] = []

  for (const campo of regra.campos) {
    switch (campo) {
      case 'documento':
        if (a.documento !== b.documento) return 0
        break
      case 'dupCr':
        if (!a.tokens.dupCr || a.tokens.dupCr !== b.tokens.dupCr) return 0
        break
      case 'idBaixa':
        if (!a.tokens.idBaixa || a.tokens.idBaixa !== b.tokens.idBaixa) return 0
        break
      case 'doctoBaixa':
        if (!a.tokens.doctoBaixa || a.tokens.doctoBaixa !== b.tokens.doctoBaixa) return 0
        break
      case 'ordemFaturamento':
        if (!a.tokens.ordemFaturamento || a.tokens.ordemFaturamento !== b.tokens.ordemFaturamento) return 0
        break
      case 'cnpjParceiro':
        if (!a.tokens.cnpjParceiro || a.tokens.cnpjParceiro !== b.tokens.cnpjParceiro) return 0
        break
      case 'nrAdiantamento':
        if (!a.tokens.nrAdiantamento || a.tokens.nrAdiantamento !== b.tokens.nrAdiantamento) return 0
        break
      case 'valor': {
        const va = valorEfetivo(a)
        const vb = valorEfetivo(b)
        const diff = Math.abs(va - vb)
        if (diff > config.toleranciaValor) return 0
        // Penalidade proporcional à diferença de valor.
        penalidades.push(diferencaPercentual(va, vb) * 0.3)
        break
      }
      case 'data': {
        const dias = Math.abs(differenceInCalendarDays(a.dataLancamento, b.dataLancamento))
        if (dias > config.toleranciaDias) return 0
        // Penalidade proporcional à defasagem de dias (evita divisão por zero).
        if (config.toleranciaDias > 0) penalidades.push((dias / config.toleranciaDias) * 0.2)
        break
      }
    }
  }

  const penalidade = penalidades.reduce((acc, p) => acc + p, 0)
  return Math.max(0, score - penalidade)
}

// ─── engine principal ────────────────────────────────────────────────────────

export function compararContas(
  lancamentosA: Lct[],
  lancamentosB: Lct[],
  config: ConfiguracaoComparacao,
): Omit<ResultadoComparacao, 'sessaoId'> {
  const regras =
    config.regrasPrioridade.length > 0
      ? config.regrasPrioridade
      : (REGRAS_PADRAO[config.cenario] ?? REGRAS_PADRAO.FORNECEDORES_BANCO)

  const regrasAtivas = regras
    .filter((r) => r.ativa)
    .sort((x, y) => y.peso - x.peso) // maior peso primeiro

  // Filtra pelo período configurado.
  const filtrarPeriodo = (l: Lct) =>
    isWithinInterval(l.dataLancamento, { start: config.periodoInicio, end: config.periodoFim })

  const a = lancamentosA.filter(filtrarPeriodo)
  const b = lancamentosB.filter(filtrarPeriodo)

  const pareados = new Set<string>() // IDs já usados em pares
  const pares: ParComparacaoResult[] = []

  // Para cada lançamento de A, busca o melhor par disponível em B.
  for (const la of a) {
    let melhorScore = 0
    let melhorPar: Lct | null = null
    let regraAplicada = ''

    for (const regra of regrasAtivas) {
      for (const lb of b) {
        if (pareados.has(lb.id)) continue
        const score = calcularScore(la, lb, regra, config)
        if (score > melhorScore) {
          melhorScore = score
          melhorPar = lb
          regraAplicada = regra.nome
        }
      }
      // Para na primeira regra que encontrar par (maior peso = maior prioridade).
      if (melhorPar) break
    }

    if (melhorPar && melhorScore > 0) {
      pareados.add(la.id)
      pareados.add(melhorPar.id)
      pares.push({
        lancamentoA: la,
        lancamentoB: melhorPar,
        score: melhorScore,
        diferencaValor: Math.abs(valorEfetivo(la) - valorEfetivo(melhorPar)),
        diferencaDias: Math.abs(differenceInCalendarDays(la.dataLancamento, melhorPar.dataLancamento)),
        regraQueAplicou: regraAplicada,
        status: 'PENDENTE',
      })
    }
  }

  // Lançamentos sem par.
  const semParA: LancamentoSemPar[] = a
    .filter((l) => !pareados.has(l.id))
    .map((l) => ({
      lancamento: l,
      conta: 'A' as const,
      motivoSemPar: 'Nenhuma contrapartida encontrada na conta B no período',
    }))

  const semParB: LancamentoSemPar[] = b
    .filter((l) => !pareados.has(l.id))
    .map((l) => ({
      lancamento: l,
      conta: 'B' as const,
      motivoSemPar: 'Nenhuma contrapartida encontrada na conta A no período',
    }))

  // Resumo.
  const somaA = semParA.reduce((s, x) => s + valorEfetivo(x.lancamento), 0)
  const somaB = semParB.reduce((s, x) => s + valorEfetivo(x.lancamento), 0)
  const mediaConfianca = pares.length > 0 ? pares.reduce((s, p) => s + p.score, 0) / pares.length : 0

  return {
    config,
    pares,
    semParA,
    semParB,
    resumo: {
      totalA: a.length,
      totalB: b.length,
      paresEncontrados: pares.length,
      taxaMatchA: a.length > 0 ? pares.length / a.length : 0,
      taxaMatchB: b.length > 0 ? pares.length / b.length : 0,
      valorSemParA: somaA,
      valorSemParB: somaB,
      maiorDivergencia: pares.reduce((m, p) => Math.max(m, p.diferencaValor), 0),
      mediaConfianca,
    },
  }
}
