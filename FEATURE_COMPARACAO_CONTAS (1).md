# FEATURE: Comparação entre Contas

## Contexto

Branch: `feature/comparacao-entre-contas`  
Base: `main` (Sprint A concluído — parser, importação, schema base)  
Tipo: Nova feature vertical (banco, domínio, API, UI)

### Casos de Uso Cobertos

| Caso | Conta Débito (A) | Conta Crédito (B) | O que busca |
| :---- | :---- | :---- | :---- |
| Fornecedores × Banco | AP (2.x.xx) | Banco (1.1.01.x) | Cada pagamento tem contrapartida bancária? |
| Clientes × Banco | AR (1.1.02.x) | Banco (1.1.01.x) | Cada recebimento baixou o banco? |
| Intercompany | Conta filial A | Conta filial B | Lançamentos espelho estão pareados? |

---

## 1\. Comandos Git — Execute Nesta Ordem

\# Garante que main está atualizado

git checkout main

git pull origin main

\# Cria o branch

git checkout \-b feature/comparacao-entre-contas

\# Confirma

git branch

\# → \* feature/comparacao-entre-contas

\#     main

---

## 2\. Alterações no Schema Prisma

Adicione ao `prisma/schema.prisma` — **não altere nenhum model existente, apenas adicione**:

// Sessão de comparação entre duas contas distintas

model SessaoComparacao {

  id                String   @id @default(cuid())

  empresaId         String

  nomeDescritivo    String                         // ex: "Fornecedores × Banco \- Maio/2026"

  tipoCenario       CenarioComparacao

  contaOrigemId     String                         // conta A (ex: fornecedores)

  contaDestinoId    String                         // conta B (ex: banco)

  periodoInicio     DateTime

  periodoFim        DateTime

  status            SessaoStatus  @default(PROCESSANDO)

  totalParesA       Int           @default(0)      // lançamentos na conta A

  totalParesB       Int           @default(0)      // lançamentos na conta B

  paresEncontrados  Int           @default(0)

  semParA           Int           @default(0)      // A sem contrapartida em B

  semParB           Int           @default(0)      // B sem contrapartida em A

  valorDivergente   Decimal       @default(0) @db.Decimal(18, 2\)

  criadoEm          DateTime      @default(now())

  concluidoEm       DateTime?

  contaOrigem       ContaContabil @relation("ComparacaoOrigem",  fields: \[contaOrigemId\],  references: \[id\])

  contaDestino      ContaContabil @relation("ComparacaoDestino", fields: \[contaDestinoId\], references: \[id\])

  pares             ParComparacao\[\]

  @@index(\[contaOrigemId, contaDestinoId\])

}

// Par identificado entre as duas contas

model ParComparacao {

  id              String   @id @default(cuid())

  sessaoId        String

  lancamentoAId   String?                          // null \= sem par em A

  lancamentoBId   String?                          // null \= sem par em B

  tipoMatch       TipoMatch

  scoreConfianca  Float

  diferencaValor  Decimal  @default(0) @db.Decimal(18, 2\)

  diferencaDias   Int      @default(0)             // defasagem de data entre os pares

  status          StatusParComparacao @default(PENDENTE)

  motivoRejeicao  String?

  aprovadoPor     String?

  aprovadoEm      DateTime?

  observacao      String?

  criadoEm        DateTime @default(now())

  sessao          SessaoComparacao @relation(fields: \[sessaoId\], references: \[id\])

  lancamentoA     Lancamento? @relation("ParCompA", fields: \[lancamentoAId\], references: \[id\])

  lancamentoB     Lancamento? @relation("ParCompB", fields: \[lancamentoBId\], references: \[id\])

}

enum CenarioComparacao {

  FORNECEDORES\_BANCO

  CLIENTES\_BANCO

  INTERCOMPANY

  PERSONALIZADO

}

enum StatusParComparacao {

  PENDENTE

  APROVADO

  REJEITADO

  IGNORADO

}

Adicione as relações inversas em `Lancamento` (model já existente):

// Adicionar dentro do model Lancamento (apenas estas duas linhas):

  paresComoA  ParComparacao\[\] @relation("ParCompA")

  paresComoB  ParComparacao\[\] @relation("ParCompB")

Adicione as relações inversas em `ContaContabil`:

