import React, { useId, useMemo, useState } from 'react';
import type { BankAccount, FinancialTransaction } from '../types/finance';
import type { SavedSnapshot } from '../lib/useFinancialHistory';
import { brazilDay } from '../lib/planning';
export function BalanceEvolution({ accounts, transactions, isPrivateMode, snapshots = [] }: { accounts: BankAccount[]; transactions: FinancialTransaction[]; isPrivateMode: boolean; snapshots?: SavedSnapshot[] }) {
  const [accountId, setAccountId] = useState('all');
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 8, top: 8 });
  const gradient = useId().replace(/:/g, '');
  const points = useMemo(() => {
    const selected = accounts.filter((account) => (account.currencyCode || 'BRL') === 'BRL' && (accountId === 'all' || account.id === accountId));
    const ids = new Set(selected.map((account) => account.id));
    const current = selected.reduce((sum, account) => sum + account.balance, 0);
    const cutoff = new Date(`${brazilDay()}T12:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - (period === 'week' ? 6 : period === 'month' ? 29 : 364));
    const recorded = snapshots.filter((snapshot) => snapshot.date >= cutoff.toISOString().slice(0, 10) && snapshot.date <= brazilDay() && (accountId === 'all' || snapshot.accounts.some((account) => account.id === accountId))).map((snapshot) => ({ month: snapshot.date, balance: snapshot.accounts.filter((account) => (account.currencyCode || 'BRL') === 'BRL' && (accountId === 'all' || account.id === accountId)).reduce((sum, account) => sum + account.balance, 0), recorded: true })).sort((a, b) => a.month.localeCompare(b.month));
    if (recorded.length >= 2) return recorded;
    const net = new Map<string, number>();
    for (const transaction of transactions) {
      if (!ids.has(transaction.sourceAccountId) || transaction.status !== 'concluido' || (transaction.currencyCode || 'BRL') !== 'BRL' || !transaction.direction) continue;
      const date = new Date(transaction.timestamp); if (Number.isNaN(date.getTime()) || date > new Date()) continue;
      const month = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo' }).format(date);
      net.set(month, (net.get(month) || 0) + (transaction.direction === 'credit' ? transaction.amount : -transaction.amount));
    }
    const earliest = [...net.keys()].sort()[0];
    if (!earliest) return [];
    let balance = current;
    const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date());
    const date = new Date(`${today}T12:00:00Z`);
    const result: { month: string; balance: number }[] = [];
    for (let offset = 0; offset < (period === 'week' ? 7 : period === 'month' ? 30 : 365); offset++) {
      const month = date.toISOString().slice(0, 10);
      if (month < earliest) break;
      result.push({ month, balance }); balance -= net.get(month) || 0;
      date.setUTCDate(date.getUTCDate() - 1);
    }
    return result.reverse();
  }, [accounts, transactions, accountId, period, snapshots]);
  const hasRecordedHistory = points.length > 1 && 'recorded' in points[0];
  const min = Math.min(...points.map((point) => point.balance), 0), max = Math.max(...points.map((point) => point.balance), 1);
  function moveTooltip(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const container = event.currentTarget.parentElement!.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / bounds.width * 700;
    const index = Math.max(0, Math.min(points.length - 1, Math.round((position - 30) / 640 * (points.length - 1))));
    if (!points[index]) return;
    setHoveredIndex(index);
    const pointX = bounds.left - container.left + (30 + index / Math.max(points.length - 1, 1) * 640) / 700 * bounds.width;
    const pointY = bounds.top - container.top + (160 - (points[index].balance - min) / (max - min) * 130) / 190 * bounds.height;
    setTooltipPosition({ left: Math.max(8, Math.min(container.width - 180, pointX - 80)), top: Math.max(8, Math.min(container.height - 65, pointY >= 70 ? pointY - 65 : pointY + 12)) });
  }
  const line = points.map((point, index) => `${30 + index / Math.max(points.length - 1, 1) * 640},${160 - (point.balance - min) / (max - min) * 130}`).join(' ');
  return <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Evolução do saldo <span className="ml-2 text-[10px] font-normal text-slate-500">{hasRecordedHistory ? 'consultas salvas' : 'estimativa'}</span></h2><details className="mt-2 max-w-xl text-[11px] leading-relaxed text-slate-500"><summary className="cursor-pointer">Como este saldo é calculado?</summary><p className="mt-2">{hasRecordedHistory ? 'Último saldo consultado em cada dia salvo no sistema. Dias sem consulta não são inventados. Contas em reais, sem somar cartões.' : 'Reconstrução pelo saldo atual e lançamentos confirmados disponíveis. Pode diferir do saldo histórico do banco se faltarem movimentações. Com duas datas salvas no período, o gráfico passará a usar os saldos realmente consultados. Contas em reais, sem somar cartões.'}</p></details></div><select aria-label="Conta do histórico de saldo" value={accountId} onChange={(event) => { setAccountId(event.target.value); setHoveredIndex(null); }} className="max-w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300"><option value="all">Todas as contas</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.bankName}</option>)}</select></div><div className="my-3 flex justify-end"><div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">{(['week','month','year'] as const).map((value) => <button key={value} onClick={() => { setPeriod(value); setHoveredIndex(null); }} aria-pressed={period === value} className={`rounded-md px-3 py-1.5 text-xs ${period === value ? 'bg-white/[0.07] font-medium text-slate-200' : 'text-slate-400'}`}>{value === 'week' ? '1 semana' : value === 'month' ? '1 mês' : '1 ano'}</button>)}</div></div>{isPrivateMode ? <p className="py-12 text-center text-sm text-slate-500">Valores ocultos</p> : points.length > 1 ? <><div className="relative h-[200px] sm:h-[240px]"><svg onPointerMove={moveTooltip} onPointerDown={moveTooltip} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHoveredIndex(null); }} viewBox="0 0 700 190" preserveAspectRatio="none" role="img" aria-label="Evolução diária estimada do saldo bancário" className="h-full w-full touch-pan-y"><defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f12b58" stopOpacity="0.25"/><stop offset="1" stopColor="#f12b58" stopOpacity="0"/></linearGradient></defs>{[.2,.4,.6,.8].map((value) => <line key={value} x1="30" x2="670" y1={30+value*130} y2={30+value*130} stroke="#202023" strokeDasharray="4 5"/>)}<polygon points={`30,160 ${line} 670,160`} fill={`url(#${gradient})`}/>{hoveredIndex !== null && points[hoveredIndex] && <line x1={30 + hoveredIndex / Math.max(points.length - 1, 1) * 640} x2={30 + hoveredIndex / Math.max(points.length - 1, 1) * 640} y1="25" y2="160" stroke="#71717a" strokeDasharray="3 5"/>}<polyline points={line} fill="none" stroke="#f12b58" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>{points.map((point, index) => <g key={point.month}><circle cx={30 + index / Math.max(points.length - 1, 1) * 640} cy={160 - (point.balance - min) / (max - min) * 130} r={hoveredIndex === index ? 4 : 0} fill="#f12b58"><title>{point.month}: {point.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</title></circle>{(index === 0 || index === points.length - 1) && <text x={30 + index / Math.max(points.length - 1, 1) * 640} y="183" fill="#71717a" fontSize="10" textAnchor={index === 0 ? 'start' : 'end'}>{new Date(`${point.month}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</text>}</g>)}</svg>{hoveredIndex !== null && points[hoveredIndex] && <div role="tooltip" style={tooltipPosition} className="pointer-events-none absolute z-20 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs shadow-xl"><p className="text-slate-400">{new Date(`${points[hoveredIndex].month}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p><p className="mt-1 font-semibold text-white">{points[hoveredIndex].balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>}</div><details className="mt-2 text-xs text-slate-400"><summary className="cursor-pointer">Ver valores por dia</summary><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{points.map((point) => <div key={point.month}><p>{point.month}</p><p className="mt-1 text-slate-200">{point.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>)}</div></details></> : <p className="py-10 text-center text-xs text-slate-500">Ainda não há dias suficientes para reconstruir o histórico.</p>}</section>;
}



