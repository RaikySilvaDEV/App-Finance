import { useEffect, useId, useState } from 'react';
import { finiteValue } from '../lib/productMapping';
import { brazilDay } from '../lib/planning';
import type { BillPaymentStatus } from '../lib/billStatus';

type Card = {
  id: string; providerItemId?: string; currencyCode?: string; updatedAt?: string;
  creditData?: { creditLimit?: unknown; availableCreditLimit?: unknown; balanceDueDate?: unknown; balanceCloseDate?: unknown; minimumPayment?: unknown };
};
type Bill = {
  id: string; accountId: string; providerItemId: string; dueDate?: string;
  totalAmount?: unknown; totalAmountCurrencyCode?: string; minimumPaymentAmount?: unknown;
  paymentStatus?: BillPaymentStatus; paymentStatusSource?: string;
};
const paymentLabels: Record<BillPaymentStatus, string> = { paid: 'Paga', unpaid: 'Não paga', unknown: 'Pagamento não confirmado' };
function calendarDay(value: unknown) {
  if (typeof value !== 'string') return '';
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
  const stamp = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(stamp.getTime()) && stamp.toISOString().slice(0, 10) === day ? day : '';
}
const date = (value: unknown) => calendarDay(value) ? calendarDay(value).split('-').reverse().join('/') : 'Não informado';
function chooseCycle(bills: Bill[], due: string) {
  // A reported due date must match the bill itself. Never borrow an older bill's total.
  if (due) return bills.find(bill => calendarDay(bill.dueDate) === due)?.id || '';
  const today = brazilDay();
  const candidates = bills.filter(bill => bill.paymentStatus !== 'paid' && calendarDay(bill.dueDate));
  const future = candidates.filter(bill => calendarDay(bill.dueDate) >= today).sort((a, b) => calendarDay(a.dueDate).localeCompare(calendarDay(b.dueDate)));
  return future[0]?.id || candidates.filter(bill => calendarDay(bill.dueDate).slice(0, 7) === today.slice(0, 7)).sort((a, b) => calendarDay(b.dueDate).localeCompare(calendarDay(a.dueDate)))[0]?.id || '';
}

