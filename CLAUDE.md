# CLAUDE.md — Conciliação Contábil MVP

## Contexto do Projeto

Aplicação web para **conciliação contábil automática** baseada em exportações do razão contábil
em Excel. O MVP foca exclusivamente no layout de arquivo já mapeado (ver seção "Formato do Arquivo").
Integração via API do ERP será implementada em versão posterior.

Empresa de referência para testes: **HAILO SISTEMAS METALICOS LTDA (001-001)**
Conta de referência: `1.1.02.0101.100005 – DOMESTIC CUSTOMERS`
Período analisado: `01/01/2026 a 31/05/2026`

---

## Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Front-end | Next.js 14 (App Router) + TypeScript | SSR para relatórios, rotas de API integradas |
| UI Components | shadcn/ui + Tailwind CSS | Design system produtivo, acessível |
| Back-end | Next.js API Routes (Node.js) | Monorepo simples para MVP |
| Banco de dados | PostgreSQL + Prisma ORM | Relacional com tipagem forte |
| Parser Excel | xlsx (SheetJS) | Leitura robusta de .xlsx sem dependências nativas |
| Fila de processamento | Bull (Redis) | Processamento assíncrono de arquivos grandes |
| Testes | Vitest + Testing Library | Unitários no parser e engine de matching |
| Auth | NextAuth.js (credentials) | Auth simples para MVP |

---

## Estrutura de Diretórios

```
conciliacao-contabil/
├── CLAUDE.md                    ← este arquivo
├── package.json
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                     ← Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── importacao/page.tsx
│   │   │   ├── conciliacao/
│   │   │   │   ├── page.tsx      ← workspace principal
│   │   │   │   └── [id]/page.tsx
│   │   │   └── relatorios/page.tsx
│   │   └── api/
│   │       ├── upload/route.ts
│   │       ├── conciliacao/route.ts
│   │       └── relatorios/route.ts
│   ├── lib/
│   │   ├── parser/
│   │   │   ├── razao-excel.ts    ← parser principal
│   │   │   ├── complemento.ts    ← extrator de tokens do complemento
│   │   │   └── parser.test.ts
│   │   ├── engine/
│   │   │   ├── matcher.ts        ← engine de conciliação
│   │   │   ├── rules.ts          ← regras de matching configuráveis
│   │   │   └── matcher.test.ts
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   └── types/
│   │       └── razao.ts          ← tipos TypeScript
│   └── components/
│       ├── upload/
│       ├── workspace/
│       └── relatorios/
├── fixtures/
│   └── razao_exemplo.xlsx        ← arquivo de referência para testes
└── docs/
    └── regras-matching.md
```

---

## Formato do Arquivo Excel (CRÍTICO — leia antes de escrever o parser)

### Metadados (linhas 0–7, antes do cabeçalho)

O arquivo tem um bloco de metadados acima do cabeçalho de colunas:

```
Linha 0: "RAZÃO CONTÁBIL POR EVENTO" | ... | "Período de DD/MM/AAAA até DD/MM/AAAA"
Linha 3: "EMPRESA:" | "CÓD-FILIAL - CNPJ - RAZÃO SOCIAL"
Linha 5: "EVENTO:" | <número ou 0>
Linha 7: "Conta Contábil:" | "<código>" | "<nome>" | "SALDO ANTERIOR:" | <valor>
Linha 8: CABEÇALHO DAS COLUNAS (linha 8, índice base-0)
Linha 9+: LANÇAMENTOS
```

O mesmo arquivo pode conter **múltiplas contas contábeis** separadas por blocos de metadados
idênticos intercalados entre os lançamentos. O parser DEVE detectar essas quebras.

### ⚠️ Correções validadas contra o arquivo real (jun/2026)

Ao implementar o parser contra `razao_projeto.xlsx` (HAILO, 174 linhas), foram encontradas
**5 divergências entre esta spec original e o arquivo real**. O código em `src/lib/parser/`
já reflete a realidade; a tabela abaixo é a fonte de verdade:

