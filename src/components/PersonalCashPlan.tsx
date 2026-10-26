import { useState } from 'react';
import { ArrowDownLeft, Pencil } from 'lucide-react';
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
  const savedPlan = data.cashPlanMonths?.[month] || data.monthlyCashPlan;
  const sundayDay = (occurrence: 2 | 4) => {
    const firstDay = new Date(`${month}-01T12:00:00Z`).getUTCDay();
    const firstSunday = 1 + ((7 - firstDay) % 7);
    return firstSunday + 7 * (occurrence - 1);
  };
  const plan = savedPlan && { ...savedPlan, incomes: [...savedPlan.incomes, ...(savedPlan.sundayIncomes || []).map(row => ({ day: sundayDay(row.occurrence), amount: row.amount, additional: true }))].sort((a, b) => a.day - b.day) };
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
        <div><dt className="text-[11px] text-slate-500">Separar neste mês</dt><dd className="mt-2 text-xl font-semibold tracking-tight text-slate-200 tabular-nums">{assigned > 0 ? money(assigned) : 'Sem despesas previstas'}</dd></div>
        <div className="col-span-2 border-t border-white/[0.05] pt-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><dt className="text-[11px] text-slate-400">{remaining < 0 ? 'Falta no orçamento' : hasCardValues ? 'Após pagamentos previstos' : 'Para distribuir nos cartões'}</dt><dd className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${remaining < 0 ? 'text-rose-300' : 'text-white'}`}>{remaining === 0 ? 'Tudo destinado' : money(remaining < 0 ? -remaining : remaining)}</dd></div>
      </dl>
      <div className="rounded-2xl border border-white/[0.06] bg-[#101013] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-medium text-slate-200">Sua divisão por recebimento</h3><p className="mt-1 text-[11px] text-slate-500">O salário cobre as contas até a próxima entrada. Os domingos complementam o saldo.</p></div>
          <span className="hidden rounded-full bg-white/[0.04] px-3 py-1 text-[10px] text-slate-400 sm:inline">{monthName(month)}</span>
        </div>
      {pendingCards.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><p className="text-slate-500">Falta prever: {pendingCards.map(card => card.title).join(', ')}.</p><button type="button" onClick={() => setEditing(true)} className="min-h-10 text-rose-300 hover:underline">Planejar cartões →</button></div> : <p className="text-[11px] text-slate-500">{plan.buffer > 0 ? `${money(plan.buffer)} de margem de segurança incluída. ` : ''}Valores previstos para {monthName(month)}.</p>}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{(() => { let carryForward = 0; const salaryDates = plan.incomes.filter(row => !row.additional); return salaryDates.map((payday, index) => {
        const nextDay = salaryDates[index + 1]?.day || 32;
        const stageIncome = plan.incomes.filter(row => row.day >= dayInMonth(payday.day) && row.day < nextDay);
        const stageIncomeTotal = stageIncome.reduce((sum, row) => sum + row.amount, 0);
        const sundayComplements = stageIncome.filter(row => row.additional && row.amount > 0);
        const regularIndex = index;
        const rows = payments.filter(row => row.day >= dayInMonth(payday.day) && row.day < nextDay);
        const grocery = regularIndex === 0 ? Math.floor(plan.groceries * 100 / 2) / 100 : regularIndex === 1 ? plan.groceries - Math.floor(plan.groceries * 100 / 2) / 100 : 0;
        const fuel = regularIndex === 0 ? Math.floor(plan.fuel * 100 / 2) / 100 : regularIndex === 1 ? plan.fuel - Math.floor(plan.fuel * 100 / 2) / 100 : 0;
        const buffer = regularIndex === 0 ? plan.buffer : 0;
        const costs = rows.reduce((sum, row) => sum + row.amount, 0) + grocery + fuel + buffer;
        const carryIn = carryForward;
        const reserve = stageIncomeTotal + carryIn - costs;
        carryForward = reserve;
        const endDay = Math.min(nextDay - 1, new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate());
        const flexibleRows = [{ title: 'Mercado e higiene', amount: grocery }, { title: 'Combustível', amount: fuel }, ...(buffer > 0 ? [{ title: 'Margem de segurança', amount: buffer }] : [])].filter(row => row.amount > 0);
        const itemRows = [...rows.map(row => ({ title: row.title, day: row.day, amount: row.amount, kind: row.status })), ...flexibleRows.map(row => ({ ...row, day: undefined as number | undefined, kind: 'Separar deste recebimento' }))].filter(row => row.amount > 0);
        return <article key={payday.day} className={`overflow-hidden rounded-xl border bg-[#0e0e10] ${reserve < 0 ? 'border-amber-400/25' : 'border-[#242429]'}`}>
          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-sm font-semibold text-slate-200">{String(payday.day).padStart(2, '0')}</span><div><h3 className="text-sm font-medium text-slate-200">Salário · dia {payday.day}</h3><p className="mt-1 text-[11px] text-slate-500">Entra {money(payday.amount)}{sundayComplements.length ? ` + ${money(sundayComplements.reduce((sum, row) => sum + row.amount, 0))} de domingo` : ''} · cobre até dia {endDay}</p></div></div><ArrowDownLeft aria-hidden="true" className="h-4 w-4 text-rose-400"/></div>
          <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:px-5"><div><p className="text-[10px] text-slate-500">Pagar e separar</p><p className="mt-1.5 text-base font-semibold tabular-nums text-slate-200">{costs > 0 ? money(costs) : 'Nenhuma conta prevista'}</p></div><div><p className="text-[10px] text-slate-500">{reserve < 0 ? 'Ainda falta cobrir' : 'Sobra para a próxima etapa'}</p><p className={`mt-1.5 text-base font-semibold tabular-nums ${reserve < 0 ? 'text-amber-200' : 'text-emerald-300'}`}>{reserve === 0 ? 'Tudo destinado' : money(Math.abs(reserve))}</p></div></div>
          <div className="border-t border-white/[0.05] px-4 py-3 sm:px-5"><p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">O que fazer com este valor</p>{itemRows.length || sundayComplements.length ? <ul className="space-y-2">{sundayComplements.map((row, rowIndex) => <li key={`extra-${rowIndex}`} className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 text-slate-500">Renda extra · domingo dia {row.day}</span><span className="shrink-0 tabular-nums text-slate-400">+{money(row.amount)}</span></li>)}{itemRows.map((row, rowIndex) => <li key={`${row.title}-${rowIndex}`} className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 text-slate-300">{row.title}<span className="ml-1 text-[10px] text-slate-600">{row.day ? `pagar dia ${row.day} · ${row.kind}` : row.kind}</span></span><span className="shrink-0 font-medium tabular-nums text-slate-200">{money(row.amount)}</span></li>)}</ul> : <p className="text-xs text-slate-500">Nenhuma conta ou reserva nesta etapa.</p>}
            {carryIn > 0 && <p className="mt-3 border-t border-white/[0.05] pt-2 text-[10px] text-slate-500">Inclui {money(carryIn)} que sobrou da etapa anterior.</p>}
            {reserve < 0 && <p role="status" className="mt-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] p-3 text-[11px] leading-relaxed text-amber-100">Para cobrir tudo até o próximo recebimento, reduza ou adie {money(-reserve)} do valor separado para mercado/combustível. O salário do dia {nextDay <= 31 ? nextDay : '5 do próximo mês'} chega depois.</p>}
          </div>
        </article>;
      }); })()}</div>
      </div>
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
          const sundayIncomes = ([2, 4] as const).flatMap(occurrence => {
            const value = String(form.get(`sundayIncome${occurrence}`) || '').trim();
            return value ? [{ occurrence, amount: Number(value) }] : [];
          });
          const fixedExpenses = [{ id: 'utilities', title: 'Água e luz', day: num('utilitiesDay'), amount: num('utilities') }, { id: 'internet', title: 'Internet residencial', day: num('internetDay'), amount: num('internet') }, { id: 'mobile', title: 'Internet celular', day: num('mobileDay'), amount: num('mobile') }, { id: 'streaming', title: 'Streaming TV', day: num('streamingDay'), amount: num('streaming') }];
          const cardPayments: CardPaymentForecast[] = cardOptions.map((card, index) => ({ accountId: card.id, cardName: card.title, amount: optional(`cardAmount${index}`), dueDay: optional(`cardDay${index}`), paymentDay: optional(`cardPaymentDay${index}`), kind: form.get(`cardKind${index}`) === 'confirmed' ? 'confirmed' : 'estimate' }));
          const monthlyCashPlan = validateMonthlyCashPlan({ incomes, sundayIncomes, fixedExpenses, groceries: num('groceries'), fuel: num('fuel'), buffer: num('buffer'), cardPayments });
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
          <fieldset className="grid gap-3 rounded-xl border border-white/[0.05] p-3 sm:grid-cols-2"><legend className="px-1 text-[11px] text-slate-500">Rendas extras de domingo</legend>{([2, 4] as const).map(occurrence => { const extra = plan?.sundayIncomes?.find(income => income.occurrence === occurrence); return <label key={occurrence} className="text-xs text-slate-400">{occurrence}º domingo · dia {sundayDay(occurrence)} (R$)<input className={input} name={`sundayIncome${occurrence}`} type="number" min="0" max="1000000000000" step="0.01" defaultValue={extra?.amount ?? ''} placeholder="Sem recebimento"/></label>})}</fieldset>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['utilities', 'Água e luz', 5], ['internet', 'Internet residencial', 8], ['mobile', 'Internet celular', 20], ['streaming', 'Streaming TV', 19]].map(([id, title, defaultDay]) => {
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
