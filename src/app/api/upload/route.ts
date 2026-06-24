import { NextResponse } from 'next/server'
import { parseRazaoExcel } from '@/lib/parser/razao-excel'
import { mapImportacao } from '@/lib/importacao/mapper'
import { persistImportacao } from '@/lib/importacao/persist'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB
const EXTENSOES_ACEITAS = ['.xlsx', '.xls']

export async function POST(req: Request): Promise<NextResponse> {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { erro: 'Requisição inválida: envie multipart/form-data com o campo "file".' },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { erro: 'Arquivo ausente. Envie o razão no campo "file".' },
      { status: 400 },
    )
  }

  const nomeArquivo = file.name || 'razao.xlsx'
  const ext = nomeArquivo.slice(nomeArquivo.lastIndexOf('.')).toLowerCase()
  if (!EXTENSOES_ACEITAS.includes(ext)) {
    return NextResponse.json(
      { erro: `Formato não suportado (${ext}). Envie um arquivo .xlsx.` },
      { status: 415 },
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { erro: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: 25 MB.` },
      { status: 413 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let dados
  try {
    const resultado = parseRazaoExcel(buffer)
    if (resultado.contas.length === 0) {
      return NextResponse.json(
        { erro: 'Nenhuma conta contábil encontrada. Verifique o layout do arquivo.' },
        { status: 422 },
      )
    }
    dados = mapImportacao(resultado, nomeArquivo)
  } catch (e) {
    console.error('[upload] falha ao processar o razão:', e)
    return NextResponse.json(
      { erro: 'Falha ao processar a planilha do razão.' },
      { status: 422 },
    )
  }

  try {
    const resumo = await persistImportacao(prisma, dados)
    return NextResponse.json(resumo, { status: 201 })
  } catch (e) {
    console.error('[upload] falha ao persistir a importação:', e)
    return NextResponse.json(
      { erro: 'Falha ao salvar a importação no banco de dados.' },
      { status: 500 },
    )
  }
}
