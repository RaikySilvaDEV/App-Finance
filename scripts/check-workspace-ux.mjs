import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('dist');
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}) });
const errors = [];
async function setup(width, recurring = false) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block', timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  let planning = { budgets: [], bills: [{id:'fixture-bill',cardId:'fixture-card',title:'Notebook parcelado',bank:'Banco de teste',category:'Compras',amount:123.45,installments:3,dueDate:'2027-01-31',paid:[]}], goals: [], manualLoans: [], rules: [], overrides: {}, recurrenceDecisions: {}, manualCards: [{id:'fixture-card',name:'Cartão principal',bank:'Banco de teste',lastFour:'1234',closingDay:20,dueDay:28,creditLimit:5000,availableLimit:3000,active:true,updatedAt:'2026-10-20T12:00:00Z'}] };
  const today = new Date();
  const transactions = recurring ? [50, 50, 60].map((amount, i) => ({ id: `fixture-${i}`, source: 'import', type: 'account_transaction', sourceAccountType: 'BANK', sourceAccountId: 'manual:fixture', sourceAccountName: 'Banco de teste', description: 'Streaming mensal', amount, direction: 'debit', category: 'Serviços digitais', status: 'concluido', currencyCode: 'BRL', timestamp: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2 + i, 10)).toISOString().slice(0, 10) })) : [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url()); if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    let body = {}, status = 200;
    switch (url.pathname) {
      case '/api/auth/me': body = { user: { id: 'fixture', email: 'test@example.invalid' } }; break;
      case '/api/auth/google/config': body = { configured: false, linked: false }; break;
      case '/api/user/state':
        if (route.request().method() === 'PUT') { planning = route.request().postDataJSON().planning; body = { ok: true, itemIds: [] }; }
        else body = { holdings: [], itemIds: [], planning }; break;
      case '/api/user/history': body = { transactions, deletedIds: [], snapshots: [], next: null, transactionCount: transactions.length }; break;
      case '/api/user/sync': body = { cache: [] }; break;
      case '/api/open-finance/connections': body = { connections: [] }; break;
      case '/api/manual/accounts': body = { premium: false, accounts: recurring ? [{ id: 'manual:fixture', source: 'manual', bankName: 'Banco de teste', balance: 0, lastSync: today.toISOString(), accountType: 'corrente', currencyCode: 'BRL' }] : [] }; break;
      default: status = 503; body = { error: 'Serviço externo não utilizado neste teste' };
    }
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(origin); await page.locator('h1').filter({ hasText: /^Visão geral$/ }).waitFor();
  async function navigate(name) {
    if (width < 1024) await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Navegação principal', exact: true }).getByRole('button', { name, exact: true }).click();
    await page.getByRole('heading', { name, exact: true }).waitFor();
  }
  const saved = (predicate) => page.waitForResponse((r) => r.url().endsWith('/api/user/state') && r.request().method() === 'PUT' && predicate(r.request().postDataJSON().planning));
  return { page, context, navigate, saved, getPlanning: () => planning };
}

try {
  await mkdir('/tmp/finpulse-design', { recursive: true });
  for (const width of [320, 375, 390, 768, 1440]) {
    const { page, context, navigate } = await setup(width, true);
    const notice = page.getByRole('dialog', { name: 'Seus avisos' });
    await notice.waitFor();
    // Entry notices keep their existing behavior; dismiss only when present.
    const closeNotice = page.getByRole('button', { name: /Fechar avisos/ });
    await closeNotice.click(); await notice.waitFor({ state: 'hidden' });
    await page.getByRole('navigation', { name: 'Atalhos financeiros' }).waitFor();
    const noOverflow = async (screen) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px: ${screen} overflow`);
    await noOverflow('início');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `/tmp/finpulse-design/home-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Meus cartões', exact: true }).click();
    await page.getByRole('region', { name: 'Cartões manuais' }).waitFor();
    await page.getByRole('heading', { name: 'Cartão principal' }).waitFor();
    await noOverflow('cartões');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `/tmp/finpulse-design/cards-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Editar cartão Cartão principal' }).click();
    const form = page.getByRole('dialog', { name: 'Editar cartão manual' });
    await form.waitFor();
    assert.equal(await page.getByLabel('Nome do cartão', { exact: true }).evaluate((el) => el === document.activeElement), true);
    await page.keyboard.press('Escape'); await form.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Ocultar valores', exact: true }).click();
    assert.ok(!(await page.getByRole('region', { name: 'Cartões manuais' }).innerText()).includes('3.000,00'));
    await page.getByRole('button', { name: 'Mostrar valores', exact: true }).click();
    await navigate('Fluxo de caixa');
    await page.getByLabel('Buscar movimentação', { exact: true }).fill('streaming');
    assert.ok(await page.locator('.ledger-row').count() > 0);
    await page.getByLabel('Buscar movimentação', { exact: true }).fill('texto inexistente');
    assert.equal(await page.locator('.ledger-row').count(), 0);
    await page.getByLabel('Buscar movimentação', { exact: true }).fill('');
    await page.locator('.ledger-row').first().getByRole('button', { name: 'Detalhes' }).click();
    await page.getByRole('dialog', { name: 'Detalhes do lançamento' }).waitFor();
    await page.getByRole('button', { name: 'Fechar detalhes do lançamento' }).click();
    await noOverflow('extrato');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `/tmp/finpulse-design/ledger-${width}.png`, fullPage: true });
    await navigate('Planejamento');
    await page.getByRole('tab', { name: 'Recorrências', exact: true }).click();
    await page.getByRole('tab', { name: 'Parcelas', exact: true }).click();
    await noOverflow('planejamento');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `/tmp/finpulse-design/planning-${width}.png`, fullPage: true });
    console.log(`PASS ${width}px: atalhos, cartões, formulário, privacidade, busca, detalhes e planejamento`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('5 cenários da reformulação aprovados, sem erros JavaScript.');
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
