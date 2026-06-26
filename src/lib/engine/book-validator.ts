import { toCents, fromCents, formatBRL } from '@/lib/money'
import {
  ValidacaoAmarracaoInput,
  AmarracaoResult,
  OcorrenciaDetectada,
} from '@/lib/types/book'

/**
 * Engine de validação do Book Digital (§8, §9). Opera em CENTAVOS inteiros.
 *
 * Amarração tripla (§8.1): Balancete (âncora) = Razão (saldo final) = Σ itens em
 * aberto do relatório. Para conta bancária (§8.2 C2) a 3ª ponta é o saldo do
 * extrato (saldo↔saldo).
 *
 * Status (§9):
 *   ambas as pernas fecham (dif = 0)  → CONCILIADA  (sem LLM)
 *   0 < dif ≤ R$ 0,05                 → TOLERANCIA  (LLM + nota de arredondamento)
 *   dif > R$ 0,05                     → DIVERGENTE  (LLM)
 *   sem PDF de suporte                → PENDENTE    (sem LLM)
 */

// Tolerância de arredondamento (§8.4): R$ 0,05 em centavos.
const TOL_TOLERANCIA_CENTS = 5

export function validarAmarracao(input: ValidacaoAmarracaoInput): AmarracaoResult {
  const { saldoRazao, saldoBalancete, saldoRelatorio } = input

  // Sem âncora (balancete) ou sem relatório de suporte → PENDENTE.
  if (saldoBalancete === undefined || saldoRelatorio === undefined) {
    return {
      saldoRazao,
      saldoBalancete: saldoBalancete ?? 0,
      saldoRelatorio: saldoRelatorio ?? 0,
      tieRazaoBalancete: false,
      tieRazaoRelatorio: false,
      diferencaBalancete: 0,
      diferencaRelatorio: 0,
      status: 'PENDENTE',
      precisaLlm: false,
    }
  }

  const razaoC = toCents(saldoRazao)
  const balC = toCents(saldoBalancete)
  const relC = toCents(saldoRelatorio)

  const difBalanceteC = razaoC - balC
  const difRelatorioC = razaoC - relC

  const tieRazaoBalancete = difBalanceteC === 0
  const tieRazaoRelatorio = difRelatorioC === 0

  const difMaxC = Math.max(Math.abs(difBalanceteC), Math.abs(difRelatorioC))

  let status: AmarracaoResult['status']
  let nota: string | undefined
  if (difMaxC === 0) {
    status = 'CONCILIADA'
  } else if (difMaxC <= TOL_TOLERANCIA_CENTS) {
    status = 'TOLERANCIA'
    // §8.4: mesmo dentro da tolerância, a ficha gera nota documentada.
    nota =
      `Diferença de ${formatBRL(fromCents(difMaxC))} dentro da tolerância de ` +
      `R$ 0,05 — nota de arredondamento documentada (auditoria exige explicação).`
  } else {
    status = 'DIVERGENTE'
  }

  const precisaLlm = status === 'TOLERANCIA' || status === 'DIVERGENTE'

  return {
    saldoRazao,
    saldoBalancete,
    saldoRelatorio,
    tieRazaoBalancete,
    tieRazaoRelatorio,
    diferencaBalancete: fromCents(difBalanceteC),
    diferencaRelatorio: fromCents(difRelatorioC),
    status,
    precisaLlm,
    nota,
  }
}

/**
 * C4 (§8.3): escala o saldo INTERAXA parado na 200003 para uma ocorrência.
 *
 * R$ 878.380,74 parados desde 2023 (800+ dias) com recebíveis INTERAXA no ativo
 * → análise de prescrição / baixa contábil, com flag de netting intercompany
 * (passivo × ativo da mesma contraparte). Responsável: CONTABILIDADE + CLIENTE.
 *
 * Recebe o texto do relatório CP (onde o favorecido aparece).
 */
export function detectarInteraxa(cpText: string): OcorrenciaDetectada | null {
  const idx = cpText.search(/INTERAXA/i)
  if (idx === -1) return null

  // Total do fornecedor INTERAXA (somatório das notas em aberto).
  const mTotal = cpText
    .slice(idx)
    .match(/Total\s+d[oa]\s+Fornecedor:\s*\n\s*([\d.]+,\d{2})/)
  const valor = mTotal ? parseFloat(mTotal[1].replace(/\./g, '').replace(',', '.')) : undefined

  // Maior dias de atraso entre as notas INTERAXA (inteiro isolado na linha de título).
  const regiao = cpText.slice(Math.max(0, idx - 200), idx + 1500)
  const dias = [...regiao.matchAll(/ (\d{3,4}) [\d.]+,\d{2} [\d.]+,\d{2}/g)].map((m) =>
    Number(m[1]),
  )
  const diasAtraso = dias.length > 0 ? Math.max(...dias) : undefined

  const valorTxt = valor !== undefined ? formatBRL(valor) : 'valor a confirmar'
  const diasTxt = diasAtraso !== undefined ? `${diasAtraso} dias` : '800+ dias'

  return {
    descricao:
      `INTERAXA AMERICAS SOFTWARES LTDA: ${valorTxt} em aberto na 200003 há ${diasTxt} ` +
      `(desde 2023), com recebíveis INTERAXA no ativo — possível netting intercompany. ` +
      `Requer validação do CLIENTE.`,
    acaoCorretiva: 'Análise de prescrição / baixa contábil; avaliar netting passivo × ativo.',
    responsavel: 'CONTABILIDADE',
    nettingFlag: true,
    status: 'ABERTA',
    valor,
    diasAtraso,
  }
}
