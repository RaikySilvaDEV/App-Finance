import React, { useMemo, useState } from 'react';

type Expense = { name: string; day: number; amount: number; note?: string };
const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fixed: Expense[] = [
  { name: 'Internet', day: 8, amount: 132.47 },
  { name: 'Pneus • 1ª de 4', day: 10, amount: 225 },
  { name: 'Celular', day: 20, amount: 59.32 },
  { name: 'Água e luz • estimativa', day: 25, amount: 180, note: 'Vencem após o dia 20; confirme as datas.' },
];
export function PersonalBudgetPanel({ privateMode = false }: { privateMode?: boolean }) {
  const [helpDay, setHelpDay] = useState(20);
  const [helpConfirmed, setHelpConfirmed] = useState(false);
  const [market, setMarket] = useState(250);
  const [fuel, setFuel] = useState(270);
  const [paid, setPaid] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [cardDebts, setCardDebts] = useState([{ id: 'nubank', name: 'Nubank', dueDay: 5, amount: 250 }, { id: 'neon', name: 'Neon', dueDay: 23, amount: 458.08 }]);
  const [cardPayments, setCardPayments] = useState<Record<string, number>>({});
  const cardRemaining = (id: string, amount: number) => Math.max(0, Math.round((amount - (cardPayments[id] || 0)) * 100) / 100);
  const totalCardDebt = cardDebts.reduce((sum, card) => sum + cardRemaining(card.id, card.amount), 0);
  const changeCard = (id: string, amount: number) => { setCardDebts(previous => previous.map(card => card.id === id ? { ...card, amount: Math.max(0, amount) } : card)); setCardPayments(previous => ({ ...previous, [id]: 0 })); };
  const income = 827.35 + 691.85 + 200;
  const expenses = fixed.reduce((s, x) => s + x.amount, 0) + market + totalCardDebt;
  const available = income - expenses - 100;
  const money = (v: number) => privateMode ? '••••' : BRL(v);
  const schedule = useMemo(() => [
    { day: 5, name: 'Salário', amount: 827.35 },
    { day: 20, name: 'Salário', amount: 691.85 },
    ...(helpConfirmed ? [{ day: helpDay, name: 'Ajuda da mãe', amount: 200 }] : []),
    ...fixed.map(x => ({ ...x, amount: -x.amount })),
    ...cardDebts.filter(card => cardRemaining(card.id,card.amount)>0).map(card => ({day:card.dueDay,name:card.name+' • a quitar',amount:-cardRemaining(card.id,card.amount)})),
    { day: helpDay, name: 'Caixinha • meta', amount: -100 },
  ].sort((a,b) => a.day-b.day || b.amount-a.amount), [helpDay, helpConfirmed]);
  let running = 0;
  const rows = schedule.map(item => ({ ...item, balance: (running += item.amount) }));
  return <section className="rounded-[28px] border border-slate-800 bg-[#111116] p-4 md:p-7 space-y-6 text-slate-100" aria-label="Meu plano financeiro">
    <div className="flex flex-wrap justify-between gap-3 items-start">
      <div><p className="text-xs uppercase tracking-wide opacity-60">Meu plano • Novembro 2026</p><h2 className="text-2xl font-semibold tracking-tight">Controle do dinheiro até o próximo salário</h2></div>
      <span className={available < 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>{money(available)} previsto</span>
    </div>
    <p className="text-sm opacity-70">Planejamento manual: não representa saldo bancário nem limite de cartão. Valores iniciais são editáveis e não são lançamentos reais.</p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {[['Salários',1519.20],['Ajuda prevista',200],['Caixinha',100],['Despesas',expenses]].map(([label,amount])=><div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xs opacity-70">{label}</p><strong>{money(Number(amount))}</strong></div>)}
    </div>
    <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Cartões para quitar</h3><span className="text-sm text-cyan-300">{money(totalCardDebt)} pendente</span></div>
    {cardDebts.filter(card => cardRemaining(card.id,card.amount)>0).length === 0 ? <p className="text-sm text-emerald-300">Nenhuma dívida de cartão pendente.</p> : <div className="grid sm:grid-cols-2 gap-3">{cardDebts.filter(card => cardRemaining(card.id,card.amount)>0).map(card => <div key={card.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3"><div className="flex justify-between items-center"><strong>{card.name}</strong><span className="text-xs text-slate-400">Vence dia {card.dueDay}</span></div><div className="text-2xl font-semibold">{money(cardRemaining(card.id,card.amount))}</div><label className="block text-xs text-slate-400">Valor total da dívida (R$)<input type="number" min="0" step="0.01" value={card.amount} onChange={e=>changeCard(card.id, Number(e.target.value)||0)} className="mt-1 w-full rounded-lg border border-white/15 bg-transparent p-2 text-slate-100"/></label><button type="button" onClick={()=>setCardPayments(p=>({...p,[card.id]:card.amount}))} className="rounded-xl bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/20">Marcar quitado neste planejamento</button></div>)}</div>}
    <p className="text-xs text-slate-400">Os valores são informados manualmente. Ao quitar, o cartão desaparece desta lista e o total pendente é recalculado. A marcação não paga a fatura, não é sincronizada com o banco e é perdida ao recarregar a página.</p></div>
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
