import React, { useEffect, useMemo, useState } from 'react';

type Expense = { name: string; day: number; amount: number; note?: string };
const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fixed: Expense[] = [
  { name: 'Internet', day: 8, amount: 132.47 },
  { name: 'Pneus • 1ª de 4', day: 10, amount: 225 },
  { name: 'Celular', day: 20, amount: 59.32 },
  { name: 'Água e luz • estimativa', day: 25, amount: 180, note: 'Vencem após o dia 20; confirme as datas.' },
];
export function PersonalBudgetPanel({ privateMode = false, itemIds = [] }: { privateMode?: boolean; itemIds?: string[] }) {
  const [helpDay, setHelpDay] = useState(20);
  const [helpConfirmed, setHelpConfirmed] = useState(false);
  const [market, setMarket] = useState(250);
  const [fuel, setFuel] = useState(270);
  const [paid, setPaid] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [billsData, setBillsData] = useState<{ bills: any[]; unavailable: number } | null>(null);
  const [billsError, setBillsError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    itemIds.forEach(id => params.append('itemId', id));
    setBillsData(null); setBillsError('');
    fetch('/api/open-finance/bills?' + params.toString(), { signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Falha ao consultar faturas'); if (!controller.signal.aborted) setBillsData(data); })
      .catch(error => { if (!controller.signal.aborted) setBillsError(error.message); });
    return () => controller.abort();
  }, [itemIds.join(','), refresh]);
  const pendingBills = (billsData?.bills || []).filter((bill: any) =>
    bill.paymentStatus !== 'paid' && Number.isFinite(Number(bill.totalAmount)) &&
    Number(bill.totalAmount) > 0 && (bill.totalAmountCurrencyCode || 'BRL') === 'BRL'
  );
  const totalCardDebt = pendingBills.reduce((sum: number, bill: any) => sum + Number(bill.totalAmount), 0);
  const income = 827.35 + 691.85 + 200;
  const novemberBills = pendingBills.filter((bill: any) => String(bill.dueDate || '').startsWith('2026-11'));
  const novemberDebt = novemberBills.reduce((sum: number, bill: any) => sum + Number(bill.totalAmount), 0);
  const expenses = fixed.reduce((s, x) => s + x.amount, 0) + market + novemberDebt;
  const available = income - expenses - 100;
  const money = (v: number) => privateMode ? '••••' : BRL(v);
  const schedule = useMemo(() => [
    { day: 5, name: 'Salário', amount: 827.35 },
    { day: 20, name: 'Salário', amount: 691.85 },
    ...(helpConfirmed ? [{ day: helpDay, name: 'Ajuda da mãe', amount: 200 }] : []),
    ...fixed.map(x => ({ ...x, amount: -x.amount })),
    ...pendingBills.filter((bill: any) => String(bill.dueDate || '').slice(0,7) === '2026-11').map((bill: any) => ({day:Number(String(bill.dueDate).slice(8,10)) || 23,name:(bill.bank || 'Cartão')+' • fatura Pluggy',amount:-Number(bill.totalAmount)})),
    { day: helpDay, name: 'Caixinha • meta', amount: -100 },
  ].sort((a,b) => a.day-b.day || b.amount-a.amount), [helpDay, helpConfirmed]);
  let running = 0;
  const rows = schedule.map(item => ({ ...item, balance: (running += item.amount) }));
  return <section className="rounded-[28px] border border-slate-800 bg-[#111116] p-4 md:p-7 space-y-6 text-slate-100" aria-label="Meu plano financeiro">
    <div className="flex flex-wrap justify-between gap-3 items-start">
      <div><p className="text-xs uppercase tracking-wide opacity-60">Meu plano • Novembro 2026</p><h2 className="text-2xl font-semibold tracking-tight">Controle do dinheiro até o próximo salário</h2></div>
      <span className={billsData && !billsData.unavailable ? (available < 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold') : 'text-slate-400 font-semibold'}>{billsData && !billsData.unavailable ? money(available) + ' previsto' : 'Previsão incompleta'}</span>
    </div>
    <p className="text-sm opacity-70">Faturas consultadas nas conexões bancárias autorizadas. Salários e demais despesas abaixo continuam como estimativas manuais.</p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {[['Salários',1519.20],['Ajuda prevista',200],['Caixinha',100],['Despesas',expenses]].map(([label,amount])=><div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xs opacity-70">{label}</p><strong>{money(Number(amount))}</strong></div>)}
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Faturas conectadas</h3><span className="text-sm text-cyan-300">{billsData ? money(totalCardDebt) : 'Consultando…'}</span></div>
      {billsError && <div role="alert" className="text-sm text-amber-300">{billsError} <button type="button" className="underline" onClick={()=>setRefresh(x=>x+1)}>Tentar novamente</button></div>}
      {!billsData && !billsError && <p role="status" className="text-sm text-slate-400">Buscando faturas reais nas conexões autorizadas…</p>}
      {!!billsData?.unavailable && <p role="status" className="text-sm text-amber-300">Algumas instituições não disponibilizaram faturas. O total pode estar incompleto.</p>}
      {billsData && pendingBills.length === 0 && <p className="text-sm text-slate-400">{billsData.unavailable ? 'Não foi possível confirmar todas as pendências.' : 'Nenhuma fatura pendente ou sem confirmação retornada pelas conexões.'}</p>}
      <div className="grid sm:grid-cols-2 gap-3">{pendingBills.map((bill: any) => <article key={bill.providerItemId + ':' + bill.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
        <div className="flex justify-between items-center gap-2"><strong>{bill.bank || bill.cardName || 'Cartão conectado'}</strong><span className="text-xs text-slate-400">{bill.paymentStatus === 'unpaid' ? 'Não paga' : 'Pagamento não confirmado'}</span></div>
        <p className="text-2xl font-semibold">{money(Number(bill.totalAmount))}</p>
        <p className="text-xs text-slate-400">Fatura {bill.cardName || ''} · Vencimento {String(bill.dueDate || '').slice(0,10).split('-').reverse().join('/') || 'não informado'}</p>
        <p className="text-xs text-slate-500">{bill.paymentStatus === 'unknown' ? 'Confira no banco antes de considerar como dívida.' : 'Valor total da fatura informado pela conexão.'}</p>
      </article>)}</div>
      <p className="text-xs text-slate-400">Dados obtidos do endpoint de faturas Pluggy já existente no FinPulse. Pagamento não confirmado não significa dívida comprovada. O valor total da fatura pode incluir pagamentos parciais e não equivale necessariamente ao saldo restante para quitação. O painel não realiza pagamentos.</p>
    </div>
    <div className="grid sm:grid-cols-3 gap-3">
      <label className="text-sm">Mercado, higiene e limpeza (R$)<input aria-label="Orçamento de mercado" type="number" min="0" step="10" value={market} onChange={e=>setMarket(Math.max(0,Number(e.target.value)||0))} className="block w-full rounded-lg border bg-transparent p-2 mt-1"/></label>
      <label className="text-sm">Tanque do Corsa (estimativa, R$)<input aria-label="Estimativa de gasolina" type="number" min="0" step="10" value={fuel} onChange={e=>setFuel(Math.max(0,Number(e.target.value)||0))} className="block w-full rounded-lg border bg-transparent p-2 mt-1"/></label>
      <label className="text-sm">Dia da ajuda da mãe<input aria-label="Dia da ajuda" type="number" min="1" max="30" value={helpDay} onChange={e=>setHelpDay(Math.min(30,Math.max(1,Number(e.target.value)||1)))} className="block w-full rounded-lg border bg-transparent p-2 mt-1"/></label>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={helpConfirmed} onChange={e=>setHelpConfirmed(e.target.checked)}/> Incluir ajuda na previsão por data (confirmar recebimento)</label>
    <div className="rounded-xl bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100 p-3 text-sm">
      A gasolina de {money(fuel)} está prevista para a fatura Neon de dezembro (23/12), não é somada às despesas de novembro. Reserve dinheiro para ela: após reservar, o resultado de novembro seria {money(available-fuel)}. A fatura de dezembro pode ter outras compras.
    </div>
    <button type="button" className="text-sm underline" onClick={()=>setShowDetails(!showDetails)} aria-expanded={showDetails}>{showDetails?'Ocultar':'Mostrar'} calendário e marcação manual</button>
    {showDetails && <div className="space-y-2">{rows.map((item,index)=><div key={item.day+'-'+item.name+'-'+index} className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 py-2 text-sm">
      <span><b>Dia {item.day}</b> · {item.name}</span><span className="text-right">{money(item.amount)}<small className="block opacity-60">Saldo projetado: {money(item.balance)}</small></span>
      {item.amount<0 && <label className="flex items-center gap-1"><input type="checkbox" checked={paid.includes(item.name)} onChange={e=>setPaid(prev=>e.target.checked?[...prev,item.name]:prev.filter(x=>x!==item.name))}/>Pago</label>}
    </div>)}</div>}
    <p className="text-xs opacity-70">Marcação de pagamentos apenas nesta sessão; não altera faturas nem movimentações do banco. Saldo por data não inclui mercado, combustível, saldo inicial ou vencimentos ainda não confirmados. Caixinha é meta, não débito bancário.</p>
  </section>;
}
