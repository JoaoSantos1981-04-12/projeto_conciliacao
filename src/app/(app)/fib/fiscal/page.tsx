'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useFibContext } from '@/lib/fib/context'
import { ContaClassificacao } from '@/lib/types/fib'

export default function FibFiscalPage() {
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

  const { contasPorClassificacao, kpis } = dados

  // Extrair contas fiscais (Passivos que começam com 2.1 e 2.2)
  const passivos = contasPorClassificacao[ContaClassificacao.PASSIVO] || []
  const contasFiscais = passivos.filter((c) =>
    c.codigo.match(/^2\.1|^2\.2/) // Contas de curto prazo ou fiscal
  )

  const totalPassivoFiscal = contasFiscais.reduce((sum, c) => sum + c.saldo, 0)
  const percentualPassivoFiscal = kpis.passivoTotal > 0
    ? (totalPassivoFiscal / kpis.passivoTotal) * 100
    : 0

  // Simulação de obrigações fiscais comuns
  const obrigacoesFiscais = [
    {
      nome: 'ICMS a Recolher',
      valor: totalPassivoFiscal * 0.3,
      vencimento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      periodicidade: 'Mensal',
      risco: 'MEDIO',
    },
    {
      nome: 'IRPJ/CSLL a Recolher',
      valor: totalPassivoFiscal * 0.25,
      vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      periodicidade: 'Trimestral',
      risco: 'BAIXO',
    },
    {
      nome: 'PIS/COFINS a Recolher',
      valor: totalPassivoFiscal * 0.2,
      vencimento: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      periodicidade: 'Mensal',
      risco: 'ALTO',
    },
    {
      nome: 'ISS a Recolher',
      valor: totalPassivoFiscal * 0.15,
      vencimento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      periodicidade: 'Mensal',
      risco: 'CRITICO',
    },
    {
      nome: 'Contribuições Sociais',
      valor: totalPassivoFiscal * 0.1,
      vencimento: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      periodicidade: 'Mensal',
      risco: 'MEDIO',
    },
  ]

  const getCor = (risco: string) => {
    switch (risco) {
      case 'CRITICO':
        return 'bg-red-500/20 border-red-500/30 text-red-400'
      case 'ALTO':
        return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
      case 'MEDIO':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
      case 'BAIXO':
        return 'bg-green-500/20 border-green-500/30 text-green-400'
      default:
        return 'bg-slate-500/20 border-slate-500/30 text-slate-400'
    }
  }

  const getIcone = (risco: string) => {
    switch (risco) {
      case 'CRITICO':
      case 'ALTO':
        return <AlertTriangle className="w-5 h-5" />
      default:
        return <CheckCircle2 className="w-5 h-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumo Fiscal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <p className="text-slate-400 text-sm">Total de Passivos Fiscais</p>
          <p className="text-2xl font-bold text-orange-400 mt-2">
            R$ {totalPassivoFiscal.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {percentualPassivoFiscal.toFixed(1)}% do passivo total
          </p>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <p className="text-slate-400 text-sm">Obrigações Vencendo</p>
          <p className="text-2xl font-bold text-red-400 mt-2">
            {obrigacoesFiscais.filter(
              (o) => o.vencimento < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            ).length}
          </p>
          <p className="text-xs text-slate-500 mt-2">próximos 30 dias</p>
        </div>

        <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
          border border-slate-700/50">
          <p className="text-slate-400 text-sm">Conformidade Fiscal</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            {kpis.ativoTotal > 0 ? '✓' : '✗'}
          </p>
          <p className="text-xs text-slate-500 mt-2">Status: Sob Monitoramento</p>
        </div>
      </div>

      {/* Aviso de Conformidade */}
      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-400">Aviso de Conformidade</p>
          <p className="text-sm text-slate-300 mt-1">
            Este dashboard é informativo e não substitui análise fiscal profissional. Consulte o contador ou assessor fiscal para validação de valores e cumprimento de obrigações.
          </p>
        </div>
      </div>

      {/* Obrigações Fiscais */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Obrigações Fiscais Projetadas</h2>
        <div className="space-y-3">
          {obrigacoesFiscais
            .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
            .map((obrigacao, idx) => {
              const diasParaVencimento = Math.ceil(
                (obrigacao.vencimento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
              const vencida = diasParaVencimento < 0
              const proximoVencimento = diasParaVencimento >= 0 && diasParaVencimento <= 7

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getCor(
                    vencida ? 'CRITICO' : proximoVencimento ? 'ALTO' : obrigacao.risco
                  )}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getIcone(
                        vencida ? 'CRITICO' : proximoVencimento ? 'ALTO' : obrigacao.risco
                      )}
                      <div>
                        <p className="font-semibold">{obrigacao.nome}</p>
                        <div className="flex gap-4 text-sm mt-2 text-slate-400">
                          <span>Periodicidade: {obrigacao.periodicidade}</span>
                          <span>Vencimento: {obrigacao.vencimento.toLocaleDateString('pt-BR')}</span>
                          <span className={vencida ? 'text-red-400' : ''}>
                            {vencida
                              ? `✗ Vencida há ${Math.abs(diasParaVencimento)} dias`
                              : `${diasParaVencimento} dias`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        R$ {obrigacao.valor.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Recomendações Fiscais */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
        border border-slate-700/50">
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

      {/* Matriz de Risco Fiscal */}
      <div className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900
        border border-slate-700/50">
        <h3 className="font-semibold text-white mb-4">Análise de Risco Fiscal</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 rounded bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-2xl font-bold">
              {obrigacoesFiscais.filter((o) => o.risco === 'CRITICO').length}
            </p>
            <p className="text-sm text-slate-400">Críticas</p>
          </div>
          <div className="p-4 rounded bg-orange-500/10 border border-orange-500/30">
            <p className="text-orange-400 text-2xl font-bold">
              {obrigacoesFiscais.filter((o) => o.risco === 'ALTO').length}
            </p>
            <p className="text-sm text-slate-400">Altas</p>
          </div>
          <div className="p-4 rounded bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-yellow-400 text-2xl font-bold">
              {obrigacoesFiscais.filter((o) => o.risco === 'MEDIO').length}
            </p>
            <p className="text-sm text-slate-400">Médias</p>
          </div>
          <div className="p-4 rounded bg-green-500/10 border border-green-500/30">
            <p className="text-green-400 text-2xl font-bold">
              {obrigacoesFiscais.filter((o) => o.risco === 'BAIXO').length}
            </p>
            <p className="text-sm text-slate-400">Baixas</p>
          </div>
        </div>
      </div>
    </div>
  )
}
