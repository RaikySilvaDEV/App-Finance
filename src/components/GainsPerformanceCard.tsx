import React, { useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Percent, 
  ArrowUpRight, 
  Sparkles, 
  Clock, 
  Coins, 
  Layers, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { PortfolioHolding } from '../types/finance';

export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'ytd';

interface GainsPerformanceCardProps {
  holdings: PortfolioHolding[];
  isPrivateMode: boolean;
  selectedTimeframe: Timeframe;
  setSelectedTimeframe: (tf: Timeframe) => void;
}

export const GainsPerformanceCard: React.FC<GainsPerformanceCardProps> = ({
  holdings,
  isPrivateMode,
  selectedTimeframe,
  setSelectedTimeframe,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; value: number; diff: number } | null>(null);
  const [showBenchmarkComparison, setShowBenchmarkComparison] = useState(true);

  // Computations based on current holdings
  const totalValue = holdings.reduce((acc, h) => acc + h.currentValue, 0);
  const totalInvested = holdings.reduce((acc, h) => acc + h.totalInvested, 0);

  // Aggregate gains for each timeframe with zero-safe math
  const dailyGainBrl = holdings.reduce((acc, h) => acc + h.dailyReturnBrl, 0);
  const dailyBase = totalValue - dailyGainBrl;
  const dailyGainPct = dailyBase > 0 ? (dailyGainBrl / dailyBase) * 100 : 0;

  const weeklyGainBrl = holdings.reduce((acc, h) => acc + h.weeklyReturnBrl, 0);
  const weeklyBase = totalValue - weeklyGainBrl;
  const weeklyGainPct = weeklyBase > 0 ? (weeklyGainBrl / weeklyBase) * 100 : 0;

  const monthlyGainBrl = holdings.reduce((acc, h) => acc + h.monthlyReturnBrl, 0);
  const monthlyBase = totalValue - monthlyGainBrl;
  const monthlyGainPct = monthlyBase > 0 ? (monthlyGainBrl / monthlyBase) * 100 : 0;

  const ytdGainBrl = holdings.reduce((acc, h) => acc + h.totalReturnBrl, 0);
  const ytdGainPct = totalInvested > 0 ? (ytdGainBrl / totalInvested) * 100 : 0;

  // Active metrics based on selected timeframe
  let activeGainBrl = dailyGainBrl;
  let activeGainPct = dailyGainPct;
  let timeframeLabel = 'Hoje';
  let timeframeSub = 'Ganhos diários consolidados (intradiário)';
  let cdiComparison = '134% do CDI diário';

  if (selectedTimeframe === 'weekly') {
    activeGainBrl = weeklyGainBrl;
    activeGainPct = weeklyGainPct;
    timeframeLabel = 'Esta Semana';
    timeframeSub = 'Segunda a Sexta (5 dias úteis)';
    cdiComparison = '126% do CDI semanal';
  } else if (selectedTimeframe === 'monthly') {
    activeGainBrl = monthlyGainBrl;
    activeGainPct = monthlyGainPct;
    timeframeLabel = 'Este Mês';
    timeframeSub = 'Rendimento acumulado no mês corrente';
    cdiComparison = '138% do CDI mensal';
  } else if (selectedTimeframe === 'ytd') {
    activeGainBrl = ytdGainBrl;
    activeGainPct = ytdGainPct;
    timeframeLabel = 'Ano (YTD)';
    timeframeSub = 'Rentabilidade acumulada em 2026';
    cdiComparison = '142% do CDI anual';
  }

  // Format currency helper
  const formatBrl = (val: number) => {
    if (isPrivateMode) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Fixed Income daily yield estimate
  const dailyFixedIncomeYield = holdings
    .filter(h => h.category === 'renda_fixa')
    .reduce((acc, h) => acc + h.dailyReturnBrl, 0);

  // FII monthly dividends estimate
  const monthlyFiiDividends = holdings
    .filter(h => h.category === 'fiis')
    .reduce((acc, h) => acc + (h.nextDividendBrl || 0), 0);

  // Chart data generation based on timeframe
  const getChartData = () => {
    const base = totalValue - activeGainBrl;
    if (selectedTimeframe === 'daily') {
      return [
        { label: '09:00', value: base + activeGainBrl * 0.05, cdi: base + activeGainBrl * 0.04 },
        { label: '10:00', value: base + activeGainBrl * 0.18, cdi: base + activeGainBrl * 0.12 },
        { label: '11:00', value: base + activeGainBrl * 0.28, cdi: base + activeGainBrl * 0.23 },
        { label: '12:00', value: base + activeGainBrl * 0.42, cdi: base + activeGainBrl * 0.35 },
        { label: '13:00', value: base + activeGainBrl * 0.50, cdi: base + activeGainBrl * 0.46 },
        { label: '14:00', value: base + activeGainBrl * 0.65, cdi: base + activeGainBrl * 0.58 },
        { label: '15:00', value: base + activeGainBrl * 0.79, cdi: base + activeGainBrl * 0.70 },
        { label: '16:00', value: base + activeGainBrl * 0.91, cdi: base + activeGainBrl * 0.82 },
        { label: '17:00 (Agora)', value: totalValue, cdi: base + activeGainBrl * 0.75 },
      ];
    } else if (selectedTimeframe === 'weekly') {
      return [
        { label: 'Seg', value: base + activeGainBrl * 0.15, cdi: base + activeGainBrl * 0.18 },
        { label: 'Ter', value: base + activeGainBrl * 0.35, cdi: base + activeGainBrl * 0.38 },
        { label: 'Qua', value: base + activeGainBrl * 0.58, cdi: base + activeGainBrl * 0.58 },
        { label: 'Qui', value: base + activeGainBrl * 0.82, cdi: base + activeGainBrl * 0.78 },
        { label: 'Sex (Hoje)', value: totalValue, cdi: base + activeGainBrl * 0.80 },
      ];
    } else if (selectedTimeframe === 'monthly') {
      return [
        { label: 'Sem 1', value: base + activeGainBrl * 0.22, cdi: base + activeGainBrl * 0.20 },
        { label: 'Sem 2', value: base + activeGainBrl * 0.45, cdi: base + activeGainBrl * 0.43 },
        { label: 'Sem 3', value: base + activeGainBrl * 0.74, cdi: base + activeGainBrl * 0.65 },
        { label: 'Sem 4 (Atual)', value: totalValue, cdi: base + activeGainBrl * 0.76 },
      ];
    } else {
      return [
        { label: 'Jan', value: base + activeGainBrl * 0.08, cdi: base + activeGainBrl * 0.07 },
        { label: 'Fev', value: base + activeGainBrl * 0.19, cdi: base + activeGainBrl * 0.15 },
        { label: 'Mar', value: base + activeGainBrl * 0.31, cdi: base + activeGainBrl * 0.24 },
        { label: 'Abr', value: base + activeGainBrl * 0.44, cdi: base + activeGainBrl * 0.34 },
        { label: 'Mai', value: base + activeGainBrl * 0.56, cdi: base + activeGainBrl * 0.44 },
        { label: 'Jun', value: base + activeGainBrl * 0.69, cdi: base + activeGainBrl * 0.55 },
        { label: 'Jul', value: base + activeGainBrl * 0.78, cdi: base + activeGainBrl * 0.64 },
        { label: 'Ago', value: base + activeGainBrl * 0.89, cdi: base + activeGainBrl * 0.74 },
        { label: 'Set', value: base + activeGainBrl * 0.95, cdi: base + activeGainBrl * 0.83 },
        { label: 'Out (Atual)', value: totalValue, cdi: base + activeGainBrl * 0.85 },
      ];
    }
  };

  const chartData = getChartData();
  const minVal = Math.min(...chartData.map(d => Math.min(d.value, d.cdi))) * 0.998;
  const maxVal = Math.max(...chartData.map(d => Math.max(d.value, d.cdi))) * 1.002;
  const range = maxVal - minVal || 1;

  const chartWidth = 720;
  const chartHeight = 220;
  const paddingX = 30;
  const paddingY = 25;

  const getX = (index: number) => paddingX + (index / (chartData.length - 1)) * (chartWidth - paddingX * 2);
  const getY = (val: number) => chartHeight - paddingY - ((val - minVal) / range) * (chartHeight - paddingY * 2);

  // Generate SVG path for portfolio
  const portfolioPoints = chartData.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const portfolioArea = `M ${getX(0)},${chartHeight - paddingY} ` +
    chartData.map((d, i) => `L ${getX(i)},${getY(d.value)}`).join(' ') +
    ` L ${getX(chartData.length - 1)},${chartHeight - paddingY} Z`;

  // Generate SVG path for CDI benchmark
  const cdiPoints = chartData.map((d, i) => `${getX(i)},${getY(d.cdi)}`).join(' ');

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-[#0e1422] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden p-5 sm:p-7 transition-all">
      {/* Top Header: Total Balance + Timeframe Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            <span>Patrimônio Total Consolidado</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-emerald-400 normal-case font-medium">Open Finance em Tempo Real</span>
          </div>
          <div className="flex items-baseline space-x-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {formatBrl(totalValue)}
            </h1>
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{activeGainPct.toFixed(2)}%</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ganho em {timeframeLabel}: </span>
            <span className="font-bold text-emerald-400">+{formatBrl(activeGainBrl)}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-medium">{cdiComparison}</span>
          </p>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 self-start lg:self-center">
          <button
            onClick={() => setSelectedTimeframe('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTimeframe === 'daily'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            Hoje (Diário)
          </button>
          <button
            onClick={() => setSelectedTimeframe('weekly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTimeframe === 'weekly'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3" />
            Esta Semana
          </button>
          <button
            onClick={() => setSelectedTimeframe('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTimeframe === 'monthly'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Percent className="w-3 h-3" />
            Este Mês
          </button>
          <button
            onClick={() => setSelectedTimeframe('ytd')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTimeframe === 'ytd'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Ano (YTD)
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              Curva de Rentabilidade Contínua
            </span>
            <span className="text-xs text-slate-400">({timeframeSub})</span>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-emerald-400 to-teal-400"></span>
              <span className="text-slate-300 font-medium">Sua Carteira Open Finance</span>
            </div>
            {showBenchmarkComparison && (
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-slate-400 border border-dashed border-slate-400"></span>
                <span className="text-slate-400">Referência CDI (100%)</span>
              </div>
            )}
            <button
              onClick={() => setShowBenchmarkComparison(!showBenchmarkComparison)}
              className="text-cyan-400 hover:underline text-[11px] font-medium cursor-pointer"
            >
              {showBenchmarkComparison ? 'Ocultar CDI' : 'Comparar CDI'}
            </button>
          </div>
        </div>

        {/* SVG Interactive Chart */}
        <div className="relative w-full h-[230px] bg-slate-950/60 rounded-xl p-2 border border-slate-800/70">
          {/* Tooltip on hover */}
          {hoveredPoint && (
            <div className="absolute top-3 left-4 bg-slate-900/95 border border-emerald-500/30 rounded-lg p-2.5 shadow-xl text-xs z-10 pointer-events-none backdrop-blur-md">
              <p className="text-slate-400 text-[11px] font-semibold">{hoveredPoint.label}</p>
              <p className="text-white font-bold text-sm">{formatBrl(hoveredPoint.value)}</p>
              <p className="text-emerald-400 font-medium text-[11px]">
                {hoveredPoint.diff >= 0 ? '+' : ''}{formatBrl(hoveredPoint.diff)} ({((hoveredPoint.diff / totalInvested) * 100).toFixed(2)}%)
              </p>
            </div>
          )}

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="gainsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            {[0.25, 0.5, 0.75].map((pct, i) => (
              <line
                key={i}
                x1={paddingX}
                y1={paddingY + pct * (chartHeight - paddingY * 2)}
                x2={chartWidth - paddingX}
                y2={paddingY + pct * (chartHeight - paddingY * 2)}
                stroke="#1e293b"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            ))}

            {/* CDI Benchmark Line */}
            {showBenchmarkComparison && (
              <polyline
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                points={cdiPoints}
                opacity="0.8"
              />
            )}

            {/* Area Fill */}
            <path d={portfolioArea} fill="url(#gainsGradient)" />

            {/* Portfolio Line */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={portfolioPoints}
            />

            {/* Data points with interactive hover circles */}
            {chartData.map((d, i) => (
              <g key={i}>
                <circle
                  cx={getX(i)}
                  cy={getY(d.value)}
                  r={i === chartData.length - 1 ? 5 : 3.5}
                  className="fill-emerald-400 stroke-slate-950 stroke-2 hover:r-6 cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredPoint({ label: d.label, value: d.value, diff: d.value - (totalValue - activeGainBrl) })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* Labels on x-axis */}
                <text
                  x={getX(i)}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500 font-mono"
                >
                  {d.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* 4 Pillars of Daily/Weekly/Monthly Gains Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-6">
        {/* Card 1: Rendimento Diário de Renda Fixa */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Rendimento Diário Pós-Fixado
            </span>
          </div>
          <p className="text-lg font-bold text-white">
            +{formatBrl(dailyFixedIncomeYield)}
            <span className="text-xs text-emerald-400 font-medium ml-1">/dia útil</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Tesouro Selic e CDBs rendendo juros compostos 24h
          </p>
        </div>

        {/* Card 2: Proventos e Dividendos Mensais */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-cyan-400" />
              Proventos Mensais (FIIs)
            </span>
          </div>
          <p className="text-lg font-bold text-white">
            {formatBrl(monthlyFiiDividends)}
            <span className="text-xs text-cyan-400 font-medium ml-1">isentos de IR</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Pingando todo mês na conta corrente via B3
          </p>
        </div>

        {/* Card 3: Performance Semanal */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 hover:border-violet-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              Ganhos desta Semana
            </span>
          </div>
          <p className="text-lg font-bold text-white">
            +{formatBrl(weeklyGainBrl)}
            <span className="text-xs text-violet-400 font-medium ml-1">(+{weeklyGainPct.toFixed(2)}%)</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Consolidado de todas as instituições conectadas
          </p>
        </div>

        {/* Card 4: Rentabilidade Mensal vs CDI */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              Retorno no Mês Atual
            </span>
          </div>
          <p className="text-lg font-bold text-white">
            +{formatBrl(monthlyGainBrl)}
            <span className="text-xs text-amber-400 font-medium ml-1">({monthlyGainPct.toFixed(2)}%)</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Superando a Poupança e 138% do CDI
          </p>
        </div>
      </div>
    </div>
  );
};
