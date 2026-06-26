'use client'

import React, { useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useFibContext } from '@/lib/fib/context'

export default function FibCfoPage() {
  const { dados, carregando, erro, atualizarDados } = useFibContext()

  useEffect(() => {
    atualizarDados()
  }, [atualizarDados])

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Carregando dados...</div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-400">{erro}</div>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Nenhum dado disponível</div>
      </div>
    )
  }

  const { kpis } = dados

  // Estrutura simplificada de DRE (Demonstração de Resultado do Exercício)
  const dadosDRE = [
    {
      nome: 'Receita Bruta',
      valor: kpis.totalReceitas,
      tipo: 'entrada',
    },
    {
      nome: 'Despesas Operacionais',
      valor: Math.abs(kpis.totalDespesas),
      tipo: 'saida',
    },
    {
      nome: 'EBITDA',
      valor: kpis.ebitda,
      tipo: 'resultado',
    },
    {
      nome: 'Lucro Líquido',
      valor: kpis.lucroLiquido,
      tipo: 'resultado',
    },
  ]

  // Dados de liquidez
  const indicadoresLiquidez = [
    {
      nome: 'Liquidez Corrente',
      valor: kpis.liquidezCorrente,
      ideal: 1.5,
      minimo: 1.0,
    },
    {
      nome: 'Liquidez Geral',
      valor: kpis.liquidezGeral,
      ideal: 1.5,
      minimo: 1.0,
    },
    {
      nome: 'Liquidez Seca',
      valor: kpis.liquidezCorrente * 0.8, // Simplificado
      ideal: 1.0,
      minimo: 0.8,
    },
  ]

  const verificarLiquidez = (valor: number, minimo: number) => {
    return valor >= minimo ? 'Saudável' : 'Crítica'
  }

  return (
    <div className="space-y-6">
      {/* Análise de Fluxo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <p className="text-slate-400 text-sm">Entradas de Caixa</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            R$ {kpis.entradaCaixa.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="text-xs text-slate-500 mt-2">
            De contas bancárias
          </div>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <p className="text-slate-400 text-sm">Saídas de Caixa</p>
          <p className="text-2xl font-bold text-red-400 mt-2">
            R$ {kpis.saidaCaixa.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="text-xs text-slate-500 mt-2">
            Desembolsos totais
          </div>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <p className="text-slate-400 text-sm">Saldo de Caixa</p>
          <p className={`text-2xl font-bold mt-2 ${
            kpis.saldoCaixa >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            R$ {kpis.saldoCaixa.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="text-xs text-slate-500 mt-2">
            Posição atual
          </div>
        </div>
      </div>

      {/* Demonstração de Resultado (DRE) */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
        border border-slate-700/50">
        <h3 className="font-semibold text-white mb-4">
          Demonstração de Resultado do Exercício (DRE)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dadosDRE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="nome" stroke="#94a3b8" angle={-15} textAnchor="end" height={80} />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
              }}
              formatter={(value) =>
                `R$ ${Number(value).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}`
              }
            />
            <Bar dataKey="valor" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Indicadores de Liquidez */}
      <div>
        <h3 className="font-semibold text-white mb-4">Indicadores de Liquidez</h3>
        <div className="space-y-3">
          {indicadoresLiquidez.map((ind, idx) => {
            const status = verificarLiquidez(ind.valor, ind.minimo)
            const percentualOtimizacao = Math.round((ind.valor / ind.ideal) * 100)
            return (
              <div
                key={idx}
                className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {status === 'Saudável' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className="font-medium text-white">{ind.nome}</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    status === 'Saudável' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {ind.valor.toFixed(2)}x
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      status === 'Saudável'
                        ? 'bg-emerald-500'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(percentualOtimizacao, 100)}%`,
                    }}
                  />
                </div>

                <div className="text-xs text-slate-400 mt-2">
                  Ideal: {ind.ideal.toFixed(1)}x | Mínimo: {ind.minimo.toFixed(1)}x
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recomendações de Tesouraria */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20
        border border-blue-500/30">
        <h3 className="font-semibold text-white mb-4">Recomendações de Tesouraria</h3>
        <ul className="space-y-2 text-slate-200 text-sm">
          {kpis.liquidezCorrente < 1 && (
            <li>⚠️ Liquidez crítica: planejar reforço de caixa imediatamente</li>
          )}
          {kpis.saldoCaixa > 1000000 && (
            <li>💡 Excesso de caixa: considerar aplicações financeiras ou investimentos</li>
          )}
          {kpis.saldoCaixa < 0 && (
            <li>🚨 Caixa negativo: avaliar necessidade de crédito de curto prazo</li>
          )}
          <li>📊 Acompanhar fluxo de caixa diariamente</li>
          <li>💰 Otimizar ciclo de recebimentos e pagamentos</li>
        </ul>
      </div>

      {/* Matriz de Cenários */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
        border border-slate-700/50">
        <h3 className="font-semibold text-white mb-4">Análise de Cenários</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded bg-slate-900/50">
            <p className="text-slate-400 mb-2">Cenário Base (Atual)</p>
            <p className="text-emerald-400 font-semibold">
              R$ {kpis.saldoCaixa.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-4 rounded bg-slate-900/50">
            <p className="text-slate-400 mb-2">Cenário Otimista (+20% receita)</p>
            <p className="text-blue-400 font-semibold">
              R$ {(kpis.saldoCaixa * 1.2).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-4 rounded bg-slate-900/50">
            <p className="text-slate-400 mb-2">Cenário Pessimista (-20% receita)</p>
            <p className="text-red-400 font-semibold">
              R$ {(kpis.saldoCaixa * 0.8).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-4 rounded bg-slate-900/50">
            <p className="text-slate-400 mb-2">Margem de Segurança</p>
            <p className="text-amber-400 font-semibold">
              {kpis.saldoCaixa > 0 ? '✓ Positiva' : '✗ Crítica'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