// Adicionar dentro do model ContaContabil:

  comparacoesOrigem   SessaoComparacao\[\] @relation("ComparacaoOrigem")

  comparacoesDestino  SessaoComparacao\[\] @relation("ComparacaoDestino")

Rode a migration:

npx prisma migrate dev \--name feat-comparacao-entre-contas

npx prisma generate

---

## 3\. Novos Tipos TypeScript

**Arquivo:** `src/lib/types/comparacao.ts` — crie do zero

import { LancamentoRazao } from './razao'

export type CenarioComparacao \=

  | 'FORNECEDORES\_BANCO'

  | 'CLIENTES\_BANCO'

  | 'INTERCOMPANY'

  | 'PERSONALIZADO'

export type StatusParComparacao \=

  | 'PENDENTE'

  | 'APROVADO'

  | 'REJEITADO'

  | 'IGNORADO'

export interface ConfiguracaoComparacao {

  contaOrigemId: string        // ID da ContaContabil no banco

  contaDestinoId: string

  cenario: CenarioComparacao

  nomeDescritivo: string

  periodoInicio: Date

  periodoFim: Date

  toleranciaValor: number      // diferença máxima em R$ para aceitar como par

  toleranciaDias: number       // defasagem máxima em dias entre os lançamentos

  regrasPrioridade: RegraMatchComparacao\[\]

}

export interface RegraMatchComparacao {

  nome: string

  peso: number                 // 0.0 a 1.0

  campos: CampoMatchComparacao\[\]

  ativa: boolean

}

export type CampoMatchComparacao \=

  | 'documento'

  | 'dupCr'

  | 'idBaixa'

  | 'doctoBaixa'

  | 'ordemFaturamento'

  | 'cnpjParceiro'

  | 'valor'

  | 'data'

  | 'nrAdiantamento'

export interface ParComparacaoResult {

  lancamentoA: LancamentoRazao & { id: string }

  lancamentoB: LancamentoRazao & { id: string }

  score: number

  diferencaValor: number

  diferencaDias: number

  regraQueAplicou: string

  status: StatusParComparacao

}

export interface LancamentoSemPar {

  lancamento: LancamentoRazao & { id: string }

  conta: 'A' | 'B'

  motivoSemPar: string

}

export interface ResultadoComparacao {

  sessaoId: string

  config: ConfiguracaoComparacao

  pares: ParComparacaoResult\[\]

  semParA: LancamentoSemPar\[\]  // lançamentos de A sem contrapartida em B

  semParB: LancamentoSemPar\[\]  // lançamentos de B sem contrapartida em A

  resumo: ResumoComparacao

}

export interface ResumoComparacao {

  totalA: number

  totalB: number

  paresEncontrados: number

  taxaMatchA: number           // % de A com par

  taxaMatchB: number           // % de B com par

  valorSemParA: number

  valorSemParB: number

  maiorDivergencia: number

  mediaConfianca: number

}

---

## 4\. Engine de Comparação

**Arquivo:** `src/lib/engine/comparador.ts` — crie do zero

import { LancamentoRazao } from '@/lib/types/razao'

import {

  ConfiguracaoComparacao,

  ParComparacaoResult,

  LancamentoSemPar,

  ResultadoComparacao,

  RegraMatchComparacao,

} from '@/lib/types/comparacao'

import { differenceInDays, isWithinInterval } from 'date-fns'

// ─── helpers ────────────────────────────────────────────────────────────────

type Lct \= LancamentoRazao & { id: string }

function valorEfetivo(l: Lct): number {

  // Usa o lado com valor — nunca os dois são preenchidos ao mesmo tempo

  return l.debito \> 0 ? l.debito : l.credito

}

function diferencaPercentual(a: number, b: number): number {

  if (a \=== 0 && b \=== 0\) return 0

  return Math.abs(a \- b) / Math.max(Math.abs(a), Math.abs(b))

}

// ─── regras padrão por cenário ───────────────────────────────────────────────