| # | Spec original dizia | Realidade no arquivo | Correção aplicada |
|---|---|---|---|
| 1 | Período na **última coluna** da linha 0 | Período no **índice 6** (resto `null`) | Busca o regex de período em **qualquer célula** da linha |
| 2 | Saldo anterior no **índice 4** | Rótulo `SALDO ANTERIOR:` no índice 10, **valor no índice 11** | Localiza o valor pela **próxima célula após o rótulo** |
| 3 | Histórico `CR BAIXA DE CLIENTES` | Vem com **espaço duplo**: `CR  BAIXA` | Normaliza `\s+` → ` ` antes de classificar |
| 4 | Débito/crédito/saldo todos em reais | **DÉBITO/CRÉDITO em CENTAVOS** (inteiro + `,00`); **SALDO em reais** | `debito`/`credito` ÷ 100; saldo intacto. Reconciliação fecha 165/165 |
| 5 | Regex de complemento `[A-Z_.]+...:([^/]+?)` | Não casava `CNPJ/CPF` (sem `/`) e truncava no 1º `/` | Regex corrigido (abaixo); cobre a variante `DUP:` da filial 001-002 |

Outros fatos reais: CNPJ da HAILO = `13.150.810/0002-57`; o campo `HISTÓRICO PADRÃO`
(coluna 2) vem com o **complemento concatenado** — o complemento isolado está na coluna 3,
que é a usada para extrair tokens.

> ⚠️ **Item 4 (centavos) ainda PENDENTE de validação com o Contador Sênior.** Confirmar se
> a regra "débito/crédito em centavos / saldo em reais" vale para todas as contas e ERPs,
> ou se é específica desta exportação. O engine de matching do Sprint B depende disso.

### Colunas (12 colunas, índices 0–11)

| Índice | Nome no arquivo | Campo TypeScript | Tipo | Observações |
|---|---|---|---|---|
| 0 | DATA LÇTO | `dataLancamento` | Date | Formato datetime do Excel |
| 1 | DOCUMENTO | `documento` | string | Número da duplicata ou código composto |
| 2 | HISTÓRICO PADRÃO | `historicoPadrao` | string | Ex: "001-001 - CR BAIXA DE CLIENTES /" |
| 3 | COMPLEMENTO HISTÓRICO | `complemento` | string | Tokens semi-estruturados (ver abaixo) |
| 4 | CONTA INTEGRAÇÃO | `contaIntegracao` | string | Ex: "11211001" |
| 5 | C.CUSTOS | `centroCusto` | string | Número ou "9999" para APURAÇÃO |
| 6 | DESCRIÇÃO C.CUSTOS | `descCentroCusto` | string | Nome do centro de custo |
| 7 | FICHA | `ficha` | string | Código da ficha |
| 8 | SEQUÊNCIA | `sequencia` | number | Número de sequência |
| 9 | DÉBITO | `debito` | number | **Em CENTAVOS** (inteiro + sufixo `,00`). Dividir por 100 → reais |
| 10 | CRÉDITO | `credito` | number | **Em CENTAVOS** (idem débito). Dividir por 100 → reais |
| 11 | SALDO | `saldo` | number | **Em REAIS** (vírgula decimal real, ex.: `1701195,33`). Não dividir |

### Extração de Tokens do Campo COMPLEMENTO

O campo `complemento` (coluna 3) contém tokens semi-estruturados separados por espaços.
O regex de referência (validado nos dados reais) é:

```typescript
// CORRIGIDO: a chave pode conter '/' e dígitos (CNPJ/CPF) e o valor vai até a
// próxima chave (precedida por espaço) ou o fim — preservando '/' em datas/CNPJs.
const TOKEN_REGEX = /([A-Z][A-Z0-9_./]*):\s*(.*?)(?=\s+[A-Z][A-Z0-9_./]*:|$)/g;
```

> O regex original `/([A-Z_.]+(?:\.[A-Z]+)*):([^/]+?).../` **não** casava `CNPJ/CPF`
> (classe de chave sem `/`) e truncava valores no primeiro `/`. A filial 001-002 também
> usa a chave curta `DUP:` em vez de `DUP.CR.:` — ambas mapeadas para `dupCr`.

Tokens mapeados nos dados reais:

| Token | Campo | Exemplo |
|---|---|---|
| `DUP.CR` | Número da duplicata | `DUP.CR.:1045` |
| `PARC` | Parcela | `PARC:1` |
| `VCTO` | Data de vencimento | `VCTO:02/01/2026` |
| `CNPJ/CPF` | CNPJ e razão social | `CNPJ/CPF:07.175.725/0010-50 - WEG EQUIPAMENTOS` |
| `ID.DUP.CR` | ID interno da duplicata | `ID.DUP.CR:107053` |
| `OF` | Ordem de faturamento | `OF:8630` |
| `DOCTO.BAIXA` | Documento de baixa | `DOCTO.BAIXA:30092902` |
| `BCO.BAIXA` | Banco de baixa | `BCO.BAIXA:341` |
| `CC.BAIXA` | Conta corrente de baixa | `CC.BAIXA:53138-5` |
| `ID.BAIXA` | ID da baixa | `ID.BAIXA:2439` |
| `NR.ADTO` | Número do adiantamento | `NR.ADTO:1988` |

### Naturezas de Lançamento (campo `historicoPadrao`)

Identificadas nos dados reais:

| Código | Descrição | Direção esperada |
|---|---|---|
| `CR BAIXA DE CLIENTES` | Recebimento de cliente | Crédito |
| `CR BAIXA DE FORNECEDORES` | Pagamento a fornecedor | Crédito |
| `CR NOTAS FISCAIS DE SAÍDA` | Emissão de NF saída | Débito |
| `CR NOTAS FISCAIS DE ENTRADA` | Entrada de NF | Débito |
| `CP BAIXA DE FORNECEDORES` | Contrapartida baixa fornecedor | Crédito |
| `CP NOTAS FISCAIS DE SAÍDA` | Contrapartida NF saída | Crédito |

### Naturezas — observação de formato

No arquivo real o `historicoPadrao` usa **espaço duplo** após o prefixo `CR`/`CP`
(ex.: `CR  BAIXA DE CLIENTES`). A classificação normaliza `\s+` → ` ` antes de comparar.

### Valores Numéricos

- `SALDO` e `SALDO ANTERIOR`: **em reais**, vírgula decimal (`"1701195,33"`) →
  `parseFloat(v.replace(/\./g, '').replace(',', '.'))`.
- `DÉBITO` e `CRÉDITO`: **em CENTAVOS** (inteiro com sufixo `,00`, ex.: `"859250,00"` =
  R$ 8.592,50) → `parseValorCentavos`: `Math.round(parseValor(v)) / 100`.
  Validado por reconciliação `saldo = anterior + débito − crédito` em **165/165** lançamentos.
- Zero como `0` ou célula vazia (tratar ambos como `0`).

> ⚠️ A regra de centavos (item 4 das correções) está **pendente de validação com o
> Contador Sênior** — pode ser específica deste ERP/exportação.

---

## Modelo de Dados (Prisma Schema)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ImportacaoRazao {
  id              String   @id @default(cuid())
  nomeArquivo     String
  empresa         String
  cnpjEmpresa     String
  periodo         Json     // { inicio: Date, fim: Date }
  status          ImportacaoStatus @default(PROCESSANDO)
  totalLinhas     Int      @default(0)
  linhasImportadas Int     @default(0)
  erros           Json?
  criadoEm        DateTime @default(now())
  lancamentos     Lancamento[]
  sessoesConciliacao SessaoConciliacao[]
}

model ContaContabil {
  id          String   @id @default(cuid())
  codigo      String   @unique
  nome        String
  saldoAnterior Decimal @default(0) @db.Decimal(18, 2)
  lancamentos Lancamento[]
}

