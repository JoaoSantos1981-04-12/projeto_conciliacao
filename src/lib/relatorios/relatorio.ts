export type StatusConciliacao = 'PENDENTE' | 'CONCILIADO' | 'DIVERGENCIA' | 'IGNORADO'

export interface LancRelatorio {
  id: string
  dataLancamento: Date
  documento: string
  natureza: string
  debito: number
  credito: number
  dupCr: string | null
  parcela: string | null
  nomeParceiro: string | null
  statusConciliacao: StatusConciliacao
}

export interface MetaRelatorio {
  importacaoId: string | null
  empresa: string
  periodo: { inicio: string; fim: string } | null
}

export interface ResumoRelatorio {
  meta: MetaRelatorio
  referencia: string
  totais: {
    lancamentos: number
    conciliados: number
    pendentes: number
    divergencias: number
    percentualConciliado: number
  }
  valores: {
    totalDebito: number
    totalCredito: number
    abertoDebito: number
    abertoCredito: number
  }
  porNatureza: Array<{ natureza: string; quantidade: number; debito: number; credito: number }>
  aging: Array<{ faixa: string; quantidade: number; valor: number }>
  topParceirosAberto: Array<{ parceiro: string; quantidade: number; valor: number }>
}

const MS_POR_DIA = 86_400_000

export const FAIXAS_AGING = ['A vencer', '0–30 dias', '31–60 dias', '61–90 dias', '90+ dias'] as const

/** Classifica os dias em aberto (referência − data de lançamento) em faixa de aging. */
export function classificarFaixa(diasEmAberto: number): string {
  if (diasEmAberto < 0) return 'A vencer'
  if (diasEmAberto <= 30) return '0–30 dias'
  if (diasEmAberto <= 60) return '31–60 dias'
  if (diasEmAberto <= 90) return '61–90 dias'
  return '90+ dias'
}

function arred(v: number): number {
  return Math.round(v * 100) / 100
}

/**
 * Monta o relatório consolidado a partir dos lançamentos (função pura).
 * `referencia` é a data-base do aging (tipicamente o fim do período).
 */
export function montarRelatorio(
  lancamentos: LancRelatorio[],
  meta: MetaRelatorio,
  referencia: Date,
): ResumoRelatorio {
  let conciliados = 0
  let pendentes = 0
  let divergencias = 0
  let totalDebito = 0
  let totalCredito = 0
  let abertoDebito = 0
  let abertoCredito = 0

  const natureza = new Map<string, { quantidade: number; debito: number; credito: number }>()
  const aging = new Map<string, { quantidade: number; valor: number }>()
  const parceiros = new Map<string, { quantidade: number; valor: number }>()

  for (const l of lancamentos) {
    totalDebito += l.debito
    totalCredito += l.credito

    if (l.statusConciliacao === 'CONCILIADO') conciliados++
    else if (l.statusConciliacao === 'DIVERGENCIA') divergencias++
    else if (l.statusConciliacao === 'PENDENTE') pendentes++

    const nat = natureza.get(l.natureza) ?? { quantidade: 0, debito: 0, credito: 0 }
    nat.quantidade++
    nat.debito += l.debito
    nat.credito += l.credito
    natureza.set(l.natureza, nat)

    // Títulos a receber em aberto = pendentes com débito.
    if (l.statusConciliacao === 'PENDENTE') {
      abertoCredito += l.credito
      if (l.debito > 0) {
        abertoDebito += l.debito
        const dias = Math.floor((referencia.getTime() - l.dataLancamento.getTime()) / MS_POR_DIA)
        const faixa = classificarFaixa(dias)
        const fx = aging.get(faixa) ?? { quantidade: 0, valor: 0 }
        fx.quantidade++
        fx.valor += l.debito
        aging.set(faixa, fx)

        const chave = l.nomeParceiro?.trim() || 'Sem parceiro'
        const pc = parceiros.get(chave) ?? { quantidade: 0, valor: 0 }
        pc.quantidade++
        pc.valor += l.debito
        parceiros.set(chave, pc)
      }
    }
  }

  const total = lancamentos.length

  return {
    meta,
    referencia: referencia.toISOString(),
    totais: {
      lancamentos: total,
      conciliados,
      pendentes,
      divergencias,
      percentualConciliado: total > 0 ? arred((conciliados / total) * 100) : 0,
    },
    valores: {
      totalDebito: arred(totalDebito),
      totalCredito: arred(totalCredito),
      abertoDebito: arred(abertoDebito),
      abertoCredito: arred(abertoCredito),
    },
    porNatureza: [...natureza.entries()]
      .map(([nat, v]) => ({ natureza: nat, quantidade: v.quantidade, debito: arred(v.debito), credito: arred(v.credito) }))
      .sort((a, b) => b.quantidade - a.quantidade),
    aging: FAIXAS_AGING.map((faixa) => ({
      faixa,
      quantidade: aging.get(faixa)?.quantidade ?? 0,
      valor: arred(aging.get(faixa)?.valor ?? 0),
    })),
    topParceirosAberto: [...parceiros.entries()]
      .map(([parceiro, v]) => ({ parceiro, quantidade: v.quantidade, valor: arred(v.valor) }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10),
  }
}
