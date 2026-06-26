'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Percent } from 'lucide-react'
import { useFibContext } from '@/lib/fib/context'

export default function FibCeoPage() {
  const { dados, carregando, erro } = useFibContext()

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

  // Dados simulados de crescimento (em produção, virão do banco)
  const dadosCrescimento = [
    { mes: 'Jan', receita: 100000, lucro: 15000 },
    { mes: 'Fev', receita: 105000, lucro: 16000 },
    { mes: 'Mar', receita: 112000, lucro: 18000 },
    { mes: 'Abr', receita: 118000, lucro: 19500 },
    { mes: 'Mai', receita: kpis.totalReceitas, lucro: kpis.lucroLiquido },
  ]

  return (
    <div className="space-y-6">
      {/* Resumo Executivo */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Sumário Executivo</h2>
        <div className="p-6 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20
          border border-emerald-500/30 backdrop-blur-sm">
          <p className="text-slate-200 leading-relaxed">
            {kpis.margemLiquida > 0 ? (
              <>
                Empresa em posição <span className="font-semibold text-emerald-400">positiva</span> com
                receitas de R$ {kpis.totalReceitas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                e <span className="font-semibold text-emerald-400">
                  margem de {(kpis.margemLiquida * 100).toFixed(1)}%
                </span>.
                Foco recomendado: expansão de receitas e otimização de custos operacionais.
              </>
            ) : (
              <>
                Empresa em <span className="font-semibold text-red-400">posição desafiadora</span> com
                prejuízo de R$ {Math.abs(kpis.lucroLiquido).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}.
                Ação imediata recomendada para restruturação operacional.
              </>
            )}
          </p>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Margem Líquida</p>
              <p className="text-3xl font-bold mt-2">
                <span className={kpis.margemLiquida >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {(kpis.margemLiquida * 100).toFixed(1)}%
                </span>
              </p>
            </div>
            <div className={`p-3 rounded-lg ${
              kpis.margemLiquida >= 0
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {kpis.margemLiquida >= 0 ? (
                <TrendingUp className="w-6 h-6" />
              ) : (
                <TrendingDown className="w-6 h-6" />
              )}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">ROI (Patrimônio)</p>
              <p className="text-3xl font-bold mt-2">
                <span className={kpis.roi >= 0 ? 'text-blue-400' : 'text-red-400'}>
                  {(kpis.roi * 100).toFixed(1)}%
                </span>
              </p>
            </div>
            <Percent className={`w-6 h-6 ${
              kpis.roi >= 0 ? 'text-blue-400' : 'text-red-400'
            }`} />
          </div>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Liquidez Geral</p>
              <p className="text-3xl font-bold text-amber-400 mt-2">
                {kpis.liquidezGeral.toFixed(2)}x
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Crescimento */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
        border border-slate-700/50">
        <h3 className="font-semibold text-white mb-4">Evolução de Receita e Lucro</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dadosCrescimento}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="mes" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
              }}
              formatter={(value) =>
                `R$ ${Number(value).toLocaleString('pt-BR', {
                  minimumFractionDigits: 0,
                })}`
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="receita"
              stroke="#10b981"
              strokeWidth={2}
              name="Receita"
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="lucro"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Lucro"
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recomendações Estratégicas */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20
        border border-violet-500/30">
        <h3 className="font-semibold text-white mb-4">Recomendações Estratégicas</h3>
        <ul className="space-y-2 text-slate-200 text-sm">
          {kpis.margemLiquida < 0 && (
            <li>✓ Realizar análise de custos e identificar oportunidades de redução</li>
          )}
          {kpis.liquidezGeral < 1.5 && (
            <li>✓ Fortalecer fluxo de caixa e planejamento financeiro</li>
          )}
          {kpis.endividamento > 0.6 && (
            <li>✓ Considerar estratégias de redução de dívidas</li>
          )}
          <li>✓ Acompanhar KPIs operacionais mensalmente</li>
          <li>✓ Manter comunicação contínua com área financeira</li>
        </ul>
      </div>
    </div>
  )
}
