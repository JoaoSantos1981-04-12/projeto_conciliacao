import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { processarUploadSuporte, ArquivoUpload } from '@/lib/book/book-service'

// §2.4: rota que parseia PDF declara runtime Node e duração máxima.
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB por arquivo

// POST /api/book/[id]/pdf-suporte — upload MULTI-arquivo; auto-roteia por conta.
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const book = await prisma.bookDigital.findUnique({ where: { id: params.id } })
  if (!book) {
    return NextResponse.json({ erro: 'Book não encontrado.' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { erro: 'Envie multipart/form-data com os PDFs no campo "files".' },
      { status: 400 },
    )
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json(
      { erro: 'Nenhum arquivo recebido no campo "files".' },
      { status: 400 },
    )
  }

  for (const f of files) {
    if (f.size > MAX_BYTES) {
      return NextResponse.json(
        { erro: `Arquivo "${f.name}" excede o limite de 25 MB.` },
        { status: 413 },
      )
    }
  }

  const arquivos: ArquivoUpload[] = await Promise.all(
    files.map(async (f) => ({
      nome: f.name || 'arquivo.pdf',
      buffer: Buffer.from(await f.arrayBuffer()),
    })),
  )

  try {
    const resumo = await processarUploadSuporte(prisma, params.id, arquivos)
    return NextResponse.json(resumo, { status: 201 })
  } catch (e) {
    console.error('[pdf-suporte] falha no processamento:', e)
    return NextResponse.json(
      { erro: 'Falha ao processar os PDFs de suporte.' },
      { status: 500 },
    )
  }
}