export const REGRAS\_PADRAO: Record\<string, RegraMatchComparacao\[\]\> \= {

  FORNECEDORES\_BANCO: \[

    {

      nome: 'Exato por documento de baixa',

      peso: 1.0,

      campos: \['doctoBaixa', 'valor'\],

      ativa: true,

    },

    {

      nome: 'ID de baixa \+ valor',

      peso: 0.95,

      campos: \['idBaixa', 'valor'\],

      ativa: true,

    },

    {

      nome: 'Documento \+ CNPJ \+ valor próximo',

      peso: 0.80,

      campos: \['documento', 'cnpjParceiro', 'valor'\],

      ativa: true,

    },

    {

      nome: 'Valor \+ data próxima',

      peso: 0.65,

      campos: \['valor', 'data'\],

      ativa: true,

    },

  \],

  CLIENTES\_BANCO: \[

    {

      nome: 'Exato por documento de baixa',

      peso: 1.0,

      campos: \['doctoBaixa', 'valor'\],

      ativa: true,

    },

    {

      nome: 'DUP.CR \+ parcela \+ valor',

      peso: 0.95,

      campos: \['dupCr', 'valor'\],

      ativa: true,

    },

    {

      nome: 'ID de baixa',

      peso: 0.90,

      campos: \['idBaixa', 'valor'\],

      ativa: true,

    },

    {

      nome: 'CNPJ \+ valor \+ período',

      peso: 0.70,

      campos: \['cnpjParceiro', 'valor', 'data'\],

      ativa: true,

    },

  \],

  INTERCOMPANY: \[

    {

      nome: 'Documento espelho exato',

      peso: 1.0,

      campos: \['documento', 'valor'\],

      ativa: true,

    },

    {

      nome: 'Ordem de faturamento \+ valor',

      peso: 0.90,

      campos: \['ordemFaturamento', 'valor'\],

      ativa: true,

    },

    {

      nome: 'CNPJ \+ valor \+ período',

      peso: 0.75,

      campos: \['cnpjParceiro', 'valor', 'data'\],

      ativa: true,

    },

  \],

  PERSONALIZADO: \[\],

}

// ─── score de um par candidato ───────────────────────────────────────────────

function calcularScore(

  a: Lct,

  b: Lct,

  regra: RegraMatchComparacao,

  config: ConfiguracaoComparacao

): number {

  let score \= regra.peso

  const penalidades: number\[\] \= \[\]

  for (const campo of regra.campos) {

    switch (campo) {

      case 'documento':

        if (a.documento \!== b.documento) return 0

        break

      case 'dupCr':

        if (\!a.tokens.dupCr || a.tokens.dupCr \!== b.tokens.dupCr) return 0

        break

      case 'idBaixa':

        if (\!a.tokens.idBaixa || a.tokens.idBaixa \!== b.tokens.idBaixa) return 0

        break

      case 'doctoBaixa':

        if (\!a.tokens.doctoBaixa || a.tokens.doctoBaixa \!== b.tokens.doctoBaixa) return 0

        break

      case 'ordemFaturamento':

        if (\!a.tokens.ordemFaturamento ||

            a.tokens.ordemFaturamento \!== b.tokens.ordemFaturamento) return 0

        break

      case 'cnpjParceiro':

        if (\!a.tokens.cnpjParceiro || a.tokens.cnpjParceiro \!== b.tokens.cnpjParceiro) return 0

        break

      case 'nrAdiantamento':

        if (\!a.tokens.nrAdiantamento ||

            a.tokens.nrAdiantamento \!== b.tokens.nrAdiantamento) return 0

        break

      case 'valor': {

        const va \= valorEfetivo(a)

        const vb \= valorEfetivo(b)

        const diff \= Math.abs(va \- vb)

        if (diff \> config.toleranciaValor) return 0

        // Penalidade proporcional à diferença

        penalidades.push(diferencaPercentual(va, vb) \* 0.3)

        break

      }

      case 'data': {

        const dias \= Math.abs(differenceInDays(a.dataLancamento, b.dataLancamento))

        if (dias \> config.toleranciaDias) return 0

        penalidades.push((dias / config.toleranciaDias) \* 0.2)

        break

      }

    }

  }

  const penalidade \= penalidades.reduce((acc, p) \=\> acc \+ p, 0\)

  return Math.max(0, score \- penalidade)

}

// ─── engine principal ────────────────────────────────────────────────────────

