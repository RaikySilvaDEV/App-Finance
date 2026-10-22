import React, { useEffect, useState } from 'react';
import { ChevronRight, CreditCard, RefreshCw, Wallet } from 'lucide-react';
import { BankLogo, bankDisplayName } from './BankLogo';
import type { BankAccount } from '../types/finance';

const BRL = (n: number, currency = 'BRL') => n.toLocaleString('pt-BR', { style: 'currency', currency });
export function PersonalBudgetPanel({ privateMode = false, itemIds = [], cards = [], accounts = [], onOpenCards }: {
  privateMode?: boolean; itemIds?: string[]; cards?: any[]; accounts?: BankAccount[]; onOpenCards?: () => void;
}) {
  const [showPlan, setShowPlan] = useState(false);
  const [showBills, setShowBills] = useState(false);
  const [market, setMarket] = useState(250);
  const [fuel, setFuel] = useState(270);
  const [billsData, setBillsData] = useState<{ bills: any[]; unavailable: number } | null>(null);
  const [billsError, setBillsError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const money = (amount: number, currency = 'BRL') => privateMode ? '••••••' : BRL(amount, currency);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    itemIds.forEach(id => params.append('itemId', id));
    setBillsData(null);
    setBillsError('');
    fetch('/api/open-finance/bills?' + params.toString(), { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível consultar faturas');
        if (!controller.signal.aborted) setBillsData(data);
      })
      .catch(error => { if (!controller.signal.aborted) setBillsError(error.message || 'Erro ao consultar faturas'); });
    return () => controller.abort();
  }, [itemIds.join(','), refresh]);

  // Exactly the same card-balance source and currency rule used in FinancialOverview.
  const realCards = cards.filter(card => (card.currencyCode || 'BRL') === 'BRL');
  const cardBalance = realCards.reduce((sum, card) => sum + (Number(card.balance) || 0), 0);
  const limit = realCards.reduce((sum, card) => sum + (Number(card.creditData?.creditLimit) || 0), 0);
  const used = realCards.reduce((sum, card) => {
    const data = card.creditData;
    return sum + (data?.creditLimit != null && data?.availableCreditLimit != null
      ? Math.max(0, Number(data.creditLimit) - Number(data.availableCreditLimit)) : 0);
  }, 0);
  const percent = limit > 0 ? Math.min(100, used / limit * 100) : 0;
  const pendingBills = (billsData?.bills || []).filter((bill: any) =>
    bill.paymentStatus !== 'paid' && Number.isFinite(Number(bill.totalAmount)) &&
    Number(bill.totalAmount) > 0 && (bill.totalAmountCurrencyCode || 'BRL') === 'BRL');
  const novemberBills = pendingBills.filter((bill: any) => String(bill.dueDate || '').startsWith('2026-11'));
  const estimatedIncome = 827.35 + 691.85;
  const estimatedFixed = 132.47 + 225 + 59.32 + 180;
  const projected = estimatedIncome - estimatedFixed - market - 100 -
    novemberBills.reduce((sum: number, bill: any) => sum + Number(bill.totalAmount), 0);

  return <section className="space-y-5 text-slate-100" aria-label="Meu dinheiro">
    <header className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">FinPulse</p>
      <h2 className="text-2xl font-semibold tracking-tight">Meu dinheiro</h2>
      <p className="text-sm text-slate-400">Seus cartões conectados e seu planejamento, sem misturar saldo com fatura.</p>
    </header>

    <article className="overview-card">
      <div className="overview-card-heading">
        <h2><CreditCard/>Cartões de crédito</h2>
        <p className="overview-total text-rose-400">{money(cardBalance)}</p>
        <span className="overview-caption">Saldo informado nos cartões em reais · igual à Visão geral</span>
      </div>
      {limit > 0 && <details className="text-xs text-slate-500"><summary className="cursor-pointer px-5 py-3">Limite e utilização</summary><div className="border-b border-white/[0.04] px-5 py-4"><div className="flex justify-between gap-2 text-[11px] text-slate-500"><span>{privateMode ? '••' : Math.round(percent) + '%'} do limite utilizado</span><span>Limite: {money(limit)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-rose-500" style={{ width: privateMode ? '0%' : percent + '%' }}/></div></div></details>}
      <div className="divide-y divide-white/[0.04]">
        {cards.map(card => {
          const bank = accounts.find(account => account.providerItemId === card.providerItemId)?.bankName || card.name || 'Cartão de crédito';
          return <button type="button" key={card.id} onClick={onOpenCards} className="overview-row group">
            <span className="flex min-w-0 items-center gap-3">
              <BankLogo name={bank} className="h-8 w-8"/>
              <span className="min-w-0 text-left">
                <span className="block truncate text-[13px] font-medium text-slate-200">{bankDisplayName(bank)}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{card.name || 'Cartão'}{!privateMode && card.number ? ' · final ' + String(card.number).slice(-4) : ''}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-rose-400 tabular-nums">{money(Number(card.balance) || 0, card.currencyCode || 'BRL')}<ChevronRight className="h-3 w-3 text-slate-600"/></span>
          </button>;
        })}
      </div>
      {!cards.length && <p className="px-5 py-5 text-xs text-slate-500">Nenhum cartão informado pelos bancos conectados.</p>}
      {onOpenCards && <button type="button" onClick={onOpenCards} className="overview-card-link">Ver cartões e limites <ChevronRight className="h-3 w-3"/></button>}
    </article>

    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025]">
      <button type="button" onClick={() => setShowBills(v => !v)} aria-expanded={showBills} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
        <span><span className="block text-sm font-semibold text-slate-200">Faturas e vencimentos</span><span className="block pt-1 text-xs text-slate-500">Consulte valores e datas de pagamento separados do saldo do cartão</span></span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${showBills ? 'rotate-90' : ''}`}/>
      </button>
      {showBills && <div className="space-y-3 border-t border-white/[0.06] px-4 py-4">
        {billsError && <p role="alert" className="text-xs text-amber-300">{billsError}</p>}
        {!billsData && !billsError && <p className="text-xs text-slate-400">Consultando Pluggy…</p>}
        {!!billsData?.unavailable && <p className="text-xs text-amber-300">Algumas instituições não forneceram faturas.</p>}
        {pendingBills.map((bill: any) => <div key={bill.providerItemId + ':' + bill.id} className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-3 text-sm">
          <span className="min-w-0"><span className="block truncate text-slate-200">{bill.bank || bill.cardName || 'Cartão conectado'}</span><span className="block text-xs text-slate-500">{bill.dueDate ? 'Vence ' + String(bill.dueDate).slice(0,10).split('-').reverse().join('/') : 'Vencimento indisponível'} · {bill.paymentStatus === 'unpaid' ? 'Não paga' : 'Pagamento não confirmado'}</span></span>
          <span className="shrink-0 font-medium tabular-nums text-slate-200">{money(Number(bill.totalAmount))}</span>
        </div>)}
        {billsData && !pendingBills.length && <p className="text-xs text-slate-500">Nenhuma fatura pendente ou sem confirmação retornada.</p>}
        <p className="text-xs leading-relaxed text-slate-500">O valor da fatura não é o saldo do cartão e pode não representar o restante a pagar.</p>
        <button type="button" onClick={() => setRefresh(v => v + 1)} className="flex items-center gap-2 text-xs text-cyan-300"><RefreshCw className="h-3.5 w-3.5"/>Atualizar faturas</button>
      </div>}
    </div>

    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025]">
      <button type="button" onClick={() => setShowPlan(v => !v)} aria-expanded={showPlan} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
        <span className="flex items-center gap-3"><Wallet className="h-5 w-5 text-slate-400"/><span><span className="block text-sm font-semibold text-slate-200">Meu planejamento</span><span className="block pt-1 text-xs text-slate-500">Estimativas de novembro de 2026 · não são saldo bancário</span></span></span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${showPlan ? 'rotate-90' : ''}`}/>
      </button>
      {showPlan && <div className="space-y-4 border-t border-white/[0.06] px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-slate-500">Salários previstos</p><p className="mt-1 font-semibold">{money(estimatedIncome)}</p></div>
          <div><p className="text-xs text-slate-500">Despesas fixas estimadas</p><p className="mt-1 font-semibold">{money(estimatedFixed)}</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">Mercado e higiene · estimativa (R$)<input type="number" min="0" step="10" value={market} onChange={e => setMarket(Math.max(0, Number(e.target.value) || 0))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-transparent p-2.5 text-sm text-slate-100"/></label>
          <label className="text-xs text-slate-400">Combustível · estimativa (R$)<input type="number" min="0" step="10" value={fuel} onChange={e => setFuel(Math.max(0, Number(e.target.value) || 0))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-transparent p-2.5 text-sm text-slate-100"/></label>
        </div>
        <div className="border-t border-white/[0.06] pt-3"><p className="text-xs text-slate-500">Resultado estimado de novembro</p><p className="mt-1 text-xl font-semibold">{billsData && !billsData.unavailable ? money(projected) : 'Previsão incompleta'}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Inclui salários, despesas fixas, mercado, meta de R$ 100 para a caixinha e faturas com vencimento em novembro. Não inclui ajuda não confirmada nem combustível previsto para dezembro. Verifique possíveis despesas já incluídas na fatura para evitar duplicidade.</p></div>
      </div>}
    </div>
  </section>;
