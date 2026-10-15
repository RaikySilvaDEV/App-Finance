import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, X } from 'lucide-react';
import { Asset, InvestorProfile } from '../types/finance';
interface Props { asset: Asset | null; isOpen: boolean; onClose: () => void; investorProfile: InvestorProfile; onAddToPortfolio: (asset: Asset, amount: number) => void; }
export const RiskAnalysisModal: React.FC<Props> = ({ asset, isOpen, onClose, investorProfile }) => {
  const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (!asset) return;
    setLoading(true); setError(null); setAnalysis(null);
    try {
      const response = await fetch('/api/ai/analyze-risk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker: asset.ticker, name: asset.name, category: asset.category, userRiskProfile: investorProfile }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Análise indisponível.'); setAnalysis(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar a análise.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (isOpen && asset) void load(); }, [isOpen, asset?.ticker, investorProfile]);
  if (!isOpen || !asset) return null;
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.currentPrice);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><section className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#101012] p-6 text-slate-200">
    <header className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-white">{asset.ticker} · dados de mercado</h2><p className="mt-1 text-xs text-slate-400">Cotação consultada pelo servidor; pode haver atraso em relação à bolsa.</p></div><button onClick={onClose} aria-label="Fechar"><X/></button></header>
    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{[['Preço', money], ['Hoje', `${asset.variationDailyPct >= 0 ? '+' : ''}${asset.variationDailyPct}%`], ['5 dias', `${asset.variationWeeklyPct >= 0 ? '+' : ''}${asset.variationWeeklyPct}%`], ['1 mês', `${asset.variationMonthlyPct >= 0 ? '+' : ''}${asset.variationMonthlyPct}%`]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>)}</div>
    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-white">Análise educativa por IA</h3><button onClick={() => void load()} disabled={loading} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><RefreshCw className={`mr-1 inline h-3 w-3 ${loading ? 'animate-spin' : ''}`}/>Atualizar</button></div>
    {loading && <p className="mt-4 text-sm text-slate-400">Consultando cotação, Banco Central e OpenAI…</p>}
    {error && <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p>}
    {analysis && <div className="mt-4 space-y-3 text-sm"><p>{analysis.executiveVerdict}</p><p className="text-xs text-slate-400">Selic consultada: {analysis.selicPct}% ({analysis.selicDate}) · Cotação consultada: {analysis.quoteDate}. A nota de risco é uma avaliação qualitativa gerada por IA, não uma medida oficial nem recomendação.</p><div className="grid gap-3 md:grid-cols-2"><div><b>Pontos para considerar</b><ul className="mt-1 list-disc pl-5">{analysis.pros?.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div><div><b>Riscos e limitações</b><ul className="mt-1 list-disc pl-5">{analysis.cons?.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div></div>{analysis.macroSensitivity && <p className="text-xs text-slate-400">Sensibilidade macroeconômica gerada por IA; não é previsão: {analysis.macroSensitivity.selicUp}</p>}</div>}
    {!loading && !error && !analysis && <p className="mt-4 text-sm text-slate-400"><Activity className="mr-2 inline h-4 w-4"/>Análise não disponível.</p>}</div>
    <div className="mt-5 flex justify-end"><button onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2 text-sm">Fechar</button></div>
  </section></div>;
};

