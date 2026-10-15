import { finiteValue } from './productMapping.js';

export type BillPaymentStatus = 'paid' | 'unpaid' | 'unknown';
export function classifyBills(bills: any[], confirmations: any[] = [], incompleteAccounts: string[] = []) {
  return bills.map((bill) => {
    const confirmation = confirmations.find((row) => row.billId === bill.id && row.itemId === bill.providerItemId && ['paid', 'unpaid'].includes(row.status));
    if (confirmation) return { ...bill, paymentStatus: confirmation.status as BillPaymentStatus, paymentStatusSource: 'user', paymentStatusAt: confirmation.updatedAt, paymentStatusReason: 'Situação confirmada por você; não altera os registros bancários.' };
    const unknown = { ...bill, paymentStatus: 'unknown' as BillPaymentStatus, paymentStatusSource: 'unconfirmed', paymentStatusReason: 'A conexão não forneceu dados suficientes para confirmar a quitação.' };
    if (incompleteAccounts.includes(bill.accountId)) return unknown;
    const total = finiteValue(bill.totalAmount);
    if (total == null || total <= 0) return unknown;
    const currency = bill.totalAmountCurrencyCode;
    const due = String(bill.dueDate || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return unknown;
    const later = bills.filter((row) => row.accountId === bill.accountId && row.totalAmountCurrencyCode === currency && String(row.dueDate).slice(0, 10) > due).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    const next = later[0];
    if (!next || !currency) return unknown;
    const [year, month] = due.split('-').map(Number), [nextYear, nextMonth] = String(next.dueDate).split('-').map(Number);
    if ((nextYear * 12 + nextMonth) - (year * 12 + month) !== 1 || !Array.isArray(next.payments) || !Array.isArray(next.financeCharges)) return unknown;
    const sum = (rows: any[]) => {
      const ids = new Set<string>(); let value = 0;
      for (const row of rows) {
        if (!row.id || finiteValue(row.amount) == null || Number(row.amount) < 0 || row.currencyCode !== currency) return null;
        if (ids.has(row.id)) continue;
        ids.add(row.id); value += Number(row.amount);
      }
      return value;
    };
    const payments = sum(next.payments), charges = sum(next.financeCharges);
    // Pluggy documents payment reconciliation against the NEXT billing cycle.
    // Compare displayed currency cents: the API may return more decimal places.
    if (payments != null && charges != null && Math.round(payments * 100) === Math.round((total + charges) * 100)) return { ...bill, paymentStatus: 'paid' as BillPaymentStatus, paymentStatusSource: 'pluggy_cycle', paymentStatusReason: 'Pagamentos do ciclo seguinte cobrem o valor desta fatura e os encargos, conforme os dados da Pluggy.' };
    // A missing/partial payment list is not proof that the bill is unpaid.
    return unknown;
  });
}
