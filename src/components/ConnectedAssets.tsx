import React, { useState } from 'react';

const classes: Record<string, string> = { FIXED_INCOME: 'Renda fixa', MUTUAL_FUND: 'Fundos', EQUITY: 'Ações', ETF: 'ETFs', SECURITY: 'Previdência', OTHER: 'Outros', COE: 'COE' };
export function ConnectedAssets({ investments, creditCards, isPrivateMode, section = 'investments' }: { investments: any[]; creditCards: any[]; isPrivateMode: boolean; section?: 'cards' | 'investments' }) {
  const [groupBy, setGroupBy] = useState<'type' | 'institution'>('type');
  const [selected, setSelected] = useState<string | null>(null);
  const [movements, setMovements] = useState<Record<string, any[]>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const money = (value: unknown, currency = 'BRL') => isPrivateMode ? '••••••' : value == null ? 'Não informado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
  const groups = new Map<string, { label: string; currency: string; balance: number; count: number }>();
  investments.forEach((asset) => {
    const label = groupBy === 'type' ? classes[asset.type] || asset.type || 'Outros' : asset.institution?.name || asset.institution?.nickname || 'Instituição não informada';
    const currency = asset.currencyCode || 'BRL';
    const key = `${label}:${currency}`;
    const group = groups.get(key) || { label, currency, balance: 0, count: 0 };
    group.balance += Number(asset.balance) || 0;
    group.count += 1;
    groups.set(key, group);
  });
  async function open(asset: any) {
    if (selected === asset.id) { setSelected(null); return; }
    setSelected(asset.id); setError('');
    if (movements[asset.id]) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/open-finance/investment-transactions?investmentId=${encodeURIComponent(asset.id)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMovements((previous) => ({ ...previous, [asset.id]: data.transactions || [] }));
    } catch (reason: any) { setError(reason.message || 'Falha ao carregar movimentações.'); }
    finally { setLoading(false); }
  }
  return <section className="space-y-4">
    {section === 'cards' && <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <h3 className="font-semibold text-white">Cartões de crédito</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{creditCards.map((card) => {
        const data = card.creditData || {};
        const limit = Number(data.creditLimit);
        const used = data.availableCreditLimit != null && data.creditLimit != null ? limit - Number(data.availableCreditLimit) : null;
        const percent = used != null && limit > 0 ? Math.min(100, Math.max(0, used / limit * 100)) : null;
        return <article key={card.id} className="min-w-0 rounded-xl border border-slate-700 p-4"><p className="truncate font-medium text-white">{card.name} {card.number && `· final ${card.number}`}</p><dl className="mt-3 space-y-2 text-xs text-slate-400"><div className="flex justify-between gap-2"><dt>Saldo informado</dt><dd className="text-rose-400">{money(card.balance, card.currencyCode)}</dd></div><div className="flex justify-between gap-2"><dt>Limite total</dt><dd>{money(data.creditLimit, card.currencyCode)}</dd></div><div className="flex justify-between gap-2"><dt>Limite disponível</dt><dd>{money(data.availableCreditLimit, card.currencyCode)}</dd></div><div className="flex justify-between gap-2"><dt>Limite utilizado</dt><dd>{money(used, card.currencyCode)}</dd></div></dl>{percent != null && <div aria-label="Utilização do limite" className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400" style={{ width: `${percent}%` }} /></div>}</article>;
      })}</div>{!creditCards.length && <p className="mt-2 text-xs text-slate-400">Nenhum cartão retornado pela conexão.</p>}
    </div>}
    {section === 'investments' && <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-white">Carteira conectada · {investments.length} ativos</h3><select aria-label="Agrupar investimentos" value={groupBy} onChange={(event) => setGroupBy(event.target.value as 'type' | 'institution')} className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white"><option value="type">Por classe</option><option value="institution">Por instituição</option></select></div>
      <div className="mt-4 space-y-3">{Array.from(groups, ([key, group]) => {
        const total = investments.filter((asset) => (asset.currencyCode || 'BRL') === group.currency).reduce((sum, asset) => sum + (Number(asset.balance) || 0), 0);
        const percent = total > 0 ? group.balance / total * 100 : 0;
        return <div key={key}><div className="flex justify-between gap-2 text-xs text-slate-300"><span>{group.label} · {group.count} ativos</span><span>{money(group.balance, group.currency)} · {isPrivateMode ? '••' : percent.toFixed(1)}%</span></div><div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div></div>;
      })}</div>
      <div className="mt-4 space-y-2">{investments.map((asset) => <article key={asset.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60"><button onClick={() => void open(asset)} aria-expanded={selected === asset.id} className="flex w-full items-center justify-between gap-3 p-4 text-left"><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{asset.name}</p><p className="mt-1 text-xs text-slate-400">{classes[asset.type] || asset.type} · {asset.subtype}</p></div><span className="shrink-0 text-sm text-emerald-400">{money(asset.balance, asset.currencyCode)}</span></button>{selected === asset.id && <div className="border-t border-slate-800 p-4"><dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">{[['Valor investido', money(asset.amount, asset.currencyCode)], ['Rentabilidade contratada', asset.rate != null ? `${asset.rate}% ${asset.rateType || ''}` : 'Não informada'], ['Código', asset.code || 'Não informado'], ['Vencimento', asset.dueDate ? new Date(asset.dueDate).toLocaleDateString('pt-BR') : 'Não informado']].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 text-slate-200">{value}</dd></div>)}</dl><h4 className="mt-4 text-xs font-semibold text-white">Movimentações do investimento</h4>{loading ? <p className="mt-2 text-xs text-slate-400">Carregando…</p> : error ? <p role="alert" className="mt-2 text-xs text-amber-300">{error}</p> : <div className="mt-2 space-y-2">{(movements[asset.id] || []).map((movement) => <div key={movement.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-900 p-3 text-xs text-slate-300"><span>{{ BUY: 'Compra', SELL: 'Venda', TRANSFER: 'Transferência', YIELD: 'Rendimento' }[movement.type as string] || movement.type} · {movement.date ? new Date(movement.date).toLocaleDateString('pt-BR') : 'Data não informada'}</span><span>{money(movement.amount, asset.currencyCode)}</span></div>)}{movements[asset.id]?.length === 0 && <p className="text-xs text-slate-500">Nenhuma movimentação retornada.</p>}</div>}</div>}</article>)}</div>
      {!investments.length && <p className="mt-3 text-xs text-slate-400">Nenhum investimento com saldo. Investimentos zerados ficam ocultos.</p>}
    </div>}
  </section>;
}