model Lancamento {
  id                String   @id @default(cuid())
  importacaoId      String
  contaContabilId   String
  dataLancamento    DateTime
  documento         String
  historicoPadrao   String
  complemento       String?
  contaIntegracao   String?
  centroCusto       String?
  descCentroCusto   String?
  ficha             String?
  sequencia         Int?
  debito            Decimal  @default(0) @db.Decimal(18, 2)
  credito           Decimal  @default(0) @db.Decimal(18, 2)
  saldo             Decimal  @db.Decimal(18, 2)
  natureza          NaturezaLancamento
  // Tokens extraídos do complemento
  dupCr             String?
  parcela           String?
  vencimento        DateTime?
  cnpjParceiro      String?
  nomeParceiro      String?
  idDupCr           String?
  ordemFaturamento  String?
  doctoBaixa        String?
  bancoBaixa        String?
  ccBaixa           String?
  idBaixa           String?
  nrAdiantamento    String?
  // Conciliação
  statusConciliacao StatusConciliacao @default(PENDENTE)
  parConciliadoId   String?
  parConciliado     ParConciliacao? @relation("LancamentoPar", fields: [parConciliadoId], references: [id])
  importacao        ImportacaoRazao @relation(fields: [importacaoId], references: [id])
  contaContabil     ContaContabil @relation(fields: [contaContabilId], references: [id])
  criadoEm          DateTime @default(now())
}

model ParConciliacao {
  id                String   @id @default(cuid())
  sessaoId          String
  tipoMatch         TipoMatch
  scoreConfianca    Float    // 0.0 a 1.0
  diferencaValor    Decimal  @default(0) @db.Decimal(18, 2)
  statusAprovacao   StatusAprovacao @default(PENDENTE)
  observacao        String?
  aprovadoPor       String?
  aprovadoEm        DateTime?
  lancamentos       Lancamento[] @relation("LancamentoPar")
  sessao            SessaoConciliacao @relation(fields: [sessaoId], references: [id])
  criadoEm          DateTime @default(now())
}

model SessaoConciliacao {
  id            String   @id @default(cuid())
  importacaoId  String
  status        SessaoStatus @default(PROCESSANDO)
  totalPares    Int      @default(0)
  paresAutomatic Int     @default(0)
  paresManuais  Int      @default(0)
  divergencias  Int      @default(0)
  criadoEm      DateTime @default(now())
  importacao    ImportacaoRazao @relation(fields: [importacaoId], references: [id])
  pares         ParConciliacao[]
}

enum ImportacaoStatus { PROCESSANDO CONCLUIDA ERRO }
enum StatusConciliacao { PENDENTE CONCILIADO DIVERGENCIA IGNORADO }
enum StatusAprovacao { PENDENTE APROVADO REJEITADO }
enum TipoMatch { AUTOMATICO_EXATO AUTOMATICO_FUZZY MANUAL }
enum SessaoStatus { PROCESSANDO CONCLUIDA PARCIAL }
enum NaturezaLancamento {
  BAIXA_CLIENTE
  BAIXA_FORNECEDOR
  NF_SAIDA
  NF_ENTRADA
  CONTRAPARTIDA_BAIXA_FORNECEDOR
  CONTRAPARTIDA_NF_SAIDA
  OUTRO
}
```

---

## Regras de Matching (engine/rules.ts)

### Regra 1 — Match Exato por Duplicata (peso 1.0)

Par conciliado quando:
- `dupCr` igual nos dois lançamentos
- `parcela` igual
- `documento` igual (ou dentro da mesma sequência de baixa)
- Soma de débitos = soma de créditos (tolerância: ≤ R$ 0,02 por diferença de arredondamento)

### Regra 2 — Match por ID de Baixa (peso 0.95)

Par conciliado quando:
- `idBaixa` igual nos dois lançamentos
- `doctoBaixa` igual
- Direções opostas (um débito, um crédito)

### Regra 3 — Match por Ordem de Faturamento + Valor (peso 0.85)

Par candidato quando:
- `ordemFaturamento` (OF) igual
- Valores com diferença ≤ 0,5%
- Data de lançamento com diferença ≤ 30 dias

### Regra 4 — Match por CNPJ + Valor + Período (peso 0.70)

Candidato para revisão manual quando:
- `cnpjParceiro` igual
- Valores iguais (tolerância ≤ R$ 1,00)
- Mesmo mês de competência

### Divergências Automáticas

Marcar como `DIVERGENCIA` quando:
- Lançamento com `dupCr` preenchido mas sem contrapartida encontrada após 30 dias
- Saldo credor em conta de ativo sem par identificado
- Diferença de valor > 0,5% entre lançamentos pareados

---

## Ordem de Implementação (MVP — Sprint A)

Implemente nesta sequência exata:

### 1. Setup do projeto

```bash
npx create-next-app@latest conciliacao-contabil \
  --typescript --tailwind --app --src-dir --import-alias "@/*"
