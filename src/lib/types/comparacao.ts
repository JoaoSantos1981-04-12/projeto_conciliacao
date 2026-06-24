import { LancamentoRazao } from './razao'

export type CenarioComparacao =
  | 'FORNECEDORES_BANCO'
  | 'CLIENTES_BANCO'
  | 'INTERCOMPANY'
  | 'PERSONALIZADO'

export type StatusParComparacao = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'IGNORADO'

export interface ConfiguracaoComparacao {
  contaOrigemId: string // ID da ContaContabil no banco
  contaDestinoId: string
  cenario: CenarioComparacao
  nomeDescritivo: string
  periodoInicio: Date
  periodoFim: Date
  toleranciaValor: number // diferença máxima em R$ para aceitar como par
  toleranciaDias: number // defasagem máxima em dias entre os lançamentos
  regrasPrioridade: RegraMatchComparacao[]
}

export interface RegraMatchComparacao {
  nome: string
  peso: number // 0.0 a 1.0
  campos: CampoMatchComparacao[]
  ativa: boolean
}

export type CampoMatchComparacao =
  | 'documento'
  | 'dupCr'
  | 'idBaixa'
  | 'doctoBaixa'
  | 'ordemFaturamento'
  | 'cnpjParceiro'
  | 'valor'
  | 'data'
  | 'nrAdiantamento'

/** Lançamento já carregado do banco (com id) usado pelo engine de comparação. */
export type LancamentoComparavel = LancamentoRazao & { id: string }

export interface ParComparacaoResult {
  lancamentoA: LancamentoComparavel
  lancamentoB: LancamentoComparavel
  score: number
  diferencaValor: number
  diferencaDias: number
  regraQueAplicou: string
  status: StatusParComparacao
}

export interface LancamentoSemPar {
  lancamento: LancamentoComparavel
  conta: 'A' | 'B'
  motivoSemPar: string
}

export interface ResumoComparacao {
  totalA: number
  totalB: number
  paresEncontrados: number
  taxaMatchA: number // % de A com par (0.0 a 1.0)
  taxaMatchB: number // % de B com par (0.0 a 1.0)
  valorSemParA: number
  valorSemParB: number
  maiorDivergencia: number
  mediaConfianca: number
}

export interface ResultadoComparacao {
  sessaoId: string
  config: ConfiguracaoComparacao
  pares: ParComparacaoResult[]
  semParA: LancamentoSemPar[] // lançamentos de A sem contrapartida em B
  semParB: LancamentoSemPar[] // lançamentos de B sem contrapartida em A
  resumo: ResumoComparacao
}
