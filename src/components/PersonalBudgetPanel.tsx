import React, { useEffect, useState } from 'react';
import { ChevronRight, CreditCard, RefreshCw, Wallet } from 'lucide-react';
import { BankLogo, bankDisplayName } from './BankLogo';
import type { BankAccount } from '../types/finance';

const BRL = (n: number, currency = 'BRL') => n.toLocaleString('pt-BR', { style: 'currency', currency });
const PLAN_MONTHS = [{id:'2026-10',name:'Outubro 2026'},{id:'2026-11',name:'Novembro 2026'},{id:'2026-12',name:'Dezembro 2026'},{id:'2027-01',name:'Janeiro 2027'},{id:'2027-02',name:'Fevereiro 2027'}];
const PLAN_ITEMS = [
  {id:'oct-nubank',month:'2026-10',day:20,label:'Nubank — fatura vencida',amount:250,debt:true},
  {id:'oct-mobile',month:'2026-10',day:20,label:'Internet celular — conferir atraso',amount:59.9,debt:false},
  ...PLAN_MONTHS.slice(1).flatMap((month,i)=>[
    {id:month.id+'-utilities',month:month.id,day:5,label:'Água e luz da avó',amount:160,debt:false},
    {id:month.id+'-home',month:month.id,day:8,label:'Internet residencial',amount:89.9,debt:false},
    {id:month.id+'-tire',month:month.id,day:10,label:'Atacadão — pneus '+(i+1)+'/4',amount:225,debt:true},
    {id:month.id+'-mobile',month:month.id,day:20,label:'Internet celular',amount:59.9,debt:false},
    ...(i===0?[{id:'nov-neon',month:month.id,day:23,label:'Neon — fatura conhecida',amount:458.08,debt:true}]:[])
  ])
];
const PLAN_KEY='finpulse-personal-payments-v1';
function ProgressRing({value,label,subLabel,tone='cyan'}:{value:number;label:string;subLabel:string;tone?:'cyan'|'emerald'}) {
  const progress=Math.min(100,Math.max(0,value));
  const circumference=2*Math.PI*48;
  return <div className="flex min-w-0 items-center gap-3">
    <div className="relative h-20 w-20 shrink-0" role="progressbar" aria-label={label} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="9" className="text-slate-800"/>
        <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference*(1-progress/100)}
          className={`${tone==='emerald'?'text-emerald-400':'text-cyan-400'} transition-all duration-500 ease-out`}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-base font-semibold tabular-nums">{Math.round(progress)}%</strong>
        
      </div>
    </div>
    <div className="min-w-0"><p className="text-xs font-medium text-slate-300">{label}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{subLabel}</p></div>
  </div>;
}