cd conciliacao-contabil
npx shadcn@latest init
npx prisma init
npm install xlsx bull ioredis date-fns
npm install -D vitest @testing-library/react
```

### 2. Tipos TypeScript (`src/lib/types/razao.ts`)

Comece pelos tipos. Tudo deriva deles.

```typescript
export interface MetadadosRazao {
  empresa: string
  cnpjEmpresa: string
  codigoFilial: string
  periodoInicio: Date
  periodoFim: Date
  evento: string
}

export interface ContaRazao {
  codigo: string
  nome: string
  saldoAnterior: number
}

export interface LancamentoRazao {
  dataLancamento: Date
  documento: string
  historicoPadrao: string
  complemento: string
  contaIntegracao: string
  centroCusto: string
  descCentroCusto: string
  ficha: string
  sequencia: number
  debito: number
  credito: number
  saldo: number
  // tokens extraídos
  tokens: ComplementoTokens
  natureza: NaturezaLancamento
}

export interface ComplementoTokens {
  dupCr?: string
  parcela?: string
  vencimento?: Date
  cnpjParceiro?: string
  nomeParceiro?: string
  idDupCr?: string
  ordemFaturamento?: string
  doctoBaixa?: string
  bancoBaixa?: string
  ccBaixa?: string
  idBaixa?: string
  nrAdiantamento?: string
}

export type NaturezaLancamento =
  | 'BAIXA_CLIENTE'
  | 'BAIXA_FORNECEDOR'
  | 'NF_SAIDA'
  | 'NF_ENTRADA'
  | 'CONTRAPARTIDA_BAIXA_FORNECEDOR'
  | 'CONTRAPARTIDA_NF_SAIDA'
  | 'OUTRO'

export interface RazaoParseResult {
  metadados: MetadadosRazao
  contas: Array<{
    conta: ContaRazao
    lancamentos: LancamentoRazao[]
  }>
  erros: ParseError[]
}

export interface ParseError {
  linha: number
  campo: string
  valor: string
  mensagem: string
}
```

### 3. Parser de Complemento (`src/lib/parser/complemento.ts`)

```typescript
import { ComplementoTokens } from '@/lib/types/razao'
import { parse } from 'date-fns'

const TOKEN_REGEX = /([A-Z_.]+(?:\.[A-Z]+)*):([^/]+?)(?=\s+[A-Z_.]+:|$)/g

export function parseComplemento(texto: string): ComplementoTokens {
  if (!texto) return {}
  const tokens: Record<string, string> = {}
  let match: RegExpExecArray | null
  while ((match = TOKEN_REGEX.exec(texto)) !== null) {
    tokens[match[1].trim()] = match[2].trim()
  }
  TOKEN_REGEX.lastIndex = 0

  const cnpjRaw = tokens['CNPJ/CPF'] ?? ''
  const [cnpj, ...nomePartes] = cnpjRaw.split(' - ')

  const vctoStr = tokens['VCTO']
  let vencimento: Date | undefined
  if (vctoStr) {
    try {
      vencimento = parse(vctoStr, 'dd/MM/yyyy', new Date())
    } catch { /* ignora */ }
  }

  return {
    dupCr:             tokens['DUP.CR.'] ?? tokens['DUP.CR'] ?? tokens['DUP:'],
    parcela:           tokens['PARC'],
    vencimento,
    cnpjParceiro:      cnpj?.trim(),
    nomeParceiro:      nomePartes.join(' - ').trim() || undefined,
    idDupCr:           tokens['ID.DUP.CR'],
    ordemFaturamento:  tokens['OF'],
    doctoBaixa:        tokens['DOCTO.BAIXA'],
    bancoBaixa:        tokens['BCO.BAIXA'],
    ccBaixa:           tokens['CC.BAIXA'],
    idBaixa:           tokens['ID.BAIXA'],
    nrAdiantamento:    tokens['NR.ADTO'],
  }
}
```

### 4. Parser Principal (`src/lib/parser/razao-excel.ts`)

```typescript
import * as XLSX from 'xlsx'
import { parseComplemento } from './complemento'
import {
  RazaoParseResult, MetadadosRazao, ContaRazao,
  LancamentoRazao, NaturezaLancamento, ParseError
} from '@/lib/types/razao'