export function compararContas(

  lancamentosA: Lct\[\],

  lancamentosB: Lct\[\],

  config: ConfiguracaoComparacao

): Omit\<ResultadoComparacao, 'sessaoId'\> {

  const regras \= config.regrasPrioridade.length \> 0

    ? config.regrasPrioridade

    : (REGRAS\_PADRAO\[config.cenario\] ?? REGRAS\_PADRAO.FORNECEDORES\_BANCO)

  const regrasAtivas \= regras.filter(r \=\> r.ativa)

    .sort((a, b) \=\> b.peso \- a.peso)  // maior peso primeiro

  // Filtra pelo período

  const filtrarPeriodo \= (l: Lct) \=\>

    isWithinInterval(l.dataLancamento, {

      start: config.periodoInicio,

      end: config.periodoFim,

    })

  const a \= lancamentosA.filter(filtrarPeriodo)

  const b \= lancamentosB.filter(filtrarPeriodo)

  const pareados \= new Set\<string\>()   // IDs já usados em pares

  const pares: ParComparacaoResult\[\] \= \[\]

  // Para cada lançamento de A, busca o melhor par em B

  for (const la of a) {

    let melhorScore \= 0

    let melhorPar: Lct | null \= null

    let regraAplicada \= ''

    for (const regra of regrasAtivas) {

      for (const lb of b) {

        if (pareados.has(lb.id)) continue

        const score \= calcularScore(la, lb, regra, config)

        if (score \> melhorScore) {

          melhorScore \= score

          melhorPar \= lb

          regraAplicada \= regra.nome

        }

      }

      // Para na primeira regra que encontrar par (maior peso \= maior prioridade)

      if (melhorPar) break

    }

    if (melhorPar && melhorScore \> 0\) {

      pareados.add(la.id)

      pareados.add(melhorPar.id)

      pares.push({

        lancamentoA: la,

        lancamentoB: melhorPar,

        score: melhorScore,

        diferencaValor: Math.abs(valorEfetivo(la) \- valorEfetivo(melhorPar)),

        diferencaDias: Math.abs(

          differenceInDays(la.dataLancamento, melhorPar.dataLancamento)

        ),

        regraQueAplicou: regraAplicada,

        status: 'PENDENTE',

      })

    }

  }

  // Sem par

  const semParA: LancamentoSemPar\[\] \= a

    .filter(l \=\> \!pareados.has(l.id))

    .map(l \=\> ({

      lancamento: l,

      conta: 'A' as const,

      motivoSemPar: 'Nenhuma contrapartida encontrada na conta B no período',

    }))

  const semParB: LancamentoSemPar\[\] \= b

    .filter(l \=\> \!pareados.has(l.id))

    .map(l \=\> ({

      lancamento: l,

      conta: 'B' as const,

      motivoSemPar: 'Nenhuma contrapartida encontrada na conta A no período',

    }))

  // Resumo

  const somaA \= semParA.reduce((s, x) \=\> s \+ valorEfetivo(x.lancamento), 0\)

  const somaB \= semParB.reduce((s, x) \=\> s \+ valorEfetivo(x.lancamento), 0\)

  const mediaConfianca \= pares.length \> 0

    ? pares.reduce((s, p) \=\> s \+ p.score, 0\) / pares.length

    : 0

  return {

    config,

    pares,

    semParA,

    semParB,

    resumo: {

      totalA: a.length,

      totalB: b.length,

      paresEncontrados: pares.length,

      taxaMatchA: a.length \> 0 ? pares.length / a.length : 0,

      taxaMatchB: b.length \> 0 ? pares.length / b.length : 0,

      valorSemParA: somaA,

      valorSemParB: somaB,

      maiorDivergencia: pares.reduce((m, p) \=\> Math.max(m, p.diferencaValor), 0),

      mediaConfianca,

    },

  }

}

---

## 5\. Testes do Engine

**Arquivo:** `src/lib/engine/comparador.test.ts` — crie do zero

import { describe, it, expect } from 'vitest'

import { compararContas, REGRAS\_PADRAO } from './comparador'

import { LancamentoRazao } from '@/lib/types/razao'

import { ConfiguracaoComparacao } from '@/lib/types/comparacao'

import { subDays } from 'date-fns'

type Lct \= LancamentoRazao & { id: string }

const config: ConfiguracaoComparacao \= {

  contaOrigemId: 'conta-fornecedores',

  contaDestinoId: 'conta-banco',

  cenario: 'FORNECEDORES\_BANCO',

  nomeDescritivo: 'Teste Fornecedores × Banco',

  periodoInicio: new Date('2026-01-01'),

  periodoFim: new Date('2026-05-31'),

  toleranciaValor: 1.00,

  toleranciaDias: 5,

  regrasPrioridade: REGRAS\_PADRAO.FORNECEDORES\_BANCO,

}

