import { StatusFicha } from '@/lib/types/book'

/**
 * Semáforo acessível (§12.2 U2): SEMPRE ícone + label + cor (contraste AA).
 * Nunca depende só da cor — o texto identifica o status para leitores de tela.
 */

type IconeProps = { className?: string }

function IconeCheck({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function IconeAlerta({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.3 2.9c.8-1.3 2.7-1.3 3.4 0l6.3 11c.8 1.3-.2 3-1.7 3H3.7c-1.5 0-2.5-1.7-1.7-3l6.3-11zM10 7a1 1 0 00-1 1v3a1 1 0 102 0V8a1 1 0 00-1-1zm0 7.5a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function IconeErro({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.7 7.3a1 1 0 00-1.4 1.4L8.6 10l-1.3 1.3a1 1 0 101.4 1.4l1.3-1.3 1.3 1.3a1 1 0 001.4-1.4L11.4 10l1.3-1.3a1 1 0 00-1.4-1.4L10 8.6 8.7 7.3z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function IconeRelogio({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.3.7l2.5 2.5a1 1 0 001.4-1.4L11 9.6V6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const META: Record<
  StatusFicha,
  { label: string; cls: string; iconCls: string; Icone: (p: IconeProps) => JSX.Element }
> = {
  CONCILIADA: {
    label: 'Conciliada',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconCls: 'text-emerald-600',
    Icone: IconeCheck,
  },
  TOLERANCIA: {
    label: 'Tolerância',
    cls: 'border-amber-200 bg-amber-50 text-amber-800',
    iconCls: 'text-amber-600',
    Icone: IconeAlerta,
  },
  DIVERGENTE: {
    label: 'Divergente',
    cls: 'border-red-200 bg-red-50 text-red-800',
    iconCls: 'text-red-600',
    Icone: IconeErro,
  },
  PENDENTE: {
    label: 'Pendente',
    cls: 'border-slate-200 bg-slate-100 text-slate-700',
    iconCls: 'text-slate-500',
    Icone: IconeRelogio,
  },
}

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: StatusFicha
  size?: 'sm' | 'md'
}) {
  const meta = META[status] ?? META.PENDENTE
  const { Icone } = meta
  const dims = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
  const icon = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${meta.cls} ${dims}`}
    >
      <Icone className={`${icon} ${meta.iconCls}`} />
      {meta.label}
    </span>
  )
}
