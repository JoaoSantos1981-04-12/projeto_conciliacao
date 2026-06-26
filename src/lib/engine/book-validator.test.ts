import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { parseRazaoPdf } from '@/lib/parser/razao-pdf'
import { parseBalancete } from '@/lib/parser/balancete-pdf'
import { parseRelatorioSuporte } from '@/lib/parser/relatorio-suporte-pdf'
import { validarAmarracao, detectarInteraxa } from './book-validator'
import { AmarracaoResult, OcorrenciaDetectada } from '@/lib/types/book'

const DIR = join(process.cwd(), 'docs', 'PDFs Exemplo')
const buf = (arquivo: string) => readFileSync(join(DIR, arquivo))

describe('Etapa 5 — engine de amarração tripla', () => {
  let amarr100006: AmarracaoResult
  let amarr200003: AmarracaoResult
  let amarr100003: AmarracaoResult
  let ocInteraxa: OcorrenciaDetectada | null

  beforeAll(async () => {
    const [r100006, r200003, r100003] = await Promise.all([
      parseRazaoPdf(buf('100006.pdf')),
      parseRazaoPdf(buf('200003.pdf')),
      parseRazaoPdf(buf('100003.pdf')),
    ])
    const balancete = await parseBalancete(buf('Balancete.pdf'))
    const cr = await parseRelatorioSuporte(buf('relatorio contas a receber.pdf'))
    const cp = await parseRelatorioSuporte(buf('fornecedores_200003.pdf'))
    const extrato = await parseRelatorioSuporte(buf('extrato 2302_nice.pdf'))

    amarr100006 = validarAmarracao({
      codigoConta: '100006',
      tipoConta: r100006.tipoConta,
      saldoRazao: r100006.saldoFinal,
      saldoBalancete: balancete.porCodigo['100006']?.saldoAtual,
      saldoRelatorio: cr.total,
    })
    amarr200003 = validarAmarracao({
      codigoConta: '200003',
      tipoConta: r200003.tipoConta,
      saldoRazao: r200003.saldoFinal,
      saldoBalancete: balancete.porCodigo['200003']?.saldoAtual,
      saldoRelatorio: cp.total,
    })
    amarr100003 = validarAmarracao({
      codigoConta: '100003',
      tipoConta: r100003.tipoConta,
      saldoRazao: r100003.saldoFinal,
      saldoBalancete: balancete.porCodigo['100003']?.saldoAtual,
      saldoRelatorio: extrato.total, // C2: saldo↔saldo
    })

    const { text: cpText } = await pdf(buf('fornecedores_200003.pdf'))
    ocInteraxa = detectarInteraxa(cpText)
  })

  // ── Status esperado por conta (§9, obrigatório) ──
  it('100006 → CONCILIADA (ambas as pernas fecham)', () => {
    expect(amarr100006.status).toBe('CONCILIADA')
    expect(amarr100006.tieRazaoBalancete).toBe(true)
    expect(amarr100006.tieRazaoRelatorio).toBe(true)
    expect(amarr100006.precisaLlm).toBe(false)
  })

  it('100003 → CONCILIADA (banco saldo↔saldo, C2)', () => {
    expect(amarr100003.status).toBe('CONCILIADA')
    expect(amarr100003.precisaLlm).toBe(false)
  })

  it('200003 → TOLERANCIA (dif R$ 0,01) com nota e flag de LLM', () => {
    expect(amarr200003.status).toBe('TOLERANCIA')
    expect(amarr200003.tieRazaoBalancete).toBe(true) // razão = balancete
    expect(amarr200003.tieRazaoRelatorio).toBe(false) // relatório CP difere R$ 0,01
    expect(Math.abs(amarr200003.diferencaRelatorio)).toBeCloseTo(0.01, 2)
    expect(amarr200003.precisaLlm).toBe(true)
    expect(amarr200003.nota).toMatch(/tolerância/i)
  })

  // ── Casos de borda ──
  it('sem relatório de suporte → PENDENTE', () => {
    const r = validarAmarracao({
      codigoConta: '100006',
      tipoConta: 'ATIVO_CIRCULANTE',
      saldoRazao: 29637147.22,
      saldoBalancete: 29637147.22,
      saldoRelatorio: undefined,
    })
    expect(r.status).toBe('PENDENTE')
    expect(r.precisaLlm).toBe(false)
  })

  it('diferença > R$ 0,05 → DIVERGENTE', () => {
    const r = validarAmarracao({
      codigoConta: 'X',
      tipoConta: 'ATIVO_CIRCULANTE',
      saldoRazao: 1000.0,
      saldoBalancete: 1000.0,
      saldoRelatorio: 999.0, // dif R$ 1,00
    })
    expect(r.status).toBe('DIVERGENTE')
    expect(r.precisaLlm).toBe(true)
  })

  // ── INTERAXA escalada (§8.3 C4) ──
  it('escala INTERAXA para ocorrência com netting flag', () => {
    expect(ocInteraxa).not.toBeNull()
    expect(ocInteraxa?.nettingFlag).toBe(true)
    expect(ocInteraxa?.valor).toBeCloseTo(878380.74, 2)
    expect(ocInteraxa?.diasAtraso ?? 0).toBeGreaterThanOrEqual(800)
    expect(ocInteraxa?.responsavel).toBe('CONTABILIDADE')
    expect(ocInteraxa?.acaoCorretiva).toMatch(/prescrição|baixa/i)
    expect(ocInteraxa?.status).toBe('ABERTA')
  })
})