function makeLct(overrides: Partial\<Lct\> & { id: string }): Lct {

  return {

    dataLancamento: new Date('2026-02-11'),

    documento: '9593',

    historicoPadrao: 'CR BAIXA DE FORNECEDORES',

    complemento: '',

    contaIntegracao: '11211001',

    centroCusto: '103067',

    descCentroCusto: 'HBR-OS25256',

    ficha: '5005',

    sequencia: 5,

    debito: 0,

    credito: 69166944.00,

    saldo: 75606.00,

    natureza: 'BAIXA\_FORNECEDOR',

    tokens: {

      dupCr: '9593',

      parcela: '1',

      cnpjParceiro: '13.536.632/0017-83',

      nomeParceiro: 'NORDEX ENERGY BRASIL',

      idBaixa: '2447',

      doctoBaixa: '30092908',

      bancoBaixa: '341',

      ordemFaturamento: '8647',

    },

    ...overrides,

  }

}

describe('compararContas — FORNECEDORES\_BANCO', () \=\> {

  it('pareia por doctoBaixa exato', () \=\> {

    const a: Lct\[\] \= \[makeLct({ id: 'a1', credito: 69166944.00 })\]

    const b: Lct\[\] \= \[makeLct({ id: 'b1', debito: 69166944.00, credito: 0 })\]

    const result \= compararContas(a, b, config)

    expect(result.pares).toHaveLength(1)

    expect(result.pares\[0\].score).toBeGreaterThan(0.9)

    expect(result.pares\[0\].diferencaValor).toBe(0)

    expect(result.semParA).toHaveLength(0)

    expect(result.semParB).toHaveLength(0)

  })

  it('não pareia quando valor excede tolerância', () \=\> {

    const a: Lct\[\] \= \[makeLct({ id: 'a1', credito: 100.00 })\]

    const b: Lct\[\] \= \[makeLct({ id: 'b1', debito: 102.00, credito: 0 })\]

    const result \= compararContas(a, b, config)

    expect(result.pares).toHaveLength(0)

    expect(result.semParA).toHaveLength(1)

    expect(result.semParB).toHaveLength(1)

  })

  it('não pareia quando data excede tolerância em dias', () \=\> {

    const a: Lct\[\] \= \[makeLct({ id: 'a1', credito: 100.00 })\]

    const b: Lct\[\] \= \[makeLct({

      id: 'b1',

      debito: 100.00,

      credito: 0,

      dataLancamento: subDays(new Date('2026-02-11'), 10),

    })\]

    const result \= compararContas(a, b, { ...config, toleranciaDias: 5 })

    // Regras que usam 'data' como campo devem rejeitar

    const paresPorData \= result.pares.filter(p \=\>

      p.regraQueAplicou.includes('data') || p.regraQueAplicou.includes('período')

    )

    // Pode ter match por outro campo (doctoBaixa), mas não por data

    expect(paresPorData).toHaveLength(0)

  })

  it('calcula resumo corretamente', () \=\> {

    const a: Lct\[\] \= \[

      makeLct({ id: 'a1', credito: 100.00 }),

      makeLct({ id: 'a2', documento: '9999', credito: 200.00,

        tokens: { dupCr: '9999', idBaixa: '9999', doctoBaixa: '9999' } }),

    \]

    const b: Lct\[\] \= \[

      makeLct({ id: 'b1', debito: 100.00, credito: 0 }),

    \]

    const result \= compararContas(a, b, config)

    expect(result.resumo.totalA).toBe(2)

    expect(result.resumo.totalB).toBe(1)

    expect(result.resumo.paresEncontrados).toBe(1)

    expect(result.resumo.taxaMatchA).toBeCloseTo(0.5, 2\)

    expect(result.resumo.taxaMatchB).toBeCloseTo(1.0, 2\)

    expect(result.semParA).toHaveLength(1)

    expect(result.resumo.valorSemParA).toBe(200.00)

  })

  it('filtra lançamentos fora do período', () \=\> {

    const fora \= makeLct({

      id: 'a-fora',

      dataLancamento: new Date('2025-12-31'),

      credito: 500.00,

    })

    const a: Lct\[\] \= \[fora\]

    const b: Lct\[\] \= \[makeLct({ id: 'b1', debito: 500.00, credito: 0 })\]

    const result \= compararContas(a, b, config)

    expect(result.resumo.totalA).toBe(0)

    expect(result.pares).toHaveLength(0)

  })

})

