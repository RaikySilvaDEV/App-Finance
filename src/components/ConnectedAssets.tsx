import React from 'react';
import { BankLogo, bankDisplayName } from './BankLogo';
import type { SavedSnapshot } from '../lib/useFinancialHistory';
import { ConnectedCardDetails } from './ConnectedCardDetails';
import { finiteValue } from '../lib/productMapping';
import { InvestmentsSection } from './InvestmentsSection';
import type { BankAccount } from '../types/finance';

export function ConnectedAssets({ investments, creditCards, isPrivateMode, section = 'investments', accounts = [], snapshots = [] }: { investments: any[]; creditCards: any[]; isPrivateMode: boolean; section?: 'cards' | 'investments'; accounts?: BankAccount[]; snapshots?: SavedSnapshot[] }) {
  if (section === 'investments') return <InvestmentsSection investments={investments} accounts={accounts} privateMode={isPrivateMode} snapshots={snapshots}/>;
  const money = (value: unknown, currency = 'BRL') => finiteValue(value) == null ? 'Não informado' : isPrivateMode ? '••••••' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
  return <section className="space-y-4">
    <div>
      
      <div className="wallet-grid">{creditCards.map((card) => {
        const data = card.creditData || {};
        return <article key={card.id} className="wallet-card connected-wallet"><div className="wallet-card-top"><span className="wallet-brand"><BankLogo name={accounts.find((account) => account.providerItemId === card.providerItemId)?.bankName || card.name || "Cartão"} className="h-8 w-8"/> <span>Cartão conectado</span></span></div><p className="wallet-name">{bankDisplayName(accounts.find((account) => account.providerItemId === card.providerItemId)?.bankName || card.name || 'Cartão')}<span className="mt-1 block text-xs font-normal text-slate-500">{card.name}{!isPrivateMode && card.number ? ` · final ${String(card.number).slice(-4)}` : ''}</span></p><dl className="wallet-limits"><div ><dt>Saldo informado</dt><dd className="text-rose-400">{money(card.balance, card.currencyCode)}</dd></div><div ><dt>Limite disponível</dt><dd>{money(data.availableCreditLimit, card.currencyCode)}</dd></div></dl><ConnectedCardDetails card={card} privateMode={isPrivateMode}/></article>;
      })}</div>{!creditCards.length && <p className="mt-2 text-xs text-slate-400">Nenhum cartão retornado pela conexão.</p>}
    </div>
  </section>;
}
