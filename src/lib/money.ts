/**
 * Política de dinheiro (SPEC v2.0 §5).
 *
 * Numa ferramenta onde R$ 0,01 decide status, somar com float JS introduz erro
 * de ponto flutuante. Regra do time:
 *  - Parser → memória:  number (reais), valor pontual sem soma acumulada
 *  - Somatórios:        integer (CENTAVOS), toda soma/subtração em inteiros
 *  - Persistência:      Prisma.Decimal(18,2), convertendo centavos → Decimal
 *
 * D2: ao ler Decimal do Prisma, use .toNumber() na fronteira. NUNCA faça
 * (decimalA - decimalB) com operador direto entre dois Decimals.
 */

/** Converte reais (number) → centavos inteiros. */
export const toCents = (v: number): number => Math.round(v * 100)

/** Converte centavos inteiros → reais (number). */
export const fromCents = (c: number): number => c / 100

/** Soma uma lista de reais em CENTAVOS inteiros (evita erro de float). */
export const somaCents = (vals: number[]): number =>
  vals.reduce((acc, v) => acc + toCents(v), 0)

/** Formata um valor em reais como moeda BRL (pt-BR). */
export const formatBRL = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
