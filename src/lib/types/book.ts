/**
 * Tipos do domínio Book Digital (SPEC v2.0).
 *
 * Tudo deriva daqui. Camada de domínio/parser é desacoplada do Prisma: os enums
 * são unions de string literal (mesmo padrão de razao.ts/comparacao.ts) e
 * espelham os enums do schema. Valores monetários trafegam como number (reais)
 * no domínio; somatórios usam centavos inteiros (ver money.ts).
 */

// ─── Enums (espelham prisma/schema.prisma) ───────────────────────────────────

export type BookStatus = 'RASCUNHO' | 'EM_REVISAO' | 'APROVADO' | 'FECHADO'

export type StatusFicha = 'PENDENTE' | 'CONCILIADA' | 'TOLERANCIA' | 'DIVERGENTE'

export type TipoConta =
  | 'ATIVO_CIRCULANTE'
  | 'ATIVO_BANCO'
  | 'PASSIVO_CIRCULANTE'
  | 'RESULTADO'
  | 'OUTROS'

export type TipoRelatorio =
  | 'BALANCETE'
  | 'CR_ABERTO'
  | 'CP_ABERTO'
  | 'EXTRATO_BANCARIO'
  | 'OUTROS'

export type ParseStatus = 'AGUARDANDO' | 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO'

export type StatusCheckList = 'PENDENTE' | 'CONCLUIDO' | 'NAO_APLICAVEL'

export type StatusOcorrencia = 'ABERTA' | 'EM_ANDAMENTO' | 'RESOLVIDA' | 'CANCELADA'

export type TipoItemRelatorio = 'TITULO_ABERTO' | 'ITEM_TRANSITO'

// ─── Parser do Razão (PDF NetCorp) ───────────────────────────────────────────

/**
 * Tokens extraídos do complemento de um lançamento do razão PDF (SPEC §7.5).
 * Nem todos presentes em todo lançamento; varia por conta (100006/200003/100003).
 */
export interface RazaoPdfTokens {
  dupCr?: string // DUP.CR.: / DUP:        (100006)
  dupCp?: string // DUP.CP.: / BAIXA DUP.CP.: (200003)
  idDupCp?: string // ID.DUP.CP:            (200003)
  protocolo?: string // PROTOCOLO:          (200003)
  numeroNF?: string // NF.                  (200003)
  acp?: string // Acp:                      (200003)
  vencimento?: Date // VCTO:                (100006 e 200003)
  parcela?: string // PARC:                 (100006 e 200003)
  cnpj?: string // CNPJ/CPF: (CNPJ ou CPF)  (todas)
  nome?: string // razão social/favorecido  (todas)
  idFra?: string // ID.FRA:                 (100003)
  bancoConta?: string // BCO:xxx CC:xxx      (100003)
}

/** Um lançamento parseado do razão PDF. Classificação D/C vem do delta de saldo (§7.1). */
export interface LancamentoRazaoPdf {
  dataLancamento: Date | null
  documento: string
  historico: string
  complemento: string
  debito: number // reais; ≥ 0
  credito: number // reais; ≥ 0
  saldo: number // reais; saldo acumulado após o lançamento (pode ser negativo)
  tokens: RazaoPdfTokens
  // Atalhos planos dos tokens mais consultados em testes/engine
  dupCr?: string
  dupCp?: string
  acp?: string
}

/**
 * Resultado do parse de um razão PDF (uma conta).
 * parseConfiavel/deltaIntegridade vêm do self-check de integridade (§7.2):
 *   SaldoAnterior ± movimento === SaldoFinal.
 */
export interface RazaoPdfParseResult {
  codigoConta: string
  nomeConta: string
  tipoConta: TipoConta
  saldoAnterior: number
  saldoFinal: number
  lancamentos: LancamentoRazaoPdf[]
  parseConfiavel: boolean
  deltaIntegridade: number // SaldoFinal calculado − SaldoFinal lido (reais); 0 se fecha
  erros: ParseErroPdf[]
}

export interface ParseErroPdf {
  contexto: string
  trecho: string
  mensagem: string
}

// ─── Relatórios de suporte (CR/CP em aberto, extrato bancário) ───────────────

