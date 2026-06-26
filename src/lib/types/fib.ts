// Tipos para Financial Intelligence Book (FIB)

export enum ContaClassificacao {
  ATIVO = 'ATIVO',
  PASSIVO = 'PASSIVO',
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
  PATRIMONIO = 'PATRIMONIO',
  OUTRO = 'OUTRO',
}

export interface FibKpi {
  id: string
  importacaoId: string
  periodo: {
    inicio: Date
    fim: Date
  }
  // Resumo de valores
  totalReceitas: number
  totalDespesas: number
  ebitda: number
  lucroLiquido: number
  margemBruta: number
  margemOperacional: number
  margemLiquida: number
  // Balanço
  ativoTotal: number
  passivoTotal: number
  patrimonioLiquido: number
  // Fluxo de caixa (simplificado)
  entradaCaixa: number
  saidaCaixa: number
  saldoCaixa: number
  // Índices
  liquidezGeral: number
  liquidezCorrente: number
  endividamento: number
  roi: number
  criadoEm: Date
}

export interface FibContaAgregada {
  codigo: string
  nome: string
  classificacao: ContaClassificacao
  saldo: number
  variacao: number // mês anterior vs mês atual
  percentualDaClasse: number
}

export interface FibDashboardData {
  kpis: FibKpi
  contasPorClassificacao: Record<ContaClassificacao, FibContaAgregada[]>
  alertas: FibAlerta[]
  cacheTimestamp: Date
}

export interface FibAlerta {
  tipo: 'RISCO' | 'OPORTUNIDADE' | 'ANOMALIA'
  severidade: 'BAIXA' | 'MEDIA' | 'ALTA'
  titulo: string
  descricao: string
  contaCodigo?: string
  recomendacao?: string
}

export interface FibImportacaoResumo {
  id: string
  empresa: string
  nomeArquivo: string
  periodoInicio: string | null // ISO date
  periodoFim: string | null // ISO date
}

export interface FibContextType {
  importacoesDisponiveis: FibImportacaoResumo[]
  importacaoAtual: FibImportacaoResumo | null
  selecionarImportacao: (id: string) => void
  periodoSelecionado: { inicio: Date; fim: Date } | null
  definirPeriodo: (inicio: Date | null, fim: Date | null) => void
  carregandoImportacoes: boolean
  carregando: boolean
  dados: FibDashboardData | null
  erro: string | null
  atualizarDados: () => Promise<void>
}

export interface FibExportacao {
  formato: 'PDF' | 'EXCEL'
  tipo: 'DASHBOARD' | 'RELATORIO_COMPLETO'
  incluirGraficos: boolean
  data: Buffer | string
  nomeArquivo: string
}
