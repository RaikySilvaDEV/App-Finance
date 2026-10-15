import { billOccurrences, brazilDay, installmentDate, isConsumption, normalizedText } from './planning';
import type { ClassifiedTransaction, PlanningData } from './planning';
import { normalizeLoan } from './productMapping';

export function findRecurrences(transactions: ClassifiedTransaction[], today = brazilDay()) {
  const groups = new Map<string, ClassifiedTransaction[]>();
  for (const tx of transactions) {
    if (tx.status !== 'concluido' || !['expense', 'income'].includes(tx.nature) || (tx.creditCardMetadata?.totalInstallments || 1) > 1) continue;
    const label = normalizedText(tx.description).replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, '').replace(/\s+/g, ' ').trim();
    const key = `${tx.sourceAccountId}:${tx.currencyCode || 'BRL'}:${tx.direction}:${label.slice(0, 120)}`;
    const rows = groups.get(key) || []; rows.push(tx); groups.set(key, rows);
  }
  return [...groups].flatMap(([id, rows]) => {
    rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const recent = rows.filter((row) => brazilDay(row.timestamp) >= installmentDate(today, -6));
    if (recent.length < 3) return [];
    const sample = recent.slice(-6), last = sample.at(-1)!;
    if (brazilDay(last.timestamp) < installmentDate(today, -2) || new Set(sample.map((row) => brazilDay(row.timestamp).slice(0, 7))).size !== sample.length) return [];
    const mean = sample.reduce((sum, row) => sum + row.amount, 0) / sample.length;
    if (mean <= 0 || sample.some((row) => Math.abs(row.amount - mean) / mean > .1)) return [];
    for (let i = 1; i < sample.length; i++) {
      const interval = (Date.parse(`${brazilDay(sample[i].timestamp)}T12:00:00Z`) - Date.parse(`${brazilDay(sample[i - 1].timestamp)}T12:00:00Z`)) / 86400000;
      if (interval < 25 || interval > 35) return [];
    }
    return [{ id, title: last.description, bank: last.sourceAccountName, category: last.displayCategory, direction: last.direction, currency: last.currencyCode || 'BRL', average: Math.round(mean * 100) / 100, occurrences: sample.length, lastDate: brazilDay(last.timestamp), nextDate: installmentDate(brazilDay(last.timestamp), 1) }];
  });
}

/** Only the next manual loan installment is known; never infer a full amortization plan. */
export function commitments(data: PlanningData) {
  const bills = billOccurrences(data.bills).map((row) => ({ id: row.occurrenceId, title: row.title, bank: row.bank, date: row.date, amount: row.amount, paid: row.isPaid, source: 'Cadastro manual' }));
  const loans = data.manualLoans.filter((loan) => !loan.alsoConnected && loan.remaining > 0 && loan.installment > 0 && loan.nextDue && !bills.some((bill) => bill.date === loan.nextDue && Math.abs(bill.amount - loan.installment) < .01 && normalizedText(bill.bank) === normalizedText(loan.bank))).map((loan) => ({ id: `loan:${loan.id}`, title: loan.title, bank: loan.bank, date: loan.nextDue, amount: loan.installment, paid: false, source: 'Próxima parcela manual' }));
  return [...bills, ...loans].sort((a, b) => a.date.localeCompare(b.date));
}
export type DailyAlert = { id: string; title: string; detail: string; severity: 'warning' | 'info'; target: 'bills' | 'budgets' | 'connections' | 'recurring' | 'loans'; month?: string };
export function dailyAlerts(data: PlanningData, transactions: ClassifiedTransaction[], connections: any[], today = brazilDay(), loans: any[] = []): DailyAlert[] {
  const alerts: DailyAlert[] = [];
  const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const cutoff = new Date(`${today}T12:00:00Z`); cutoff.setUTCDate(cutoff.getUTCDate() + 7);
  for (const raw of loans) {
    const loan = normalizeLoan(raw);
    if (loan.outstandingBalance != null && loan.outstandingBalance <= 0) continue;
    const overdue = (loan.pastDueInstallments || 0) > 0;
    const due = loan.nextDueDate;
    if (!overdue && (!due || due > cutoff.toISOString().slice(0, 10))) continue;
    const name = loan.productName || 'Empréstimo conectado';
    alerts.push({ id: `connected-loan:${loan.id}`, title: overdue ? 'Banco informou parcelas em atraso' : due! < today ? 'Vencimento do empréstimo passou: confira' : 'Vencimento de empréstimo próximo', detail: `${name} · ${loan.institution || 'Instituição conectada'}${due ? ` · vencimento ${due.split('-').reverse().join('/')}` : ''}${overdue ? ` · ${loan.pastDueInstallments} parcela(s) em atraso informada(s)` : ' · confira no banco se a parcela já foi paga'}${loan.outstandingBalance != null ? ` · saldo devedor do contrato ${loan.outstandingBalance.toLocaleString('pt-BR', { style: 'currency', currency: loan.currencyCode || 'BRL' })}` : ''}`, severity: 'warning', target: 'loans' });
  }
  for (const bill of commitments(data).filter((row) => !row.paid && row.date <= cutoff.toISOString().slice(0, 10))) {
    alerts.push({ id: bill.id, title: bill.date < today ? 'Pagamento pendente de confirmação' : bill.date === today ? 'Vence hoje' : 'Vence nos próximos 7 dias', detail: `${bill.title} · ${bill.bank || 'Manual'} · ${money(bill.amount)} · ${bill.date.split('-').reverse().join('/')} · pagamento não confirmado no sistema`, severity: 'warning', target: bill.source === 'Próxima parcela manual' ? 'loans' : 'bills', month: bill.date.slice(0, 7) });
  }
  for (const budget of data.budgets.filter((row) => row.month === today.slice(0, 7))) {
    const used = transactions.filter((tx) => isConsumption(tx) && (tx.currencyCode || 'BRL') === 'BRL' && brazilDay(tx.timestamp).slice(0, 7) === budget.month && tx.displayCategory === budget.category).reduce((sum, tx) => sum + tx.amount, 0);
    if (used >= budget.limit * .9) alerts.push({ id: `budget:${budget.id}`, title: used > budget.limit ? 'Orçamento ultrapassado' : 'Orçamento próximo do limite', detail: `${budget.category}: ${money(used)} de ${money(budget.limit)}`, severity: 'warning', target: 'budgets' });
  }
  for (const connection of connections) {
    const stamp = Date.parse(connection.lastUpdatedAt || '');
    if (!['UPDATED', 'UPDATING'].includes(connection.status) || !Number.isFinite(stamp) || Date.now() - stamp > 48 * 3600000) alerts.push({ id: `connection:${connection.id}`, title: 'Verifique sua conexão bancária', detail: `${connection.institution || 'Banco conectado'}: ${connection.status === 'UPDATED' ? 'dados sem atualização há mais de 48 horas' : 'pode precisar de autorização no Meu Pluggy'}`, severity: 'warning', target: 'connections' });
  }
  const suggested = findRecurrences(transactions, today).filter((row) => !data.recurrenceDecisions?.[row.id]);
  if (suggested.length) alerts.push({ id: 'recurring', title: 'Possíveis recorrências encontradas', detail: `${suggested.length} sugestões para você revisar. Nenhuma cobrança foi cadastrada automaticamente.`, severity: 'info', target: 'recurring' });
  return alerts;
}