describe('compararContas — INTERCOMPANY', () \=\> {

  const configIC: ConfiguracaoComparacao \= {

    ...config,

    cenario: 'INTERCOMPANY',

    regrasPrioridade: REGRAS\_PADRAO.INTERCOMPANY,

  }

  it('pareia por documento espelho', () \=\> {

    const a: Lct\[\] \= \[makeLct({

      id: 'a1', credito: 28489004.00,

      documento: '9562',

      tokens: { ordemFaturamento: '8611', cnpjParceiro: '13.536.632/0017-83' }

    })\]

    const b: Lct\[\] \= \[makeLct({

      id: 'b1', debito: 28489004.00, credito: 0,

      documento: '9562',

      tokens: { ordemFaturamento: '8611', cnpjParceiro: '13.536.632/0017-83' }

    })\]

    const result \= compararContas(a, b, configIC)

    expect(result.pares).toHaveLength(1)

    expect(result.pares\[0\].regraQueAplicou).toBe('Documento espelho exato')

  })

})

---

## 6\. API Route

**Arquivo:** `src/app/api/comparacao/route.ts` — crie do zero

import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'

import { compararContas, REGRAS\_PADRAO } from '@/lib/engine/comparador'

import { ConfiguracaoComparacao, CenarioComparacao } from '@/lib/types/comparacao'

import { LancamentoRazao } from '@/lib/types/razao'

// POST /api/comparacao — inicia uma comparação entre duas contas

export async function POST(req: NextRequest) {

  try {

    const body \= await req.json() as {

      contaOrigemId: string

      contaDestinoId: string

      cenario: CenarioComparacao

      nomeDescritivo: string

      periodoInicio: string

      periodoFim: string

      toleranciaValor?: number

      toleranciaDias?: number

    }

    const {

      contaOrigemId,

      contaDestinoId,

      cenario,

      nomeDescritivo,

      periodoInicio,

      periodoFim,

      toleranciaValor \= 1.00,

      toleranciaDias \= 5,

    } \= body

    // Carrega lançamentos das duas contas

    const \[lancamentosA, lancamentosB\] \= await Promise.all(\[

      prisma.lancamento.findMany({

        where: {

          contaContabilId: contaOrigemId,

          dataLancamento: {

            gte: new Date(periodoInicio),

            lte: new Date(periodoFim),

          },

        },

      }),

      prisma.lancamento.findMany({

        where: {

          contaContabilId: contaDestinoId,

          dataLancamento: {

            gte: new Date(periodoInicio),

            lte: new Date(periodoFim),

          },

        },

      }),

    \])

    const config: ConfiguracaoComparacao \= {

      contaOrigemId,

      contaDestinoId,

      cenario,

      nomeDescritivo,

      periodoInicio: new Date(periodoInicio),

      periodoFim: new Date(periodoFim),

      toleranciaValor,

      toleranciaDias,

      regrasPrioridade: REGRAS\_PADRAO\[cenario\] ?? REGRAS\_PADRAO.FORNECEDORES\_BANCO,

    }

    // Adapta do modelo Prisma para LancamentoRazao

    const toLct \= (l: typeof lancamentosA\[0\]) \=\> ({

      id: l.id,

      dataLancamento: l.dataLancamento,

      documento: l.documento,

      historicoPadrao: l.historicoPadrao,

      complemento: l.complemento ?? '',

      contaIntegracao: l.contaIntegracao ?? '',

      centroCusto: l.centroCusto ?? '',

      descCentroCusto: l.descCentroCusto ?? '',

      ficha: l.ficha ?? '',

      sequencia: l.sequencia ?? 0,

      debito: Number(l.debito),

      credito: Number(l.credito),

      saldo: Number(l.saldo),

      natureza: l.natureza as LancamentoRazao\['natureza'\],

      tokens: {

        dupCr: l.dupCr ?? undefined,

        parcela: l.parcela ?? undefined,

        vencimento: l.vencimento ?? undefined,

        cnpjParceiro: l.cnpjParceiro ?? undefined,

        nomeParceiro: l.nomeParceiro ?? undefined,

        idDupCr: l.idDupCr ?? undefined,

        ordemFaturamento: l.ordemFaturamento ?? undefined,

        doctoBaixa: l.doctoBaixa ?? undefined,

        bancoBaixa: l.bancoBaixa ?? undefined,

        ccBaixa: l.ccBaixa ?? undefined,

        idBaixa: l.idBaixa ?? undefined,

        nrAdiantamento: l.nrAdiantamento ?? undefined,

      },

    })

    const resultado \= compararContas(

      lancamentosA.map(toLct),

      lancamentosB.map(toLct),

      config

    )

    // Persiste sessão e pares no banco

    const sessao \= await prisma.sessaoComparacao.create({

      data: {

        contaOrigemId,

        contaDestinoId,

        cenario,

        nomeDescritivo,

        periodoInicio: new Date(periodoInicio),

        periodoFim: new Date(periodoFim),

        status: 'CONCLUIDA',

        totalParesA: resultado.resumo.totalA,

        totalParesB: resultado.resumo.totalB,

        paresEncontrados: resultado.resumo.paresEncontrados,

        semParA: resultado.semParA.length,

        semParB: resultado.semParB.length,

        valorDivergente: resultado.resumo.valorSemParA \+ resultado.resumo.valorSemParB,

        concluidoEm: new Date(),

        pares: {

          create: resultado.pares.map(p \=\> ({

            lancamentoAId: p.lancamentoA.id,

            lancamentoBId: p.lancamentoB.id,

            tipoMatch: p.score \>= 0.9 ? 'AUTOMATICO\_EXATO' : 'AUTOMATICO\_FUZZY',

            scoreConfianca: p.score,

            diferencaValor: p.diferencaValor,

            diferencaDias: p.diferencaDias,

            status: 'PENDENTE',

          })),

        },

      },

      include: { pares: true },

    })

    return NextResponse.json({ sessaoId: sessao.id, resumo: resultado.resumo })

  } catch (error) {

    console.error('\[POST /api/comparacao\]', error)

    return NextResponse.json({ error: 'Erro ao processar comparação' }, { status: 500 })

  }

}

