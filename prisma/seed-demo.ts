/**
 * Seed de DEMONSTRAÇÃO (apresentação da ferramenta).
 *
 * Cria, para a empresa "Nice System", books de Jan–Jun/2026 com um plano de
 * contas completo (Ativo, Passivo+PL, Receitas, Custos/Despesas, Provisões),
 * fichas validadas (saldo Razão = Balancete = Relatório → CONCILIADA) e alguns
 * divergentes com ocorrência. Alimenta tanto o Book Digital quanto o FIB
 * (Inteligência Financeira), que lê FichaConciliacao.saldoBalancete.
 *
 * Idempotente: upsert por (empresa, ano, mês) e por (book, código da conta).
 * Rodar com:  npx tsx prisma/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EMPRESA = 'Nice System'
const ELABORADOR = 'João Santos'
const ANO = 2026
const MESES = [1, 2, 3, 4, 5, 6]

// Status por mês: meses antigos reportados/aprovados, recentes em aberto.
const STATUS_POR_MES: Record<number, string> = {
  1: 'FECHADO',
  2: 'FECHADO',
  3: 'APROVADO',
  4: 'EM_REVISAO',
  5: 'RASCUNHO',
  6: 'RASCUNHO',
}

type Tipo =
  | 'ATIVO_BANCO'
  | 'ATIVO_CIRCULANTE'
  | 'PASSIVO_CIRCULANTE'
  | 'RESULTADO'
  | 'OUTROS'

interface Conta {
  codigo: string
  nome: string
  tipo: Tipo
  base: number // saldo-base (Jan/2026)
  cresce: boolean // aplica o fator de crescimento mensal?
}

// Plano de contas (código 6 dígitos; 1=Ativo, 2=Passivo+PL, 3=Receita,
// 4=Custos/Despesas, 5=Provisões). 200051 (Reservas) é calculado p/ fechar.
const PLANO: Conta[] = [
  // ── ATIVO (1) ──
  { codigo: '100001', nome: 'CAIXA GERAL', tipo: 'ATIVO_BANCO', base: 85000, cresce: true },
  { codigo: '100003', nome: 'CITIBANK - C/C 0071200019', tipo: 'ATIVO_BANCO', base: 131384.2, cresce: true },
  { codigo: '100004', nome: 'BRADESCO - C/C 0045-9', tipo: 'ATIVO_BANCO', base: 312500, cresce: true },
  { codigo: '100006', nome: 'CLIENTES NACIONAIS', tipo: 'ATIVO_CIRCULANTE', base: 2480000, cresce: true },
  { codigo: '100007', nome: 'CLIENTES EXTERIOR', tipo: 'ATIVO_CIRCULANTE', base: 760000, cresce: true },
  { codigo: '100010', nome: 'ESTOQUE PRODUTOS ACABADOS', tipo: 'ATIVO_CIRCULANTE', base: 1180000, cresce: true },
  { codigo: '100011', nome: 'ESTOQUE MATÉRIA-PRIMA', tipo: 'ATIVO_CIRCULANTE', base: 640000, cresce: true },
  { codigo: '100020', nome: 'IMOBILIZADO - MÁQUINAS E EQUIP.', tipo: 'OUTROS', base: 3450000, cresce: false },
  { codigo: '100021', nome: 'IMOBILIZADO - VEÍCULOS', tipo: 'OUTROS', base: 520000, cresce: false },
  // ── PASSIVO + PL (2) ──
  { codigo: '200003', nome: 'FORNECEDORES NACIONAIS', tipo: 'PASSIVO_CIRCULANTE', base: 1046071.39, cresce: true },
  { codigo: '200004', nome: 'FORNECEDORES EXTERIOR', tipo: 'PASSIVO_CIRCULANTE', base: 415000, cresce: true },
  { codigo: '200010', nome: 'EMPRÉSTIMOS BANCÁRIOS', tipo: 'PASSIVO_CIRCULANTE', base: 1480000, cresce: false },
  { codigo: '200020', nome: 'IMPOSTOS A RECOLHER', tipo: 'PASSIVO_CIRCULANTE', base: 358000, cresce: true },
  { codigo: '200021', nome: 'SALÁRIOS E ENCARGOS A PAGAR', tipo: 'PASSIVO_CIRCULANTE', base: 192000, cresce: true },
  { codigo: '200050', nome: 'CAPITAL SOCIAL', tipo: 'OUTROS', base: 3000000, cresce: false },
  { codigo: '200051', nome: 'RESERVAS DE LUCROS', tipo: 'OUTROS', base: 0, cresce: false }, // calculado
  // ── RECEITAS (3) ──
  { codigo: '300001', nome: 'RECEITA DE VENDAS', tipo: 'RESULTADO', base: 1820000, cresce: true },
  { codigo: '300002', nome: 'RECEITA DE SERVIÇOS', tipo: 'RESULTADO', base: 360000, cresce: true },
  { codigo: '300010', nome: 'RECEITAS FINANCEIRAS', tipo: 'RESULTADO', base: 42000, cresce: true },
  // ── CUSTOS / DESPESAS (4) ──
  { codigo: '400001', nome: 'CMV - CUSTO MERCADORIA VENDIDA', tipo: 'RESULTADO', base: 968000, cresce: true },
  { codigo: '400010', nome: 'DESPESAS COM PESSOAL', tipo: 'RESULTADO', base: 418000, cresce: true },
  { codigo: '400020', nome: 'DESPESAS ADMINISTRATIVAS', tipo: 'RESULTADO', base: 176000, cresce: true },
  { codigo: '400030', nome: 'DESPESAS COMERCIAIS', tipo: 'RESULTADO', base: 152000, cresce: true },
  { codigo: '400040', nome: 'DESPESAS FINANCEIRAS', tipo: 'RESULTADO', base: 88000, cresce: true },
  // ── PROVISÕES (5) ──
  { codigo: '500001', nome: 'PROVISÃO P/ DEVEDORES DUVIDOSOS', tipo: 'OUTROS', base: 74000, cresce: true },
  { codigo: '500002', nome: 'PROVISÃO P/ CONTINGÊNCIAS', tipo: 'OUTROS', base: 118000, cresce: false },
]

const round2 = (n: number) => Math.round(n * 100) / 100

function classe(codigo: string): '1' | '2' | '3' | '4' | '5' | 'x' {
  const d = codigo.charAt(0)
  return d === '1' || d === '2' || d === '3' || d === '4' || d === '5' ? d : 'x'
}

async function main() {
  console.log(`Seed de demonstração — empresa "${EMPRESA}", ${MESES.length} meses\n`)

  for (const mes of MESES) {
    const fator = 1 + 0.05 * (mes - 1) // +5% a.m. nas contas que crescem

    // Saldos do mês (Reservas calculado para fechar Ativo = Passivo+PL)
    const saldos = new Map<string, number>()
    for (const c of PLANO) {
      if (c.codigo === '200051') continue
      saldos.set(c.codigo, round2(c.base * (c.cresce ? fator : 1)))
    }
    let somaAtivo = 0
    let somaPassivoExigivelEPL = 0
    for (const c of PLANO) {
      if (c.codigo === '200051') continue
      const v = saldos.get(c.codigo)!
      if (classe(c.codigo) === '1') somaAtivo += v
      if (classe(c.codigo) === '2') somaPassivoExigivelEPL += v
    }
    // Reservas fecha o balanço (Ativo = Passivo + PL)
    saldos.set('200051', round2(somaAtivo - somaPassivoExigivelEPL))

    const book = await prisma.bookDigital.upsert({
      where: { empresaId_ano_mes: { empresaId: EMPRESA, ano: ANO, mes } },
      create: {
        empresaId: EMPRESA,
        ano: ANO,
        mes,
        elaboradoPor: ELABORADOR,
        status: STATUS_POR_MES[mes] as never,
      },
      update: { status: STATUS_POR_MES[mes] as never, elaboradoPor: ELABORADOR },
      select: { id: true },
    })

    // Divergência proposital: Fornecedores Nacionais nos meses em aberto (5,6)
    const fornecedorDivergente = mes >= 5

    for (const c of PLANO) {
      const saldo = saldos.get(c.codigo)!
      let saldoRazao = saldo
      let saldoBalancete = saldo
      const saldoRelatorio = saldo

      if (c.codigo === '200003' && fornecedorDivergente) {
        // razão difere do balancete (âncora) → divergência
        saldoRazao = round2(saldo + 12500)
      }

      const tieRB = Math.abs(saldoRazao - saldoBalancete) <= 0.01
      const status = tieRB ? 'CONCILIADA' : 'DIVERGENTE'

      await prisma.fichaConciliacao.upsert({
        where: { bookId_codigoConta: { bookId: book.id, codigoConta: c.codigo } },
        create: {
          bookId: book.id,
          tipoConta: c.tipo as never,
          codigoConta: c.codigo,
          nomeConta: c.nome,
          saldoRazao,
          saldoBalancete,
          saldoRelatorio,
          tieRazaoBalancete: tieRB,
          tieRazaoRelatorio: Math.abs(saldoRazao - saldoRelatorio) <= 0.01,
          statusConciliacao: status as never,
        },
        update: {
          nomeConta: c.nome,
          tipoConta: c.tipo as never,
          saldoRazao,
          saldoBalancete,
          saldoRelatorio,
          tieRazaoBalancete: tieRB,
          tieRazaoRelatorio: Math.abs(saldoRazao - saldoRelatorio) <= 0.01,
          statusConciliacao: status as never,
        },
      })
    }

    // Ocorrência para a divergência (idempotência simples: limpa e recria)
    await prisma.ocorrenciaBook.deleteMany({ where: { bookId: book.id } })
    if (fornecedorDivergente) {
      await prisma.ocorrenciaBook.create({
        data: {
          bookId: book.id,
          descricao:
            'Divergência Razão × Balancete em FORNECEDORES NACIONAIS (200003): R$ 12.500,00 a investigar.',
          status: 'ABERTA',
          responsavel: ELABORADOR,
        },
      })
    }

    console.log(
      `✓ ${String(mes).padStart(2, '0')}/${ANO} [${STATUS_POR_MES[mes]}] — ${PLANO.length} fichas | Ativo R$ ${somaAtivo.toLocaleString('pt-BR')}`,
    )
  }

  console.log('\nConcluído. FIB e Book Digital populados para a apresentação.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
