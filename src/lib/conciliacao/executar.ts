import type { PrismaClient } from '@prisma/client'
import { LancamentoConciliavel } from '@/lib/engine/rules'
import { conciliar } from '@/lib/engine/matcher'

export interface ResumoSessao {
  sessaoId: string
  importacaoId: string
  status: 'CONCLUIDA' | 'PARCIAL'
  totalPares: number
  paresAutomatic: number
  paresManuais: number
  divergencias: number
  pendentes: number
  conciliados: number
}

/**
 * Executa a conciliação de uma importação e persiste o resultado.
 *
 * É **idempotente**: reseta o estado de conciliação anterior daquela importação
 * (status dos lançamentos + sessões/pares antigos) antes de gravar a nova sessão.
 */
export async function executarConciliacao(
  prisma: PrismaClient,
  importacaoId: string,
): Promise<ResumoSessao> {
  const rows = await prisma.lancamento.findMany({
    where: { importacaoId },
    select: {
      id: true,
      dataLancamento: true,
      documento: true,
      debito: true,
      credito: true,
      natureza: true,
      dupCr: true,
      parcela: true,
      idBaixa: true,
      doctoBaixa: true,
      ordemFaturamento: true,
      cnpjParceiro: true,
    },
  })

  if (rows.length === 0) {
    throw new Error(`Importação ${importacaoId} não encontrada ou sem lançamentos.`)
  }

  const lancamentos: LancamentoConciliavel[] = rows.map((r) => ({
    id: r.id,
    dataLancamento: r.dataLancamento,
    documento: r.documento,
    debito: Number(r.debito),
    credito: Number(r.credito),
    natureza: r.natureza,
    dupCr: r.dupCr,
    parcela: r.parcela,
    idBaixa: r.idBaixa,
    doctoBaixa: r.doctoBaixa,
    ordemFaturamento: r.ordemFaturamento,
    cnpjParceiro: r.cnpjParceiro,
  }))

  const resultado = conciliar(lancamentos)
  const idsDivergentes = resultado.divergencias.flatMap((d) => d.ids)
  const paresAutomatic = resultado.grupos.filter((g) => g.tipo !== 'MANUAL').length
  const paresManuais = resultado.grupos.length - paresAutomatic
  const status: ResumoSessao['status'] = resultado.divergencias.length > 0 ? 'PARCIAL' : 'CONCLUIDA'

  const sessaoId = await prisma.$transaction(
    async (tx) => {
      // Reset do estado anterior (nula FKs antes de remover os pares).
      await tx.lancamento.updateMany({
        where: { importacaoId },
        data: { statusConciliacao: 'PENDENTE', parConciliadoId: null },
      })
      const sessoesAntigas = await tx.sessaoConciliacao.findMany({
        where: { importacaoId },
        select: { id: true },
      })
      if (sessoesAntigas.length > 0) {
        const ids = sessoesAntigas.map((s) => s.id)
        await tx.parConciliacao.deleteMany({ where: { sessaoId: { in: ids } } })
        await tx.sessaoConciliacao.deleteMany({ where: { id: { in: ids } } })
      }

      const sessao = await tx.sessaoConciliacao.create({
        data: {
          importacaoId,
          status,
          totalPares: resultado.grupos.length,
          paresAutomatic,
          paresManuais,
          divergencias: resultado.divergencias.length,
        },
      })

      // Um ParConciliacao por grupo; vincula os lançamentos e marca CONCILIADO.
      for (const grupo of resultado.grupos) {
        const par = await tx.parConciliacao.create({
          data: {
            sessaoId: sessao.id,
            tipoMatch: grupo.tipo,
            scoreConfianca: grupo.score,
            diferencaValor: grupo.diferencaValor,
            statusAprovacao: grupo.aprovacao,
            aprovadoEm: grupo.aprovacao === 'APROVADO' ? new Date() : null,
            aprovadoPor: grupo.aprovacao === 'APROVADO' ? 'sistema' : null,
          },
        })
        await tx.lancamento.updateMany({
          where: { id: { in: grupo.ids } },
          data: { parConciliadoId: par.id, statusConciliacao: 'CONCILIADO' },
        })
      }

      if (idsDivergentes.length > 0) {
        await tx.lancamento.updateMany({
          where: { id: { in: idsDivergentes } },
          data: { statusConciliacao: 'DIVERGENCIA' },
        })
      }

      return sessao.id
    },
    { timeout: 30_000 },
  )

  return {
    sessaoId,
    importacaoId,
    status,
    totalPares: resultado.grupos.length,
    paresAutomatic,
    paresManuais,
    divergencias: resultado.divergencias.length,
    pendentes: resultado.pendentes.length,
    conciliados: resultado.resumo.conciliados,
  }
}