export function ConnectedCardDetails({ card, privateMode }: { card: Card; privateMode: boolean }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<{ bills: Bill[]; unavailable: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const selectId = useId();
  const credit = card.creditData || {};
  const due = calendarDay(credit.balanceDueDate);
  const limit = finiteValue(credit.creditLimit), available = finiteValue(credit.availableCreditLimit);
  const used = limit != null && available != null ? Math.max(0, limit - available) : null;
  const percent = limit != null && limit > 0 && used != null ? Math.min(100, used / limit * 100) : null;
  useEffect(() => {
    if (!open) return;
    if (!card.providerItemId) { setError('O vínculo bancário deste cartão não está disponível. Recarregue suas conexões.'); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ itemId: card.providerItemId, accountId: card.id });
    fetch(`/api/open-finance/bills?${params}`, { signal: controller.signal })
      .then(async response => {
        if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Não foi possível consultar as faturas. Tente novamente.');
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Não foi possível consultar as faturas.');
        if (!Array.isArray(body.bills)) throw new Error('O servidor não retornou as faturas.');
        if (!controller.signal.aborted) {
          const bills: Bill[] = body.bills.filter((bill: Bill) => bill.accountId === card.id && bill.providerItemId === card.providerItemId);
          setData({ bills, unavailable: Number(body.unavailable) || 0 });
          setSelectedId(chooseCycle(bills, due));
        }
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, card.id, card.providerItemId, due, version]);
  const bill = data?.bills.find(row => row.id === selectedId);
  const currency = bill?.totalAmountCurrencyCode || card.currencyCode || 'BRL';
  const money = (value: unknown, code = currency) => finiteValue(value) == null ? 'Não informado' : privateMode ? '••••••' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: code });
  const minimum = bill ? finiteValue(bill.minimumPaymentAmount) : null;
  return <details className="wallet-disclosure" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer">Fatura, vencimento e limites</summary>
    <div className="mt-3 space-y-4 border-t border-white/[0.06] pt-4">
      <dl className="grid grid-cols-2 gap-4 text-xs">
        <div className="min-w-0"><dt className="text-slate-500">Vencimento informado pelo cartão</dt><dd className="mt-1 text-slate-200">{date(credit.balanceDueDate)}</dd></div>
        <div className="min-w-0"><dt className="text-slate-500">Fechamento informado</dt><dd className="mt-1 text-slate-200">{date(credit.balanceCloseDate)}</dd></div>
        <div className="min-w-0"><dt className="text-slate-500">Limite total</dt><dd className="mt-1 break-words text-slate-200">{money(limit, card.currencyCode)}</dd></div>
        <div className="min-w-0"><dt className="text-slate-500">Limite utilizado · calculado</dt><dd className="mt-1 break-words text-slate-200">{money(used, card.currencyCode)}</dd></div>
      </dl>
      {percent != null && <div role="progressbar" aria-label="Utilização do limite" aria-valuemin={0} aria-valuemax={100} aria-valuenow={privateMode ? undefined : Math.round(percent)} className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-rose-400" style={{ width: privateMode ? '0%' : `${percent}%` }}/></div>}
      <div className="border-t border-white/[0.06] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-medium text-slate-300">Fatura informada pelo banco</h3><button type="button" disabled={loading} onClick={() => setVersion(value => value + 1)} className="min-h-9 text-[11px] text-rose-300 disabled:opacity-50">{loading ? 'Consultando…' : 'Consultar faturas'}</button></div>
        {loading && <div role="status" className="mt-3 h-16 motion-safe:animate-pulse rounded-lg bg-white/[0.025]"><span className="sr-only">Consultando a fatura deste cartão…</span></div>}
        {error && <p role="alert" className="mt-2 text-xs text-amber-200">{error}</p>}
        {!!data?.unavailable && !loading && <p className="mt-2 text-[11px] text-amber-200">O banco não disponibilizou todas as faturas nesta consulta.</p>}
        {!loading && bill && <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/10 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-lg font-semibold text-slate-100">{money(bill.totalAmount)}</p><span className={`text-[11px] ${bill.paymentStatus === 'paid' ? 'text-emerald-300' : bill.paymentStatus === 'unpaid' ? 'text-rose-300' : 'text-slate-500'}`}>{paymentLabels[bill.paymentStatus || 'unknown']}</span></div>
          <p className="mt-1 text-xs text-slate-400">Vencimento da fatura: {date(bill.dueDate)}</p>
          {bill.paymentStatusSource === 'user' && <p className="mt-1 text-[11px] text-slate-500">Situação de pagamento informada por você.</p>}
          {minimum != null && minimum > 0 && <p className="mt-2 text-[11px] text-slate-500">Pagamento mínimo: {money(minimum)}</p>}
        </div>}
        {!loading && data && !bill && !error && <p className="mt-3 text-xs leading-relaxed text-slate-500">{due ? `A conexão não retornou uma fatura para o vencimento ${date(due)}.` : 'A conexão não retornou uma fatura para o ciclo atual.'} O saldo e o limite utilizado não são usados como total da fatura.</p>}
        {!!data?.bills.length && !loading && <div className="mt-3"><label htmlFor={selectId} className="text-[11px] text-slate-500">Consultar outro ciclo</label><select id={selectId} value={selectedId} onChange={event => setSelectedId(event.target.value)} className="mt-2 min-h-10 w-full rounded-lg border border-white/10 bg-[#101012] px-3 text-xs text-slate-300"><option value="">Selecione a fatura</option>{data.bills.map(row => <option key={row.id} value={row.id}>{date(row.dueDate)} · {paymentLabels[row.paymentStatus || 'unknown']}</option>)}</select></div>}
      </div>
      {card.updatedAt && Number.isFinite(Date.parse(card.updatedAt)) && <p className="text-[10px] text-slate-500">Dados do cartão: {new Date(card.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>}
    </div>
  </details>;
}
