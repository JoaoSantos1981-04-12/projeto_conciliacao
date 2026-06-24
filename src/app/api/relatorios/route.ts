import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { carregarDadosRelatorio } from '@/lib/relatorios/consulta'
import { classificarFaixa, montarRelatorio } from '@/lib/relatorios/relatorio'

export const runtime = 'nodejs'

const MS_POR_DIA = 86_400_000

function campoCsv(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

function moeda(v: number): string {
  return v.toFixed(2).replace('.', ',')
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url)
  const importacaoId = url.searchParams.get('importacaoId') ?? undefined
  const formato = url.searchParams.get('formato') ?? 'json'

  let dados
  try {
    dados = await carregarDadosRelatorio(prisma, importacaoId)
  } catch (e) {
    console.error('[relatorios] falha ao carregar dados:', e)
    return NextResponse.json({ erro: 'Falha ao gerar o relatório.' }, { status: 500 })
  }

  if (formato === 'csv') {
    const ref = dados.referencia.getTime()
    const abertos = dados.lancamentos
      .filter((l) => l.statusConciliacao === 'PENDENTE' && l.debito > 0)
      .sort((a, b) => a.dataLancamento.getTime() - b.dataLancamento.getTime())

    const linhas = [
      ['Data', 'Documento', 'Duplicata', 'Parcela', 'Parceiro', 'Valor', 'Faixa'].join(';'),
      ...abertos.map((l) => {
        const dias = Math.floor((ref - l.dataLancamento.getTime()) / MS_POR_DIA)
        return [
          campoCsv(l.dataLancamento.toLocaleDateString('pt-BR')),
          campoCsv(l.documento),
          campoCsv(l.dupCr ?? ''),
          campoCsv(l.parcela ?? ''),
          campoCsv(l.nomeParceiro ?? ''),
          moeda(l.debito),
          campoCsv(classificarFaixa(dias)),
        ].join(';')
      }),
    ]
    const csv = '﻿' + linhas.join('\r\n') // BOM p/ Excel pt-BR

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="titulos-em-aberto.csv"',
      },
    })
  }

  return NextResponse.json(montarRelatorio(dados.lancamentos, dados.meta, dados.referencia))
}
