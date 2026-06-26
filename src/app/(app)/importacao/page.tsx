import { UploadRazao } from '@/components/upload/UploadRazao'

export const metadata = { title: 'Importação · Conciliação Contábil' }

export default function ImportacaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Importação do Razão
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Envie a exportação do razão contábil em Excel (.xlsx). Os lançamentos serão lidos,
          os tokens do complemento extraídos e tudo será armazenado para a conciliação.
        </p>
      </div>
      <UploadRazao />
    </div>
  )
}
