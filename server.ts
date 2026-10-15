import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { installAuth } from './auth';
import { generateFinancialAnalysis } from './openai';
import { localAiStatus, researchFinancialTopic, ensureLocalAiStarted, isLocalAiEnabled } from './local-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

export const app = express();
// Keep local browser storage on the same origin when opening either loopback alias.
app.use((req, res, next) => {
  if (!isProduction && req.hostname === 'localhost' && (req.method === 'GET' || req.method === 'HEAD')) {
    return res.redirect(302, `http://127.0.0.1:${PORT}${req.originalUrl}`);
  }
  next();
});
app.use(express.json());
installAuth(app, async (id) => { await pluggyRequest(`/items/${id}`); }, async (id) => (await pluggyRequest(`/investments/${id}`)).itemId);

// Initialize server-side Gemini

// Memory cache for real market data
const cache = {
  indicators: { data: null as any, timestamp: 0 },
  quotes: new Map<string, { data: any; timestamp: number }>(),
};
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Helper: Fetch Real Indicators from Banco Central do Brasil (BACEN SGS)
async function fetchBacenSeries(serieCode: number, count: number): Promise<{ data: string; valor: number }[]> {
  try {
    const res = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieCode}/dados/ultimos/${count}?formato=json`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    if (!Array.isArray(json)) return [];
    return json.map((item: any) => ({ data: item.data, valor: parseFloat(item.valor) }))
      .filter((item: any) => Number.isFinite(item.valor));
  } catch (err) {
    console.warn(`[BACEN] Erro ao buscar série ${serieCode}:`, err);
  }
  return [];
}

async function fetchBacenSerie(serieCode: number): Promise<{ data: string; valor: number } | null> {
  return (await fetchBacenSeries(serieCode, 1))[0] || null;
}

// Helper: Fetch Real Quote from Yahoo Finance (B3)
async function fetchYahooQuote(symbol: string) {
  const cached = cache.quotes.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let querySymbol = symbol.toUpperCase().trim();
  if (!querySymbol.includes('.') && !querySymbol.includes('^') && !['BTC', 'ETH', 'SOL'].includes(querySymbol)) {
    querySymbol = `${querySymbol}.SA`;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) throw new Error(`Yahoo returned status ${res.status}`);
    const json: any = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('No result in chart');

    const meta = result.meta;
    const currentPrice = Number(meta.regularMarketPrice);
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) throw new Error('Cotação atual não disponível');
    const previousClose = meta.chartPreviousClose || currentPrice;
    const dailyChangePct = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

    const closes: number[] = result.indicators?.quote?.[0]?.close?.filter((c: any) => typeof c === 'number' && !isNaN(c)) || [];
    const fiveDaysAgoPrice = closes.length >= 5 ? closes[closes.length - 5] : closes[0] || previousClose;
    const weeklyChangePct = fiveDaysAgoPrice > 0 ? ((currentPrice - fiveDaysAgoPrice) / fiveDaysAgoPrice) * 100 : 0;

    const monthAgoPrice = closes.length > 0 ? closes[0] : previousClose;
    const monthlyChangePct = monthAgoPrice > 0 ? ((currentPrice - monthAgoPrice) / monthAgoPrice) * 100 : 0;

    const payload = {
      symbol: symbol.toUpperCase(),
      yahooSymbol: querySymbol,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      previousClose: parseFloat(previousClose.toFixed(2)),
      dailyChangePct: parseFloat(dailyChangePct.toFixed(2)),
      weeklyChangePct: parseFloat(weeklyChangePct.toFixed(2)),
      monthlyChangePct: parseFloat(monthlyChangePct.toFixed(2)),
      currency: meta.currency || 'BRL',
      isLive: true,
      lastUpdated: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    };

    cache.quotes.set(symbol, { data: payload, timestamp: Date.now() });
    return payload;
  } catch (err: any) {
    console.warn(`[Yahoo Finance] Falha ao cotar ${symbol}:`, err.message);
    return null;
  }
}

// -------------------------------------------------------------
// READ-ONLY OPEN FINANCE VIA PLUGGY
// -------------------------------------------------------------

let pluggyApiKey: { value: string; expiresAt: number } | null = null;

async function getPluggyApiKey(): Promise<string> {
  if (pluggyApiKey && pluggyApiKey.expiresAt > Date.now()) return pluggyApiKey.value;

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.');
  }

  const response = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!response.ok) throw new Error(`Falha de autenticação Pluggy (HTTP ${response.status}).`);

  const data = await response.json() as { apiKey?: string };
  if (!data.apiKey) throw new Error('A Pluggy não retornou uma chave de API válida.');
  pluggyApiKey = { value: data.apiKey, expiresAt: Date.now() + 110 * 60 * 1000 };
  return data.apiKey;
}

async function pluggyRequest(pathname: string): Promise<any> {
  const apiKey = await getPluggyApiKey();
  const response = await fetch(`https://api.pluggy.ai${pathname}`, {
    headers: { 'X-API-KEY': apiKey, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`A Pluggy respondeu HTTP ${response.status}.`);
  return response.json();
}