// ---- helpers ----

function parseValor(v: unknown): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/\./g, '').replace(',', '.')
  return parseFloat(s) || 0
}

function parseData(v: unknown): Date | null {
  if (!v) return null
  if (typeof v === 'number') return XLSX.SSF.parse_date_code(v) as unknown as Date
  if (v instanceof Date) return v
  return null
}

function classificarNatureza(historico: string): NaturezaLancamento {
  const h = historico.toUpperCase()
  if (h.includes('CR BAIXA DE CLIENTES'))             return 'BAIXA_CLIENTE'
  if (h.includes('CR BAIXA DE FORNECEDORES'))         return 'BAIXA_FORNECEDOR'
  if (h.includes('CR NOTAS FISCAIS DE SAÍDA') ||
      h.includes('CR NOTAS FISCAIS DE SAIDA'))        return 'NF_SAIDA'
  if (h.includes('CR NOTAS FISCAIS DE ENTRADA'))      return 'NF_ENTRADA'
  if (h.includes('CP BAIXA DE FORNECEDORES'))         return 'CONTRAPARTIDA_BAIXA_FORNECEDOR'
  if (h.includes('CP NOTAS FISCAIS DE SAÍDA') ||
      h.includes('CP NOTAS FISCAIS DE SAIDA'))        return 'CONTRAPARTIDA_NF_SAIDA'
  return 'OUTRO'
}

// ---- parser de metadados ----

function parseMetadadosBloco(rows: unknown[][]): {
  metadados: MetadadosRazao | null
  conta: ContaRazao | null
  headerRowIndex: number
} {
  let metadados: MetadadosRazao | null = null
  let conta: ContaRazao | null = null
  let headerRowIndex = -1

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as string[]
    const r0 = String(row[0] ?? '').trim()
    const r1 = String(row[1] ?? '').trim()

    if (r0.includes('RAZÃO CONTÁBIL') || r0 === '') {
      // linha de título — extrai período
      const periodoStr = String(row[row.length - 1] ?? '')
      const match = periodoStr.match(/(\d{2}\/\d{2}\/\d{4})\s*até\s*(\d{2}\/\d{2}\/\d{4})/)
      if (match && !metadados) {
        const [, ini, fim] = match
        const [dI, mI, aI] = ini.split('/').map(Number)
        const [dF, mF, aF] = fim.split('/').map(Number)
        metadados = {
          empresa: '', cnpjEmpresa: '', codigoFilial: '',
          periodoInicio: new Date(aI, mI - 1, dI),
          periodoFim:    new Date(aF, mF - 1, dF),
          evento: ''
        }
      }
    }

    if (r0 === 'EMPRESA:' && r1 && metadados) {
      const partes = r1.split(' - ')
      metadados.codigoFilial = partes[0]?.trim() ?? ''
      metadados.cnpjEmpresa  = partes[1]?.trim() ?? ''
      metadados.empresa      = partes.slice(2).join(' - ').trim()
    }

    if (r0 === 'EVENTO:' && metadados) {
      metadados.evento = r1
    }

    if (r0 === 'Conta Contábil:') {
      conta = {
        codigo:        r1,
        nome:          String(row[2] ?? '').trim(),
        saldoAnterior: parseValor(row[4])
      }
    }

    if (r0 === 'DATA LÇTO') {
      headerRowIndex = i
      break
    }
  }

  return { metadados, conta, headerRowIndex }
}

// ---- parser principal ----

