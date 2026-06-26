import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseRazaoPdf } from './razao-pdf'
import { RazaoPdfParseResult } from '@/lib/types/book'

const DIR = join(process.cwd(), 'docs', 'PDFs Exemplo')
const ler = (arquivo: string) => parseRazaoPdf(readFileSync(join(DIR, arquivo)))

describe('parseRazaoPdf — razões reais NetCorp (NSQP1105L)', () => {
  let r100006: RazaoPdfParseResult
  let r200003: RazaoPdfParseResult
  let r100003: RazaoPdfParseResult

  beforeAll(async () => {
    r100006 = await ler('100006.pdf')
    r200003 = await ler('200003.pdf')
    r100003 = await ler('100003.pdf')
  })

  // ── integridade (self-check P2) ──
  it('parseConfiavel = true nos 3 razões', () => {
    expect(r100006.parseConfiavel).toBe(true)
    expect(r200003.parseConfiavel).toBe(true)
    expect(r100003.parseConfiavel).toBe(true)
  })

  it('saldos finais corretos (§6.1)', () => {
    expect(r100006.saldoFinal).toBeCloseTo(29637147.22, 2) // 100006
    expect(r200003.saldoFinal).toBeCloseTo(1046071.39, 2) // 200003
    expect(r100003.saldoFinal).toBeCloseTo(131384.2, 2) // 100003
  })

  it('saldos anteriores corretos (§6.1)', () => {
    expect(r100006.saldoAnterior).toBeCloseTo(37245638.58, 2)
    expect(r200003.saldoAnterior).toBeCloseTo(1353752.07, 2)
    expect(r100003.saldoAnterior).toBeCloseTo(158478.36, 2)
  })

  it('deltaIntegridade zerado quando confiável', () => {
    expect(r100006.deltaIntegridade).toBeCloseTo(0, 2)
    expect(r200003.deltaIntegridade).toBeCloseTo(0, 2)
    expect(r100003.deltaIntegridade).toBeCloseTo(0, 2)
  })

  // ── classificação por delta de saldo (P1) ──
  it('par espelhado 200003 (Acp 13470): um débito e um crédito', () => {
    const acp13470 = r200003.lancamentos.filter((l) => l.acp === '13470')
    expect(acp13470.length).toBe(2)
    expect(acp13470.some((l) => l.debito > 0)).toBe(true)
    expect(acp13470.some((l) => l.credito > 0)).toBe(true)
  })

  // ── tokens do complemento (§7.5) ──
  it('variante DUP: (sem .CR.) na 100006 → dupCr', () => {
    const d = r100006.lancamentos.find((l) => l.documento === '000010340')
    expect(d?.dupCr).toBe('10340')
  })

  it('extrai CNPJ e CPF (C3) na 200003', () => {
    const comCnpj = r200003.lancamentos.find((l) => l.tokens.cnpj?.includes('/'))
    const comCpf = r200003.lancamentos.find(
      (l) => l.tokens.cnpj && !l.tokens.cnpj.includes('/'),
    )
    expect(comCnpj?.tokens.cnpj).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)
    expect(comCpf?.tokens.cnpj).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
  })

  // ── contagem de lançamentos (CR + CP + BC + ET) ──
  it('conta todos os lançamentos, incluindo natureza ET na 200003', () => {
    expect(r100006.lancamentos.length).toBe(391) // 391 CR
    expect(r200003.lancamentos.length).toBe(148) // 125 CP + 23 ET
    expect(r100003.lancamentos.length).toBe(76) // 17 CP + 52 BC + 7 CR
  })

  // ── tipo de conta (banco separado, corrige C2) ──
  it('classifica tipoConta — banco como ATIVO_BANCO', () => {
    expect(r100006.tipoConta).toBe('ATIVO_CIRCULANTE')
    expect(r200003.tipoConta).toBe('PASSIVO_CIRCULANTE')
    expect(r100003.tipoConta).toBe('ATIVO_BANCO')
  })

  // ── saldo negativo em parênteses (§7.4) ──
  it('saldo negativo em parênteses vira negativo (banco intraday)', () => {
    const negativos = r100003.lancamentos.filter((l) => l.saldo < 0)
    expect(negativos.length).toBeGreaterThan(0)
  })
})
