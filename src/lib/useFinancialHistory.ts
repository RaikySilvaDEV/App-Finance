import { useEffect, useState } from 'react';
import type { BankAccount, FinancialTransaction } from '../types/finance';
export type SavedSnapshot = { date: string; capturedAt: string; accounts: BankAccount[]; investments: any[]; creditCards: any[]; loans: any[] };
export function useFinancialHistory(syncVersion: number, transactions: FinancialTransaction[], snapshot: Omit<SavedSnapshot, 'date' | 'capturedAt'>, complete: boolean, itemIds: string[]) {
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [archived, setArchived] = useState<FinancialTransaction[]>([]);
  const [snapshots, setSnapshots] = useState<SavedSnapshot[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  async function load(signal?: AbortSignal) {
    let after = '', collected: FinancialTransaction[] = [];
    do {
      const response = await fetch(`/api/user/history?after=${encodeURIComponent(after)}`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o histórico.');
      collected.push(...data.transactions); after = data.next || '';
      if (!signal?.aborted) { setDeletedIds(data.deletedIds || []); setSnapshots(data.snapshots); setTotal(data.transactionCount); }
    } while (after);
    if (!signal?.aborted) setArchived(collected);
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { if (!document.hidden) load(controller.signal).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); }); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    if (!syncVersion) return;
    let cancelled = false;
    const persist = async () => {
      setSaving(true);
      try {
        for (let start = 0; start < Math.max(1, transactions.length); start += 100) {
          const response = await fetch('/api/user/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactions: transactions.slice(start, start + 100), ...(start === 0 && complete ? { snapshot } : {}) }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Falha ao salvar o histórico.');
          if (cancelled) return;
        }
        await load();
        if (!cancelled) setError('');
      } catch (reason: any) { if (!cancelled) setError(reason.message); }
      finally { if (!cancelled) setSaving(false); }
    };
    void persist();
    return () => { cancelled = true; };
  }, [syncVersion]);
  const deleted = new Set(deletedIds);
  // The server archive is canonical when background notifications have corrected a record.
  const allTransactions = [...new Map([...transactions, ...archived].filter((tx) => !deleted.has(tx.id) && itemIds.includes(tx.providerItemId || '')).map((tx) => [tx.id, tx])).values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { allTransactions, snapshots, error, saving, loading, total };
}
