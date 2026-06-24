import type { Prisma, PrismaClient } from '@prisma/client'
import { ImportacaoPersistivel } from './mapper'

export interface ResumoImportacao {
  importacaoId: string
  empresa: string
  cnpjEmpresa: string
  totalLinhas: number
  linhasImportadas: number
  totalErros: number
  contas: Array<{ codigo: string; nome: string; lancamentos: number }>
}

/**
 * Persiste uma importação completa numa transação: cria a ImportacaoRazao,
 * faz upsert das contas contábeis (chave única = código) e insere os
 * lançamentos vinculados. Retorna um resumo para a resposta da API.
 */
export async function persistImportacao(
  prisma: PrismaClient,
  dados: ImportacaoPersistivel,
): Promise<ResumoImportacao> {
  return prisma.$transaction(async (tx) => {
    const importacao = await tx.importacaoRazao.create({
      data: {
        nomeArquivo: dados.nomeArquivo,
        empresa: dados.empresa,
        cnpjEmpresa: dados.cnpjEmpresa,
        periodo: dados.periodo,
        // ERRO apenas se nada foi importado; com lançamentos válidos +
        // erros pontuais a importação é considerada CONCLUIDA.
        status: dados.linhasImportadas === 0 ? 'ERRO' : 'CONCLUIDA',
        totalLinhas: dados.totalLinhas,
        linhasImportadas: dados.linhasImportadas,
        erros:
          dados.erros.length > 0
            ? (dados.erros as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    })

    const contasResumo: ResumoImportacao['contas'] = []

    for (const conta of dados.contas) {
      const contaContabil = await tx.contaContabil.upsert({
        where: { codigo: conta.codigo },
        create: {
          codigo: conta.codigo,
          nome: conta.nome,
          saldoAnterior: conta.saldoAnterior,
        },
        update: {
          nome: conta.nome,
          saldoAnterior: conta.saldoAnterior,
        },
      })

      if (conta.lancamentos.length > 0) {
        await tx.lancamento.createMany({
          data: conta.lancamentos.map((l) => ({
            ...l,
            importacaoId: importacao.id,
            contaContabilId: contaContabil.id,
          })),
        })
      }

      contasResumo.push({
        codigo: conta.codigo,
        nome: conta.nome,
        lancamentos: conta.lancamentos.length,
      })
    }

    return {
      importacaoId: importacao.id,
      empresa: dados.empresa,
      cnpjEmpresa: dados.cnpjEmpresa,
      totalLinhas: dados.totalLinhas,
      linhasImportadas: dados.linhasImportadas,
      totalErros: dados.erros.length,
      contas: contasResumo,
    }
  })
}
