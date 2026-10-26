import { useState } from 'react';
import { ArrowDownLeft, ChevronDown, Pencil } from 'lucide-react';
import type { PlanningData, MonthlyCashPlan, CardPaymentForecast } from '../lib/planning';
import { billOccurrences, brazilDay, installmentDate, normalizedText, validateMonthlyCashPlan } from '../lib/planning';
import type { BankAccount } from '../types/finance';
import { bankDisplayName } from './BankLogo';

type Card = { id: string; providerItemId?: string; name?: string; institution?: string; number?: string };
export function PersonalCashPlan({ data, onChange, privateMode, cards = [], accounts = [] }: {
  data: PlanningData; onChange: (data: PlanningData) => void; privateMode: boolean; cards?: Card[]; accounts?: BankAccount[];
}) {
  const currentMonth = brazilDay().slice(0, 7);
  const [month, setMonth] = useState(() => installmentDate(currentMonth + '-01', 1).slice(0, 7));
  const [editing, setEditing] = useState(!data.monthlyCashPlan);
  const [error, setError] = useState('');
  const plan = data.cashPlanMonths?.[month] || data.monthlyCashPlan;
  const money = (amount: number) => privateMode ? '••••••' : amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const monthName = (value: string) => new Date(value + '-01T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const months = [...new Set([...Object.keys(data.cashPlanMonths || {}), ...Array.from({ length: 13 }, (_, index) => installmentDate(currentMonth + '-01', index).slice(0, 7))])].sort();
  const dayInMonth = (day: number) => Math.min(day, new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate());
  const manual = billOccurrences(data.bills).filter(row => row.date.slice(0, 7) === month).map(row => ({ id: row.occurrenceId, title: row.title, day: Number(row.date.slice(8)), amount: row.amount, status: row.isPaid ? 'Pago · informado por você' : 'Cadastrado' }));
  const fixed = (plan?.fixedExpenses || []).filter(row => !manual.some(bill => normalizedText(bill.title) === normalizedText(row.title))).map(row => ({ ...row, day: dayInMonth(row.day), status: 'Previsão mensal' }));
  const loans = data.manualLoans.filter(row => !row.alsoConnected && row.remaining > 0 && row.nextDue.slice(0, 7) === month && !manual.some(bill => normalizedText(bill.title) === normalizedText(row.title) && Math.abs(bill.amount - row.installment) < .01)).map(row => ({ id: 'loan:' + row.id, title: row.title, day: Number(row.nextDue.slice(8)), amount: row.installment, status: 'Parcela manual' }));
  const cardOptions = [...new Map([...cards.map(card => {
    const bank = accounts.find(account => account.providerItemId === card.providerItemId)?.bankName || (card.institution !== 'MeuPluggy' ? card.institution : '') || card.name || 'Cartão';
    return [card.id, { id: card.id, title: bankDisplayName(bank), number: card.number }] as const;
  }), ...(plan?.cardPayments || []).filter(row => !cards.some(card => card.id === row.accountId)).map(row => [row.accountId, { id: row.accountId, title: row.cardName, number: undefined }] as const)]).values()];
  const cardRows = (plan?.cardPayments || []).filter(row => row.amount != null && row.amount > 0 && row.dueDay != null).map(row => ({ id: 'card:' + row.accountId, title: row.cardName + ' · pagamento', day: dayInMonth(row.paymentDay ?? row.dueDay!), amount: row.amount!, status: `Vence dia ${dayInMonth(row.dueDay!)} · ${row.kind === 'confirmed' ? 'valor conferido por você' : 'valor planejado por você'}` }));
  const payments = [...manual, ...fixed, ...loans, ...cardRows].sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  const pendingCards = cardOptions.filter(card => !plan?.cardPayments?.some(row => row.accountId === card.id && row.amount != null));
  const income = (plan?.incomes || []).reduce((sum, row) => sum + row.amount, 0);
  const fixedTotal = payments.reduce((sum, row) => sum + row.amount, 0);
  const flexible = (plan?.groceries || 0) + (plan?.fuel || 0);
  const assigned = fixedTotal + flexible + (plan?.buffer || 0);
  const remaining = income - assigned;
  const hasCardValues = (plan?.cardPayments || []).some(row => row.amount != null);
  const input = 'mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-[#101012] px-3 text-sm text-slate-200';
  return <section aria-label="Meu plano de pagamentos" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="sr-only" htmlFor="cash-plan-month">Mês do plano</label>
      <select id="cash-plan-month" value={month} onChange={event => { setMonth(event.target.value); setEditing(false); setError(''); }} className="min-h-11 max-w-full rounded-lg border border-white/[0.07] bg-[#101012] px-3 text-sm text-slate-300">{months.map(value => <option key={value} value={value}>{monthName(value)}</option>)}</select>
      <button type="button" onClick={() => setEditing(value => !value)} aria-expanded={editing} aria-controls="cash-plan-editor" className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-slate-400 hover:bg-white/5 hover:text-white"><Pencil aria-hidden="true" className="h-3.5 w-3.5"/>{editing ? 'Fechar edição' : 'Ajustar este mês'}</button>
    </div>
    {plan && <>
      <dl className="grid grid-cols-2 gap-5 rounded-2xl border border-[#242429] bg-[#101013] p-5 sm:grid-cols-3 sm:p-6">
        <div><dt className="text-[11px] text-slate-500">Recebimentos previstos</dt><dd className="mt-2 text-xl font-semibold tracking-tight text-slate-200 tabular-nums">{money(income)}</dd></div>
        <div><dt className="text-[11px] text-slate-500">Separar neste mês</dt><dd className="mt-2 text-xl font-semibold tracking-tight text-slate-200 tabular-nums">{money(assigned)}</dd></div>
        <div className="col-span-2 border-t border-white/[0.05] pt-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><dt className="text-[11px] text-slate-400">{remaining < 0 ? 'Falta no orçamento' : hasCardValues ? 'Após pagamentos previstos' : 'Para distribuir nos cartões'}</dt><dd className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${remaining < 0 ? 'text-rose-300' : 'text-white'}`}>{money(remaining < 0 ? -remaining : remaining)}</dd></div>
      </dl>
      {pendingCards.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><p className="text-slate-500">Falta prever: {pendingCards.map(card => card.title).join(', ')}.</p><button type="button" onClick={() => setEditing(true)} className="min-h-10 text-rose-300 hover:underline">Planejar cartões →</button></div> : <p className="text-[11px] text-slate-500">{money(plan.buffer)} de segurança incluídos. Valores previstos para {monthName(month)}.</p>}
      <div className="grid gap-4 lg:grid-cols-2">{(() => { let carryForward = 0; let regularIndexCounter = 0; return plan.incomes.map((payday, index) => {
        const nextDay = plan.incomes[index + 1]?.day || 32;
        const regularIndex = payday.additional ? -1 : regularIndexCounter++;
        const rows = payments.filter(row => row.day >= dayInMonth(payday.day) && row.day < nextDay);
        const grocery = regularIndex === 0 ? Math.floor(plan.groceries * 100 / 2) / 100 : regularIndex === 1 ? plan.groceries - Math.floor(plan.groceries * 100 / 2) / 100 : 0;
        const fuel = regularIndex === 0 ? Math.floor(plan.fuel * 100 / 2) / 100 : regularIndex === 1 ? plan.fuel - Math.floor(plan.fuel * 100 / 2) / 100 : 0;
        const buffer = regularIndex === 0 ? plan.buffer : 0;
        const costs = rows.reduce((sum, row) => sum + row.amount, 0) + grocery + fuel + buffer;
        const carryIn = carryForward;
        const reserve = payday.amount + carryIn - costs;
        carryForward = reserve;
        return <article key={payday.day} className="overflow-hidden rounded-2xl border border-[#242429] bg-[#0e0e10]">
          <div className="flex items-center justify-between gap-3 px-5 pt-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-sm font-semibold text-slate-200">{String(payday.day).padStart(2, '0')}</span><div><h3 className="text-sm font-medium text-slate-200">Recebimento do dia {payday.day}</h3><p className="mt-1 text-[11px] text-slate-500">{money(payday.amount)} previstos</p></div></div><ArrowDownLeft aria-hidden="true" className="h-4 w-4 text-rose-400"/></div>
          <div className="grid grid-cols-2 gap-4 px-5 py-5"><div><p className="text-[11px] text-slate-500">Separar para pagamentos</p><p className="mt-2 text-base font-medium tabular-nums text-slate-300">{money(costs)}</p></div><div><p className="text-[11px] text-slate-500">{reserve < 0 ? 'Precisa complementar' : hasCardValues ? 'Saldo após pagamentos' : 'Reservar para cartões'}</p><p className={`mt-2 text-lg font-semibold tabular-nums ${reserve < 0 ? 'text-rose-300' : 'text-slate-100'}`}>{money(reserve < 0 ? -reserve : reserve)}</p></div></div>
          <details className="group border-t border-white/[0.05]"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5 text-xs text-slate-500 hover:text-slate-300 [&::-webkit-details-marker]:hidden">Ver divisão<ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180"/></summary><div className="divide-y divide-white/[0.04] px-5 pb-3">{[...(carryIn > 0 ? [{ title: 'Reserva trazida do recebimento anterior', amount: carryIn, status: 'Separada anteriormente' }] : []), ...rows.map(row => ({ title: `${row.title} · dia ${row.day}`, amount: row.amount, status: row.status })), { title: 'Mercado e higiene', amount: grocery, status: 'Limite previsto' }, { title: 'Combustível', amount: fuel, status: 'Limite previsto' }, ...(buffer > 0 ? [{ title: 'Margem de segurança', amount: buffer, status: 'Reserva prevista' }] : [])].map((row, rowIndex) => <div key={rowIndex} className="flex justify-between gap-3 py-3 text-xs"><span className="min-w-0 text-slate-400">{row.title}<span className="mt-1 block text-[10px] text-slate-600">{row.status}</span></span><span className="shrink-0 tabular-nums text-slate-200">{money(row.amount)}</span></div>)}</div></details>
        </article>;
      }); })()}</div>
      {remaining < 0 && <p role="status" className="text-xs leading-relaxed text-rose-300">Os pagamentos previstos ultrapassam a renda. Ajuste despesas ou o plano de pagamento; o sistema não considera limite de crédito como renda.</p>}
      {payments.some(row => row.day < dayInMonth(plan.incomes[0].day)) && <p role="status" className="text-xs text-amber-200">Há contas antes do primeiro recebimento. Reserve esses valores no mês anterior.</p>}
      <p className="text-[11px] leading-relaxed text-slate-600">{data.cashPlanMonths?.[month] ? 'Plano ajustado para este mês.' : 'Previsão inicial com seus limites padrão.'} Revise despesas variáveis e faturas antes de pagar. {pendingCards.length > 0 ? 'Os cartões sem valor ainda não entram no total.' : ''}</p>
    </>}
    {editing && <section id="cash-plan-editor" aria-label="Editar plano do mês" className="rounded-2xl border border-[#242429] bg-[#101013] p-5">
      <h3 className="mb-2 text-sm font-medium text-slate-200">Ajustes de {monthName(month)}</h3>
      {privateMode ? <p className="text-xs text-slate-500">Mostre os valores para editar o plano.</p> : <form key={month} className="space-y-5" onSubmit={event => {
        event.preventDefault(); setError('');
        const form = new FormData(event.currentTarget);
        const num = (key: string) => Number(form.get(key));
        const optional = (key: string) => String(form.get(key) || '').trim() ? num(key) : null;
        try {
          const incomes = [{ day: num('firstDay'), amount: num('firstIncome') }, { day: num('secondDay'), amount: num('secondIncome') }];
          [0, 1].forEach(index => {
            const extraDay = String(form.get(`extraIncome${index}Day`) || '').trim();
            const extraAmount = String(form.get(`extraIncome${index}Amount`) || '').trim();
            if (Boolean(extraDay) !== Boolean(extraAmount)) throw new Error('Preencha a data e o valor de cada renda extra.');
            if (extraDay && extraAmount) incomes.push({ day: Number(extraDay), amount: Number(extraAmount), additional: true });
          });
          incomes.sort((a, b) => a.day - b.day);
          const fixedExpenses = [{ id: 'utilities', title: 'Água e luz', day: num('utilitiesDay'), amount: num('utilities') }, { id: 'internet', title: 'Internet residencial', day: num('internetDay'), amount: num('internet') }, { id: 'mobile', title: 'Internet celular', day: num('mobileDay'), amount: num('mobile') }];
          const cardPayments: CardPaymentForecast[] = cardOptions.map((card, index) => ({ accountId: card.id, cardName: card.title, amount: optional(`cardAmount${index}`), dueDay: optional(`cardDay${index}`), paymentDay: optional(`cardPaymentDay${index}`), kind: form.get(`cardKind${index}`) === 'confirmed' ? 'confirmed' : 'estimate' }));
          const monthlyCashPlan = validateMonthlyCashPlan({ incomes, fixedExpenses, groceries: num('groceries'), fuel: num('fuel'), buffer: num('buffer'), cardPayments });
          // Month edits never rewrite another month's saved forecast or carry card amounts forward.
          const { cardPayments: _cards, ...defaultLimits } = monthlyCashPlan;
          onChange({ ...data, monthlyCashPlan: data.monthlyCashPlan || defaultLimits, cashPlanMonths: { ...(data.cashPlanMonths || {}), [month]: monthlyCashPlan } });
          setEditing(false);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Confira os valores do plano.'); }
      }}>
        <p className="text-[11px] leading-relaxed text-slate-500">Estas alterações valem apenas para {monthName(month)}. O histórico dos outros meses é preservado.</p>
        {cardOptions.length > 0 && <fieldset className="space-y-3"><legend className="mb-3 text-xs font-medium text-slate-300">Pagamento dos cartões</legend>{cardOptions.map((card, index) => {
          const row = plan?.cardPayments?.find(row => row.accountId === card.id);
          const previousPlan = Object.keys(data.cashPlanMonths || {}).filter(value => value < month).sort().reverse().map(value => data.cashPlanMonths![value].cardPayments?.find(row => row.accountId === card.id)).find(value => value != null);
          const previousDay = previousPlan?.dueDay;
          const dueDay = row?.dueDay ?? data.cardSchedules?.find(row => row.accountId === card.id)?.dueDay ?? previousDay ?? '';
          const paymentDay = row?.paymentDay ?? previousPlan?.paymentDay ?? dueDay;
          return <fieldset key={card.id} className="rounded-xl border border-white/[0.06] p-4"><legend className="px-1 text-xs text-slate-300">{card.title}{!privateMode && card.number ? ` · final ${card.number}` : ''}</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-[11px] text-slate-500">Pagamento planejado neste mês (R$)<input name={`cardAmount${index}`} type="number" min="0" max="1000000000000" step="0.01" defaultValue={row?.amount ?? ''} placeholder="A confirmar" className={input}/></label><label className="text-[11px] text-slate-500">Pagar no dia<input name={`cardPaymentDay${index}`} type="number" min="1" max="31" step="1" defaultValue={paymentDay} placeholder="Dia" className={input}/></label><label className="text-[11px] text-slate-500">Vencimento · dia<input name={`cardDay${index}`} type="number" min="1" max="31" step="1" defaultValue={dueDay} placeholder="Dia" className={input}/></label><label className="text-[11px] text-slate-500">Referência do valor<select name={`cardKind${index}`} defaultValue={row?.kind || 'estimate'} className={input}><option value="estimate">Estimativa</option><option value="confirmed">Conferido por mim no banco</option></select></label></div></fieldset>;
        })}<p className="text-[11px] text-slate-600">Informe quanto pretende pagar neste mês. Esse valor pode ser parcial; não é necessariamente o total da fatura e não registra um pagamento no banco.</p></fieldset>}
        <details className="group rounded-xl border border-white/[0.06] px-4" open={!plan}><summary className="min-h-11 cursor-pointer py-3 text-xs text-slate-400">Renda e despesas variáveis</summary><div className="space-y-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map(index => { const regular = plan?.incomes.filter(income => !income.additional)[index]; return <fieldset key={index} className="grid grid-cols-[1fr_2fr] gap-3"><legend className="mb-2 text-[11px] text-slate-500">{index + 1}º recebimento</legend><label className="text-xs text-slate-400">Dia<input className={input} name={index ? 'secondDay' : 'firstDay'} type="number" min="1" max="31" step="1" required defaultValue={regular?.day ?? (index ? 20 : 5)}/></label><label className="text-xs text-slate-400">Valor líquido (R$)<input className={input} name={index ? 'secondIncome' : 'firstIncome'} type="number" min="0.01" max="1000000000000" step="0.01" required defaultValue={regular?.amount ?? ''}/></label></fieldset>})}</div>
          <fieldset className="grid gap-3 rounded-xl border border-white/[0.05] p-3 sm:grid-cols-2"><legend className="px-1 text-[11px] text-slate-500">Rendas extras (opcional)</legend>{[0, 1].map(index => { const extra = plan?.incomes.filter(income => income.additional)[index]; return <div key={index} className="grid grid-cols-[1fr_2fr] gap-3"><label className="text-xs text-slate-400">Dia<input className={input} name={`extraIncome${index}Day`} type="number" min="1" max="31" step="1" defaultValue={extra?.day ?? ''} placeholder="Dia do recebimento"/></label><label className="text-xs text-slate-400">Valor líquido (R$)<input className={input} name={`extraIncome${index}Amount`} type="number" min="0.01" max="1000000000000" step="0.01" defaultValue={extra?.amount ?? ''} placeholder="Valor"/></label></div>})}</fieldset>
          <div className="grid gap-3 sm:grid-cols-3">{[['utilities', 'Água e luz', 5], ['internet', 'Internet residencial', 8], ['mobile', 'Internet celular', 20]].map(([id, title, defaultDay]) => {
            const row = plan?.fixedExpenses.find(row => row.id === id);
            return <fieldset key={id} className="space-y-2 rounded-lg border border-white/[0.05] p-3"><legend className="px-1 text-[11px] text-slate-500">{title}</legend><label className="block text-xs text-slate-400">Previsão mensal (R$)<input className={input} name={String(id)} type="number" min="0" max="1000000000000" step="0.01" required defaultValue={row?.amount ?? ''}/></label><label className="block text-xs text-slate-400">Vencimento · dia<input className={input} name={id + 'Day'} type="number" min="1" max="31" step="1" required defaultValue={row?.day ?? defaultDay}/></label></fieldset>;
          })}</div>
          <div className="grid gap-3 sm:grid-cols-3">{[['groceries', 'Mercado e higiene'], ['fuel', 'Combustível'], ['buffer', 'Margem de segurança']].map(([key, label]) => <label key={key} className="text-xs text-slate-400">{label} (R$)<input className={input} name={key} type="number" min="0" max="1000000000000" step="0.01" required defaultValue={plan?.[key as 'groceries' | 'fuel' | 'buffer'] ?? ''}/></label>)}</div>
        </div></details>
        {error && <p role="alert" className="text-xs text-amber-200">{error}</p>}
        <div className="flex flex-wrap gap-3"><button type="submit" className="min-h-11 rounded-lg bg-rose-400 px-5 text-xs font-semibold text-slate-950">Salvar {monthName(month)}</button><button type="button" onClick={() => setEditing(false)} className="min-h-11 px-3 text-xs text-slate-500">Cancelar</button></div>
      </form>}
    </section>}
  </section>;
}
