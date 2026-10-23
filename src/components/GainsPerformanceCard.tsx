import React, { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { PriceAlertSettings } from './PriceAlertSettings';
import { manualCostPositions, type usePriceAlerts } from '../lib/usePriceAlerts';
import type { PriceAlertRule } from '../lib/planning';
import type { Asset, PortfolioHolding } from '../types/finance';

interface HistoryPoint { timestamp: number; close: number }
interface HistoryResponse { points: HistoryPoint[]; currency?: string; source?: string }
interface Series extends HistoryResponse { ticker: string }
interface ConnectedInvestment { type?: string; code?: string | null; currencyCode?: string; balance?: number | null }
const noConnectedInvestments: ConnectedInvestment[] = [];
interface Props { priceRules: PriceAlertRule[]; onPriceRulesChange: (rules: PriceAlertRule[]) => void; priceMonitor: ReturnType<typeof usePriceAlerts>; connectedInvestments?: ConnectedInvestment[]; holdings: PortfolioHolding[]; isPrivateMode: boolean; assets: Asset[]; onManageHoldings?: () => void }
const colors = ['#f12b58', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee', '#e879f9', '#a3e635'];
const day = (stamp: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(stamp);
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
const pct = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`;
const money = (value: number, currency: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

export const GainsPerformanceCard: React.FC<Props> = ({ holdings, isPrivateMode, assets, onManageHoldings, priceRules, onPriceRulesChange, priceMonitor, connectedInvestments = noConnectedInvestments }) => {
  const positions = useMemo(() => manualCostPositions(holdings), [holdings]);
  const ownedTickers = useMemo(() => [...new Set([...positions.keys(), ...connectedInvestments.flatMap(asset => {
    // Only use an explicit exchange code; product names and fixed income are not tickers.
    const code = typeof asset.code === 'string' ? asset.code.trim().toUpperCase().replace(/\.SA$/, '') : '';
    return ['EQUITY', 'ETF'].includes(asset.type || '') && asset.currencyCode === 'BRL' && Number(asset.balance) > 0 && /^[A-Z]{4,5}\d{1,2}$/.test(code) ? [code] : [];
  })])].sort(), [positions, connectedInvestments]);
  const [scope, setScope] = useState<'positions' | 'market'>('positions');
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [mode, setMode] = useState<'period' | 'cost'>('period');
  const [series, setSeries] = useState<Series[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [anchor, setAnchor] = useState({ left: 8, top: 8 });
  const own = scope === 'positions' && ownedTickers.length > 0;
  const tickerKey = useMemo(() => [...new Set(own ? ownedTickers : assets.map(asset => asset.ticker.trim().toUpperCase()).filter(ticker => /^[A-Z0-9.^-]{1,15}$/.test(ticker)))].sort().join(','), [own, ownedTickers, assets]);
  useEffect(() => {
    const controller = new AbortController();
    const tickers = tickerKey ? tickerKey.split(',') : [];
    setSeries([]); setErrors([]); setHidden([]); setHoveredDay(null);
    if (!tickers.length) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    async function load() {
      let next = 0;
      const results: Series[] = [];
      const failed: string[] = [];
      // Bound concurrent requests even when a portfolio contains many symbols.
      await Promise.all(Array.from({ length: Math.min(4, tickers.length) }, async () => {
        while (next < tickers.length && !controller.signal.aborted) {
          const ticker = tickers[next++];
          try {
            const response = await fetch(`/api/market/history/${encodeURIComponent(ticker)}`, { signal: controller.signal });
            if (!response.headers.get('content-type')?.includes('application/json')) throw new Error();
            const data: HistoryResponse = await response.json();
            if (!response.ok || !Array.isArray(data.points)) throw new Error();
            const points = data.points.filter(point => Number.isFinite(point.timestamp) && Number.isFinite(point.close) && point.close > 0).sort((a, b) => a.timestamp - b.timestamp);
            if (!points.length) throw new Error();
            results.push({ ticker, currency: data.currency || 'BRL', source: data.source || 'Fonte não informada', points });
          } catch { if (!controller.signal.aborted) failed.push(ticker); }
        }
      }));
      if (!controller.signal.aborted) { setSeries(results.sort((a, b) => a.ticker.localeCompare(b.ticker))); setErrors(failed.sort()); setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [tickerKey, refresh]);
  const effectiveMode = own && positions.size > 0 ? mode : 'period';
  const comparison = useMemo(() => {
    if (!series.length) return [];
    const lastTime = Math.max(...series.map(row => row.points.at(-1)!.timestamp));
    const periodStart = period === 'week' ? lastTime - 7 * 86400000 : -Infinity;
    const starts = series.map(row => row.points.find(point => point.timestamp >= periodStart)?.timestamp).filter((stamp): stamp is number => stamp !== undefined);
    const startDay = starts.length ? day(Math.max(...starts)) : '';
    return series.map((row, index) => {
      const points = row.points.filter(point => day(point.timestamp) >= startDay);
      const position = positions.get(row.ticker);
      const average = position && position.quantity > 0 && position.invested > 0 && row.currency === 'BRL' ? position.invested / position.quantity : null;
      const base = effectiveMode === 'cost' ? average : points[0]?.close;
      return { ...row, color: colors[index % colors.length], average, position, points, chart: points.map(point => ({ ...point, day: day(point.timestamp), value: base ? (point.close / base - 1) * 100 : null })) };
    });
  }, [series, period, positions, effectiveMode]);
  const visible = comparison.filter(row => !hidden.includes(row.ticker) && row.chart.some(point => point.value !== null));
  const days = [...new Set(visible.flatMap(row => row.chart.map(point => point.day)))].sort();
  const values = visible.flatMap(row => row.chart.flatMap(point => point.value === null ? [] : [point.value]));
  const minimum = Math.min(0, ...values), maximum = Math.max(0, ...values);
  const spread = maximum - minimum || 1;
  const low = minimum - spread * .12, high = maximum + spread * .12;
  const width = 800, height = 290, padX = 48, padY = 26;
  const firstDay = days[0] ? Date.parse(days[0]) : 0;
  const lastDay = days.at(-1) ? Date.parse(days.at(-1)!) : firstDay;
  const x = (value: string) => padX + (Date.parse(value) - firstDay) / (lastDay - firstDay || 1) * (width - 2 * padX);
  const y = (value: number) => height - padY - (value - low) / (high - low) * (height - 2 * padY);
  useEffect(() => setHoveredDay(null), [tickerKey, period, effectiveMode, hidden, refresh]);
  function pointAt(selectedDay: string) {
    return visible.flatMap(row => {
      const point = row.chart.find(point => point.day === selectedDay);
      return point && point.value !== null ? [{ row, point }] : [];
    });
  }
  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (!days.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const container = event.currentTarget.parentElement!.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / bounds.width * width;
    const selectedDay = days.reduce((best, value) => Math.abs(x(value) - position) < Math.abs(x(best) - position) ? value : best, days[0]);
    const points = pointAt(selectedDay);
    const pointerY = (event.clientY - bounds.top) / bounds.height * height;
    const nearest = points.reduce<(typeof points)[number] | null>((best, value) => !best || Math.abs(y(value.point.value!) - pointerY) < Math.abs(y(best.point.value!) - pointerY) ? value : best, null);
    const pointX = bounds.left - container.left + x(selectedDay) / width * bounds.width;
    const pointY = nearest ? bounds.top - container.top + y(nearest.point.value!) / height * bounds.height : 10;
    setHoveredDay(selectedDay);
    setAnchor({ left: Math.max(8, Math.min(container.width - Math.min(270, container.width - 16) - 8, pointX - 120)), top: Math.max(8, Math.min(container.height - 180, pointY - 120)) });
  }
  const maskedPct = (value: number) => isPrivateMode ? '••••' : pct(value);
  const selectedPoints = hoveredDay ? pointAt(hoveredDay) : [];
  const control = 'min-h-10 rounded-lg border border-white/10 bg-[#101012] px-3 text-xs text-slate-300';
  return <section className="space-y-4" aria-label="Comparação das cotações">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Activity aria-hidden="true" className="h-4 w-4 text-rose-400"/>Comparar ativos</h2><p className="mt-1 text-[11px] text-slate-500">{own ? 'Seus ativos com código de bolsa' : 'Cotações de mercado · não representam sua carteira'} · dados diários</p></div>
      <div className="flex flex-wrap gap-2">
        {!!ownedTickers.length && <select aria-label="Ativos para comparar" value={scope} onChange={event => setScope(event.target.value as typeof scope)} className={control}><option value="positions">Meus ativos</option><option value="market">Mercado</option></select>}
        <select aria-label="Período das cotações" value={period} onChange={event => setPeriod(event.target.value as typeof period)} className={control}><option value="week">1 semana</option><option value="month">1 mês</option></select>
        {own && positions.size > 0 && <select aria-label="Base de comparação" value={mode} onChange={event => setMode(event.target.value as typeof mode)} className={control}><option value="period">Variação no período</option><option value="cost">Sobre meu preço médio</option></select>}
        <button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading || !tickerKey} className={`${control} disabled:opacity-50`} aria-label="Atualizar cotações" title="Atualizar cotações"><RefreshCw className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`}/></button>
      </div>
    </div>
    {!own && onManageHoldings && <p className="text-xs text-slate-400">Cadastre quantidade e preço médio para acompanhar seu ganho ou perda. <button type="button" onClick={onManageHoldings} className="text-rose-300 hover:underline">Cadastrar posição →</button></p>}
    <PriceAlertSettings holdings={holdings} rules={priceRules} onChange={onPriceRulesChange} evaluations={priceMonitor.evaluations} checking={priceMonitor.checking} checkedAt={priceMonitor.checkedAt} onRefresh={priceMonitor.reload} privateMode={isPrivateMode} onCompareCost={() => { setScope('positions'); setMode('cost'); }}/>
    <div className="relative h-[290px] min-w-0 rounded-xl border border-white/[0.06] bg-[#0b0b0d] p-2 sm:h-[350px]" aria-busy={loading}>
      {loading ? <div role="status" className="absolute inset-0 grid place-items-center text-xs text-slate-400">Carregando as cotações…</div> : !days.length ? <div role="status" className="absolute inset-0 grid place-items-center p-5 text-center text-sm text-slate-500">{!tickerKey ? 'Nenhum ativo com cotação para comparar.' : hidden.length ? 'Selecione um ativo na legenda abaixo.' : 'Histórico indisponível para os ativos selecionados.'}</div> : <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full touch-pan-y" role="img" tabIndex={0} aria-label={`Comparação percentual de ${visible.map(row => row.ticker).join(', ')}. Use as setas para consultar as datas.`} onPointerMove={move} onPointerDown={move} onPointerLeave={event => { if (event.pointerType === 'mouse') setHoveredDay(null); }} onBlur={() => setHoveredDay(null)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Escape') { setHoveredDay(null); return; }
        const current = hoveredDay ? days.indexOf(hoveredDay) : days.length - 1;
        setHoveredDay(days[Math.max(0, Math.min(days.length - 1, current + (event.key === 'ArrowLeft' ? -1 : 1)))]);
        setAnchor({ left: 52, top: 12 });
      }}>
        {[0, .25, .5, .75, 1].map(part => { const value = low + part * (high - low); return <g key={part}><line x1={padX} x2={width - padX} y1={y(value)} y2={y(value)} stroke="#202023" strokeDasharray="3 5"/><text x={padX - 6} y={y(value) + 4} fill="#71717a" fontSize="10" textAnchor="end">{isPrivateMode ? '••' : value.toFixed(1) + '%'}</text></g>; })}
        <line x1={padX} x2={width - padX} y1={y(0)} y2={y(0)} stroke="#71717a" strokeDasharray="5 4"/>
        {visible.map(row => <g key={row.ticker}><polyline points={row.chart.filter(point => point.value !== null).map(point => `${x(point.day)},${y(point.value!)}`).join(' ')} fill="none" stroke={row.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>{row.chart.filter(point => point.value !== null).map(point => <circle key={point.timestamp} cx={x(point.day)} cy={y(point.value!)} r={point.day === hoveredDay ? 4 : 1.8} fill={row.color}><title>{row.ticker} · {date(point.day)} · {isPrivateMode ? '••••' : money(point.close, row.currency || 'BRL')} · {maskedPct(point.value!)}</title></circle>)}</g>)}
        {hoveredDay && <line x1={x(hoveredDay)} x2={x(hoveredDay)} y1={padY} y2={height - padY} stroke="#929297" strokeDasharray="4 4"/>}
        {[...new Set([days[0], days[Math.floor(days.length / 2)], days.at(-1)!])].map(value => <text key={value} x={x(value)} y={height - 4} fill="#929297" fontSize="10" textAnchor="middle">{date(value)}</text>)}
      </svg>}
      {!!selectedPoints.length && !loading && <div role="tooltip" className="pointer-events-none absolute z-20 max-h-44 w-[min(270px,calc(100%-16px))] overflow-hidden rounded-lg border border-white/15 bg-[#18181d] px-3 py-2 text-[11px] shadow-xl" style={anchor}><p className="mb-2 text-slate-400">{date(hoveredDay!)} · {hoveredDay!.slice(0, 4)}</p>{selectedPoints.slice(0, 5).map(({ row, point }) => <div key={row.ticker} className="flex items-center justify-between gap-3 py-0.5"><span style={{ color: row.color }}>{row.ticker}</span><span className="tabular-nums text-slate-200">{isPrivateMode ? '••••' : money(point.close, row.currency || 'BRL')} <span className={point.value! < 0 ? 'text-rose-300' : 'text-emerald-300'}>{maskedPct(point.value!)}</span></span></div>)}{selectedPoints.length > 5 && <p className="mt-1 text-slate-400">+{selectedPoints.length - 5} ativos nos detalhes abaixo</p>}</div>}
    </div>
    {!!comparison.length && <div className="flex flex-wrap gap-2" aria-label="Ativos visíveis no gráfico">{comparison.map(row => <button type="button" key={row.ticker} onClick={() => setHidden(old => old.includes(row.ticker) ? old.filter(ticker => ticker !== row.ticker) : [...old, row.ticker])} aria-pressed={!hidden.includes(row.ticker)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/[0.07] px-3 text-xs ${hidden.includes(row.ticker) ? 'text-slate-600' : 'text-slate-300'}`}><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: row.color }}/>{row.ticker}<span className={`tabular-nums ${hidden.includes(row.ticker) || row.chart.at(-1)?.value == null ? '' : row.chart.at(-1)!.value! < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{row.chart.at(-1)?.value == null ? '—' : maskedPct(row.chart.at(-1)!.value!)}</span></button>)}</div>}
    {effectiveMode === 'cost' && comparison.some(row => !row.average) && <p className="text-xs text-slate-400">Ativos sem preço médio compatível não entram nesta comparação. Use “Variação no período” para vê-los.</p>}
    {!!errors.length && <p role="status" className="text-xs text-amber-200">Sem histórico: {errors.join(', ')}. Esses ativos não entram no gráfico.</p>}
    <p className="text-[11px] leading-relaxed text-slate-500">{effectiveMode === 'cost' ? 'Posições manuais com custo conhecido: 0% representa seu preço médio atual cadastrado. Resultado bruto, sem taxas, impostos ou proventos.' : 'Cada linha parte de 0% no primeiro ponto disponível da janela comparada. A variação não representa seu lucro pessoal.'} Renda fixa sem cotação de bolsa continua em Ativos. Dados diários podem estar atrasados; não indicam o momento certo de comprar ou vender.</p>
    {!!comparison.length && <details className="text-xs text-slate-500"><summary className="min-h-10 cursor-pointer py-2">Preços, resultados e fontes</summary><p className="mb-3 max-w-3xl leading-relaxed">O resultado sobre o custo usa a quantidade e o preço médio atuais das posições manuais. A linha histórica não reconstrói compras, vendas ou aportes. Ativos conectados sem custo cadastrado aparecem somente na variação de mercado.</p><div className="overflow-x-auto rounded-xl border border-white/[0.07]"><table className="w-full text-left text-xs"><caption className="sr-only">Últimos preços diários e resultado bruto das posições manuais cadastradas</caption><thead className="border-b border-white/[0.07] text-slate-400"><tr>{['Ativo', 'Último preço diário', 'Variação no período', 'Resultado da posição manual', 'Data / fonte'].map(label => <th key={label} className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{comparison.map(row => {
      const latest = row.points.at(-1), first = row.points[0];
      const result = latest && row.average && row.position ? latest.close * row.position.quantity - row.position.invested : null;
      return <tr key={row.ticker} className="border-b border-white/[0.04]"><th className="px-4 py-3 font-medium text-slate-300">{row.ticker}</th><td className="whitespace-nowrap px-4 py-3 tabular-nums">{latest ? isPrivateMode ? '••••' : money(latest.close, row.currency || 'BRL') : '—'}</td><td className="whitespace-nowrap px-4 py-3">{latest && first ? maskedPct((latest.close / first.close - 1) * 100) : '—'}</td><td className={`whitespace-nowrap px-4 py-3 ${result == null ? '' : result < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{result == null ? 'Sem preço médio compatível' : isPrivateMode ? '••••' : `${money(result, row.currency || 'BRL')} (${pct((latest!.close / row.average! - 1) * 100)})`}</td><td className="whitespace-nowrap px-4 py-3">{latest ? date(day(latest.timestamp)) : '—'} · {row.source}</td></tr>;
    })}</tbody></table></div></details>}
  </section>;
};