app.get('/api/open-finance/status', (_req: Request, res: Response) => {
  const configured = Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
  res.json({ provider: 'Pluggy', configured, mode: 'read_only' });
});

app.get('/api/open-finance/accounts', async (req: Request, res: Response) => {
  const itemIds = req.query.itemId;
  const ids = (Array.isArray(itemIds) ? itemIds : itemIds ? [itemIds] : [])
    .map(String).filter((itemId) => /^[0-9a-f-]{36}$/i.test(itemId));
  if (ids.length === 0) return res.json({ accounts: [], totalCheckingBalance: 0, totalAccounts: 0, activeAccounts: 0 });

  try {
    const accounts: any[] = [];
    const creditCards: any[] = [];
    const unavailableItems: string[] = [];
    for (const itemId of ids) {
      try {
      const [item, firstPage] = await Promise.all([
        pluggyRequest(`/items/${encodeURIComponent(itemId)}`),
        pluggyRequest(`/accounts?itemId=${encodeURIComponent(itemId)}&page=1&pageSize=100`),
      ]);
      const totalPages = Number(firstPage.totalPages) || 1;
      const pages = await Promise.all(Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
        pluggyRequest(`/accounts?itemId=${encodeURIComponent(itemId)}&page=${index + 2}&pageSize=100`)
      ));
      const connector = item.connector || {};
      for (const account of [ ...(firstPage.results || []), ...pages.flatMap((page: any) => page.results || []) ]) {
        if (account.type === 'CREDIT') {
          creditCards.push({ id: account.id, name: account.marketingName || account.name || 'Cartão', number: String(account.number || '').slice(-4), currencyCode: account.currencyCode || 'BRL', balance: account.balance, creditData: account.creditData || {}, institution: connector.name });
        }
        if (account.type !== 'BANK') continue;
        const rawNumber = String(account.number || '');
        const institutionName = String(account.marketingName || account.name || connector.name || item.connectorName || 'Instituição conectada');
        const normalizedInstitution = institutionName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const bankName = normalizedInstitution.includes('mercado pago') ? 'Mercado Pago'
          : normalizedInstitution.includes('santander') ? 'Santander'
          : normalizedInstitution.includes('nu pagamentos') || normalizedInstitution.includes('nubank') ? 'Nubank'
          : normalizedInstitution.includes('itau') ? 'Itaú'
          : /\bneon\b/.test(normalizedInstitution) ? 'Neon'
          : institutionName;
        accounts.push({
          id: account.id,
          providerItemId: itemId,
          bankName,
          currencyCode: account.currencyCode || 'BRL',
          bankData: account.bankData || {},
          bankCode: String(connector.id || ''),
          accountType: account.subtype === 'SAVINGS_ACCOUNT' ? 'poupanca' : 'corrente',
          agency: '',
          accountNumber: rawNumber ? `••••${rawNumber.slice(-4)}` : '',
          accountDigit: '',
          cpfTitular: '',
          nomeTitular: '',
          balance: Number(account.balance) || 0,
          availableForInvestment: Number(account.balance) || 0,
          lastSync: account.updatedAt || account.createdAt || new Date().toISOString(),
          connected: true,
          brandColor: '#0891b2',
          logo: '🏦',
        });
      }
      } catch { unavailableItems.push(itemId); }
    }
    res.json({
      accounts,
      creditCards,
      unavailableItems,
      totalCheckingBalance: accounts.reduce((total, account) => total + account.balance, 0),
      totalAccounts: accounts.length,
      activeAccounts: accounts.length,
    });
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Não foi possível carregar as contas da Pluggy.' });
  }
});

