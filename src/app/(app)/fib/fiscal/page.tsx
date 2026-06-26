'use client'

import React from 'react'
import { AlertTriangle, CheckCircle2, Inbox } from 'lucide-react'
import { useFibContext } from '@/lib/fib/context'
import { useFibEstado } from '@/components/fib/FibGate'
import { ContaClassificacao } from '@/lib/types/fib'

type NivelRisco = 'ALTO' | 'MEDIO' | 'BAIXO'

/**
 * Classifica o risco de uma conta fiscal pelo peso relativo no total de
 * passivos fiscais. Heurística transparente baseada em dados reais — o razão
 * não traz datas de vencimento, então não fabricamos prazos.
 */
function nivelPorPeso(percentual: number): NivelRisco {
  if (percentual >= 40) return 'ALTO'
  if (percentual >= 20) return 'MEDIO'
  return 'BAIXO'
}

function corRisco(risco: NivelRisco): string {
  switch (risco) {
    case 'ALTO':
      return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
    case 'MEDIO':
      return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
    case 'BAIXO':
      return 'bg-green-500/20 border-green-500/30 text-green-400'
  }
}

function iconeRisco(risco: NivelRisco) {
  return risco === 'ALTO' ? (
    <AlertTriangle className="w-5 h-5" />
  ) : (
    <CheckCircle2 className="w-5 h-5" />
  )
}

export default function FibFiscalPage() {
  const { dados } = useFibContext()
  const estado = useFibEstado()
  if (estado) return <>{estado}</>

  const { contasPorClassificacao, kpis } = dados!

  // Contas fiscais reais = passivos cujo código começa em 2.1 ou 2.2.
  const passivos = contasPorClassificacao[ContaClassificacao.PASSIVO] || []
  const contasFiscais = passivos.filter((c) => /^2\.[12]/.test(c.codigo))

  const totalPassivoFiscal = contasFiscais.reduce((s, c) => s + c.saldo, 0)
  const percentualPassivoFiscal =
    kpis.passivoTotal > 0
      ? (totalPassivoFiscal / kpis.passivoTotal) * 100
      : 0

  // Atribui o nível de risco por peso relativo no total fiscal.
  const itensFiscais = contasFiscais.map((c) => {
    const peso =
      totalPassivoFiscal !== 0
        ? (Math.abs(c.saldo) / Math.abs(totalPassivoFiscal)) * 100
        : 0
    return { conta: c, peso, risco: nivelPorPeso(peso) }
  })

  const contar = (r: NivelRisco) =>
    itensFiscais.filter((i) => i.risco === r).length

  return (
    <div className="space-y-6">
      {/* Resumo Fiscal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
          <p className="text-slate-400 text-sm">Total de Passivos Fiscais</p>
          <p className="text-2xl font-bold text-orange-400 mt-2">
            R$ {totalPassivoFiscal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {percentualPassivoFiscal.toFixed(1)}% do passivo total
          </p>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
          <p className="text-slate-400 text-sm">Contas Fiscais Identificadas</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">
            {contasFiscais.length}
          </p>
          <p className="text-xs text-slate-500 mt-2">códigos 2.1.x / 2.2.x</p>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
          <p className="text-slate-400 text-sm">Risco Alto</p>
          <p className="text-2xl font-bold text-orange-400 mt-2">
            {contar('ALTO')}
          </p>
          <p className="text-xs text-slate-500 mt-2">≥ 40% do passivo fiscal</p>
        </div>
      </div>

      {/* Aviso de Conformidade */}
      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-400">Aviso de Conformidade</p>
          <p className="text-sm text-slate-300 mt-1">
            Este dashboard é informativo e não substitui análise fiscal
            profissional. O razão não fornece datas de vencimento — o risco
            abaixo reflete apenas o peso de cada conta. Consulte o contador para
            validar valores e prazos.
          </p>
        </div>
      </div>

      {/* Contas Fiscais */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Passivos Fiscais</h2>
        {itensFiscais.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center
            rounded-lg bg-slate-800/40 border border-slate-700/50">
            <Inbox className="w-8 h-8 text-slate-500" />
            <p className="text-slate-400 max-w-md">
              Nenhuma conta de passivo fiscal (códigos 2.1.x / 2.2.x) foi
              identificada nesta importação.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {itensFiscais
              .sort((a, b) => Math.abs(b.conta.saldo) - Math.abs(a.conta.saldo))
              .map(({ conta, peso, risco }) => (
                <div
                  key={conta.codigo}
                  className={`p-4 rounded-lg border ${corRisco(risco)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {iconeRisco(risco)}
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono opacity-80">
                            {conta.codigo}
                          </code>
                          <p className="font-semibold">{conta.nome}</p>
                        </div>
                        <div className="flex gap-4 text-sm mt-2 opacity-80">
                          <span>Risco: {risco}</span>
                          <span>{peso.toFixed(1)}% do passivo fiscal</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        R$ {conta.saldo.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Recomendações Fiscais */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
        <h3 className="font-semibold text-white mb-4">Recomendações Fiscais</h3>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>📋 Validar provisões fiscais com o contador responsável</li>
          <li>📅 Implementar calendário de obrigações acessório</li>
          <li>💰 Reservar fluxo de caixa para pagamentos fiscais</li>
          <li>📊 Acompanhar alterações na legislação fiscal aplicável</li>
          <li>🔐 Manter documentação de suporte para auditorias</li>
          <li>⚠️ Revisar contingências de multas e juros</li>
        </ul>
      </div>

      {/* Distribuição de Risco */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
        <h3 className="font-semibold text-white mb-4">Distribuição de Risco (por peso)</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded bg-orange-500/10 border border-orange-500/30">
            <p className="text-orange-400 text-2xl font-bold">{contar('ALTO')}</p>
            <p className="text-sm text-slate-400">Alto</p>
          </div>
          <div className="p-4 rounded bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-yellow-400 text-2xl font-bold">{contar('MEDIO')}</p>
            <p className="text-sm text-slate-400">Médio</p>
          </div>
          <div className="p-4 rounded bg-green-500/10 border border-green-500/30">
            <p className="text-green-400 text-2xl font-bold">{contar('BAIXO')}</p>
            <p className="text-sm text-slate-400">Baixo</p>
          </div>
        </div>
      </div>
    </div>
  )
}
