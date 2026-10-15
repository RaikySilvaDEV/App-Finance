import React from 'react';
import { investmentPerformance } from '../lib/investmentPerformance';
import { finiteValue } from '../lib/productMapping';
import { brazilDay } from '../lib/planning';
import type { SavedSnapshot } from '../lib/useFinancialHistory';

const label = (date: string) => date.split('-').reverse().join('/');
export function InvestmentReturns({ asset, snapshots, privateMode, movements, onLoad }: { asset: any; snapshots: SavedSnapshot[]; privateMode: boolean; movements?: { loading: boolean; error: string; rows: any[]; complete: boolean }; onLoad: () => void }) {
  const rows = investmentPerformance(asset, snapshots), latest = rows[0];
  const money = (value: number) => privateMode ? '••••••' : value.toLocaleString('pt-BR', { style: 'currency', currency: asset.currencyCode || 'BRL' });
  const payments = new Map<string, { gross: number; net: number; netKnown: boolean }>();
  let undated = 0;
  for (const tx of movements?.rows || []) if (tx.type === 'INTEREST') {
    const date = brazilDay(tx.tradeDate || tx.date || 'invalid');
    if (!date || finiteValue(tx.amount) == null) { undated++; continue; }
    const group = payments.get(date) || { gross: 0, net: 0, netKnown: true };
    group.gross += Number(tx.amount);
    if (finiteValue(tx.netAmount) == null) group.netKnown = false; else group.net += Number(tx.netAmount);
    payments.set(date, group);
  }
  return <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4" aria-label="Rendimento do investimento">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xs text-slate-400">{latest?.days === 1 ? 'Variação no dia informado' : 'Variação entre atualizações'}</h3><p className={`mt-2 text-xl font-semibold tabular-nums ${latest?.change != null && latest.change < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{latest?.change != null ? money(latest.change) : 'Aguardando histórico'}</p></div>{latest && <p className="text-right text-[11px] text-slate-500">{latest.from && <>De {label(latest.from)}<br/></>}Até {label(latest.date)}</p>}</div>
    <p className="text-[11px] leading-relaxed text-slate-500">{latest?.change != null ? latest.basis + ' Não é uma previsão nem saldo disponível para saque.' : latest?.reason || 'O banco ainda não forneceu datas de referência para acompanhar a variação.'}</p>
    <details className="border-t border-slate-800 pt-3"><summary className="cursor-pointer text-xs text-slate-400">Histórico por data</summary><div className="mt-3 space-y-3">{rows.slice(0, 14).map((row) => <div key={row.date} className="flex justify-between gap-3 text-xs"><div className="text-slate-400">{label(row.date)}{row.days != null && row.days > 1 && <span className="block text-[10px] text-slate-500">Intervalo de {row.days} dias · sem divisão por dia</span>}</div><span title={row.change == null ? row.reason : row.basis} className={row.change != null && row.change < 0 ? 'text-rose-300' : 'text-slate-200'}>{row.change == null ? 'Sem comparação' : money(row.change)}</span></div>)}{!rows.length && <p className="text-xs text-slate-500">O histórico começa quando o banco disponibiliza datas e valores comparáveis.</p>}</div></details>
    <details onToggle={(event) => { if (event.currentTarget.open) onLoad(); }} className="border-t border-slate-800 pt-3"><summary className="cursor-pointer text-xs text-slate-400">Rendimentos pagos pelo banco</summary><div className="mt-3 space-y-3">{movements?.loading ? <p role="status" className="animate-pulse text-xs text-slate-400">Consultando…</p> : movements?.error ? <><p role="alert" className="text-xs text-amber-300">{movements.error}</p><button onClick={onLoad} className="text-xs text-violet-300">Tentar novamente</button></> : <>{[...payments].sort(([a], [b]) => b.localeCompare(a)).slice(0, 20).map(([date, payment]) => <div key={date} className="flex justify-between gap-3 text-xs"><span className="text-slate-400">{label(date)}</span><span className="text-emerald-300">{money(payment.netKnown ? payment.net : payment.gross)}<span className="ml-2 text-[10px] text-slate-500">{payment.netKnown ? 'líquido' : 'bruto'}</span></span></div>)}{!payments.size && <p className="text-xs text-slate-500">Nenhum rendimento pago foi retornado nesta consulta. Isso não significa que o investimento não rendeu.</p>}{movements?.complete === false && <p className="text-xs text-amber-300">Histórico parcial.</p>}{undated > 0 && <p className="text-xs text-slate-500">Há registros sem data ou valor que não puderam ser agrupados.</p>}<p className="text-[11px] leading-relaxed text-slate-500">Apenas distribuições de renda informadas pelo banco. Aplicações, resgates e amortizações ficam fora destes totais.</p></>}</div></details>
  </section>;
}