export function parseRazaoExcel(buffer: Buffer): RazaoParseResult {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })

  const erros: ParseError[] = []
  const blocos: RazaoParseResult['contas'] = []

  let cursor = 0
  let metadadosGlobal: MetadadosRazao | null = null

  while (cursor < raw.length) {
    // Encontra próximo bloco de metadados/header
    const slice = raw.slice(cursor)
    const { metadados, conta, headerRowIndex } = parseMetadadosBloco(slice as unknown[][])

    if (headerRowIndex === -1) break
    if (!conta) { cursor += headerRowIndex + 1; continue }

    if (metadados && !metadadosGlobal) metadadosGlobal = metadados

    const lancamentos: LancamentoRazao[] = []
    let dataRows = cursor + headerRowIndex + 1

    while (dataRows < raw.length) {
      const row = raw[dataRows] as (string | number | null)[]

      // Detecta próximo bloco de metadados
      if (String(row[0] ?? '').includes('Conta Contábil:') ||
          String(row[0] ?? '').includes('RAZÃO CONTÁBIL')) {
        break
      }

      // Linha vazia ou linha de total — pula
      const col0 = String(row[0] ?? '').trim()
      if (!col0 || col0.startsWith('SALDO FINAL') || col0.startsWith('TOTAL')) {
        dataRows++; continue
      }

      const data = parseData(row[0])
      if (!data) { dataRows++; continue }

      try {
        const complementoRaw = String(row[3] ?? '')
        const tokens = parseComplemento(complementoRaw)
        const historico = String(row[2] ?? '')

        lancamentos.push({
          dataLancamento:  data,
          documento:       String(row[1]  ?? '').trim(),
          historicoPadrao: historico.trim(),
          complemento:     complementoRaw.trim(),
          contaIntegracao: String(row[4]  ?? '').trim(),
          centroCusto:     String(row[5]  ?? '').trim(),
          descCentroCusto: String(row[6]  ?? '').trim(),
          ficha:           String(row[7]  ?? '').trim(),
          sequencia:       Number(row[8]  ?? 0),
          debito:          parseValor(row[9]),
          credito:         parseValor(row[10]),
          saldo:           parseValor(row[11]),
          tokens,
          natureza:        classificarNatureza(historico),
        })
      } catch (e) {
        erros.push({
          linha:    dataRows,
          campo:    'geral',
          valor:    String(row),
          mensagem: String(e)
        })
      }

      dataRows++
    }

    blocos.push({ conta, lancamentos })
    cursor = dataRows
  }

  return {
    metadados: metadadosGlobal ?? {
      empresa: '', cnpjEmpresa: '', codigoFilial: '',
      periodoInicio: new Date(), periodoFim: new Date(), evento: ''
    },
    contas: blocos,
    erros
  }
}
```

### 5. Testes do Parser (`src/lib/parser/parser.test.ts`)

```typescript
import { describe, it, expect } from 'vitest'
import { parseComplemento } from './complemento'
import { parseRazaoExcel } from './razao-excel'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('parseComplemento', () => {
  it('extrai tokens de baixa de cliente', () => {
    const input = `DUP.CR.:1045   PARC:1   VCTO:02/01/2026   CNPJ/CPF:07.175.725/0010-50 - WEG EQUIPAMENTOS   ID.DUP.CR:107053   OF:8630   DOCTO.BAIXA:30092902   BCO.BAIXA:341   CC.BAIXA:53138-5   ID.BAIXA:2439`
    const result = parseComplemento(input)
    expect(result.dupCr).toBe('1045')
    expect(result.parcela).toBe('1')
    expect(result.cnpjParceiro).toBe('07.175.725/0010-50')
    expect(result.nomeParceiro).toBe('WEG EQUIPAMENTOS')
    expect(result.ordemFaturamento).toBe('8630')
    expect(result.idBaixa).toBe('2439')
  })

  it('extrai NR.ADTO para adiantamentos', () => {
    const input = `DUP.CR.:1051   PARC:1   VCTO:15/01/2026   CNPJ/CPF:18.379.944/0001-87 - G-WIND SOLUCOES EOLICAS LTDA   ID.DUP.CR:107160   OF:8664   NR.ADTO:1988`
    const result = parseComplemento(input)
    expect(result.nrAdiantamento).toBe('1988')
  })

  it('retorna objeto vazio para complemento vazio', () => {
    expect(parseComplemento('')).toEqual({})
  })
})

