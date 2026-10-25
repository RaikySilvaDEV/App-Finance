import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Building2, CreditCard, Landmark, ReceiptText, Wallet } from 'lucide-react';
import type { ConnectedCardSchedule } from '../lib/planning';
import type { BankAccount } from '../types/finance';
import { BankLogo } from './BankLogo';
import { BankBills } from './BankBills';
import { ConnectedAssets } from './ConnectedAssets';

type Tab = 'accounts' | 'cards' | 'bills';
const tabs: { key: Tab; label: string; Icon: typeof Wallet }[] = [
  { key: 'accounts', label: 'Contas', Icon: Landmark },
  { key: 'cards', label: 'Cartões', Icon: CreditCard },
  { key: 'bills', label: 'Faturas', Icon: ReceiptText },
];

export function AccountsSection({ accounts, cards, itemIds, privateMode, onRemove, manualTools, cardTools, initialTab = 'accounts', cardSchedules, onCardSchedulesChange }: {
  cardSchedules?: ConnectedCardSchedule[];
  onCardSchedulesChange?: (schedules: ConnectedCardSchedule[]) => void;
  manualTools?: React.ReactNode;
  cardTools?: React.ReactNode;
  accounts: BankAccount[];
  cards: any[];
  itemIds: string[];
  privateMode: boolean;
  onRemove: (id: string) => Promise<void>;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  const formatMoney = (value: number, currency = 'BRL') => privateMode ? '••••' : value.toLocaleString('pt-BR', { style: 'currency', currency });
  const totals = useMemo(() => {
    const brlAccounts = accounts.filter((account) => (account.currencyCode || 'BRL') === 'BRL');
    return { amount: brlAccounts.reduce((sum, account) => sum + (Number.isFinite(account.balance) ? account.balance : 0), 0), count: brlAccounts.length };
  }, [accounts]);

  return <section className="space-y-5" aria-label="Contas e cartões">


    <div role="tablist" aria-label="Contas e cartões" className="workspace-tabs">
      {tabs.map(({ key, label, Icon }) => <button key={key} type="button" role="tab" id={`finance-tab-${key}`} aria-controls={`finance-panel-${key}`} aria-selected={tab === key} onClick={() => setTab(key)} className={`flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-colors sm:flex-none ${tab === key ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}><Icon aria-hidden="true" className={`h-4 w-4 ${tab === key ? 'text-rose-400' : ''}`}/>{label}</button>)}
    </div>

    {tab === 'accounts' && <div id="finance-panel-accounts" role="tabpanel" aria-labelledby="finance-tab-accounts" className="space-y-4">
      {!!accounts.length && <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#17171a] to-[#101012] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs text-slate-400"><Wallet aria-hidden="true" className="h-4 w-4 text-rose-400"/> Saldo consolidado em BRL</div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-white tabular-nums sm:text-3xl">{totals.count ? formatMoney(totals.amount) : 'Sem contas em BRL'}</p>
        <p className="mt-2 text-[11px] text-slate-500">{totals.count} {totals.count === 1 ? 'conta em reais' : 'contas em reais'} · Valores informados pelas instituições ou por você</p>
      </div>}
      {manualTools}
      <div className="institution-list">
        {!!accounts.length && <h3 className="px-1 text-xs font-semibold text-slate-300">Suas instituições</h3>}
        {accounts.map((account) => <article key={account.id} className="group rounded-xl border border-slate-800 bg-[#111113] px-4 py-3.5 transition-colors hover:border-slate-700 hover:bg-[#171719]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><BankLogo name={account.bankName}/></div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold text-white">{account.bankName}</h4>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">{account.source === 'manual' ? 'Conta manual' : 'Conta conectada'} · {account.accountType === 'poupanca' ? 'Poupança' : account.accountType === 'investimento' ? 'Investimento' : 'Conta corrente'}</p>
            </div>
            <div className="min-w-0 shrink-0 text-right"><p className="text-sm font-semibold text-white tabular-nums">{formatMoney(account.balance, account.currencyCode || 'BRL')}</p><p className="mt-1 text-[10px] text-slate-500">Saldo informado</p></div>
          </div>
          <details className="mt-3 border-t border-slate-800/70 pt-2.5 text-xs text-slate-400">
            <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-[11px] text-slate-400 hover:text-white [&::-webkit-details-marker]:hidden"><span>Detalhes e gerenciamento</span><ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5"/></summary>
            <div className="space-y-2 pt-2 text-[11px]">
              {!privateMode && account.accountNumber && <p>Número da conta: {account.accountNumber}</p>}
              <p>{account.source === 'manual' ? 'Saldo informado em:' : 'Última atualização informada:'} {new Date(account.lastSync).toLocaleString('pt-BR')}</p>
              {account.lastImportAt && <p>Última importação: {new Date(account.lastImportAt).toLocaleString('pt-BR')}</p>}
              {account.source !== 'manual' && <div className="flex flex-wrap gap-4 pt-1"><a href="https://meu.pluggy.ai/connections" target="_blank" rel="noreferrer" className="text-rose-300 hover:underline">Gerenciar autorização ↗</a><button type="button" onClick={() => void onRemove(account.id)} className="text-slate-400 hover:text-rose-300">Remover do painel</button></div>}
            </div>
          </details>
        </article>)}
        {!accounts.length && <div className="rounded-2xl border border-dashed border-slate-800 px-5 py-10 text-center"><Building2 aria-hidden="true" className="mx-auto h-7 w-7 text-slate-600"/><p className="mt-3 text-sm font-medium text-slate-300">Nenhuma conta cadastrada</p><p className="mt-1 text-xs text-slate-500">Cadastre uma conta manual para começar.</p></div>}
      </div>
    </div>}
    {tab === 'cards' && <div id="finance-panel-cards" role="tabpanel" aria-labelledby="finance-tab-cards" className="space-y-5">
      {(!!cards.length || !!(cardTools)) && cardTools}
      {!!cards.length && <div className="space-y-3"><h3 className="px-1 text-xs font-semibold text-slate-300">Cartões conectados</h3><ConnectedAssets cardSchedules={cardSchedules} onCardSchedulesChange={onCardSchedulesChange} section="cards" accounts={accounts} investments={[]} creditCards={cards} isPrivateMode={privateMode}/></div>}
    </div>}
    {tab === 'bills' && <div id="finance-panel-bills" role="tabpanel" aria-labelledby="finance-tab-bills"><BankBills itemIds={itemIds} privateMode={privateMode}/></div>}
  </section>;
}