export function PersonalBudgetPanel({ privateMode = false, itemIds = [], cards = [], accounts = [], onOpenCards, mode = 'cards' }: {
  privateMode?: boolean; itemIds?: string[]; cards?: any[]; accounts?: BankAccount[]; onOpenCards?: () => void; mode?: 'cards' | 'planning';
}) {
  const [showPlan, setShowPlan] = useState(true);
  const [planMonth, setPlanMonth] = useState('2026-11');
  const [checkedBills, setCheckedBills] = useState<string[]>([]);
  const [planReady, setPlanReady] = useState(false);
  const [newNeon, setNewNeon] = useState(0);
  const [receivedAid, setReceivedAid] = useState(0);
  const [paidNubank, setPaidNubank] = useState(0);
  const [paidNeon, setPaidNeon] = useState(0);
  const [paidTires, setPaidTires] = useState(0);
  const [utilities, setUtilities] = useState(160);
  const [showBills, setShowBills] = useState(false);
  const [market, setMarket] = useState(500);
  const [fuel, setFuel] = useState(270);
  const [billsData, setBillsData] = useState<{ bills: any[]; unavailable: number } | null>(null);
  const [billsError, setBillsError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PLAN_KEY) || '{}');
      if (Array.isArray(saved.checkedBills)) setCheckedBills(saved.checkedBills.filter((id: unknown) => typeof id === 'string' && PLAN_ITEMS.some(item=>item.id===id)));
      if (PLAN_MONTHS.some(m=>m.id===saved.planMonth)) setPlanMonth(saved.planMonth);
      if (typeof saved.newNeon === 'number') setNewNeon(Math.max(0,saved.newNeon));
      if (typeof saved.market === 'number') setMarket(Math.max(0,saved.market));
      if (typeof saved.fuel === 'number') setFuel(Math.max(0,saved.fuel));
    } catch { /* browser storage unavailable */ }
    setPlanReady(true);
  }, []);
  useEffect(() => {
    if (!planReady) return;
    try { window.localStorage.setItem(PLAN_KEY,JSON.stringify({checkedBills,planMonth,newNeon,market,fuel})); } catch { /* browser storage unavailable */ }
  },[checkedBills,planMonth,newNeon,market,fuel,planReady]);
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
  const salary = 1519.20;
  const essential = utilities + 89.90 + 59.90 + market + fuel;
  const available = salary + receivedAid - essential;
  const tireDue = Math.max(0, 900 - paidTires);
  const nubankDue = Math.max(0, 250 - paidNubank);
  const neonDue = Math.max(0, 458.08 + newNeon - paidNeon);
  const debtTotal = tireDue + nubankDue + neonDue;
  const afterTire = available - Math.min(225, tireDue);
  const monthItems=PLAN_ITEMS.filter(item=>item.month===planMonth);
  const monthTotal=monthItems.reduce((sum,item)=>sum+item.amount,0);
  const monthPaid=monthItems.filter(item=>checkedBills.includes(item.id)).reduce((sum,item)=>sum+item.amount,0);
  const debtItems=PLAN_ITEMS.filter(item=>item.debt);
  const debtInitial=debtItems.reduce((sum,item)=>sum+item.amount,0)+newNeon;
  const debtPaid=debtItems.filter(item=>checkedBills.includes(item.id)).reduce((sum,item)=>sum+item.amount,0);
  const inputClass = 'mt-1 block w-full rounded-xl border border-slate-700 bg-slate-900/50 p-2.5 text-sm text-slate-100';

  return <section className="space-y-5 text-slate-100" aria-label={mode === 'planning' ? 'Planejamento pessoal' : 'Meus cartões'}>
    {mode === 'cards' && <>
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

    </>}
    {mode === 'planning' && <div className="planning-summary-grid">
      <section className="overview-card planning-month-summary" aria-label="Resumo do planejamento">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.04] px-5 py-4">
          <h3 className="flex items-center gap-2 text-xs font-medium text-slate-400"><Wallet className="h-4 w-4 text-rose-400" aria-hidden="true"/>Resumo do mês</h3>
          <label htmlFor="plan-month" className="sr-only">Selecionar mês</label>
          <select id="plan-month" value={planMonth} onChange={e=>setPlanMonth(e.target.value)} className="min-h-10 min-w-0 max-w-full rounded-lg border border-white/[0.08] bg-[#101012] px-3 text-xs text-slate-300">
            {PLAN_MONTHS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4 px-5 py-6">
          <div className="min-w-0"><p className="text-[11px] text-slate-500">Salário mensal</p><p className="mt-2 break-words text-xl font-semibold tracking-tight tabular-nums">{money(salary)}</p></div>
          <div className="min-w-0"><p className="text-[11px] text-slate-500">Após essenciais · estimado</p><p className={`mt-2 break-words text-xl font-semibold tracking-tight tabular-nums ${available<0?'text-rose-400':'text-emerald-300'}`}>{money(available)}</p></div>
        </div>
        <div className="grid gap-3 border-t border-white/[0.04] px-4 py-4 min-[600px]:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <ProgressRing value={monthTotal?100*monthPaid/monthTotal:0} label="Contas do mês" subLabel={money(Math.max(0,monthTotal-monthPaid))+' pendentes'}/>
          <ProgressRing value={debtInitial?100*debtPaid/debtInitial:100} label="Quitar dívidas" subLabel={money(Math.max(0,debtInitial-debtPaid))+' restantes'} tone="emerald"/>
        </div>
      </section>

      <section className="overview-card p-5" aria-label="Calendário de pagamentos">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-xs font-medium text-slate-400">Pagamentos do mês</h3><span className="text-xs text-slate-500">{monthItems.filter(item=>checkedBills.includes(item.id)).length}/{monthItems.length} pagos</span></div>
        <div className="divide-y divide-white/[0.05]">
          {monthItems.map(item=><label key={item.id} className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-white/[0.025]">
            <input type="checkbox" checked={checkedBills.includes(item.id)} onChange={e=>setCheckedBills(old=>e.target.checked?[...old,item.id]:old.filter(id=>id!==item.id))} className="h-4 w-4 shrink-0 accent-rose-400"/>
            <span className="min-w-0 flex-1">
              <span className={`block text-[13px] font-medium ${checkedBills.includes(item.id)?'text-slate-500 line-through':'text-slate-200'}`}>{item.label}</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">{String(item.day).padStart(2,'0')}/{item.month.slice(5)}/{item.month.slice(0,4)}</span>
            </span>
            <span className="shrink-0 text-[13px] font-medium tabular-nums">{money(item.amount)}</span>
          </label>)}
        </div>
        {!monthItems.length && <p className="py-4 text-xs text-slate-500">Nenhum pagamento cadastrado neste mês.</p>}
        <div className="flex items-center justify-between border-t border-white/[0.07] pt-3 text-sm"><span className="text-slate-400">Pendente no mês</span><strong>{money(Math.max(0,monthTotal-monthPaid))}</strong></div>
      </section>

      <details className="group rounded-2xl border border-[#202023] bg-[#0e0e10]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span><span className="block text-sm font-semibold">Orçamento mensal</span><span className="mt-1 block text-xs text-slate-500">Ajustar alimentação, combustível e contas</span></span>
          <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-90"/>
        </summary>
        <div className="space-y-3 border-t border-white/[0.06] p-4">
          <p className="text-xs text-slate-400">Salário: R$ 827,35 no dia 5 e R$ 691,85 no dia 20.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">Ajuda recebida (R$)<input className={inputClass} type="number" min="0" max="200" value={receivedAid} onChange={e=>setReceivedAid(Math.min(200,Math.max(0,Number(e.target.value)||0)))}/></label>
            <label className="text-xs text-slate-400">Água e luz (R$)<input className={inputClass} type="number" min="0" value={utilities} onChange={e=>setUtilities(Math.max(0,Number(e.target.value)||0))}/></label>
            <label className="text-xs text-slate-400">Mercado e higiene (R$)<input className={inputClass} type="number" min="0" value={market} onChange={e=>setMarket(Math.max(0,Number(e.target.value)||0))}/></label>
            <label className="text-xs text-slate-400">Combustível (R$)<input className={inputClass} type="number" min="0" value={fuel} onChange={e=>setFuel(Math.max(0,Number(e.target.value)||0))}/></label>
          </div>
          <div className="space-y-2 border-t border-white/[0.06] pt-3 text-xs text-slate-400">
            <div className="flex justify-between"><span>Internet residencial · dia 8</span><span>{money(89.90)}</span></div>
            <div className="flex justify-between"><span>Internet celular · dia 20</span><span>{money(59.90)}</span></div>
            <div className="flex justify-between font-medium text-slate-200"><span>Total essencial estimado</span><span>{money(essential)}</span></div>
          </div>
        </div>
      </details>

      <details className="group rounded-2xl border border-[#202023] bg-[#0e0e10]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span><span className="block text-sm font-semibold">Detalhes das dívidas</span><span className="mt-1 block text-xs text-slate-500">Saldos e pagamentos parciais manuais</span></span>
          <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-90"/>
        </summary>
        <div className="space-y-3 border-t border-white/[0.06] p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">Novas compras Neon<input className={inputClass} type="number" min="0" value={newNeon} onChange={e=>setNewNeon(Math.max(0,Number(e.target.value)||0))}/></label>
            <label className="text-xs text-slate-400">Nubank já pago<input className={inputClass} type="number" min="0" value={paidNubank} onChange={e=>setPaidNubank(Math.max(0,Number(e.target.value)||0))}/></label>
            <label className="text-xs text-slate-400">Neon já pago<input className={inputClass} type="number" min="0" value={paidNeon} onChange={e=>setPaidNeon(Math.max(0,Number(e.target.value)||0))}/></label>
            <label className="text-xs text-slate-400">Pneus já pagos<input className={inputClass} type="number" min="0" value={paidTires} onChange={e=>setPaidTires(Math.max(0,Number(e.target.value)||0))}/></label>
          </div>
          <div className="space-y-2 border-t border-white/[0.06] pt-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Nubank</span><span>{money(nubankDue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Neon</span><span>{money(neonDue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Pneus</span><span>{money(tireDue)}</span></div>
            <div className="flex justify-between border-t border-white/[0.06] pt-3 font-semibold"><span>Total estimado</span><span className="text-rose-300">{money(debtTotal)}</span></div>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">Pagamentos parciais e marcações do calendário são controles distintos. Não registre o mesmo pagamento duas vezes. Juros e faturas futuras não informadas não estão incluídos.</p>
        </div>
      </details>
      <details className="planning-help text-[11px] leading-relaxed text-slate-500"><summary className="min-h-10 cursor-pointer py-2">Sobre os valores e marcações</summary><div className="max-w-2xl space-y-2 pb-2"><p>Valores estimados. A ajuda familiar só entra no cálculo quando informada como recebida.</p><p>As marcações são salvas apenas neste navegador. O planejamento não movimenta dinheiro nem altera dados bancários. Os cartões conectados e as faturas da Pluggy continuam na seção Meu dinheiro.</p></div></details>
    </div>}

  </section>;
}