describe('parseRazaoExcel', () => {
  it('processa o arquivo de referência sem erros críticos', () => {
    const buf = readFileSync(join(process.cwd(), 'fixtures/razao_exemplo.xlsx'))
    const result = parseRazaoExcel(buf)
    expect(result.metadados.empresa).toContain('HAILO')
    expect(result.contas.length).toBeGreaterThan(0)
    expect(result.contas[0].lancamentos.length).toBeGreaterThan(0)
    expect(result.erros.length).toBe(0)
  })

  it('extrai saldo anterior da conta corretamente', () => {
    const buf = readFileSync(join(process.cwd(), 'fixtures/razao_exemplo.xlsx'))
    const result = parseRazaoExcel(buf)
    expect(result.contas[0].conta.saldoAnterior).toBeCloseTo(1709787.83, 2)
  })

  it('classifica naturezas corretamente', () => {
    const buf = readFileSync(join(process.cwd(), 'fixtures/razao_exemplo.xlsx'))
    const result = parseRazaoExcel(buf)
    const naturezas = result.contas[0].lancamentos.map(l => l.natureza)
    expect(naturezas).toContain('BAIXA_CLIENTE')
    expect(naturezas).toContain('NF_SAIDA')
  })
})
```

---

## Variáveis de Ambiente (.env.local)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/conciliacao_dev"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Comandos para Rodar

```bash
# Banco de dados
docker run -d --name pg-conciliacao -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=conciliacao_dev -p 5432:5432 postgres:16

# Redis (para Bull)
docker run -d --name redis-conciliacao -p 6379:6379 redis:7

# Migrations
npx prisma migrate dev --name init

# Dev
npm run dev

# Testes
npm run test
npm run test -- --coverage
```

---

## Prioridades do Sprint A (Semanas 1–2 de código)

1. ✅ Tipos TypeScript (`razao.ts`) — base de tudo
2. ✅ `parseComplemento` + testes — isola a parte mais complexa
3. ✅ `parseRazaoExcel` + testes com o arquivo de referência
4. ✅ API route `/api/upload` — recebe o arquivo, chama o parser, persiste no banco
5. ✅ Prisma schema + migrations (`prisma/schema.prisma`, migration `init`)
6. ✅ Tela de importação (`/importacao`) — upload com barra de progresso (XHR)
7. ✅ Listagem de lançamentos (`/lancamentos`) com filtros e paginação

**Sprint A concluído e validado end-to-end** (23 testes, `next build` OK, upload real → 165
lançamentos no banco com valores corretos).

**Não implemente ainda:** engine de matching, workspace de conciliação, relatórios.
Esses entram no Sprint B **após validação do parser com o Contador Sênior** — em especial a
regra de centavos (item 4 das correções) e as direções/tolerâncias de matching.

---

## Convenções de Código

- **Idioma do código:** inglês (variáveis, funções, tipos)
- **Idioma da UI e comentários:** português brasileiro
- **Sem `any` em TypeScript** — use `unknown` e faça type narrowing
- Funções puras e testáveis: lógica de negócio em `src/lib/`, UI em `src/components/`
- Tratar e logar todos os erros de parsing — nunca silenciar com `catch {}`
- Valores monetários: trabalhar sempre em `number` com 2 casas decimais no domínio,
  persistir como `Decimal(18,2)` no banco
- Datas: sempre `Date` nativo no domínio, converter para ISO string apenas na camada de API

---

## Arquivo de Referência

O arquivo `fixtures/razao_exemplo.xlsx` é a fonte de verdade para todos os testes.
É o razão contábil real da HAILO SISTEMAS METALICOS LTDA, período jan–mai/2026
(cópia de `razao_projeto.xlsx`, na raiz do projeto).

Características do arquivo que o parser DEVE suportar:
- 174 linhas totais, 12 colunas
- 1 conta contábil (múltiplas contas podem aparecer em arquivos de produção)
- Lançamentos com débito zerado (apenas crédito) e vice-versa
- Saldos negativos (conta entra em posição credora)
- Campo complemento com tokens variáveis (nem todos presentes em todos os lançamentos)
- Histórico padrão com prefixo `001-001` ou `001-002` indicando filial de origem
