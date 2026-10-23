import { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import type { PortfolioHolding } from '../types/finance';
import type { PriceAlertRule } from '../lib/planning';
import { manualCostPositions, type PriceAlertEvaluation } from '../lib/usePriceAlerts';

const labels: Record<PriceAlertEvaluation['status'], string> = { breached: 'Limite atingido', watching: 'Acompanhando', stale: 'Cotação antiga ou sem data', unavailable: 'Cotação indisponível', no_cost: 'Sem posição com custo cadastrado' };
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const reference = (stamp: number) => new Date(stamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export function PriceAlertSettings({ holdings, rules, onChange, evaluations, checking, checkedAt, onRefresh, privateMode, onCompareCost }: {
  holdings: PortfolioHolding[]; rules: PriceAlertRule[]; onChange: (rules: PriceAlertRule[]) => void;
  evaluations: PriceAlertEvaluation[]; checking: boolean; checkedAt: number; onRefresh: () => void;
  privateMode: boolean; onCompareCost: () => void;
}) {
  const positions = useMemo(() => manualCostPositions(holdings), [holdings]);
  const tickers = [...positions].filter(([, row]) => row.invested > 0).map(([ticker]) => ticker).sort();
  const [ticker, setTicker] = useState(tickers[0] || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!positions.has(ticker)) setTicker([...positions].find(([, row]) => row.invested > 0)?.[0] || ''); }, [positions, ticker]);
  const selectedRule = rules.find(rule => rule.ticker === ticker);
  const breaches = evaluations.filter(row => row.status === 'breached');
  return <div className="space-y-3">
    {!!breaches.length && <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/[0.04] p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-rose-300"><Bell aria-hidden="true" className="h-4 w-4"/>Limite de perda atingido</p>
      <div className="mt-3 space-y-2">{breaches.map(row => <div key={row.ticker} className="flex flex-wrap justify-between gap-2 text-xs"><span className="text-slate-300">{row.ticker} · margem de {row.dropPct}%</span><span className="text-rose-300">{privateMode ? '••••' : `${money(row.quote!.price)} · ${row.changePct!.toFixed(2)}% sobre o custo`}</span></div>)}</div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">A última cotação disponível atingiu sua margem. Confira o preço atual e sua posição na corretora antes de decidir.</p>
      <button type="button" onClick={onCompareCost} className="mt-3 min-h-10 text-xs text-rose-300 hover:underline">Ver comparação com meu custo →</button>
    </div>}
    <details className="rounded-xl border border-white/[0.07] px-4 text-xs text-slate-400">
      <summary className="min-h-12 cursor-pointer py-4">Alertas de queda <span className="ml-2 text-slate-500">{rules.filter(rule => rule.enabled).length ? `${rules.filter(rule => rule.enabled).length} ativo(s)` : 'Definir por ativo'}</span></summary>
      <div className="space-y-4 pb-4">
        <p className="max-w-3xl text-[11px] leading-relaxed text-slate-500">Defina quanto o preço pode cair em relação ao seu preço médio manual. Consultamos a API a cada 5 minutos enquanto o app estiver aberto e visível. As cotações podem ter atraso; os avisos não são ordens de venda.</p>
        {tickers.length ? <form key={`${ticker}:${selectedRule?.dropPct ?? ''}`} onSubmit={event => {
          event.preventDefault(); setMessage(''); setError('');
          const margin = Number(new FormData(event.currentTarget).get('margin'));
          if (!ticker || !Number.isFinite(margin) || margin < .1 || margin > 99) { setError('Informe uma margem entre 0,1% e 99%.'); return; }
          onChange([...rules.filter(rule => rule.ticker !== ticker), { ticker, dropPct: margin, enabled: true }]);
          setMessage(`Limite de ${ticker} atualizado.`);
        }} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="block text-[11px] text-slate-500">Ativo<select value={ticker} onChange={event => { setTicker(event.target.value); setMessage(''); setError(''); }} className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101012] px-3 text-xs text-slate-200">{tickers.map(symbol => <option key={symbol}>{symbol}</option>)}</select></label>
          <label className="block text-[11px] text-slate-500">Queda sobre meu custo (%)<input name="margin" type="number" min="0.1" max="99" step="0.1" required defaultValue={selectedRule?.dropPct ?? ''} placeholder="Defina a margem" className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101012] px-3 text-xs text-slate-200"/></label>
          <button type="submit" className="min-h-11 rounded-lg bg-rose-400 px-4 text-xs font-semibold text-slate-950">{selectedRule?.enabled ? 'Atualizar limite' : 'Ativar alerta'}</button>
        </form> : <p className="text-xs text-slate-500">Cadastre uma posição manual com quantidade e preço médio para definir sua margem.</p>}
        {error && <p role="alert" className="text-xs text-amber-200">{error}</p>}
        {message && <p role="status" className="text-xs text-slate-400">{message}</p>}
        {!!rules.length && <ul className="divide-y divide-white/[0.05]">{rules.map(rule => {
          const row = evaluations.find(row => row.ticker === rule.ticker);
          return <li key={rule.ticker} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="text-xs text-slate-300">{rule.ticker} · queda de {rule.dropPct}% <span className={`ml-2 text-[11px] ${row?.status === 'breached' ? 'text-rose-300' : 'text-slate-500'}`}>{!rule.enabled ? 'Pausado' : checking && !row?.quote ? 'Consultando…' : labels[row?.status || 'unavailable']}</span></p>
              {row?.threshold != null && <p className="mt-1 text-[11px] text-slate-500">Limite: {privateMode ? '••••' : money(row.threshold)}{row.quote && <> · última cotação: {privateMode ? '••••' : money(row.quote.price)}</>}</p>}
              {row?.quote && <p className="mt-1 text-[11px] text-slate-500">{row.quote.at ? reference(row.quote.at) : 'Data da cotação não informada'} · {row.quote.source}</p>}
            </div>
            <div className="flex gap-4"><button type="button" onClick={() => onChange(rules.map(saved => saved.ticker === rule.ticker ? { ...saved, enabled: !saved.enabled } : saved))} className="min-h-10 text-xs text-slate-400 hover:text-white">{rule.enabled ? 'Pausar' : 'Ativar'}</button><button type="button" onClick={() => onChange(rules.filter(saved => saved.ticker !== rule.ticker))} className="min-h-10 text-xs text-slate-500 hover:text-rose-300">Remover</button></div>
          </li>;
        })}</ul>}
        {rules.some(rule => rule.enabled) && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-3"><p className="text-[11px] text-slate-500">{checkedAt ? `Consulta realizada: ${reference(checkedAt)}` : 'Aguardando consulta'} · não monitora com o app fechado</p><button type="button" disabled={checking} onClick={onRefresh} className="min-h-10 text-xs text-rose-300 disabled:opacity-50">{checking ? 'Consultando…' : 'Consultar agora'}</button></div>}
      </div>
    </details>
  </div>;
}
