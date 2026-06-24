import * as XLSX from 'xlsx'
import { parseComplemento } from './complemento'
import {
  RazaoParseResult,
  MetadadosRazao,
  ContaRazao,
  LancamentoRazao,
  NaturezaLancamento,
  ParseError,
} from '@/lib/types/razao'

// ---- helpers ----

function parseValor(v: unknown): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const s = String(v).trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

/**
 * Débito/Crédito neste layout vêm em CENTAVOS (inteiro com sufixo ",00"),
 * diferente do SALDO, que vem em reais. Validado por reconciliação do saldo
 * (saldo = anterior + débito − crédito) em 165/165 lançamentos do arquivo real.
 */
function parseValorCentavos(v: unknown): number {
  const centavos = Math.round(parseValor(v))
  return centavos / 100
}

function parseData(v: unknown): Date | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return v
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    return new Date(d.y, d.m - 1, d.d, d.H ?? 0, d.M ?? 0, Math.floor(d.S ?? 0))
  }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  }
  return null
}

function classificarNatureza(historico: string): NaturezaLancamento {
  // Normaliza espaços: o arquivo real usa espaço duplo ("CR  BAIXA DE CLIENTES").
  const h = historico.toUpperCase().replace(/\s+/g, ' ')
  if (h.includes('CR BAIXA DE CLIENTES')) return 'BAIXA_CLIENTE'
  if (h.includes('CR BAIXA DE FORNECEDORES')) return 'BAIXA_FORNECEDOR'
  if (h.includes('CR NOTAS FISCAIS DE SAÍDA') || h.includes('CR NOTAS FISCAIS DE SAIDA'))
    return 'NF_SAIDA'
  if (h.includes('CR NOTAS FISCAIS DE ENTRADA')) return 'NF_ENTRADA'
  if (h.includes('CP BAIXA DE FORNECEDORES')) return 'CONTRAPARTIDA_BAIXA_FORNECEDOR'
  if (h.includes('CP NOTAS FISCAIS DE SAÍDA') || h.includes('CP NOTAS FISCAIS DE SAIDA'))
    return 'CONTRAPARTIDA_NF_SAIDA'
  return 'OUTRO'
}

// ---- parser de metadados ----

function brDate(s: string): Date {
  const [d, m, a] = s.split('/').map(Number)
  return new Date(a, m - 1, d)
}

/**
 * Localiza o saldo anterior pelo rótulo "SALDO ANTERIOR:" e usa a próxima
 * célula preenchida — a posição da coluna varia conforme o layout exportado
 * (no arquivo real está no índice 11, não no 4 documentado no CLAUDE.md).
 */
function extrairSaldoAnterior(row: unknown[]): number {
  for (let i = 0; i < row.length; i++) {
    if (String(row[i] ?? '').toUpperCase().includes('SALDO ANTERIOR')) {
      for (let j = i + 1; j < row.length; j++) {
        if (row[j] != null && row[j] !== '') return parseValor(row[j])
      }
    }
  }
  return parseValor(row[4])
}

