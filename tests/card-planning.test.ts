import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyPlanning, validatePlanning, billOccurrences } from '../src/lib/planning.js';
import { cardForecast } from '../src/lib/cardPlanning.js';
import { findRecurrences } from '../src/lib/dailyControl.js';
import type { ClassifiedTransaction, ManualCard } from '../src/lib/planning.js';

const card: ManualCard = { id: 'card-a', name: 'Meu cartão', bank: 'Banco', lastFour: '1234', closingDay: 25, dueDay: 31, creditLimit: 2000, availableLimit: null, active: true, updatedAt: '2026-10-20T12:00:00Z' };
const plan = () => ({ ...emptyPlanning(), manualCards: [card], bills: [{ id: 'buy', cardId: card.id, title: 'Compra', bank: 'Banco', category: 'Compras', amount: 33.33, dueDate: '2026-01-31', installments: 3, paid: [1] }] });
test('card projection follows confirmed dates, month ends and manual payment flags exactly once', () => {
  const data = validatePlanning(plan());
  const result = cardForecast(data, '2026-01', card.id, 4);
  assert.deepEqual(result.map((r) => r.pending), [33.33, 0, 33.33, 0]);
  assert.equal(result[1].paid, 33.33); assert.equal(result[1].entries[0].date, '2026-02-28');
  assert.equal(result[2].entries[0].date, '2026-03-31');
  assert.equal(billOccurrences(data.bills).length, 3, 'one shared commitment per installment');
  assert.equal(cardForecast(data, '2026-01', 'another-card')[0].pending, 0);
  data.manualCards![0] = { ...card, active: false };
  assert.equal(cardForecast(data, '2026-01')[0].pending, 33.33, 'deactivation must retain outstanding purchases');
  assert.deepEqual(cardForecast(data, 'invalid'), []);
});
test('planning preserves legacy data and rejects malformed or orphaned card references', () => {
  assert.deepEqual(validatePlanning(emptyPlanning()).manualCards, []);
  for (const invalid of [
    { ...plan(), manualCards: [{ ...card, lastFour: '1234567890123456' }] },
    { ...plan(), manualCards: [{ ...card, availableLimit: 3000 }] },
    { ...plan(), manualCards: [{ ...card, closingDay: 32 }] },
    { ...plan(), manualCards: [card, card] },
    { ...plan(), manualCards: [] },
    { ...plan(), bills: [{ ...plan().bills[0], amount: 1.001 }] },
  ]) assert.throws(() => validatePlanning(invalid));
});
function history(amounts = [50, 50, 60]): ClassifiedTransaction[] {
  return amounts.map((amount, i) => ({ id: `${i}`, sourceAccountId: 'a', sourceAccountName: 'Banco', type: 'account_transaction', amount, direction: 'debit', timestamp: `2026-0${7 + i}-10`, status: 'concluido', description: 'Streaming mensal', nature: 'expense', displayCategory: 'Serviços digitais', classificationSource: 'automatic' }));
}
test('recurring insights identify a possible price change and annualize the latest amount', () => {
  const [row] = findRecurrences(history(), '2026-10-20');
  assert.equal(row.lastAmount, 60); assert.equal(row.previousAmount, 50);
  assert.equal(row.changePct, 20); assert.equal(row.annualEstimate, 720);
  assert.equal(row.nextDate, '2026-10-10');
  assert.equal(findRecurrences(history([50, 50, 100]), '2026-10-20').length, 0, 'large outliers are not automatically subscriptions');
});
test('recurrence detection excludes installments, transfers, insufficient data and stale patterns', () => {
  const tx = history();
  assert.equal(findRecurrences(tx.slice(0, 2), '2026-10-20').length, 0);
  assert.equal(findRecurrences(tx.map((row) => ({ ...row, nature: 'own_transfer' })), '2026-10-20').length, 0);
  assert.equal(findRecurrences(tx.map((row) => ({ ...row, creditCardMetadata: { totalInstallments: 3 } })), '2026-10-20').length, 0);
  assert.equal(findRecurrences(tx, '2027-03-20').length, 0);
});
