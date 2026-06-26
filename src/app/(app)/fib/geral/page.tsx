'use client'

import React, { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react'
import { useFibContext } from '@/lib/fib/context'
import { DrillDownModal } from '@/components/fib/DrillDownModal'
import { ContaClassificacao, FibContaAgregada } from '@/lib/types/fib'

const CORES = {
  [ContaClassificacao.RECEITA]: '#10b981',
  [ContaClassificacao.DESPESA]: '#ef4444',
  [ContaClassificacao.ATIVO]: '#3b82f6',
  [ContaClassificacao.PASSIVO]: '#f97316',
  [ContaClassificacao.PATRIMONIO]: '#8b5cf6',
}

export default function FibGeralPage() {
  const { dados, carregando, erro } = useFibContext()
  const [drillDownAberto, setDrillDownAberto] = useState(false)
  const [drillDownTitulo, setDrillDownTitulo] = useState('')
  const [drillDownContas, setDrillDownContas] = useState<FibContaAgregada[]>([])

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

  const { kpis, contasPorClassificacao, alertas } = dados

  // Preparar dados para gráficos
  const dadosReceitaDespesa = [
    {
      nome: 'Receitas',
      valor: kpis.totalReceitas,
      fill: CORES[ContaClassificacao.RECEITA],
    },
    {
      nome: 'Despesas',
      valor: Math.abs(kpis.totalDespesas),
      fill: CORES[ContaClassificacao.DESPESA],
    },
    {
      nome: 'EBITDA',
      valor: kpis.ebitda,
      fill: '#3b82f6',
    },
  ]

  const dadosBalanco = [
    { nome: 'Ativo', valor: kpis.ativoTotal },
    { nome: 'Passivo', valor: kpis.passivoTotal },
    { nome: 'PL', valor: kpis.patrimonioLiquido },
  ]

  const abrirDrillDown = (classificacao: ContaClassificacao, titulo: string) => {
    setDrillDownTitulo(titulo)
    setDrillDownContas(contasPorClassificacao[classificacao] || [])
    setDrillDownAberto(true)
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50 hover:border-emerald-500/30 transition-all cursor-pointer"
          onClick={() => abrirDrillDown(ContaClassificacao.RECEITA, 'Receitas')}>
          <p className="text-slate-400 text-sm">Receitas</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            R$ {kpis.totalReceitas.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
            <TrendingUp className="w-3 h-3" />
            Clique para detalhar
          </div>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50 hover:border-red-500/30 transition-all cursor-pointer"
          onClick={() => abrirDrillDown(ContaClassificacao.DESPESA, 'Despesas')}>
          <p className="text-slate-400 text-sm">Despesas</p>
          <p className="text-2xl font-bold text-red-400 mt-2">
            R$ {Math.abs(kpis.totalDespesas).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
            <Zap className="w-3 h-3" />
            % das Receitas: {((Math.abs(kpis.totalDespesas) / kpis.totalReceitas) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50 hover:border-blue-500/30 transition-all cursor-pointer"
          onClick={() => abrirDrillDown(ContaClassificacao.ATIVO, 'Ativos')}>
          <p className="text-slate-400 text-sm">Ativos</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">
            R$ {kpis.ativoTotal.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="text-xs text-slate-500 mt-2">
            Liquidez: {kpis.liquidezCorrente.toFixed(2)}x
          </div>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50 hover:border-orange-500/30 transition-all cursor-pointer"
          onClick={() => abrirDrillDown(ContaClassificacao.PASSIVO, 'Passivos')}>
          <p className="text-slate-400 text-sm">Passivos</p>
          <p className="text-2xl font-bold text-orange-400 mt-2">
            R$ {kpis.passivoTotal.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="text-xs text-slate-500 mt-2">
            Endividamento: {(kpis.endividamento * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Alertas Identificados
          </h3>
          {alertas.map((alerta, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                alerta.severidade === 'ALTA'
                  ? 'bg-red-500/10 border-red-500/30'
                  : alerta.severidade === 'MEDIA'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <p className="font-medium text-white">{alerta.titulo}</p>
              <p className="text-sm text-slate-300 mt-1">{alerta.descricao}</p>
              {alerta.recomendacao && (
                <p className="text-xs text-slate-400 mt-2 italic">
                  💡 {alerta.recomendacao}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Receita vs Despesa */}
        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <h3 className="font-semibold text-white mb-4">
            Receita vs Despesa vs EBITDA
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosReceitaDespesa}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="nome" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                formatter={(value) =>
                  `R$ ${Number(value).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}`
                }
              />
              <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                {dadosReceitaDespesa.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Composição do Balanço */}
        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <h3 className="font-semibold text-white mb-4">
            Composição do Balanço
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dadosBalanco}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: { name?: string; valor?: number }) =>
                  `${entry.name}: R$ ${((entry.valor ?? 0) / 1000).toFixed(0)}k`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="valor"
              >
                <Cell fill="#3b82f6" />
                <Cell fill="#f97316" />
                <Cell fill="#8b5cf6" />
              </Pie>
              <Tooltip
                formatter={(value) =>
                  `R$ ${Number(value).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}`
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal de Drill-Down */}
      <DrillDownModal
        aberto={drillDownAberto}
        onFechar={() => setDrillDownAberto(false)}
        titulo={drillDownTitulo}
        contas={drillDownContas}
      />
    </div>
  )
}
