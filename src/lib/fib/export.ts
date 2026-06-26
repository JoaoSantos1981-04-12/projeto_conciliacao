'use client'

import type { FibDashboardData } from '@/lib/types/fib'

/**
 * Utilitários de exportação do FIB (client-side).
 * jsPDF, html2canvas e xlsx são importados dinamicamente para não pesarem no
 * bundle inicial e por dependerem de APIs do browser (window/document).
 */

/** Nome de arquivo seguro a partir de empresa + data. */
function nomeBase(prefixo: string, empresa?: string): string {
  const data = new Date().toISOString().slice(0, 10)
  const emp = (empresa ?? 'fib')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (marcas combinantes)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${prefixo}-${emp}-${data}`
}

/**
 * Exporta um elemento do DOM (o dashboard renderizado) para PDF.
 * Usa html2canvas para rasterizar (resolve o problema conhecido de SVG do
 * recharts ao capturar via canvas) e jsPDF para paginar a imagem.
 */
export async function exportarDashboardPdf(
  elemento: HTMLElement,
  empresa?: string
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  // Fundo escuro para casar com o tema; escala 2x para nitidez.
  const canvas = await html2canvas(elemento, {
    scale: 2,
    backgroundColor: '#0f172a', // slate-900
    useCORS: true,
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const larguraPdf = pdf.internal.pageSize.getWidth()
  const alturaPdf = pdf.internal.pageSize.getHeight()
  const larguraImg = larguraPdf
  const alturaImg = (canvas.height * larguraImg) / canvas.width

  // Pagina verticalmente quando o conteúdo excede uma página A4.
  let alturaRestante = alturaImg
  let posicao = 0
  pdf.addImage(imgData, 'PNG', 0, posicao, larguraImg, alturaImg)
  alturaRestante -= alturaPdf

  while (alturaRestante > 0) {
    posicao -= alturaPdf
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, posicao, larguraImg, alturaImg)
    alturaRestante -= alturaPdf
  }

  pdf.save(`${nomeBase('dashboard', empresa)}.pdf`)
}

/**
 * Exporta os KPIs e contas do dashboard para um arquivo Excel (.xlsx),
 * com uma aba de indicadores e uma aba por classificação de conta.
 */
export async function exportarKpisExcel(
  dados: FibDashboardData,
  empresa?: string
): Promise<void> {
  const XLSX = await import('xlsx')
  const { kpis, contasPorClassificacao } = dados

  const wb = XLSX.utils.book_new()

  // Aba 1: Indicadores
  const linhasKpi: Array<[string, number | string]> = [
    ['Indicador', 'Valor'],
    ['Total de Receitas', kpis.totalReceitas],
    ['Total de Despesas', kpis.totalDespesas],
    ['EBITDA', kpis.ebitda],
    ['Lucro Líquido', kpis.lucroLiquido],
    ['Margem Bruta (%)', kpis.margemBruta * 100],
    ['Margem Operacional (%)', kpis.margemOperacional * 100],
    ['Margem Líquida (%)', kpis.margemLiquida * 100],
    ['Ativo Total', kpis.ativoTotal],
    ['Passivo Total', kpis.passivoTotal],
    ['Patrimônio Líquido', kpis.patrimonioLiquido],
    ['Saldo de Caixa', kpis.saldoCaixa],
    ['Liquidez Corrente', kpis.liquidezCorrente],
    ['Liquidez Geral', kpis.liquidezGeral],
    ['Endividamento (%)', kpis.endividamento * 100],
    ['ROI (%)', kpis.roi * 100],
  ]
  const wsKpi = XLSX.utils.aoa_to_sheet(linhasKpi)
  XLSX.utils.book_append_sheet(wb, wsKpi, 'Indicadores')

  // Demais abas: uma por classificação que tenha contas
  for (const [classe, contas] of Object.entries(contasPorClassificacao)) {
    if (contas.length === 0) continue
    const linhas: Array<Array<string | number>> = [
      ['Código', 'Nome', 'Saldo', '% da Classe'],
    ]
    for (const c of contas) {
      linhas.push([c.codigo, c.nome, c.saldo, Number(c.percentualDaClasse.toFixed(2))])
    }
    const ws = XLSX.utils.aoa_to_sheet(linhas)
    // Nome de aba do Excel: máx 31 chars, sem caracteres especiais.
    const nomeAba = classe.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, nomeAba)
  }

  XLSX.writeFile(wb, `${nomeBase('indicadores', empresa)}.xlsx`)
}