// GET /api/comparacao?sessaoId=xxx — busca resultado de uma sessão

export async function GET(req: NextRequest) {

  const sessaoId \= req.nextUrl.searchParams.get('sessaoId')

  if (\!sessaoId) {

    return NextResponse.json({ error: 'sessaoId obrigatório' }, { status: 400 })

  }

  const sessao \= await prisma.sessaoComparacao.findUnique({

    where: { id: sessaoId },

    include: {

      pares: {

        include: {

          lancamentoA: true,

          lancamentoB: true,

        },

      },

      contaOrigem:  true,

      contaDestino: true,

    },

  })

  if (\!sessao) {

    return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })

  }

  return NextResponse.json(sessao)

}

// PATCH /api/comparacao — aprova ou rejeita um par

export async function PATCH(req: NextRequest) {

  const body \= await req.json() as {

    parId: string

    status: 'APROVADO' | 'REJEITADO' | 'IGNORADO'

    observacao?: string

    aprovadoPor: string

  }

  const par \= await prisma.parComparacao.update({

    where: { id: body.parId },

    data: {

      status: body.status,

      observacao: body.observacao,

      aprovadoPor: body.aprovadoPor,

      aprovadoEm: new Date(),

    },

  })

  return NextResponse.json(par)

}

---

## 7\. Estrutura de Arquivos a Criar Neste Branch

src/

├── lib/

│   ├── types/

│   │   └── comparacao.ts          ← NOVO

│   └── engine/

│       ├── comparador.ts          ← NOVO

│       └── comparador.test.ts     ← NOVO

├── app/

│   ├── api/

│   │   └── comparacao/

│   │       └── route.ts           ← NOVO

│   └── (app)/

│       └── comparacao/

│           ├── page.tsx           ← NOVO (listagem de sessões)

│           └── nova/

│               └── page.tsx       ← NOVO (wizard de configuração)

└── components/

    └── comparacao/

        ├── FormNovaComparacao.tsx  ← NOVO

        ├── WorkspaceComparacao.tsx ← NOVO

        └── ResumoComparacao.tsx    ← NOVO

prisma/

└── migrations/

    └── YYYYMMDD\_feat-comparacao-entre-contas/  ← GERADO PELA MIGRATION

**Arquivos existentes que recebem adição (não substituição):**

- `prisma/schema.prisma` — adicionar models e enums (seção 2\)  
- `src/lib/types/razao.ts` — sem alteração neste branch  
- `src/lib/engine/matcher.ts` — sem alteração (engine original continua independente)

---

