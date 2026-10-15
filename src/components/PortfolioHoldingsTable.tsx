import React, { useState } from 'react';
import { 
  Briefcase, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  Building2, 
  Plus,
  Trash2,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { PortfolioHolding } from '../types/finance';

interface PortfolioHoldingsTableProps {
  holdings: PortfolioHolding[];
  isPrivateMode: boolean;
  onSelectHoldingForRisk: (holding: PortfolioHolding) => void;
  onOpenAddModal: () => void;
  onRemoveHolding: (holdingId: string) => void;
}

export const PortfolioHoldingsTable: React.FC<PortfolioHoldingsTableProps> = ({
  holdings,
  isPrivateMode,
  onSelectHoldingForRisk,
  onOpenAddModal,
  onRemoveHolding,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredHoldings = holdings.filter(
    (h) => filterCategory === 'all' || h.category === filterCategory
  );

  const formatBrl = (val: number) => {
    if (isPrivateMode) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'renda_fixa':
        return { label: 'Renda Fixa', color: 'text-emerald-400 bg-emerald-500/10' };
      case 'fiis':
        return { label: 'FIIs', color: 'text-cyan-400 bg-cyan-500/10' };
      case 'acoes':
        return { label: 'Ações B3', color: 'text-amber-400 bg-amber-500/10' };
      case 'global':
        return { label: 'Global ETF', color: 'text-violet-400 bg-violet-500/10' };
      case 'cripto':
        return { label: 'Cripto', color: 'text-orange-400 bg-orange-500/10' };
      default:
        return { label: cat, color: 'text-slate-400 bg-slate-800' };
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-[#101012] rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-extrabold text-white">
                Posições cadastradas manualmente
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse" />
                Preços podem estar desatualizados
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {holdings.length} posições informadas por você; não são importadas da Pluggy
            </p>
          </div>
        </div>

        {/* Action button to add real holding */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenAddModal}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/15 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar posição</span>
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center space-x-1 overflow-x-auto text-xs py-3 border-b border-slate-800/60">
        {[
          { id: 'all', label: 'Todos os Ativos' },
          { id: 'renda_fixa', label: 'Renda Fixa' },
          { id: 'fiis', label: 'FIIs' },
          { id: 'acoes', label: 'Ações B3' },
          { id: 'global', label: 'Global' },
          { id: 'cripto', label: 'Cripto' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterCategory === cat.id
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white bg-slate-950/60'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-2">Ativo & Banco</th>
              <th className="py-3 px-2">Posição & Preço Real</th>
              <th className="py-3 px-2 text-right">Valor em Custódia</th>
              <th className="py-3 px-2 text-right">Ganho Hoje (Diário)</th>
              <th className="py-3 px-2 text-right">Ganho no Mês</th>
              <th className="py-3 px-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredHoldings.map((holding) => {
              const catBadge = getCategoryBadge(holding.category);
              const isDailyPositive = holding.dailyReturnBrl >= 0;
              const isMonthlyPositive = holding.monthlyReturnBrl >= 0;

              return (
                <tr
                  key={holding.id}
                  className="hover:bg-slate-800/30 transition-colors group"
                >
                  {/* Ticker & Bank */}
                  <td className="py-3 px-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-white text-xs">
                        {holding.ticker.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-white text-xs">{holding.ticker}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${catBadge.color}`}>
                            {catBadge.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-cyan-400" />
                          {holding.institutionName}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Quantity & Current Live Price */}
                  <td className="py-3 px-2 text-slate-300">
                    <div>
                      <span className="font-mono">{holding.quantity} un.</span>
                      <p className="text-[10px] text-slate-400">
                        Cotação: <strong className="text-white">{formatBrl(holding.currentPrice)}</strong> (PM: {formatBrl(holding.averagePrice)})
                      </p>
                    </div>
                  </td>

                  {/* Total Value */}
                  <td className="py-3 px-2 text-right">
                    <span className="font-extrabold text-white font-mono text-xs block">
                      {formatBrl(holding.currentValue)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Custo: {formatBrl(holding.totalInvested)}
                    </span>
                  </td>

                  {/* Daily Gain */}
                  <td className="py-3 px-2 text-right">
                    <div className={`font-bold font-mono text-xs flex items-center justify-end space-x-0.5 ${isDailyPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isDailyPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{isDailyPositive ? '+' : ''}{formatBrl(holding.dailyReturnBrl)}</span>
                    </div>
                    <span className={`text-[10px] ${isDailyPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      ({isDailyPositive ? '+' : ''}{holding.dailyReturnPct.toFixed(2)}%)
                    </span>
                  </td>

                  {/* Monthly Gain */}
                  <td className="py-3 px-2 text-right">
                    <span className={`font-bold font-mono text-xs block ${isMonthlyPositive ? 'text-cyan-400' : 'text-rose-400'}`}>
                      {isMonthlyPositive ? '+' : ''}{formatBrl(holding.monthlyReturnBrl)}
                    </span>
                    <span className={`text-[10px] ${isMonthlyPositive ? 'text-cyan-500' : 'text-rose-500'}`}>
                      ({isMonthlyPositive ? '+' : ''}{holding.monthlyReturnPct.toFixed(2)}%)
                    </span>
                  </td>

                  {/* Actions: Risk Analysis + Delete */}
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => onSelectHoldingForRisk(holding)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                        title="Ver análise de risco personalizada deste ativo com cotação real"
                      >
                        <ShieldAlert className="w-3 h-3 text-emerald-400" />
                        <span>Risco</span>
                      </button>
                      <button
                        onClick={() => onRemoveHolding(holding.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Excluir ativo da carteira"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredHoldings.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-xs">Nenhum ativo nesta categoria.</p>
            <button
              onClick={onOpenAddModal}
              className="mt-2 text-xs text-emerald-400 hover:underline font-semibold"
            >
              + Cadastre sua primeira posição manualmente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
