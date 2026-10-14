import React, { useState } from 'react';
import { 
  Target, 
  Coins, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Sliders,
  DollarSign
} from 'lucide-react';
import { PortfolioHolding, Asset } from '../types/finance';

interface YieldGoalsCardProps {
  holdings: PortfolioHolding[];
  curatedAssets: Asset[];
  onSelectAssetForRiskAnalysis: (asset: Asset) => void;
  isPrivateMode: boolean;
}

export const YieldGoalsCard: React.FC<YieldGoalsCardProps> = ({
  holdings,
  curatedAssets,
  onSelectAssetForRiskAnalysis,
  isPrivateMode,
}) => {
  // Goal state: daily target in BRL (e.g. R$ 50/day or R$ 100/day)
  const [dailyGoalBrl, setDailyGoalBrl] = useState<number>(50);
  const monthlyGoalBrl = dailyGoalBrl * 30;

  // Current real earnings
  const currentDailyEarnings = holdings.reduce((acc, h) => acc + h.dailyReturnBrl, 0);
  const currentMonthlyEarnings = holdings.reduce((acc, h) => acc + h.monthlyReturnBrl, 0);

  const dailyProgressPct = dailyGoalBrl > 0 ? Math.max(0, Math.min((currentDailyEarnings / dailyGoalBrl) * 100, 100)) : 0;
  const remainingDailyBrl = Math.max(dailyGoalBrl - currentDailyEarnings, 0);

  // Capital needed to bridge the gap (assuming a conservative 1% monthly / 0.033% daily return)
  const requiredAdditionalCapital = remainingDailyBrl > 0 ? remainingDailyBrl / (0.00033) : 0;

  const formatBrl = (val: number) => {
    if (isPrivateMode) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Top assets for passive income
  const passiveIncomeAssets = curatedAssets
    .filter(a => a.category === 'fiis' || a.category === 'renda_fixa')
    .slice(0, 2);

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-[#0e1628] rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Metas de Renda Diária e Mensal
            </h3>
            <p className="text-xs text-slate-400">
              Efeito bola de neve: quanto seus investimentos rendem sem você trabalhar
            </p>
          </div>
        </div>

        {/* Goal Selector Presets */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto">
          {[25, 50, 100, 200].map((goal) => (
            <button
              key={goal}
              onClick={() => setDailyGoalBrl(goal)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                dailyGoalBrl === goal
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              R$ {goal}/dia
            </button>
          ))}
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-2">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Progresso da Meta Diária:</span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                {formatBrl(currentDailyEarnings)}
              </span>
              <span className="text-xs text-slate-400">
                / meta de <strong className="text-white">{formatBrl(dailyGoalBrl)}</strong> por dia
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-300">
              {dailyProgressPct.toFixed(1)}% atingido
            </span>
            <p className="text-[11px] text-slate-500">
              Equivalente a <strong className="text-cyan-400">{formatBrl(monthlyGoalBrl)}</strong>/mês
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-700"
            style={{ width: `${dailyProgressPct}%` }}
          />
        </div>

        {remainingDailyBrl > 0 ? (
          <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Faltam apenas <strong className="text-emerald-400">{formatBrl(remainingDailyBrl)}/dia</strong> para bater sua meta!
              Aporte estimado necessário: <strong className="text-white">{formatBrl(requiredAdditionalCapital)}</strong>.
            </span>
          </p>
        ) : (
          <p className="text-xs text-emerald-400 mt-2.5 flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Parabéns! Sua meta diária de renda passiva foi 100% atingida!
          </p>
        )}
      </div>

      {/* Suggested assets to boost passive daily income */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Ativos Ideais para Acelerar a Renda Diária e Mensal:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {passiveIncomeAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex items-center justify-between hover:border-emerald-500/40 transition-colors"
            >
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-white text-xs">{asset.ticker}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    +{asset.monthlyYieldEstimatedPct}%/mês
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[190px]">
                  {asset.name}
                </p>
              </div>

              <button
                onClick={() => onSelectAssetForRiskAnalysis(asset)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Simular</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
