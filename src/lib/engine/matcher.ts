import { LancamentoRazao } from '@/lib/types/razao'
import {
  CONFIG_PADRAO,
  ConfigMatching,
  LancamentoConciliavel,
  TipoMatch,
  avaliarPar,
} from './rules'

export type Aprovacao = 'APROVADO' | 'PENDENTE'

/**
 * Grupo de lançamentos conciliados entre si. Pode ter 2 membros (par 1:1) ou
 * mais (1:N — um título quitado por várias baixas parciais), conforme o modelo
 * `ParConciliacao.lancamentos` (relação N) do Prisma.
 */
export interface GrupoConciliado {
  ids: string[]
  regra: string
  tipo: TipoMatch
  score: number
  totalDebito: number
  totalCredito: number
  diferencaValor: number
  /** Exatos (Regras 1–2) são aprovados automaticamente; demais entram para revisão. */
  aprovacao: Aprovacao
}

export interface Divergencia {
  dupCr: string | null
  parcela: string | null
  ids: string[]
  motivo: 'VALOR_DIVERGENTE'
  descricao: string
}

export interface ResultadoConciliacao {
  grupos: GrupoConciliado[]
  divergencias: Divergencia[]
  pendentes: string[]
  resumo: {
    total: number
    grupos: number
    conciliados: number
    aprovadosAuto: number
    paraRevisao: number
    divergencias: number
    pendentes: number
  }
}

function aprovacaoDe(tipo: TipoMatch): Aprovacao {
  return tipo === 'AUTOMATICO_EXATO' ? 'APROVADO' : 'PENDENTE'
}

function soma(lancs: LancamentoConciliavel[], campo: 'debito' | 'credito'): number {
  return lancs.reduce((acc, l) => acc + l[campo], 0)
}

/**
 * Concilia uma lista de lançamentos (intra-conta, fase 1).
 *
 * Fase 1 — Regra 1 por DUPLICATA (agregada): agrupa por `dupCr`+`parcela`; se há
 * débito e crédito e `Σdébito ≈ Σcrédito` (≤ tolerância), todo o grupo é conciliado
 * (cobre 1:1 e 1:N). Se os dois lados existem mas a soma não fecha → divergência.
 *
 * Fase 2 — Regras 2/3/4 (par 1:1) sobre o que sobrou, de forma gulosa por score.
 *
 * O restante fica PENDENTE.
 */
export function conciliar(
  lancamentos: LancamentoConciliavel[],
  cfg: ConfigMatching = CONFIG_PADRAO,
): ResultadoConciliacao {
  const usados = new Set<string>()
  const grupos: GrupoConciliado[] = []
  const divergencias: Divergencia[] = []

  // ---- Fase 1: agrupamento por duplicata ----
  const porDup = new Map<string, LancamentoConciliavel[]>()
  for (const l of lancamentos) {
    if (!l.dupCr) continue
    const chave = `${l.dupCr}|${l.parcela ?? ''}`
    const grupo = porDup.get(chave)
    if (grupo) grupo.push(l)
    else porDup.set(chave, [l])
  }

  for (const grupo of porDup.values()) {
    const totalDebito = soma(grupo, 'debito')
    const totalCredito = soma(grupo, 'credito')
    if (!(totalDebito > 0 && totalCredito > 0)) continue // só um lado → fica para fase 2/pendente
    const diff = Math.abs(totalDebito - totalCredito)
    const ids = grupo.map((l) => l.id)
    grupo.forEach((l) => usados.add(l.id))

    if (diff <= cfg.toleranciaValor + 1e-9) {
      grupos.push({
        ids,
        regra: 'REGRA_1_DUPLICATA',
        tipo: 'AUTOMATICO_EXATO',
        score: 1.0,
        totalDebito,
        totalCredito,
        diferencaValor: diff,
        aprovacao: 'APROVADO',
      })
    } else {
      const ref = grupo[0]
      divergencias.push({
        dupCr: ref.dupCr ?? null,
        parcela: ref.parcela ?? null,
        ids,
        motivo: 'VALOR_DIVERGENTE',
        descricao: `Duplicata ${ref.dupCr}/${ref.parcela ?? '-'}: Σdébito (${totalDebito.toFixed(2)}) ≠ Σcrédito (${totalCredito.toFixed(2)})`,
      })
    }
  }

  // ---- Fase 2: pares residuais (Regras 2/3/4) ----
  const residuais = lancamentos.filter((l) => !usados.has(l.id))
  const candidatos: Array<{ aId: string; bId: string; regra: string; tipo: TipoMatch; score: number; diferencaValor: number }> = []
  for (let i = 0; i < residuais.length; i++) {
    for (let j = i + 1; j < residuais.length; j++) {
      const av = avaliarPar(residuais[i], residuais[j], cfg)
      if (av) candidatos.push({ aId: residuais[i].id, bId: residuais[j].id, ...av })
    }
  }
  candidatos.sort((x, y) => y.score - x.score || x.diferencaValor - y.diferencaValor)

  const porId = new Map(lancamentos.map((l) => [l.id, l]))
  for (const c of candidatos) {
    if (usados.has(c.aId) || usados.has(c.bId)) continue
    usados.add(c.aId)
    usados.add(c.bId)
    const a = porId.get(c.aId)!
    const b = porId.get(c.bId)!
    grupos.push({
      ids: [c.aId, c.bId],
      regra: c.regra,
      tipo: c.tipo,
      score: c.score,
      totalDebito: a.debito + b.debito,
      totalCredito: a.credito + b.credito,
      diferencaValor: c.diferencaValor,
      aprovacao: aprovacaoDe(c.tipo),
    })
  }

  const pendentes = lancamentos.filter((l) => !usados.has(l.id)).map((l) => l.id)
  const conciliados = grupos.reduce((acc, g) => acc + g.ids.length, 0)
  const aprovadosAuto = grupos.filter((g) => g.aprovacao === 'APROVADO').length

  return {
    grupos,
    divergencias,
    pendentes,
    resumo: {
      total: lancamentos.length,
      grupos: grupos.length,
      conciliados,
      aprovadosAuto,
      paraRevisao: grupos.length - aprovadosAuto,
      divergencias: divergencias.length,
      pendentes: pendentes.length,
    },
  }
}

/** Adapta um lançamento do parser para o engine. */
export function conciliavelDeRazao(l: LancamentoRazao, id: string): LancamentoConciliavel {
  return {
    id,
    dataLancamento: l.dataLancamento,
    documento: l.documento,
    debito: l.debito,
    credito: l.credito,
    natureza: l.natureza,
    dupCr: l.tokens.dupCr,
    parcela: l.tokens.parcela,
    idBaixa: l.tokens.idBaixa,
    doctoBaixa: l.tokens.doctoBaixa,
    ordemFaturamento: l.tokens.ordemFaturamento,
    cnpjParceiro: l.tokens.cnpjParceiro,
  }
}