/** Linha de relatório: título em aberto (CR/CP) OU item em trânsito (banco) (§8.2). */
export interface ItemRelatorioParsed {
  tipo: TipoItemRelatorio
  documento?: string
  dupCr?: string
  dupCp?: string
  cnpj?: string
  nome?: string
  historico?: string // descrição do lançamento (extrato bancário)
  dataEmissao?: Date
  dataVencimento?: Date
  diasAtraso?: number
  valorAberto?: number // títulos em aberto (reais)
  debito?: number // itens em trânsito (reais)
  credito?: number // itens em trânsito (reais)
  saldo?: number // extrato bancário (reais)
}

export interface RelatorioParseResult {
  tipoRelatorio: TipoRelatorio
  codigoConta?: string // conta detectada (auto-roteamento §12.1)
  total: number // somatório do relatório (reais)
  itens: ItemRelatorioParsed[]
  parseConfiavel: boolean
  erros: ParseErroPdf[]
}

/** Saída do roteador de PDFs: tipo + conta detectados a partir do conteúdo (§12.1). */
export interface DeteccaoPdf {
  tipoRelatorio: TipoRelatorio
  codigoConta?: string
  confiavel: boolean
}

// ─── Balancete (âncora oficial §8.1) ─────────────────────────────────────────

/** Saldos de uma conta-folha do balancete (NSQP1106). */
export interface BalanceteConta {
  codigoConta: string // leaf de 6 dígitos (ex.: "100006") — chave de amarração
  codigoCompleto: string // hierárquico (ex.: "1.01.01.01.100006") — p/ subtotais/classe
  saldoAnterior: number
  saldoAtual: number // saldo oficial — âncora da amarração
  totalDebito: number
  totalCredito: number
}

export interface BalanceteParseResult {
  contas: BalanceteConta[]
  porCodigo: Record<string, BalanceteConta>
  erros: ParseErroPdf[]
}

// ─── Engine de validação (amarração tripla §8.1, §9) ─────────────────────────

/** Entrada da validação de uma ficha (saldos já parseados, em reais). */
export interface ValidacaoAmarracaoInput {
  codigoConta: string
  tipoConta: TipoConta
  saldoRazao: number
  saldoBalancete?: number // âncora oficial (balancete); ausente → não amarra
  saldoRelatorio?: number // Σ itens em aberto / saldo do extrato; ausente → PENDENTE
}

/** Resultado da amarração tripla de uma ficha (Balancete = Razão = Σ itens). */
export interface AmarracaoResult {
  saldoRazao: number
  saldoBalancete: number
  saldoRelatorio: number
  tieRazaoBalancete: boolean // perna 1: razão final ↔ balancete
  tieRazaoRelatorio: boolean // perna 2: razão final ↔ Σ relatório aberto
  diferencaBalancete: number // reais
  diferencaRelatorio: number // reais
  status: StatusFicha
  precisaLlm: boolean // true para TOLERANCIA/DIVERGENTE (§10.2)
  nota?: string // ex.: nota de arredondamento dentro da tolerância (§8.4)
}

// ─── Contrato de saída da análise LLM (§10.3) ────────────────────────────────

export type RiscoNivel = 'ALTO' | 'MEDIO' | 'BAIXO'
export type RiscoFiscal = RiscoNivel | 'NENHUM'
export type Materialidade = 'ALTA' | 'MEDIA' | 'BAIXA'
export type ResponsavelArea =
  | 'CONTABILIDADE'
  | 'FINANCEIRO'
  | 'FISCAL'
  | 'CLIENTE'
  | 'AUDITORIA'

export interface AnaliseLlm {
  naturezaDivergencia: string
  riscoContabil: RiscoNivel
  riscoFiscal: RiscoFiscal
  acaoCorretiva: string
  responsavel: ResponsavelArea
  materialidade: Materialidade
  notaParaRevisao: string // linguagem executiva
}

// ─── Ocorrências escaladas pelo engine (§8.3 C4) ─────────────────────────────

/** Ocorrência detectada automaticamente para virar OcorrenciaBook. */
export interface OcorrenciaDetectada {
  descricao: string
  acaoCorretiva: string
  responsavel: ResponsavelArea
  nettingFlag: boolean // passivo × ativo da mesma contraparte (intercompany)
  status: StatusOcorrencia
  valor?: number
  diasAtraso?: number
}