## 8\. Ordem de Implementação no Claude Code

Execute nesta sequência. Cada etapa tem um critério de "pronto" antes de avançar.

1\. git checkout \-b feature/comparacao-entre-contas

   ✓ branch criado

2\. Atualizar prisma/schema.prisma (seção 2\)

   → npx prisma migrate dev \--name feat-comparacao-entre-contas

   ✓ migration roda sem erro

   ✓ npx prisma studio → SessaoComparacao e ParComparacao aparecem na UI

3\. Criar src/lib/types/comparacao.ts (seção 3\)

   ✓ npx tsc \--noEmit → zero erros

4\. Criar src/lib/engine/comparador.ts (seção 4\)

   ✓ npx tsc \--noEmit → zero erros

5\. Criar src/lib/engine/comparador.test.ts (seção 5\)

   → npm run test comparador

   ✓ todos os testes passam

6\. Criar src/app/api/comparacao/route.ts (seção 6\)

   ✓ POST com payload de teste retorna { sessaoId, resumo }

   ✓ GET com sessaoId retorna a sessão completa

   ✓ PATCH aprova um par

7\. UI — FormNovaComparacao.tsx

   Campos obrigatórios:

   \- Select conta A (busca contas importadas)

   \- Select conta B

   \- Select cenário (FORNECEDORES\_BANCO / CLIENTES\_BANCO / INTERCOMPANY / PERSONALIZADO)

   \- DateRangePicker período

   \- Inputs tolerância valor e dias (com defaults)

   \- Botão "Iniciar comparação"

8\. UI — WorkspaceComparacao.tsx

   Três abas:

   \- "Pares encontrados" — tabela com score, divergência de valor, divergência de dias,

     botões Aprovar / Rejeitar por linha

   \- "Sem par em B" — lançamentos de A sem contrapartida

   \- "Sem par em A" — lançamentos de B sem contrapartida

9\. UI — ResumoComparacao.tsx

   Cards com: total A, total B, pares encontrados, taxa match A%, taxa match B%,

   valor sem par A, valor sem par B, média de confiança

10\. Commit e PR

    → git add \-p   (revisão linha a linha)

    → git commit \-m "feat: comparação entre contas (engine \+ API \+ UI)"

    → git push origin feature/comparacao-entre-contas

    ✓ Abrir PR apontando para main com template de PR abaixo

---

## 9\. Template de Pull Request

\#\# Comparação entre Contas

\#\#\# O que essa feature faz

Permite conciliar lançamentos de duas contas distintas da mesma empresa,

cobrindo os cenários: Fornecedores × Banco, Clientes × Banco e Intercompany.

\#\#\# Alterações no banco

\- Novos models: \`SessaoComparacao\`, \`ParComparacao\`

\- Novos enums: \`CenarioComparacao\`, \`StatusParComparacao\`

\- Relações adicionadas em \`Lancamento\` e \`ContaContabil\`

\- Migration: \`feat-comparacao-entre-contas\`

\#\#\# Como testar

1\. Importe dois razões contábeis (conta fornecedores \+ conta banco)

2\. Acesse \`/comparacao/nova\`

3\. Selecione as contas, cenário \`FORNECEDORES\_BANCO\`, período jan–mai/2026

4\. Clique em "Iniciar comparação"

5\. Valide os pares encontrados na aba "Pares encontrados"

\#\#\# Testes automatizados

\- \`npm run test comparador\` → X testes, todos verdes

\#\#\# Checklist

\- \[ \] Migration roda sem erro em banco limpo

\- \[ \] \`npx tsc \--noEmit\` sem erros

\- \[ \] Todos os testes do engine passam

\- \[ \] UI funciona nos três cenários

\- \[ \] Aprovação/rejeição de par persiste no banco

\- \[ \] Validado com o Contador Sênior em dados reais

---

## 10\. Configurações Padrão por Cenário (referência para UI)

| Cenário | toleranciaValor | toleranciaDias | Campos-chave |
| :---- | :---- | :---- | :---- |
| FORNECEDORES\_BANCO | R$ 1,00 | 5 dias | doctoBaixa, idBaixa |
| CLIENTES\_BANCO | R$ 1,00 | 3 dias | doctoBaixa, dupCr |
| INTERCOMPANY | R$ 0,01 | 1 dia | documento, ordemFaturamento |
| PERSONALIZADO | configurável | configurável | configurável |

