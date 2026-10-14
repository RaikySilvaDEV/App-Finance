import React from 'react';
import { Coins, Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { DividendEvent } from '../types/finance';

interface DividendsCalendarProps {
  events: DividendEvent[];
  isPrivateMode: boolean;
}

export const DividendsCalendar: React.FC<DividendsCalendarProps> = ({
  events,
  isPrivateMode,
}) => {
  const formatBrl = (val: number) => {
    if (isPrivateMode) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalUpcomingMonth = events.reduce((acc, e) => acc + e.totalPayoutBrl, 0);

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-[#0c121d] rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Calendário de Proventos & Rendimentos
            </h3>
            <p className="text-xs text-slate-400">
              Pagamentos diários e mensais caindo na sua conta
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase font-medium block">Total no Mês</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono">
            {formatBrl(totalUpcomingMonth)}
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-800/80 mt-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="py-3 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-white text-[11px]">
                {event.ticker.slice(0, 4)}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-white">{event.ticker}</span>
                  <span className="text-[10px] text-slate-400">• {event.type}</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    {event.paymentDate}
                  </span>
                  {event.amountPerShare && (
                    <span>(R$ {event.amountPerShare.toFixed(3)}/cota)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-bold text-emerald-400 font-mono block">
                +{formatBrl(event.totalPayoutBrl)}
              </span>
              <span className={`text-[10px] font-semibold ${event.status === 'creditado' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {event.status === 'creditado' ? 'Creditado em conta' : 'Previsto'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
