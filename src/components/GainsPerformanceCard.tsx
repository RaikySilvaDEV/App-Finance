import { SectionInfo } from './SectionInfo';
import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, RefreshCw } from 'lucide-react';
import { Asset, PortfolioHolding } from '../types/finance';
interface HistoryPoint { timestamp: number; close: number; }
interface HistoryResponse { points: HistoryPoint[]; currency?: string; }
interface Props { holdings: PortfolioHolding[]; isPrivateMode: boolean; assets: Asset[]; }
export const GainsPerformanceCard: React.FC<Props> = ({ holdings, isPrivateMode, assets }) => {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const invested = holdings.reduce((sum, holding) => sum + holding.totalInvested, 0);
  const pnl = totalValue - invested;
  const pnlPct = invested > 0 ? pnl / invested * 100 : 0;
  const [ticker, setTicker] = useState(assets[0]?.ticker || '');
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [currencyCode, setCurrencyCode] = useState('BRL');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 8, top: 8 });
  useEffect(() => setHoveredIndex(null), [ticker, period, history]);
  useEffect(() => { if (assets.length && !assets.some(asset => asset.ticker === ticker)) setTicker(assets[0].ticker); }, [assets, ticker]);
  useEffect(() => {
    if (!ticker) { setHistory([]); return; }
    const controller = new AbortController();
    setLoading(true); setError(null);
    fetch(`/api/market/history/${encodeURIComponent(ticker)}`, { signal: controller.signal })
      .then(async response => { const data: HistoryResponse & { error?: string } = await response.json(); if (!response.ok) throw new Error(data.error || 'Histórico indisponível.'); setCurrencyCode(data.currency || 'BRL'); return data.points; })
      .then(points => setHistory(points || []))
      .catch(reason => { if (reason.name !== 'AbortError') { setHistory([]); setError(reason.message || 'Falha ao obter histórico.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ticker, refreshKey]);
  const visiblePoints = useMemo(() => period === 'week' ? history.slice(-6) : history, [history, period]);
  const width = 800, height = 270, padX = 38, padY = 26;
  const prices = visiblePoints.map(point => point.close);
  const minimum = Math.min(...prices), maximum = Math.max(...prices);
  const spread = maximum - minimum || Math.max(maximum * 0.01, 1);
  const x = (index: number) => padX + index * (width - padX * 2) / Math.max(visiblePoints.length - 1, 1);
  function moveTooltip(event: React.PointerEvent<SVGSVGElement>) {
    const svgBounds = event.currentTarget.getBoundingClientRect();
    const containerBounds = event.currentTarget.parentElement!.getBoundingClientRect();
    const position = (event.clientX - svgBounds.left) / svgBounds.width * width;
    const index = Math.max(0, Math.min(visiblePoints.length - 1, Math.round((position - padX) / (width - 2 * padX) * (visiblePoints.length - 1))));
    if (!visiblePoints[index]) return;
    setHoveredIndex(index);
    const pointX = svgBounds.left - containerBounds.left + x(index) / width * svgBounds.width;
    const pointY = svgBounds.top - containerBounds.top + y(visiblePoints[index].close) / height * svgBounds.height;
    setTooltipPosition({ left: Math.max(8, Math.min(containerBounds.width - 160, pointX - 65)), top: Math.max(8, Math.min(containerBounds.height - 65, pointY >= 70 ? pointY - 65 : pointY + 12)) });
  }
  const y = (price: number) => height - padY - ((price - minimum) / spread) * (height - padY * 2);
  const line = visiblePoints.map((point, index) => `${x(index)},${y(point.close)}`).join(' ');
  const area = visiblePoints.length ? `M ${x(0)},${height-padY} ${visiblePoints.map((point,index) => `L ${x(index)},${y(point.close)}`).join(' ')} L ${x(visiblePoints.length-1)},${height-padY} Z` : '';
  const latest = visiblePoints.at(-1)?.close;
  const first = visiblePoints[0]?.close;
  const change = latest !== undefined && first ? (latest / first - 1) * 100 : null;
  const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(value);
  const formatDate = (timestamp: number) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(timestamp));
  return <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-[#101012] p-4 shadow-2xl sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-5">
      <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><Activity className="h-4 w-4 text-emerald-400"/>Posições manuais · estimativa</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-3"><h2 className="text-3xl font-extrabold text-white">{isPrivateMode ? 'R$ ••••••' : currency(totalValue)}</h2><span className={`text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{isPrivateMode ? '••••' : `${pnl >= 0 ? '+' : ''}${currency(pnl)} (${pnlPct.toFixed(2)}%)`}</span></div>
        <SectionInfo title="Sobre os valores">Posições manuais: valor estimado pelo último preço disponível e preço médio cadastrado.</SectionInfo>
      </div>
      <div className="flex items-center gap-2"><select aria-label="Ativo do gráfico" value={ticker} onChange={event => setTicker(event.target.value)} className="max-w-[180px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">{assets.map(asset => <option key={asset.ticker} value={asset.ticker}>{asset.ticker}</option>)}</select>
        <button onClick={() => setRefreshKey(value => value + 1)} disabled={loading || !ticker} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-50" title="Atualizar histórico" aria-label="Atualizar histórico"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button></div>
    </div>
    <div className="pt-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-white">Histórico de cotação · {ticker || '—'}</h3><SectionInfo title="Sobre o gráfico">Fechamentos diários de mercado, via Yahoo Finance. Não representa o patrimônio histórico da carteira.</SectionInfo></div>
      <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">{(['week','month'] as const).map(value => <button key={value} onClick={() => setPeriod(value)} className={`rounded-md px-3 py-1.5 text-xs ${period === value ? 'bg-cyan-400 font-bold text-slate-950' : 'text-slate-400'}`}>{value === 'week' ? <><CalendarDays className="mr-1 inline h-3 w-3"/>1 semana</> : '1 mês'}</button>)}</div></div>
      <div className="relative h-[240px] rounded-xl border border-slate-800/70 bg-slate-950/60 p-2 sm:h-[300px]">
        {loading && <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-slate-950/70 text-xs text-slate-400">Carregando histórico…</div>}
        {error && <div role="status" className="absolute inset-0 z-10 grid place-items-center rounded-xl p-6 text-center text-sm text-slate-400">{error}</div>}
        {!loading && !error && !visiblePoints.length && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-400">{assets.length ? 'Sem histórico para este ativo.' : 'Cotações indisponíveis no momento.'}</div>}
        {!!visiblePoints.length && <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full touch-pan-y" preserveAspectRatio="none" role="img" aria-label={`Histórico de cotação de ${ticker}`} onPointerMove={moveTooltip} onPointerDown={moveTooltip} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHoveredIndex(null); }}>
          <defs><linearGradient id="marketChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f12b58" stopOpacity=".28"/><stop offset="100%" stopColor="#f12b58" stopOpacity="0"/></linearGradient></defs>
          {[0.2,0.4,0.6,0.8].map(value => <line key={value} x1={padX} x2={width-padX} y1={padY+(height-2*padY)*value} y2={padY+(height-2*padY)*value} stroke="#242427" strokeDasharray="4 5"/>)}
          <path d={area} fill="url(#marketChartFill)"/><polyline points={line} fill="none" stroke="#f12b58" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
          {visiblePoints.map((point,index) => <circle key={point.timestamp} cx={x(index)} cy={y(point.close)} r={index === visiblePoints.length-1 ? 4 : 2.2} fill="#f12b58"><title>{formatDate(point.timestamp)} · {currency(point.close)}</title></circle>)}
          {hoveredIndex !== null && visiblePoints[hoveredIndex] && <g pointerEvents="none"><line x1={x(hoveredIndex)} x2={x(hoveredIndex)} y1={padY} y2={height-padY} stroke="#929297" strokeDasharray="4 4"/><circle cx={x(hoveredIndex)} cy={y(visiblePoints[hoveredIndex].close)} r="5" fill="#f12b58" stroke="#0b0b0e" strokeWidth="2"/></g>}
          {visiblePoints.filter((_,index) => index===0 || index===visiblePoints.length-1 || index===Math.floor(visiblePoints.length/2)).map(point => <text key={`label-${point.timestamp}`} x={x(visiblePoints.indexOf(point))} y={height-5} fill="#929297" fontSize="11" textAnchor="middle">{formatDate(point.timestamp)}</text>)}
        </svg>}
        {hoveredIndex !== null && visiblePoints[hoveredIndex] && !loading && !error && <div role="tooltip" className="pointer-events-none absolute z-20 min-w-32 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs shadow-xl" style={tooltipPosition}><p className="text-slate-400">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(visiblePoints[hoveredIndex].timestamp))}</p><p className="mt-1 font-semibold text-white">{currency(visiblePoints[hoveredIndex].close)}</p></div>}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>{visiblePoints.length ? `${visiblePoints.length} pregões · ${formatDate(visiblePoints[0].timestamp)} a ${formatDate(visiblePoints.at(-1)!.timestamp)}` : 'Sem série disponível'}</span><span className={change !== null && change >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400'}>{change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}% no período`}</span></div>
    </div>
  </section>;
};


