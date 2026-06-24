import {
  LancamentoRazao,
  NaturezaLancamento,
  ParseError,
  RazaoParseResult,
} from '@/lib/types/razao'

/**
 * Payload de um lançamento pronto para persistência (campos espelham o model
 * `Lancamento` do Prisma, menos as FKs que são preenchidas na rota). Mantido
 * desacoplado de `@prisma/client` para permitir testes sem banco/codegen.
 */
export interface LancamentoPersistivel {
  dataLancamento: Date
  documento: string
  historicoPadrao: string
  complemento: string | null
  contaIntegracao: string | null
  centroCusto: string | null
  descCentroCusto: string | null
  ficha: string | null
  sequencia: number | null
  debito: number
  credito: number
  saldo: number
  natureza: NaturezaLancamento
  dupCr: string | null
  parcela: string | null
  vencimento: Date | null
  cnpjParceiro: string | null
  nomeParceiro: string | null
  idDupCr: string | null
  ordemFaturamento: string | null
  doctoBaixa: string | null
  bancoBaixa: string | null
  ccBaixa: string | null
  idBaixa: string | null
  nrAdiantamento: string | null
}

export interface ContaPersistivel {
  codigo: string
  nome: string
  saldoAnterior: number
  lancamentos: LancamentoPersistivel[]
}

export interface ImportacaoPersistivel {
  nomeArquivo: string
  empresa: string
  cnpjEmpresa: string
  periodo: { inicio: string; fim: string }
  totalLinhas: number
  linhasImportadas: number
  erros: ParseError[]
  contas: ContaPersistivel[]
}

/** Converte string vazia/whitespace em null; preserva o resto trimado. */
function nn(v: string | undefined | null): string | null {
  if (v == null) return null
  const t = String(v).trim()
  return t === '' ? null : t
}

export function mapLancamento(l: LancamentoRazao): LancamentoPersistivel {
  const t = l.tokens
  return {
    dataLancamento: l.dataLancamento,
    documento: l.documento,
    historicoPadrao: l.historicoPadrao,
    complemento: nn(l.complemento),
    contaIntegracao: nn(l.contaIntegracao),
    centroCusto: nn(l.centroCusto),
    descCentroCusto: nn(l.descCentroCusto),
    ficha: nn(l.ficha),
    sequencia: Number.isFinite(l.sequencia) ? l.sequencia : null,
    debito: l.debito,
    credito: l.credito,
    saldo: l.saldo,
    natureza: l.natureza,
    dupCr: nn(t.dupCr),
    parcela: nn(t.parcela),
    vencimento: t.vencimento ?? null,
    cnpjParceiro: nn(t.cnpjParceiro),
    nomeParceiro: nn(t.nomeParceiro),
    idDupCr: nn(t.idDupCr),
    ordemFaturamento: nn(t.ordemFaturamento),
    doctoBaixa: nn(t.doctoBaixa),
    bancoBaixa: nn(t.bancoBaixa),
    ccBaixa: nn(t.ccBaixa),
    idBaixa: nn(t.idBaixa),
    nrAdiantamento: nn(t.nrAdiantamento),
  }
}

/**
 * Transforma o resultado do parser na estrutura persistível da importação.
 */
export function mapImportacao(
  result: RazaoParseResult,
  nomeArquivo: string,
): ImportacaoPersistivel {
  const contas: ContaPersistivel[] = result.contas.map((c) => ({
    codigo: c.conta.codigo,
    nome: c.conta.nome,
    saldoAnterior: c.conta.saldoAnterior,
    lancamentos: c.lancamentos.map(mapLancamento),
  }))

  const linhasImportadas = contas.reduce((acc, c) => acc + c.lancamentos.length, 0)

  return {
    nomeArquivo,
    empresa: result.metadados.empresa,
    cnpjEmpresa: result.metadados.cnpjEmpresa,
    periodo: {
      inicio: result.metadados.periodoInicio.toISOString(),
      fim: result.metadados.periodoFim.toISOString(),
    },
    totalLinhas: linhasImportadas + result.erros.length,
    linhasImportadas,
    erros: result.erros,
    contas,
  }
}
