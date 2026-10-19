import React, { useState } from 'react';
import { Building2, ChevronRight, CreditCard, TrendingUp } from 'lucide-react';
import type { BankAccount } from '../types/finance';
import { BankLogo, bankDisplayName } from './BankLogo';

const classNames: Record<string, string> = { FIXED_INCOME: 'Renda fixa', MUTUAL_FUND: 'Fundos', EQUITY: 'Ações', ETF: 'ETFs', SECURITY: 'Previdência', OTHER: 'Outros', COE: 'COE' };
export function FinancialOverview({ accounts, cards, investments, privateMode, onOpenAccounts, onOpenCards = onOpenAccounts, onOpenAssets, onConnect }: {
  accounts: BankAccount[]; cards: any[]; investments: any[]; privateMode: boolean;
  onOpenAccounts: () => void; onOpenCards?: () => void; onOpenAssets: () => void; onConnect: () => void;
}) {
  const [groupBy, setGroupBy] = useState<'class' | 'bank'>('class');
  const money = (amount: number, currency = 'BRL') => privateMode ? '••••••' : amount.toLocaleString('pt-BR', { style: 'currency', currency });
  const balance = accounts.filter((account) => (account.currencyCode || 'BRL') === 'BRL').reduce((sum, account) => sum + account.balance, 0);
  const realCards = cards.filter((card) => (card.currencyCode || 'BRL') === 'BRL');
  const cardBalance = realCards.reduce((sum, card) => sum + (Number(card.balance) || 0), 0);
  const limit = realCards.reduce((sum, card) => sum + (Number(card.creditData?.creditLimit) || 0), 0);
  const used = realCards.reduce((sum, card) => {
    const data = card.creditData;
    return sum + (data?.creditLimit != null && data?.availableCreditLimit != null ? Math.max(0, Number(data.creditLimit) - Number(data.availableCreditLimit)) : 0);
  }, 0);
  const percent = limit > 0 ? Math.min(100, used / limit * 100) : null;
  const visibleCards = cards;
  const activeInvestments = investments.filter((asset) => Math.round((Number(asset.balance) || 0) * 100) !== 0);
  const invested = activeInvestments.filter((asset) => (asset.currencyCode || 'BRL') === 'BRL').reduce((sum, asset) => sum + (Number(asset.balance) || 0), 0);
  const groups = new Map<string, { label: string; value: number; currency: string; count: number }>();
  for (const asset of activeInvestments) {
    const label = groupBy === 'class' ? classNames[asset.type] || 'Outros' : bankDisplayName(asset.institution?.name || asset.institution?.nickname || 'Instituição não informada');
    const currency = asset.currencyCode || 'BRL';
    const key = `${label}:${currency}`;
    const group = groups.get(key) || { label, currency, value: 0, count: 0 };
    group.value += Number(asset.balance) || 0; group.count++; groups.set(key, group);
  }
  return <section aria-label="Resumo financeiro" className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
    <article className="overview-card">
      <div className="overview-card-heading"><h2><Building2/>Contas bancárias</h2><p className="overview-total">{money(balance)}</p><span className="overview-caption">Saldo das contas em reais</span></div>
      <div className="divide-y divide-white/[0.04]">{accounts.map((account) => <button key={account.id} onClick={onOpenAccounts} className="overview-row group"><span className="flex min-w-0 items-center gap-3"><BankLogo name={account.bankName} className="h-8 w-8"/><span className="min-w-0"><span className="block truncate text-[13px] font-medium text-slate-200">{bankDisplayName(account.bankName)}</span><span className="block mt-0.5 text-[11px] text-slate-500">{account.source === 'manual' ? 'Manual · ' : ''}{account.accountType === 'poupanca' ? 'Poupança' : account.accountType === 'investimento' ? 'Investimento' : 'Conta corrente'}</span></span></span><span className="flex shrink-0 items-center gap-2 text-xs font-medium text-emerald-400 tabular-nums">{money(account.balance, account.currencyCode || 'BRL')}<ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-slate-300"/></span></button>)}</div>
      {!accounts.length && <button onClick={onConnect} className="m-5 text-sm text-cyan-300">Conectar meu banco →</button>}
    </article>
    <article className="overview-card">
      <div className="overview-card-heading"><h2><CreditCard/>Cartões de crédito</h2><p className="overview-total text-rose-400">{money(cardBalance)}</p><span className="overview-caption">Saldo informado nos cartões em reais</span></div>
      {limit > 0 && <details className="text-xs text-slate-500"><summary className="cursor-pointer px-5 py-3">Limite e utilização</summary><div className="border-b border-white/[0.04] px-5 py-4"><div className="flex justify-between gap-2 text-[11px] text-slate-500"><span>{privateMode ? '••' : `${Math.round(percent || 0)}%`} do limite utilizado</span><span>Limite: {money(limit)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-rose-500" style={{ width: privateMode ? '0%' : `${percent || 0}%` }}/></div></div></details>}
      {visibleCards.map((card) => <button key={card.id} onClick={onOpenCards} className="overview-row"><span className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-slate-400"><CreditCard className="h-4 w-4"/></span><span className="min-w-0 text-left"><span className="block truncate text-[13px] text-slate-200">{accounts.find((account) => account.providerItemId === card.providerItemId)?.bankName || card.name || 'Cartão de crédito'}</span><span className="mt-0.5 block text-[11px] text-slate-500">{card.name || 'Cartão'}{!privateMode && card.number ? ` · final ${String(card.number).slice(-4)}` : ''}</span></span></span><span className="shrink-0 text-xs font-medium text-rose-400 tabular-nums">{money(Number(card.balance) || 0, card.currencyCode || 'BRL')}</span></button>)}
      {!visibleCards.length && <p className="px-5 py-6 text-xs text-slate-500">{cards.length ? 'Nenhum cartão com saldo em aberto.' : 'Nenhum cartão informado pelos bancos.'}</p>}
      <button onClick={onOpenCards} className="overview-card-link">Ver cartões e limites <ChevronRight className="h-3 w-3"/></button>
    </article>
    <article className="overview-card md:col-span-2 lg:col-span-1">
      <div className="overview-card-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2><TrendingUp/>Investimentos</h2><div className="segmented-control" role="group" aria-label="Agrupar investimentos do resumo">{(['class','bank'] as const).map((value) => <button key={value} aria-pressed={groupBy === value} onClick={() => setGroupBy(value)}>{value === 'class' ? 'Classes' : 'Bancos'}</button>)}</div></div><p className="overview-total text-emerald-400">{money(invested)}</p><span className="overview-caption">{activeInvestments.length} ativos com saldo · total em reais</span></div>
      <div className="space-y-5 px-5 py-5">{[...groups].map(([key, group]) => {
        const total = activeInvestments.filter((asset) => (asset.currencyCode || 'BRL') === group.currency).reduce((sum, asset) => sum + Math.max(0, Number(asset.balance) || 0), 0);
        const share = total > 0 ? Math.max(0, Math.min(100, group.value / total * 100)) : 0;
        return <button key={key} onClick={onOpenAssets} className="block w-full text-left"><span className="flex items-start justify-between gap-3 text-xs"><span className="text-slate-300">{group.label}<span className="ml-1 text-slate-500">({group.count})</span></span><span className="text-right text-slate-300 tabular-nums">{money(group.value, group.currency)}</span></span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-800"><span className="block h-full rounded-full bg-rose-500" style={{ width: privateMode ? '0%' : `${share}%` }}/></span></button>;
      })}{!activeInvestments.length && <p className="text-xs text-slate-500">Nenhum investimento com saldo.</p>}</div>
      <button onClick={onOpenAssets} className="overview-card-link">Ver meus investimentos <ChevronRight className="h-3 w-3"/></button>
    </article>
  </section>;
}
