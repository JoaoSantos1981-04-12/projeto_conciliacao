import { formatBRL } from '@/lib/format'

/** As 3 pernas da amarração tripla (§8.1): razão ↔ balancete e razão ↔ relatório. */
export interface AmarracaoView {
  saldoRazao: number
  saldoBalancete: number
  saldoRelatorio: number
  tieRazaoBalancete: boolean
  tieRazaoRelatorio: boolean
}

function Perna({
  titulo,
  esquerda,
  direita,
  fecha,
}: {
  titulo: string
  esquerda: number
  direita: number
  fecha: boolean
}) {
  const dif = esquerda - direita
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-700">{titulo}</p>
        <p className="text-xs text-slate-500">
          {formatBRL(esquerda)} ↔ {formatBRL(direita)}
        </p>
      </div>
      <div className="text-right">
        {fecha ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
            <span aria-hidden="true">✓</span> Fecha
          </span>
        ) : (
          <span className="inline-flex flex-col items-end text-sm font-medium text-amber-700">
            <span>
              <span aria-hidden="true">≠</span> Difere
            </span>
            <span className="text-xs tabular-nums">{formatBRL(dif)}</span>
          </span>
        )}
      </div>
    </div>
  )
}

export function PainelAmarracao({ amarracao }: { amarracao: AmarracaoView }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Amarração tripla</h2>
      <Perna
        titulo="Razão ↔ Balancete"
        esquerda={amarracao.saldoRazao}
        direita={amarracao.saldoBalancete}
        fecha={amarracao.tieRazaoBalancete}
      />
      <Perna
        titulo="Razão ↔ Σ relatório em aberto"
        esquerda={amarracao.saldoRazao}
        direita={amarracao.saldoRelatorio}
        fecha={amarracao.tieRazaoRelatorio}
      />
    </section>
  )
}
