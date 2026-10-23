import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PortfolioHolding } from '../types/finance';
import type { PriceAlertRule } from './planning';
import type { DailyAlert } from './dailyControl';

export function manualCostPositions(holdings: PortfolioHolding[]) {
  const result = new Map<string, { quantity: number; invested: number }>();
  for (const holding of holdings) {
    const ticker = holding.ticker.trim().toUpperCase();
    if (!/^[A-Z0-9.^-]{1,15}$/.test(ticker) || !Number.isFinite(holding.quantity) || holding.quantity <= 0) continue;
    const invested = Number.isFinite(holding.totalInvested) ? holding.totalInvested : holding.quantity * holding.averagePrice;
    if (!Number.isFinite(invested) || invested < 0) continue;
    const row = result.get(ticker) || { quantity: 0, invested: 0 };
    row.quantity += holding.quantity; row.invested += invested;
    result.set(ticker, row);
  }
  return result;
}

type Quote = { price: number; currency: string; source: string; at: number | null };
export type PriceAlertEvaluation = { ticker: string; dropPct: number; threshold: number | null; quote?: Quote; changePct: number | null; status: 'breached' | 'watching' | 'stale' | 'unavailable' | 'no_cost' };
const noRules: PriceAlertRule[] = [];
function quoteTime(value: unknown) {
  if (value == null || value === '') return null;
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  const time = Number.isFinite(number) ? number * (number < 1e12 ? 1000 : 1) : typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(time) && time > 0 && time <= Date.now() + 300000 ? time : null;
}

export function usePriceAlerts(holdings: PortfolioHolding[], rules: PriceAlertRule[] = noRules) {
  const positions = useMemo(() => manualCostPositions(holdings), [holdings]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [revision, setRevision] = useState(0);
  const [checkedAt, setCheckedAt] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const tickerKey = [...new Set(rules.filter(rule => rule.enabled && (positions.get(rule.ticker)?.invested || 0) > 0).map(rule => rule.ticker))].sort().join(',');
  useEffect(() => {
    const controller = new AbortController();
    const tickers = tickerKey ? tickerKey.split(',') : [];
    let running = false;
    if (!tickers.length) { setQuotes({}); setFailed([]); setChecking(false); setCheckedAt(0); return () => controller.abort(); }
    async function load() {
      if (running || document.hidden || controller.signal.aborted) return;
      running = true; setChecking(true);
      let next = 0;
      const result: Record<string, Quote> = {};
      const errors: string[] = [];
      await Promise.all(Array.from({ length: Math.min(4, tickers.length) }, async () => {
        while (next < tickers.length && !controller.signal.aborted) {
          const ticker = tickers[next++];
          try {
            const response = await fetch(`/api/market/quote/${encodeURIComponent(ticker)}`, { signal: controller.signal });
            if (!response.headers.get('content-type')?.includes('application/json')) throw new Error();
            const data = await response.json();
            if (!response.ok || !Number.isFinite(data.currentPrice) || data.currentPrice <= 0 || data.currency !== 'BRL') throw new Error();
            result[ticker] = { price: data.currentPrice, currency: data.currency, source: typeof data.source === 'string' ? data.source : 'API de mercado', at: quoteTime(data.lastUpdated) };
          } catch { if (!controller.signal.aborted) errors.push(ticker); }
        }
      }));
      running = false;
      if (!controller.signal.aborted) { setQuotes(result); setFailed(errors); setCheckedAt(Date.now()); setChecking(false); }
    }
    const refresh = () => { void load(); };
    refresh();
    const timer = setInterval(refresh, 300000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [tickerKey, revision]);
  const evaluations: PriceAlertEvaluation[] = rules.filter(rule => rule.enabled).map(rule => {
    const position = positions.get(rule.ticker);
    const average = position && position.invested > 0 ? position.invested / position.quantity : null;
    const quote = failed.includes(rule.ticker) ? undefined : quotes[rule.ticker];
    const threshold = average == null ? null : Math.floor(average * (1 - rule.dropPct / 100) * 100 + 1e-8) / 100;
    const changePct = average && quote ? (quote.price / average - 1) * 100 : null;
    const status = !average ? 'no_cost' : !quote ? 'unavailable' : !quote.at || Date.now() - quote.at > 36 * 3600000 ? 'stale' : quote.price <= threshold! ? 'breached' : 'watching';
    return { ticker: rule.ticker, dropPct: rule.dropPct, threshold, quote, changePct, status };
  });
  const alerts: DailyAlert[] = evaluations.filter(row => row.status === 'breached').map(row => ({
    id: `price:${row.ticker}`, title: `${row.ticker}: limite de perda atingido`,
    detail: `Margem definida: ${row.dropPct}%. Cotação disponível: ${row.quote!.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Referência: ${new Date(row.quote!.at!).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${row.quote!.source}. Revise a posição e confira o preço atual na corretora.`,
    severity: 'warning', target: 'market',
  }));
  return { evaluations, alerts, checking, checkedAt, reload };
}
