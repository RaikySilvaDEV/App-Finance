import React, { useEffect, useState } from 'react';
import { BankLogo } from './BankLogo';
import { finiteValue } from '../lib/productMapping';
import { brazilDay } from '../lib/planning';
import type { BillPaymentStatus } from '../lib/billStatus';

const labels: Record<BillPaymentStatus, string> = { unpaid: 'Não pagas', paid: 'Pagas', unknown: 'Sem confirmação' };
const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10).split('-').reverse().join('/') : 'Não informado';
export function BankBills({ itemIds, privateMode }: { itemIds: string[]; privateMode: boolean }) {
  const [data, setData] = useState<{ bills: any[]; unavailable: number } | null>(null), [error, setError] = useState('');
  const [filter, setFilter] = useState<BillPaymentStatus>('unpaid'), [period, setPeriod] = useState('all');
  const [version, setVersion] = useState(0), [editing, setEditing] = useState('');
  const [choice, setChoice] = useState<BillPaymentStatus>('paid'), [saving, setSaving] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(); itemIds.forEach((id) => params.append('itemId', id));
    setError('');
    fetch(`/api/open-finance/bills?${params}`, { signal: controller.signal }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Não foi possível consultar as faturas.'); if (!controller.signal.aborted) setData(body); }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [itemIds, version]);
  const money = (value: unknown, currency = 'BRL') => finiteValue(value) == null ? 'Não informado' : privateMode ? '••••' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency });
  const months = [...new Set<string>((data?.bills || []).map((bill) => String(bill.dueDate || '').slice(0, 7)).filter((month) => /^\d{4}-\d{2}$/.test(month)))].sort().reverse();
  const inPeriod = (data?.bills || []).filter((bill) => period === 'all' || String(bill.dueDate).slice(0, 7) === period);
  const visible = inPeriod.filter((bill) => (bill.paymentStatus || 'unknown') === filter);
  const count = (status: BillPaymentStatus) => inPeriod.filter((bill) => (bill.paymentStatus || 'unknown') === status).length;
  async function saveConfirmation(bill: any) {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/user/bill-payment', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: bill.providerItemId, billId: bill.id, status: choice }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Não foi possível salvar a confirmação.');
      // Reload from the server; do not show a successful status before it is persisted.
      setEditing(''); setVersion((value) => value + 1);
    } catch (reason: any) { setError(reason.message); } finally { setSaving(false); }
  }
  return <section className="space-y-4"><h2 className="text-sm font-medium text-white">Histórico de faturas</h2>
    <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2" role="tablist" aria-label="Situação das faturas">{(['unpaid', 'paid', 'unknown'] as const).map((status) => <button key={status} role="tab" aria-selected={filter === status} onClick={() => { setFilter(status); setEditing(''); }} className={`rounded-lg px-3 py-2 text-xs ${filter === status ? 'bg-rose-500/10 text-rose-300' : 'text-slate-400'}`}>{labels[status]}{data ? ` (${count(status)})` : ''}</button>)}</div>
    <details className="text-xs text-slate-500"><summary className="cursor-pointer">Período{period !== 'all' ? ` · ${period.split('-').reverse().join('/')}` : ' · todo o histórico'}</summary><select aria-label="Período do histórico de faturas" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-3 max-w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-300"><option value="all">Todo o histórico</option>{months.map((month) => <option key={month} value={month}>{month.split('-').reverse().join('/')}</option>)}</select></details>
    {error && <p role="alert" className="text-xs text-amber-300">{error}<button className="ml-3 underline" onClick={() => setVersion((value) => value + 1)}>Tentar novamente</button></p>}
    {!data && !error && <p role="status" className="animate-pulse text-xs text-slate-400">Consultando faturas…</p>}
    {!!data?.unavailable && <p role="status" className="text-xs text-amber-200">Consulta parcial: algumas conexões não disponibilizaram faturas.</p>}
    {data && !visible.length && <div className="rounded-xl border border-slate-800 p-4"><p className="text-xs text-slate-400">{filter === 'unpaid' ? 'Nenhuma fatura confirmada como não paga neste período.' : filter === 'paid' ? 'Nenhuma fatura com pagamento confirmado neste período.' : 'Nenhuma fatura sem confirmação neste período.'}</p>{filter !== 'unknown' && count('unknown') > 0 && <button onClick={() => setFilter('unknown')} className="mt-3 text-xs text-rose-300">Conferir {count('unknown')} fatura(s) sem confirmação →</button>}</div>}
    <div className="grid gap-3 md:grid-cols-2">{visible.map((bill) => <article key={bill.id} className="min-w-0 rounded-xl border border-slate-800 p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><BankLogo name={bill.bank}/><div className="min-w-0"><h3 className="truncate text-sm text-white">{bill.bank}</h3><p className="mt-1 text-xs text-slate-500">{bill.cardName || 'Cartão'}{!privateMode && bill.cardLastFour ? ` · final ${bill.cardLastFour}` : ''}</p></div></div><span className={`shrink-0 text-[11px] ${filter === 'paid' ? 'text-emerald-300' : filter === 'unpaid' ? 'text-rose-300' : 'text-slate-400'}`}>{filter === 'paid' ? 'Paga' : filter === 'unpaid' ? 'Não paga' : 'Sem confirmação'}</span></div><p className="mt-3 text-xl text-white">{money(bill.totalAmount, bill.totalAmountCurrencyCode)}</p><p className="mt-1 text-xs text-slate-500">Vencimento: {date(bill.dueDate)}{filter === 'unpaid' && String(bill.dueDate).slice(0, 10) < brazilDay() ? ' · vencida' : ''}</p>{bill.paymentStatusSource === 'user' && <p className="mt-2 text-[11px] text-slate-500">Informado por você</p>}
      <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">Pagamentos e confirmação</summary><p className="mt-3 leading-relaxed">{bill.paymentStatusReason || 'Situação não confirmada pela conexão.'}</p>{Number(bill.minimumPaymentAmount) > 0 && <p className="mt-2">Mínimo informado: {money(bill.minimumPaymentAmount, bill.totalAmountCurrencyCode)}</p>}{(bill.financeCharges || []).filter((charge: any) => Number(charge.amount) !== 0).map((charge: any, index: number) => <p key={`charge:${index}`} className="mt-2">{charge.additionalInfo || charge.type}: {money(charge.amount, charge.currencyCode)}</p>)}{(bill.payments || []).map((payment: any, index: number) => <p key={`payment:${index}`} className="mt-2">Pagamento registrado no ciclo: {money(payment.amount, payment.currencyCode)} · {date(payment.paymentDate)}</p>)}
      {editing === bill.id ? <div className="mt-4 space-y-3 border-t border-slate-800 pt-3"><label className="block">Confirme a situação que você verificou no banco<select aria-label="Confirmar situação da fatura" value={choice} disabled={saving} onChange={(event) => setChoice(event.target.value as BillPaymentStatus)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-300"><option value="paid">Já paguei esta fatura</option><option value="unpaid">Ainda não paguei esta fatura</option><option value="unknown">Remover minha confirmação</option></select></label><p className="text-[11px] leading-relaxed">A confirmação fica salva na sua conta como informada por você. Não realiza pagamento nem altera o banco.</p><div className="flex gap-4"><button disabled={saving} onClick={() => void saveConfirmation(bill)} className="text-rose-300 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar confirmação'}</button><button disabled={saving} onClick={() => setEditing('')}>Cancelar</button></div></div> : <button onClick={() => { setEditing(bill.id); setChoice(bill.paymentStatus === 'unpaid' ? 'unpaid' : 'paid'); }} className="mt-4 text-rose-300">{bill.paymentStatusSource === 'user' ? 'Alterar minha confirmação' : 'Confirmar situação no banco'}</button>}</details></article>)}</div>
    <details className="text-xs text-slate-500"><summary className="cursor-pointer">Como as faturas são separadas?</summary><p className="mt-2 max-w-2xl leading-relaxed">O sistema abre em Não pagas. Pagamentos reconciliados com o ciclo seguinte são identificados com os dados da Pluggy. Quando não há evidência suficiente, a fatura fica em Sem confirmação, mesmo depois do vencimento. Confirmações feitas por você são identificadas separadamente.</p></details>
  </section>;
}
