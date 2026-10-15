import { finiteValue } from './productMapping';
import type { SavedSnapshot } from './useFinancialHistory';

function reference(value: unknown) {
  if (typeof value !== 'string') return '';
  const text = value.slice(0, 10), date = new Date(`${text}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : '';
}
export function investmentPerformance(asset: any, snapshots: SavedSnapshot[]) {
  const observations = new Map<string, any>();
  for (const snapshot of [...snapshots].sort((a, b) => String(a.capturedAt).localeCompare(String(b.capturedAt)))) {
    const previous = snapshot.investments?.find((row) => row.id === asset.id && (row.providerItemId || row.itemId) === (asset.providerItemId || asset.itemId));
    if (previous && reference(previous.date)) observations.set(reference(previous.date), previous);
  }
  if (reference(asset.date)) observations.set(reference(asset.date), asset);
  const rows = [...observations].sort(([a], [b]) => a.localeCompare(b));
  return rows.map(([date, current], index) => {
    const before = rows[index - 1];
    let change: number | null = null, basis = '', reason = 'Aguardando uma segunda data informada pelo banco.';
    if (before) {
      const previous = before[1];
      const original = finiteValue(current.amountOriginal), oldOriginal = finiteValue(previous.amountOriginal);
      const quantity = finiteValue(current.quantity), oldQuantity = finiteValue(previous.quantity);
      const sameCurrency = (current.currencyCode || 'BRL') === (previous.currencyCode || 'BRL');
      const samePrincipal = original != null && original > 0 && original === oldOriginal;
      const sameQuantity = quantity != null && quantity > 0 && quantity === oldQuantity;
      const quantitiesCompatible = quantity == null && oldQuantity == null || sameQuantity;
      const profit = finiteValue(current.amountProfit), oldProfit = finiteValue(previous.amountProfit);
      if (sameCurrency && samePrincipal && quantitiesCompatible && profit != null && oldProfit != null) {
        change = profit - oldProfit; basis = 'Diferença do lucro líquido acumulado informado pelo banco, com principal e quantidade comparáveis.';
      } else if (sameCurrency && sameQuantity && (original == null && oldOriginal == null || samePrincipal) && finiteValue(current.value) != null && finiteValue(previous.value) != null) {
        change = (Number(current.value) - Number(previous.value)) * quantity; basis = 'Variação bruta da cota multiplicada pela quantidade mantida. Não representa rendimento pago.';
      } else reason = 'Não há dados comparáveis de lucro ou cotas; aplicações e resgates podem alterar os valores.';
    }
    const days = before ? Math.round((Date.parse(date) - Date.parse(before[0])) / 86400000) : null;
    return { date, from: before?.[0], days, change, basis, reason, profit: finiteValue(current.amountProfit) };
  }).reverse();
}
