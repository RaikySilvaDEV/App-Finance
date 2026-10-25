import { useState } from 'react';
import type { PlanningData, MonthlyCashPlan } from '../lib/planning';
import { billOccurrences, brazilDay, installmentDate, normalizedText } from '../lib/planning';

export function PersonalCashPlan({ data, onChange, privateMode }: { data: PlanningData; onChange: (data: PlanningData) => void; privateMode: boolean }) {
  const currentMonth = brazilDay().slice(0, 7);
  const [month, setMonth] = useState(() => installmentDate(currentMonth + '-01', 1).slice(0, 7));
  const [editing, setEditing] = useState(!data.monthlyCashPlan);
  const [error, setError] = useState('');
  const plan = data.monthlyCashPlan;
  const money = (amount: number) => privateMode ? '••••••' : amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const monthName = (value: string) => new Date(value + '-01T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const months = Array.from({ length: 13 }, (_, index) => installmentDate(currentMonth + '-01', index).slice(0, 7));
  const dayInMonth = (day: number) => Math.min(day, new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate());
  const manual = billOccurrences(data.bills).filter(row => row.date.slice(0, 7) === month).map(row => ({ id: row.occurrenceId, title: row.title, day: Number(row.date.slice(8)), amount: row.amount, status: row.isPaid ? 'Pago · informado por você' : 'Cadastrado' }));
  const fixed = (plan?.fixedExpenses || []).filter(row => !manual.some(bill => normalizedText(bill.title) === normalizedText(row.title))).map(row => ({ ...row, day: dayInMonth(row.day), status: 'Previsão mensal' }));
  const loans = data.manualLoans.filter(row => !row.alsoConnected && row.remaining > 0 && row.nextDue.slice(0, 7) === month && !manual.some(bill => normalizedText(bill.title) === normalizedText(row.title) && Math.abs(bill.amount - row.installment) < .01)).map(row => ({ id: 'loan:' + row.id, title: row.title, day: Number(row.nextDue.slice(8)), amount: row.installment, status: 'Parcela manual' }));
  const payments = [...manual, ...fixed, ...loans].sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  const income = (plan?.incomes || []).reduce((sum, row) => sum + row.amount, 0);
  const fixedTotal = payments.reduce((sum, row) => sum + row.amount, 0);
  const flexible = (plan?.groceries || 0) + (plan?.fuel || 0);
  const remaining = income - fixedTotal - flexible - (plan?.buffer || 0);
  const input = 'mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#101012] px-3 text-sm text-slate-200';
  return <section aria-label="Meu plano de pagamentos" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-200">Meu plano do mês</h2><label className="sr-only" htmlFor="cash-plan-month">Mês do plano</label><select id="cash-plan-month" value={month} onChange={event => setMonth(event.target.value)} className="min-h-10 max-w-full rounded-lg border border-white/10 bg-[#101012] px-3 text-xs text-slate-300">{months.map(value => <option key={value} value={value}>{monthName(value)}</option>)}</select></div>
    {plan && <>
      <dl className="grid gap-3 sm:grid-cols-3">{[['Renda prevista', income], ['Contas + mercado e combustível', fixedTotal + flexible], ['Reservar para faturas / quitação', remaining]].map(([label, amount], index) => <div key={String(label)} className="overview-card p-5"><dt className="text-[11px] text-slate-500">{label}</dt><dd className={`mt-2 text-xl font-semibold tabular-nums ${index === 2 ? Number(amount) < 0 ? 'text-rose-300' : 'text-emerald-300' : 'text-slate-100'}`}>{money(Number(amount))}</dd></div>)}</dl>
      <p className="text-[11px] leading-relaxed text-slate-500">Margem de segurança de {money(plan.buffer)} já separada. A reserva para quitação ainda precisa cobrir as faturas bancárias não disponibilizadas pela conexão; não é sobra livre.</p>
      <div className="grid gap-4 xl:grid-cols-2">{plan.incomes.map((payday, index) => {
        const nextDay = plan.incomes[index + 1]?.day || 32;
        const rows = payments.filter(row => row.day >= dayInMonth(payday.day) && row.day < nextDay);
        const grocery = index === 0 ? Math.floor(plan.groceries * 100 / 2) / 100 : plan.groceries - Math.floor(plan.groceries * 100 / 2) / 100;
        const fuel = index === 0 ? Math.floor(plan.fuel * 100 / 2) / 100 : plan.fuel - Math.floor(plan.fuel * 100 / 2) / 100;
        const buffer = index === 0 ? plan.buffer : 0;
        const reserve = payday.amount - rows.reduce((sum, row) => sum + row.amount, 0) - grocery - fuel - buffer;
        return <article key={payday.day} className="overview-card"><div className="flex items-center justify-between gap-3 border-b border-white/[0.05] p-5"><h3 className="text-sm font-medium text-slate-300">Ao receber no dia {payday.day}</h3><span className="text-sm font-semibold text-slate-100">{money(payday.amount)}</span></div><div className="divide-y divide-white/[0.04] px-5">{[...rows.map(row => ({ title: `${row.title} · dia ${row.day}`, amount: row.amount })), { title: 'Mercado e higiene', amount: grocery }, { title: 'Combustível', amount: fuel }, ...(buffer > 0 ? [{ title: 'Margem de segurança', amount: buffer }] : [])].map((row, rowIndex) => <div key={rowIndex} className="flex justify-between gap-3 py-3 text-xs"><span className="min-w-0 text-slate-400">{row.title}</span><span className="shrink-0 tabular-nums text-slate-200">{money(row.amount)}</span></div>)}</div><div className="flex justify-between gap-3 border-t border-white/[0.05] p-5 text-xs"><span className="text-slate-400">Reservar para cartões / dívidas</span><strong className={reserve < 0 ? 'text-rose-300' : 'text-emerald-300'}>{money(reserve)}</strong></div></article>;
      })}</div>
      {payments.some(row => row.day < dayInMonth(plan.incomes[0].day)) && <p role="status" className="text-xs text-amber-200">Há contas antes do primeiro recebimento do mês. Reserve esses valores no mês anterior; não espere o salário para pagar depois do vencimento.</p>}
      <details className="rounded-xl border border-white/[0.07] px-4 text-xs text-slate-500"><summary className="min-h-11 cursor-pointer py-3">Compromissos e datas usados no plano</summary><div className="divide-y divide-white/[0.04] pb-3">{payments.map(row => <div key={row.id} className="flex flex-wrap justify-between gap-2 py-3"><span className="text-slate-300">Dia {row.day} · {row.title}<span className="ml-2 text-[10px] text-slate-500">{row.status}</span></span><span>{money(row.amount)}</span></div>)}</div></details>
    </>}
    <details open={editing} onToggle={event => setEditing(event.currentTarget.open)} className="rounded-xl border border-white/[0.07] px-4 text-xs text-slate-400"><summary className="min-h-11 cursor-pointer py-3">Renda e limites do meu plano</summary>{privateMode ? <p className="pb-4 text-xs text-slate-500">Mostre os valores para consultar ou editar o plano.</p> : <form className="space-y-4 pb-4" onSubmit={event => {
      event.preventDefault(); setError('');
      const form = new FormData(event.currentTarget);
      const num = (key: string) => Number(form.get(key));
      const incomes = [{ day: num('firstDay'), amount: num('firstIncome') }, { day: num('secondDay'), amount: num('secondIncome') }];
      if (incomes[0].day >= incomes[1].day || incomes.some(row => !Number.isInteger(row.day) || row.day < 1 || row.day > 31 || !Number.isFinite(row.amount) || row.amount <= 0)) { setError('Confira as datas e os valores dos recebimentos.'); return; }
      const fixedExpenses = [{ id: 'utilities', title: 'Água e luz', day: num('utilitiesDay'), amount: num('utilities') }, { id: 'internet', title: 'Internet residencial', day: num('internetDay'), amount: num('internet') }, { id: 'mobile', title: 'Internet celular', day: num('mobileDay'), amount: num('mobile') }];
      const monthlyCashPlan: MonthlyCashPlan = { incomes, fixedExpenses, groceries: num('groceries'), fuel: num('fuel'), buffer: num('buffer') };
      if ([monthlyCashPlan.groceries, monthlyCashPlan.fuel, monthlyCashPlan.buffer, ...fixedExpenses.map(row => row.amount)].some(amount => !Number.isFinite(amount) || amount < 0 || amount > 1e12) || fixedExpenses.some(row => !Number.isInteger(row.day) || row.day < 1 || row.day > 31)) { setError('Confira os limites e vencimentos das despesas.'); return; }
      onChange({ ...data, monthlyCashPlan }); setEditing(false);
    }}>
      <p className="text-[11px] leading-relaxed text-slate-500">Previsões informadas por você, salvas na sua conta. O calendário também inclui as contas, parcelas e empréstimos manuais já cadastrados, sem somar novamente faturas antigas ou limite de crédito.</p>
      <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map(index => <fieldset key={index} className="grid grid-cols-[1fr_2fr] gap-3 rounded-lg border border-white/[0.05] p-3"><legend className="px-1 text-[11px] text-slate-500">{index + 1}º recebimento</legend><label>Dia<input className={input} name={index ? 'secondDay' : 'firstDay'} type="number" min="1" max="31" step="1" required defaultValue={plan?.incomes[index]?.day ?? (index ? 20 : 5)}/></label><label>Valor líquido (R$)<input className={input} name={index ? 'secondIncome' : 'firstIncome'} type="number" min="0.01" max="1000000000000" step="0.01" required defaultValue={plan?.incomes[index]?.amount ?? ''}/></label></fieldset>)}</div>
      <div className="grid gap-3 sm:grid-cols-3">{[['utilities', 'Água e luz', 5], ['internet', 'Internet residencial', 8], ['mobile', 'Internet celular', 20]].map(([id, title, defaultDay]) => {
        const row = plan?.fixedExpenses.find(row => row.id === id);
        return <fieldset key={id} className="space-y-2 rounded-lg border border-white/[0.05] p-3"><legend className="px-1 text-[11px] text-slate-500">{title}</legend><label className="block">Previsão mensal (R$)<input className={input} name={String(id)} type="number" min="0" max="1000000000000" step="0.01" required defaultValue={row?.amount ?? ''}/></label><label className="block">Vencimento · dia<input className={input} name={id + 'Day'} type="number" min="1" max="31" step="1" required defaultValue={row?.day ?? defaultDay}/></label></fieldset>;
      })}</div>
      <div className="grid gap-3 sm:grid-cols-3">{[['groceries', 'Mercado e higiene'], ['fuel', 'Combustível'], ['buffer', 'Margem de segurança']].map(([key, label]) => <label key={key}>{label} (R$)<input className={input} name={key} type="number" min="0" max="1000000000000" step="0.01" required defaultValue={plan?.[key as 'groceries' | 'fuel' | 'buffer'] ?? ''}/></label>)}</div>
      {error && <p role="alert" className="text-xs text-amber-200">{error}</p>}
      <button type="submit" disabled={privateMode} className="min-h-11 rounded-lg bg-rose-400 px-5 text-xs font-semibold text-slate-950 disabled:opacity-50">Salvar meu plano</button>
    </form>}</details>
  </section>;
}