function parseMetadadosBloco(rows: unknown[][]): {
  metadados: MetadadosRazao | null
  conta: ContaRazao | null
  headerRowIndex: number
} {
  const metadados: MetadadosRazao = {
    empresa: '',
    cnpjEmpresa: '',
    codigoFilial: '',
    periodoInicio: new Date(0),
    periodoFim: new Date(0),
    evento: '',
  }
  let achouMeta = false
  let conta: ContaRazao | null = null
  let headerRowIndex = -1

  for (let i = 0; i < rows.length; i++) {
    const row = (rows[i] ?? []) as unknown[]
    const r0 = String(row[0] ?? '').trim()
    const r1 = String(row[1] ?? '').trim()

    // Período pode estar em qualquer célula da linha de título.
    if (metadados.periodoInicio.getTime() === 0) {
      const texto = row.map((c) => String(c ?? '')).join(' ')
      const match = texto.match(/(\d{2}\/\d{2}\/\d{4})\s*até\s*(\d{2}\/\d{2}\/\d{4})/)
      if (match) {
        metadados.periodoInicio = brDate(match[1])
        metadados.periodoFim = brDate(match[2])
        achouMeta = true
      }
    }

    if (r0 === 'EMPRESA:' && r1) {
      const partes = r1.split(' - ')
      metadados.codigoFilial = partes[0]?.trim() ?? ''
      metadados.cnpjEmpresa = partes[1]?.trim() ?? ''
      metadados.empresa = partes.slice(2).join(' - ').trim()
      achouMeta = true
    }

    if (r0 === 'EVENTO:') {
      metadados.evento = r1
      achouMeta = true
    }

    if (r0 === 'Conta Contábil:') {
      conta = {
        codigo: r1,
        nome: String(row[2] ?? '').trim(),
        saldoAnterior: extrairSaldoAnterior(row),
      }
    }

    if (r0 === 'DATA LÇTO') {
      headerRowIndex = i
      break
    }
  }

  return { metadados: achouMeta ? metadados : null, conta, headerRowIndex }
}

// ---- parser principal ----

export function parseRazaoExcel(buffer: Buffer): RazaoParseResult {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, blankrows: true })

  const erros: ParseError[] = []
  const blocos: RazaoParseResult['contas'] = []

  let cursor = 0
  let metadadosGlobal: MetadadosRazao | null = null

  while (cursor < raw.length) {
    // Encontra próximo bloco de metadados/header
    const slice = raw.slice(cursor) as unknown[][]
    const { metadados, conta, headerRowIndex } = parseMetadadosBloco(slice)

    if (headerRowIndex === -1) break
    if (!conta) {
      cursor += headerRowIndex + 1
      continue
    }

    if (metadados && !metadadosGlobal) metadadosGlobal = metadados

    const lancamentos: LancamentoRazao[] = []
    let dataRows = cursor + headerRowIndex + 1

    while (dataRows < raw.length) {
      const row = (raw[dataRows] ?? []) as (string | number | null)[]
      const col0 = String(row[0] ?? '').trim()

      // Detecta próximo bloco de metadados
      if (col0.includes('Conta Contábil:') || col0.includes('RAZÃO CONTÁBIL')) {
        break
      }

      // Linha vazia ou linha de total — pula
      if (!col0 || col0.startsWith('SALDO FINAL') || col0.startsWith('TOTAL')) {
        dataRows++
        continue
      }

      const data = parseData(row[0])
      if (!data) {
        dataRows++
        continue
      }

      try {
        const complementoRaw = String(row[3] ?? '')
        const tokens = parseComplemento(complementoRaw)
        const historico = String(row[2] ?? '')

        lancamentos.push({
          dataLancamento: data,
          documento: String(row[1] ?? '').trim(),
          historicoPadrao: historico.trim(),
          complemento: complementoRaw.trim(),
          contaIntegracao: String(row[4] ?? '').trim(),
          centroCusto: String(row[5] ?? '').trim(),
          descCentroCusto: String(row[6] ?? '').trim(),
          ficha: String(row[7] ?? '').trim(),
          sequencia: Number(row[8] ?? 0),
          debito: parseValorCentavos(row[9]),
          credito: parseValorCentavos(row[10]),
          saldo: parseValor(row[11]),
          tokens,
          natureza: classificarNatureza(historico),
        })
      } catch (e) {
        erros.push({
          linha: dataRows,
          campo: 'geral',
          valor: String(row),
          mensagem: e instanceof Error ? e.message : String(e),
        })
      }

      dataRows++
    }

    blocos.push({ conta, lancamentos })
    cursor = dataRows
  }

  return {
    metadados: metadadosGlobal ?? {
      empresa: '',
      cnpjEmpresa: '',
      codigoFilial: '',
      periodoInicio: new Date(),
      periodoFim: new Date(),
      evento: '',
    },
    contas: blocos,
    erros,
  }
}
