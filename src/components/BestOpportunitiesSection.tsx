import { SectionInfo } from './SectionInfo';
import React, { useState } from 'react';
import { Activity, RefreshCw, Search } from 'lucide-react';
import { Asset, InvestorProfile } from '../types/finance';
interface Props { assets: Asset[]; onSelectAssetForRiskAnalysis: (asset: Asset) => void; investorProfile: InvestorProfile; }
export const BestOpportunitiesSection: React.FC<Props> = ({ assets, onSelectAssetForRiskAnalysis }) => {
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Asset | null>(null);
  const lookup = async () => {
    const symbol = ticker.trim().toUpperCase(); if (!symbol) return;
    setIsLoading(true); setError(null); setQuote(null);
    try {
      const response = await fetch(`/api/market/quote/${encodeURIComponent(symbol)}`);
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Cotação indisponível.');
      const item: Asset = { id: symbol, ticker: symbol, name: data.name || symbol, source: data.source, quoteDate: data.lastUpdated, category: 'acoes', currentPrice: data.currentPrice, variationDailyPct: data.dailyChangePct, variationWeeklyPct: data.weeklyChangePct, variationMonthlyPct: data.monthlyChangePct, annualReturnPct: 0, dividendYieldAnnualPct: 0, dailyYieldEstimatedPct: 0, monthlyYieldEstimatedPct: 0, liquidity: 'Não informado', riskScore: 0, riskRating: 'Moderado', fgcInsured: false, minInvestmentBrl: data.currentPrice, description: 'Cotação de mercado', whyInvestNow: '', benchmarkTarget: '', tags: [], isLiveQuote: true };
      setQuote(item);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao consultar a cotação.'); }
    finally { setIsLoading(false); }
  };
  const items = [...assets, ...(quote && !assets.some(a => a.ticker === quote.ticker) ? [quote] : [])];
  const currency = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  return <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-white">Cotações de mercado</h2></div>
      <div className="flex w-full min-w-0 gap-2 sm:w-auto"><div className="relative min-w-0 flex-1 sm:flex-none"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"/><input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && lookup()} placeholder="Ticker B3 (ex.: PETR4)" className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white sm:w-52"/></div><button onClick={lookup} disabled={isLoading} className="shrink-0 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"><RefreshCw className={`mr-1 inline h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}/>Buscar</button></div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    {items.length ? <div className="mt-4 grid gap-3 md:grid-cols-3">{items.map(a => <article key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><button onClick={() => onSelectAssetForRiskAnalysis(a)} className="block w-full text-left"><span className="flex items-center gap-2 font-bold text-white"><Activity className="h-4 w-4 text-cyan-300"/>{a.ticker}</span><span className="mt-3 block text-lg font-semibold text-white">{currency(a.currentPrice)}</span><span className="mt-1 block text-xs text-slate-400">Hoje {a.variationDailyPct == null ? 'Não informada' : `${a.variationDailyPct >= 0 ? '+' : ''}${a.variationDailyPct}%`}</span></button><details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">Outros períodos</summary><p className="mt-2">5 dias: {a.variationWeeklyPct == null ? 'Não informado' : `${a.variationWeeklyPct >= 0 ? '+' : ''}${a.variationWeeklyPct}%`}</p><p className="mt-1">1 mês: {a.variationMonthlyPct == null ? 'Não informado' : `${a.variationMonthlyPct >= 0 ? '+' : ''}${a.variationMonthlyPct}%`}</p>{a.source && <p className="mt-3 text-[10px] text-slate-500">Fonte: {a.source}{a.quoteDate ? ` · ${new Date(a.quoteDate).toLocaleString('pt-BR')}` : ''}</p>}</details></article>)}</div> : <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">Nenhuma cotação carregada. Pesquise um ticker para consultar o preço atual.</p>}
    <SectionInfo title="Sobre as cotações">Preços e variações consultados sob demanda. Toque em um ativo para ver sua análise. Não são recomendações de investimento.</SectionInfo>
  </section>;
};
