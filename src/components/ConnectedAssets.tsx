import React from 'react';
import type { SavedSnapshot } from '../lib/useFinancialHistory';
import { InvestmentsSection } from './InvestmentsSection';
import type { BankAccount } from '../types/finance';

export function ConnectedAssets({ investments, creditCards, isPrivateMode, section = 'investments', accounts = [], snapshots = [] }: { investments: any[]; creditCards: any[]; isPrivateMode: boolean; section?: 'cards' | 'investments'; accounts?: BankAccount[]; snapshots?: SavedSnapshot[] }) {
  if (section === 'investments') return <InvestmentsSection investments={investments} accounts={accounts} privateMode={isPrivateMode} snapshots={snapshots}/>;
  const money = (value: unknown, currency = 'BRL') => isPrivateMode ? '••••••' : value == null ? 'Não informado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
  return <section className="space-y-4">
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      
      <div className="grid gap-3 sm:grid-cols-2">{creditCards.map((card) => {
        const data = card.creditData || {};
        const limit = Number(data.creditLimit);
        const used = data.availableCreditLimit != null && data.creditLimit != null ? limit - Number(data.availableCreditLimit) : null;
        const percent = used != null && limit > 0 ? Math.min(100, Math.max(0, used / limit * 100)) : null;
        return <article key={card.id} className="min-w-0 rounded-xl border border-slate-700 p-4"><p className="truncate font-medium text-white">{accounts.find((account) => account.providerItemId === card.providerItemId)?.bankName || card.name}<span className="mt-1 block text-xs font-normal text-slate-500">{card.name}{!isPrivateMode && card.number ? ` · final ${card.number}` : ''}</span></p><dl className="mt-3 space-y-2 text-xs text-slate-400"><div className="flex justify-between gap-2"><dt>Saldo informado</dt><dd className="text-rose-400">{money(card.balance, card.currencyCode)}</dd></div><div className="flex justify-between gap-2"><dt>Limite disponível</dt><dd>{money(data.availableCreditLimit, card.currencyCode)}</dd></div></dl><details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">Detalhes do limite</summary><p className="mt-3">Total: {money(data.creditLimit, card.currencyCode)}</p><p className="mt-2">Utilizado: {money(used, card.currencyCode)}</p>{percent != null && <div aria-label="Utilização do limite" className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400" style={{ width: isPrivateMode ? '0%' : `${percent}%` }} /></div>}</details></article>;
      })}</div>{!creditCards.length && <p className="mt-2 text-xs text-slate-400">Nenhum cartão retornado pela conexão.</p>}
    </div>
  </section>;
}