app.get('/api/open-finance/transactions', async (req: Request, res: Response) => {
  const itemIds = req.query.itemId;
  const ids = (Array.isArray(itemIds) ? itemIds : itemIds ? [itemIds] : [])
    .map(String).filter((itemId) => /^[0-9a-f-]{36}$/i.test(itemId));
  if (ids.length === 0) return res.json({ transactions: [] });

  try {
    const transactions: any[] = [];
    for (const itemId of ids) {
      const accountPage = await pluggyRequest(`/accounts?itemId=${encodeURIComponent(itemId)}&page=1&pageSize=100`);
      for (const account of accountPage.results || []) {
        let next: string | null = `/v2/transactions?accountId=${encodeURIComponent(account.id)}`;
        let pagesRead = 0;
        while (next && pagesRead < 100) {
          const page = await pluggyRequest(next);
          transactions.push(...(page.results || []).map((transaction: any) => ({
            ...transaction,
            providerAccountName: account.marketingName || account.name || 'Conta conectada',
            providerAccountType: account.type,
          })));
          if (page.next) {
            // Pluggy returns a query string (for example, ?accountId=…&after=…);
            // keep it on the v2 endpoint instead of requesting the API root.
            const nextUrl = new URL(String(page.next), 'https://api.pluggy.ai/v2/transactions');
            if (nextUrl.origin !== 'https://api.pluggy.ai' || nextUrl.pathname !== '/v2/transactions') {
              throw new Error('A Pluggy retornou um cursor de paginação inválido.');
            }
            next = `${nextUrl.pathname}${nextUrl.search}`;
          } else {
            next = null;
          }
          pagesRead += 1;
        }
      }
    }
    res.json({ transactions });
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Não foi possível carregar as transações da Pluggy.' });
  }
});

app.get('/api/open-finance/investments', async (req: Request, res: Response) => {
  const itemIds = req.query.itemId;
  const ids = (Array.isArray(itemIds) ? itemIds : itemIds ? [itemIds] : [])
    .map(String).filter((itemId) => /^[0-9a-f-]{36}$/i.test(itemId));
  if (ids.length === 0) return res.json({ investments: [] });
  try {
    const investments: any[] = [];
    for (const itemId of ids) {
      const firstPage = await pluggyRequest(`/investments?itemId=${encodeURIComponent(itemId)}&page=1&pageSize=100`);
      const pages = await Promise.all(Array.from({ length: Math.max(0, (Number(firstPage.totalPages) || 1) - 1) }, (_, index) =>
        pluggyRequest(`/investments?itemId=${encodeURIComponent(itemId)}&page=${index + 2}&pageSize=100`)
      ));
      investments.push(...(firstPage.results || []), ...pages.flatMap((page: any) => page.results || []));
    }
    res.json({ investments });
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Não foi possível carregar os investimentos da Pluggy.' });
  }
});

app.get('/api/open-finance/loans', async (req: Request, res: Response) => {
  const values = req.query.itemId;
  const ids = (Array.isArray(values) ? values : values ? [values] : []).map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const loans: any[] = [];
  const unavailableItems: string[] = [];
  const unsupportedItems: string[] = [];
  for (const itemId of ids) {
    try {
      const item = await pluggyRequest(`/items/${itemId}`);
      if (Array.isArray(item.connector?.products) && !item.connector.products.includes('LOANS')) {
        unsupportedItems.push(itemId);
        unavailableItems.push(itemId);
        continue;
      }
      const collected: any[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const result = await pluggyRequest(`/loans?itemId=${itemId}&page=${page}&pageSize=100`);
        collected.push(...(result.results || []));
        totalPages = Number(result.totalPages) || 1;
        page += 1;
      } while (page <= totalPages && page <= 100);
      loans.push(...collected);
    } catch { unavailableItems.push(itemId); }
  }
  res.json({ loans, complete: ids.length > 0 && unavailableItems.length === 0, unavailableItems, unsupportedItems });
});

