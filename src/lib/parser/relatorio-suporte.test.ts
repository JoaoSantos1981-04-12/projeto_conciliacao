import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseBalancete } from './balancete-pdf'
import { parseRelatorioSuporte } from './relatorio-suporte-pdf'
import { detectarPdf } from './pdf-router'
import { BalanceteParseResult, RelatorioParseResult, DeteccaoPdf } from '@/lib/types/book'

const DIR = join(process.cwd(), 'docs', 'PDFs Exemplo')
const buf = (arquivo: string) => readFileSync(join(DIR, arquivo))

describe('Etapa 4 — parsers de suporte + router', () => {
  let balancete: BalanceteParseResult
  let cr: RelatorioParseResult
  let cp: RelatorioParseResult
  let extrato: RelatorioParseResult
  let detBal: DeteccaoPdf
  let detCr: DeteccaoPdf
  let detCp: DeteccaoPdf
  let detEx: DeteccaoPdf

  beforeAll(async () => {
    balancete = await parseBalancete(buf('Balancete.pdf'))
    cr = await parseRelatorioSuporte(buf('relatorio contas a receber.pdf'))
    cp = await parseRelatorioSuporte(buf('fornecedores_200003.pdf'))
    extrato = await parseRelatorioSuporte(buf('extrato 2302_nice.pdf'))
    detBal = await detectarPdf(buf('Balancete.pdf'))
    detCr = await detectarPdf(buf('relatorio contas a receber.pdf'))
    detCp = await detectarPdf(buf('fornecedores_200003.pdf'))
    detEx = await detectarPdf(buf('extrato 2302_nice.pdf'))
  })

  // ── Balancete (âncora §8.1) ──
  it('balancete: saldo atual por conta bate com o saldo final do razão', () => {
    expect(balancete.porCodigo['100006']?.saldoAtual).toBeCloseTo(29637147.22, 2)
    expect(balancete.porCodigo['200003']?.saldoAtual).toBeCloseTo(1046071.39, 2)
    expect(balancete.porCodigo['100003']?.saldoAtual).toBeCloseTo(131384.2, 2)
  })

  it('balancete: também traz saldo anterior coerente', () => {
    expect(balancete.porCodigo['100006']?.saldoAnterior).toBeCloseTo(37245638.58, 2)
    expect(balancete.porCodigo['200003']?.saldoAnterior).toBeCloseTo(1353752.07, 2)
    expect(balancete.porCodigo['100003']?.saldoAnterior).toBeCloseTo(158478.36, 2)
  })

  // ── Totais dos relatórios (cada total bate) ──
  it('CR em aberto: total = 29.637.147,22 (amarra razão 100006)', () => {
    expect(cr.total).toBeCloseTo(29637147.22, 2)
  })

  it('CP em aberto: total = 1.046.071,40 (razão 200003 + R$ 0,01)', () => {
    expect(cp.total).toBeCloseTo(1046071.4, 2)
  })

  it('Extrato: saldo final = 131.384,20 (amarra razão 100003)', () => {
    expect(extrato.total).toBeCloseTo(131384.2, 2)
  })

  it('parseConfiavel = true nos 3 relatórios', () => {
    expect(cr.parseConfiavel).toBe(true)
    expect(cp.parseConfiavel).toBe(true)
    expect(extrato.parseConfiavel).toBe(true)
  })

  // ── Auto-detecção de tipo e conta (§12.1) ──
  it('detecta o TIPO de relatório dos 4 PDFs', () => {
    expect(detBal.tipoRelatorio).toBe('BALANCETE')
    expect(detCr.tipoRelatorio).toBe('CR_ABERTO')
    expect(detCp.tipoRelatorio).toBe('CP_ABERTO')
    expect(detEx.tipoRelatorio).toBe('EXTRATO_BANCARIO')
  })

  it('detecta a CONTA em CR e CP (extrato resolve pela ficha de banco)', () => {
    expect(detCr.codigoConta).toBe('100006')
    expect(detCp.codigoConta).toBe('200003')
    expect(detEx.codigoConta).toBeUndefined()
  })

  // ── Extrato como itens em trânsito (§8.2) ──
  it('extrato popula itens em trânsito (ITEM_TRANSITO)', () => {
    expect(extrato.itens.length).toBeGreaterThan(0)
    expect(extrato.itens.every((i) => i.tipo === 'ITEM_TRANSITO')).toBe(true)
    expect(extrato.itens.at(-1)?.saldo).toBeCloseTo(131384.2, 2)
  })

  // ── Títulos em aberto CR/CP (TITULO_ABERTO) ──
  const somaAberto = (r: RelatorioParseResult) =>
    r.itens.reduce((acc, i) => acc + (i.valorAberto ?? 0), 0)

  it('CR: extrai títulos em aberto; Σ valorAberto ≈ total impresso', () => {
    expect(cr.itens.length).toBeGreaterThan(400)
    expect(cr.itens.every((i) => i.tipo === 'TITULO_ABERTO')).toBe(true)
    // Σ itens ≈ total impresso; residual conhecido < R$ 50 (1-2 registros de borda).
    expect(Math.abs(somaAberto(cr) - 29637147.22)).toBeLessThan(50)
    expect(cr.itens[0]?.nome).toBeTruthy()
    expect(cr.itens[0]?.documento).toMatch(/^\d{9}$/)
  })

  it('CP: extrai títulos em aberto; Σ valorAberto = total impresso (exato)', () => {
    expect(cp.itens.length).toBeGreaterThan(0)
    expect(cp.itens.every((i) => i.tipo === 'TITULO_ABERTO')).toBe(true)
    expect(somaAberto(cp)).toBeCloseTo(1046071.4, 2)
    expect(cp.itens[0]?.nome).toBeTruthy()
  })
})
