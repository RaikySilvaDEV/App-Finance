import { billOccurrences, installmentDate } from './planning';
import type { PlanningData } from './planning';

/** Only explicitly entered installments; no inference from provider balances. */
export function cardForecast(data: PlanningData, startMonth: string, cardId = '', months = 6) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth) || !Number.isInteger(months) || months < 1 || months > 24) return [];
  const ids = new Set((data.manualCards || []).filter((card) => !cardId || card.id === cardId).map((card) => card.id));
  const entries = billOccurrences(data.bills.filter((bill) => bill.cardId && ids.has(bill.cardId)));
  return Array.from({ length: months }, (_, index) => {
    const month = installmentDate(`${startMonth}-01`, index).slice(0, 7);
    const rows = entries.filter((row) => row.date.slice(0, 7) === month);
    const sum = (paid: boolean) => rows.filter((row) => row.isPaid === paid).reduce((total, row) => total + Math.round(row.amount * 100), 0) / 100;
    return { month, pending: sum(false), paid: sum(true), entries: rows };
  });
}
