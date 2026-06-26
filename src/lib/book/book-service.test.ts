import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { hashArquivo, decidirAcaoUpload } from './book-service'

const DIR = join(process.cwd(), 'docs', 'PDFs Exemplo')

describe('Etapa 7 — idempotência do upload (lógica pura)', () => {
  it('hashArquivo é determinístico (mesmo arquivo → mesmo hash)', () => {
    const buf = readFileSync(join(DIR, '100006.pdf'))
    expect(hashArquivo(buf)).toBe(hashArquivo(Buffer.from(buf)))
    expect(hashArquivo(buf)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('arquivos diferentes → hashes diferentes', () => {
    const a = hashArquivo(readFileSync(join(DIR, '100006.pdf')))
    const b = hashArquivo(readFileSync(join(DIR, '200003.pdf')))
    expect(a).not.toBe(b)
  })

  it('decidirAcaoUpload: hash inexistente → INSERIR; existente → SUBSTITUIR', () => {
    expect(decidirAcaoUpload(null)).toBe('INSERIR')
    expect(decidirAcaoUpload('pdf-id-existente')).toBe('SUBSTITUIR')
  })
})
