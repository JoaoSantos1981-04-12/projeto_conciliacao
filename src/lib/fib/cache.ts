import { FibDashboardData } from '@/lib/types/fib'

/**
 * Cache em memória (process-level) para os dados do dashboard FIB.
 *
 * Decisão de MVP: evitar uma tabela `FibKpiSnapshot` no banco (que exigiria
 * migração no DB já baselined) e resolver a preocupação de performance
 * recalcular-a-cada-request com um cache simples por chave (importação+período)
 * e TTL. Para múltiplas instâncias/serverless, trocar por Redis no futuro.
 */

const TTL_MS = 5 * 60 * 1000 // 5 minutos

interface Entrada {
  dados: FibDashboardData
  expiraEm: number
}

const store = new Map<string, Entrada>()

export function chaveCache(
  importacaoId: string,
  periodoInicio: string | null,
  periodoFim: string | null
): string {
  return `${importacaoId}|${periodoInicio ?? ''}|${periodoFim ?? ''}`
}

export function lerCache(chave: string): FibDashboardData | null {
  const entrada = store.get(chave)
  if (!entrada) return null
  if (Date.now() > entrada.expiraEm) {
    store.delete(chave)
    return null
  }
  return entrada.dados
}

export function gravarCache(chave: string, dados: FibDashboardData): void {
  store.set(chave, { dados, expiraEm: Date.now() + TTL_MS })
}

/** Invalida o cache de uma importação (ex.: após reimportação). */
export function invalidarCache(importacaoId: string): void {
  for (const chave of store.keys()) {
    if (chave.startsWith(`${importacaoId}|`)) store.delete(chave)
  }
}
