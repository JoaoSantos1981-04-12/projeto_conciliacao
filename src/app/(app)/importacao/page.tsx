import { UploadRazao } from '@/components/upload/UploadRazao'

export const metadata = { title: 'Importação · Conciliação Contábil' }

export default function ImportacaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Importação do razão</h1>
        <p className="mt-1 text-sm text-slate-600">
          Envie a exportação do razão contábil em Excel (.xlsx). Os lançamentos são lidos,
          os tokens do complemento extraídos e tudo é persistido para conciliação.
        </p>
      </div>
      <UploadRazao />
    </div>
  )
}
