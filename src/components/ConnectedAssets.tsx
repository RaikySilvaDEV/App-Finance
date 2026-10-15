import React from 'react';
import { InvestmentsSection } from './InvestmentsSection';
import type { BankAccount } from '../types/finance';

export function ConnectedAssets({ investments, creditCards, isPrivateMode, section = 'investments', accounts = [] }: { investments: any[]; creditCards: any[]; isPrivateMode: boolean; section?: 'cards' | 'investments'; accounts?: BankAccount[] }) {
  if (section === 'investments') return <InvestmentsSection investments={investments} accounts={accounts} privateMode={isPrivateMode}/>;
  const money = (value: unknown, currency = 'BRL') => isPrivateMode ? '••••••' : value == null ? 'Não informado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
  return <section className="space-y-4">
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <h3 className="font-semibold text-white">Cartões de crédito</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{creditCards.map((card) => {
        const data = card.creditData || {};
        const limit = Number(data.creditLimit);
        const used = data.availableCreditLimit != null && data.creditLimit != null ? limit - Number(data.availableCreditLimit) : null;
        const percent = used != null && limit > 0 ? Math.min(100, Math.max(0, used / limit * 100)) : null;
        return <article key={card.id} className="min-w-0 rounded-xl border border-slate-700 p-4"><p className="truncate font-medium text-white">{card.name} {card.number && `· final ${card.number}`}</p><dl className="mt-3 space-y-2 text-xs text-slate-400"><div className="flex justify-between gap-2"><dt>Saldo informado</dt><dd className="text-rose-400">{money(card.balance, card.currencyCode)}</dd></div><div className="flex justify-between gap-2"><dt>Limite total</dt><dd>{money(data.creditLimit, card.currencyCode)}</dd></div><div className="flex justify-between gap-2"><dt>Limite disponível</dt><dd>{money(data.availableCreditLimit, card.currencyCode)}</dd></div><div className="flex justify-between gap-2"><dt>Limite utilizado</dt><dd>{money(used, card.currencyCode)}</dd></div></dl>{percent != null && <div aria-label="Utilização do limite" className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400" style={{ width: isPrivateMode ? '0%' : `${percent}%` }} /></div>}</article>;
      })}</div>{!creditCards.length && <p className="mt-2 text-xs text-slate-400">Nenhum cartão retornado pela conexão.</p>}
    </div>
  </section>;
}
