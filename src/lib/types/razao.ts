export interface MetadadosRazao {
  empresa: string
  cnpjEmpresa: string
  codigoFilial: string
  periodoInicio: Date
  periodoFim: Date
  evento: string
}

export interface ContaRazao {
  codigo: string
  nome: string
  saldoAnterior: number
}

export interface LancamentoRazao {
  dataLancamento: Date
  documento: string
  historicoPadrao: string
  complemento: string
  contaIntegracao: string
  centroCusto: string
  descCentroCusto: string
  ficha: string
  sequencia: number
  debito: number
  credito: number
  saldo: number
  // tokens extraídos
  tokens: ComplementoTokens
  natureza: NaturezaLancamento
}

export interface ComplementoTokens {
  dupCr?: string
  parcela?: string
  vencimento?: Date
  cnpjParceiro?: string
  nomeParceiro?: string
  idDupCr?: string
  ordemFaturamento?: string
  doctoBaixa?: string
  bancoBaixa?: string
  ccBaixa?: string
  idBaixa?: string
  nrAdiantamento?: string
}

export type NaturezaLancamento =
  | 'BAIXA_CLIENTE'
  | 'BAIXA_FORNECEDOR'
  | 'NF_SAIDA'
  | 'NF_ENTRADA'
  | 'CONTRAPARTIDA_BAIXA_FORNECEDOR'
  | 'CONTRAPARTIDA_NF_SAIDA'
  | 'OUTRO'

export interface RazaoParseResult {
  metadados: MetadadosRazao
  contas: Array<{
    conta: ContaRazao
    lancamentos: LancamentoRazao[]
  }>
  erros: ParseError[]
}

export interface ParseError {
  linha: number
  campo: string
  valor: string
  mensagem: string
}