app.get('/api/open-finance/connections', async (req, res) => {
  const input = req.query.itemId;
  const ids = (Array.isArray(input) ? input : input ? [input] : []).map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const connections = await Promise.all(ids.map(async (id) => {
    try {
      const [item, page] = await Promise.all([pluggyRequest(`/items/${id}`), pluggyRequest(`/accounts?itemId=${id}&pageSize=100`)]);
      const accounts = page.results || [];
      return { id, status: item.status, lastUpdatedAt: item.lastUpdatedAt || item.updatedAt, connector: item.connector?.name, products: item.connector?.products || [], institution: accounts.find((account: any) => account.type === 'BANK')?.marketingName || accounts.find((account: any) => account.type === 'BANK')?.name || item.connector?.name || 'Conexão', accountCount: accounts.filter((account: any) => account.type === 'BANK').length, cardCount: accounts.filter((account: any) => account.type === 'CREDIT').length };
    } catch { return { id, status: 'UNAVAILABLE', institution: 'Conexão indisponível', products: [] }; }
  }));
  res.json({ connections });
});

app.get('/api/open-finance/investment-transactions', async (req: Request, res: Response) => {
  const id = String(req.query.investmentId || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Investimento inválido.' });
  try {
    const transactions: any[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const data = await pluggyRequest(`/investments/${id}/transactions?page=${page}&pageSize=100`);
      transactions.push(...(data.results || []));
      totalPages = Number(data.totalPages) || 1;
      page += 1;
    } while (page <= totalPages && page <= 100);
    res.json({ transactions });
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Não foi possível carregar as movimentações.' });
  }
});

// Real payment initiation is disabled until a separate payments integration is configured.
app.post('/api/open-finance/transfer', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Pagamentos e transferências reais ainda não estão habilitados neste aplicativo.' });
});
// REAL MARKET DATA ENDPOINTS (BACEN, B3, GEMINI)
// -------------------------------------------------------------

app.get('/api/market/real-indicators', async (_req: Request, res: Response) => {
  if (cache.indicators.data && Date.now() - cache.indicators.timestamp < CACHE_TTL_MS) {
    return res.json(cache.indicators.data);
  }

  const [selicSeries, cdiSeries, dollarSeries, ipcaSeries, trSeries] = await Promise.all([
    fetchBacenSeries(432, 1),
    fetchBacenSeries(12, 1),
    fetchBacenSeries(1, 1),
    fetchBacenSeries(433, 12),
    fetchBacenSeries(226, 1),
  ]);
  const selic = selicSeries[0];
  const cdi = cdiSeries[0];
  const dollar = dollarSeries[0];
  const ipca = ipcaSeries[ipcaSeries.length - 1];
  const tr = trSeries[0];

  if (!selic || !cdi || !dollar || !ipca || !tr || ipcaSeries.length < 12) {
    return res.status(503).json({ error: 'O Banco Central não retornou todos os indicadores atualizados.' });
  }

  const cdiAnnual = parseFloat(((Math.pow(1 + cdi.valor / 100, 252) - 1) * 100).toFixed(2));
  const ipca12m = (ipcaSeries.reduce((factor, item) => factor * (1 + item.valor / 100), 1) - 1) * 100;
  const savingsMonthly = (selic.valor > 8.5
    ? 0.5 + tr.valor
    : (Math.pow(1 + (selic.valor * 0.7) / 100, 1 / 12) - 1) * 100 + tr.valor);
  const indicators = {
    selic: { metaAnnualPct: selic.valor, date: selic.data, source: 'Banco Central do Brasil (SGS 432)' },
    cdi: { dailyPct: cdi.valor, annualizedPct: cdiAnnual, date: cdi.data, source: 'Banco Central do Brasil (SGS 12)' },
    dolar: { ptaxBrl: dollar.valor, date: dollar.data, source: 'Banco Central do Brasil (SGS 1)' },
    ipca: {
      lastMonthlyPct: ipca.valor,
      accumulated12mPct: Number(ipca12m.toFixed(2)),
      date: ipca.data,
      source: 'Banco Central do Brasil (SGS 433)',
    },
    poupanca: {
      dailyEstimatedPct: Number(((Math.pow(1 + savingsMonthly / 100, 1 / 21) - 1) * 100).toFixed(5)),
      monthlyPct: Number(savingsMonthly.toFixed(4)),
      rule: 'Regra do Banco Central: Selic e TR (SGS 226)',
    },
    isLive: true,
    lastSync: new Date().toISOString(),
  };
  cache.indicators = { data: indicators, timestamp: Date.now() };
  res.json(indicators);
});
app.get('/api/market/quote/:ticker', async (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase().trim();
  const quote = await fetchYahooQuote(ticker);
  if (!quote) {
    return res.status(404).json({ error: `Ativo ${ticker} não encontrado na B3.` });
  }
  res.json(quote);
});

