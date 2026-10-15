import 'dotenv/config';
import type { Express } from 'express';
const publicTickers = new Set(['PETR4', 'MGLU3', 'VALE3', 'ITUB4']);
const cache = new Map<string, { expires: number; data: any }>();
const failures = new Map<string, number>();
const pending = new Map<string, Promise<any>>();
export const brapiConfigured = () => Boolean(process.env.BRAPI_API_KEY?.trim());
export async function brapiRequest(path: string) {
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.data;
  if ((failures.get(path) || 0) > Date.now()) throw new Error('Consulta brapi temporariamente indisponível.');
  if (pending.has(path)) return pending.get(path);
  const request = (async () => {
    const response = await fetch(`https://brapi.dev/api/v2/${path}`, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json', ...(brapiConfigured() ? { Authorization: `Bearer ${process.env.BRAPI_API_KEY!.trim()}` } : {}) } });
    if (!response.ok) throw new Error([401, 403].includes(response.status) ? 'A brapi exige uma chave ou um plano com acesso a estes dados.' : response.status === 429 ? 'Limite de consultas da brapi atingido. Aguarde para consultar novamente.' : 'Dados indisponíveis na brapi.');
    const data = await response.json();
    if (cache.size > 300) cache.clear();
    cache.set(path, { expires: Date.now() + 300000, data });
    return data;
  })().catch((error) => { if (failures.size > 300) failures.clear(); failures.set(path, Date.now() + 60000); throw error; }).finally(() => pending.delete(path));
  pending.set(path, request);
  return request;
}
export async function brapiHistory(ticker: string) {
  if (!brapiConfigured() && !publicTickers.has(ticker)) return null;
  try {
    const result = await brapiRequest(`stocks/historical?symbols=${encodeURIComponent(ticker)}&range=1mo&interval=1d&sortOrder=asc`);
    const row = result.results?.find((row: any) => row.requestedSymbol === ticker || row.symbol === ticker);
    const points = (row?.data?.historicalDataPrice || []).filter((point: any) => typeof point.date === 'number' && typeof point.close === 'number' && Number.isFinite(point.close)).map((point: any) => ({ timestamp: point.date * 1000, close: point.close, adjustedClose: point.adjustedClose })).sort((a: any, b: any) => a.timestamp - b.timestamp);
    return points.length ? { ticker, currency: 'BRL', source: 'brapi', points } : null;
  } catch { return null; }
}
export async function brapiQuote(ticker: string) {
  if (!/^[A-Z0-9]{4,12}$/.test(ticker) || !brapiConfigured() && !publicTickers.has(ticker)) return null;
  try {
    const body = await brapiRequest(`stocks/quote?symbols=${encodeURIComponent(ticker)}`);
    const row = body.results?.find((row: any) => row.requestedSymbol === ticker || row.symbol === ticker);
    const data = row?.data;
    if (!data || typeof data.regularMarketPrice !== 'number' || data.regularMarketPrice <= 0 || !Number.isFinite(data.regularMarketPrice)) return null;
    const history = await brapiHistory(ticker);
    const points = history?.points || [];
    const change = (offset: number) => {
      if (points.length <= offset) return null;
      const last = points[points.length - 1], before = points[points.length - 1 - offset];
      if (!(last.adjustedClose > 0) || !(before.adjustedClose > 0)) return null;
      return Math.round((last.adjustedClose / before.adjustedClose - 1) * 10000) / 100;
    };
    return { symbol: ticker, resolvedSymbol: row.symbol, name: data.longName || data.shortName || ticker, currentPrice: data.regularMarketPrice, previousClose: data.regularMarketPreviousClose ?? null, dailyChangePct: typeof data.regularMarketChangePercent === 'number' ? data.regularMarketChangePercent : null, weeklyChangePct: change(5), monthlyChangePct: points.length > 1 ? change(points.length - 1) : null, currency: data.currency || 'BRL', source: 'brapi', isLive: true, lastUpdated: data.regularMarketTime || null };
  } catch { return null; }
}
export function installBrapi(app: Express) {
  app.get('/api/market/dividends/:ticker', async (req, res) => {
    const ticker = String(req.params.ticker).trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(ticker)) return res.status(400).json({ error: 'Ticker inválido.' });
    const fii = req.query.type === 'fii';
    if (!brapiConfigured() && !(fii ? ['MXRF11', 'HGLG11'].includes(ticker) : publicTickers.has(ticker))) return res.status(503).json({ error: 'Configure a chave brapi para consultar os proventos deste ativo.' });
    try {
      const body = await brapiRequest(`${fii ? 'fii' : 'stocks'}/dividends?symbols=${encodeURIComponent(ticker)}`);
      const events = fii ? body.dividends : body.results?.[0]?.data?.cashDividends;
      res.json({ ticker, source: 'brapi', events: (events || []).filter((event: any) => typeof event.rate === 'number' && Number.isFinite(event.rate)).map((event: any) => ({ type: event.label || 'Provento', amountPerShare: event.rate, paymentDate: event.paymentDate, entitlementDate: event.lastDatePrior, remarks: event.remarks || null })) });
    } catch (error: any) { res.status(503).json({ error: error.message }); }
  });
}