app.get('/api/market/history/:ticker', async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!/^[A-Z0-9.^-]{1,15}$/.test(ticker)) return res.status(400).json({ error: 'Ticker inválido.' });
  const querySymbol = !ticker.includes('.') && !ticker.includes('^') && !['BTC', 'ETH', 'SOL'].includes(ticker)
    ? `${ticker}.SA`
    : ticker;
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=1d&range=1mo`, {
      headers: { 'User-Agent': 'Mozilla/5.0 FinPulse/1.0', 'Accept': 'application/json' },
    });
    if (!response.ok) return res.status(502).json({ error: 'Fonte de cotações indisponível.' });
    const json: any = await response.json();
    const result = json?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close || [];
    const points = timestamps.map((timestamp, index) => ({
      timestamp: timestamp * 1000,
      close: closes[index],
    })).filter((point) => typeof point.close === 'number' && Number.isFinite(point.close));
    if (!points.length) return res.status(404).json({ error: `Sem histórico disponível para ${ticker}.` });
    res.json({ ticker, currency: result.meta?.currency || 'BRL', source: 'Yahoo Finance', points });
  } catch {
    res.status(502).json({ error: 'Falha ao obter o histórico de cotações.' });
  }
});

app.get('/api/market/quotes-batch', async (req: Request, res: Response) => {
  const tickers = ['MXRF11', 'HGLG11', 'KNIP11', 'BBAS3', 'VALE3', 'WEGE3', 'IVVB11', 'PETR4', 'ITUB4'];
  try {
    const b3Quotes = await Promise.all(tickers.map((t) => fetchYahooQuote(t)));
    const quotesMap: Record<string, any> = {};
    tickers.forEach((t, i) => {
      if (b3Quotes[i]) quotesMap[t] = b3Quotes[i];
    });

    res.json({ quotes: quotesMap, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar cotações' });
  }
});

app.get('/api/ai/status', async (_req, res) => res.json(isLocalAiEnabled() ? await localAiStatus() : { configured: Boolean(process.env.OPENAI_API_KEY), provider: 'openai' }));
app.post('/api/ai/research', async (req, res) => {
  const question = String(req.body.question || '').trim();
  if (question.length < 5 || question.length > 400) return res.status(400).json({ error: 'Escreva uma pergunta de 5 a 400 caracteres.' });
  try {
    const generateAnswer = isLocalAiEnabled() ? undefined : (prompt: string) => generateFinancialAnalysis(prompt, 'research');
    return res.json(await researchFinancialTopic(question, generateAnswer));
  }
  catch (error: any) { return res.status(error.status || 503).json({ error: error.message || 'Não foi possível concluir a pesquisa.' }); }
});

// Grounded AI Risk Analysis with OpenAI
app.post('/api/ai/analyze-risk', async (req: Request, res: Response) => {
  if (!isLocalAiEnabled() && !process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Configure OPENAI_API_KEY nas variáveis de ambiente para habilitar a análise.' });
  try {
    const { ticker, name, category, userRiskProfile = 'Moderado', intendedAmount = 5000 } = req.body;
    if (typeof ticker !== 'string' || !ticker.trim()) return res.status(400).json({ error: 'Informe o ticker do ativo.' });
    const [quote, selic] = await Promise.all([fetchYahooQuote(ticker), fetchBacenSerie(432)]);
    if (!quote) return res.status(503).json({ error: 'Cotação indisponível; a análise foi interrompida para evitar dados desatualizados.' });
    if (!selic) return res.status(503).json({ error: 'Taxa Selic oficial indisponível no Banco Central.' });
    const prompt = `Analise criticamente o ativo brasileiro ${ticker} (${name || ticker}), categoria informada ${category || 'não informada'}, perfil ${userRiskProfile}. Dados objetivos disponíveis: preço R$ ${quote.currentPrice}; variação observada hoje ${quote.dailyChangePct}%, em 5 dias ${quote.weeklyChangePct}%, em um mês ${quote.monthlyChangePct}%; Selic meta oficial ${selic.valor}% (BCB em ${selic.data}); aporte hipotético R$ ${Number(intendedAmount)}. As variações não são previsão. Não invente volatilidade histórica, Sharpe, liquidez, DY, garantias ou cenários de retorno. Devolva JSON com ticker, riskScore (1-10, deixando claro que é uma opinião qualitativa), riskLevel, liquidityTerm ("Não informado" se não puder ser demonstrado), executiveVerdict, pros (lista), cons (lista), macroSensitivity {selicUp,inflationUp,exchangeRate}. Diga que análise de IA não é recomendação financeira. Não calcule qualquer rendimento projetado.`;
    const parsed = await generateFinancialAnalysis(prompt, 'risk');
    return res.json({ ...parsed, ticker, currentPrice: quote.currentPrice, quoteDate: quote.lastUpdated, selicPct: selic.valor, selicDate: selic.data, isAiGenerated: true });
  } catch (error: any) {
    return res.status(error.status || 503).json({ error: error.message || 'A análise OpenAI está indisponível.' });
  }
});

app.post('/api/ai/portfolio-diagnostic', async (req: Request, res: Response) => {
  if (!isLocalAiEnabled() && !process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Configure OPENAI_API_KEY nas variáveis de ambiente para habilitar o diagnóstico.' });
  try {
    const { totalPatrimony, allocations, financialSnapshot = {}, profile = 'Moderado' } = req.body;
    if (!Array.isArray(allocations) && (!allocations || typeof allocations !== 'object')) return res.status(400).json({ error: 'Informe as alocações da carteira.' });
    const prompt = `Faça um diagnóstico educativo e não prescritivo. Posições manuais R$ ${Number(totalPatrimony) || 0}; alocações manuais JSON ${JSON.stringify(allocations)}; resumo financeiro em BRL JSON ${JSON.stringify(financialSnapshot)}; perfil ${String(profile)}. Considere saldos bancários, investimentos conectados, saldo devedor dos empréstimos quando conhecido e saldo dos cartões como obrigações separadas. Não some posições manuais aos investimentos conectados pois podem duplicar os mesmos ativos. Não confunda valor originalmente contratado com saldo devedor atual. Ausência de empréstimos retornados não comprova ausência de dívidas. Se a consulta não estiver completa ou faltarem saldos, explique a limitação. Não use limite de cartão como dinheiro disponível. Não invente rentabilidades, dívidas, garantia ou rendimento. Responda em JSON com diagnostic (texto simples e explicando o impacto das obrigações e os limites dos dados), diversificationScore (number de 0 a 100 baseado apenas na concentração das posições manuais por classe; explique quando não há dados), suggestedActions (array de orientações gerais), dailyYieldHealth (diga que rendimento diário não pode ser aferido com estes dados). Não faça recomendação personalizada de compra/venda.`;
    const result = await generateFinancialAnalysis(`${prompt} Os valores exatos serão exibidos diretamente pela interface. Nos campos de texto, não repita números, valores monetários ou percentuais; descreva qualitativamente os dados e suas limitações.`, 'diagnostic');
    if (typeof result.diagnostic !== 'string' || !Array.isArray(result.suggestedActions) || typeof result.dailyYieldHealth !== 'string' || !Number.isFinite(result.diversificationScore)) throw new Error('INVALID_RESPONSE');
    result.diversificationScore = Math.min(100, Math.max(0, result.diversificationScore));
    return res.json(result);
  } catch (error: any) {
    return res.status(error.status || 503).json({ error: error.message || 'A análise OpenAI está indisponível.' });
  }
});

// API requests must never fall through to the SPA HTML document.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Esta função da API não foi encontrada. Atualize a página e confira se o servidor está atualizado.' }));
app.use((error: any, _req: Request, res: Response, next: any) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.parse.failed' ? 400 : error.type === 'entity.too.large' ? 413 : 500;
  return res.status(status).json({ error: status === 400 ? 'O formato dos dados enviados é inválido.' : status === 413 ? 'Os dados enviados excedem o limite permitido.' : 'Não foi possível concluir a consulta no servidor.' });
});

// Start Server
async function startServer() {
  await ensureLocalAiStarted();
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[FinPulse Live Server] Servidor FinPulse ouvindo na porta ${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('Falha ao iniciar servidor:', err);
  });
}
