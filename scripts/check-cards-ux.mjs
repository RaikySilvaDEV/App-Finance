import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
  let planning = { budgets: [], bills: [], goals: [], manualLoans: [], rules: [], overrides: {}, recurrenceDecisions: {}, manualCards: [] };
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
  for (const width of [320, 390, 1440]) {
    const { page, context, navigate, saved, getPlanning } = await setup(width);
    await navigate('Contas e cartões'); await page.getByRole('tab', { name: 'Cartões', exact: true }).click();
    await page.getByRole('button', { name: 'Novo cartão', exact: true }).click();
    await page.getByLabel('Nome do cartão', { exact: true }).fill('Cartão de teste');
    await page.getByLabel('Banco / instituição', { exact: true }).fill('Banco de teste');
    await page.getByLabel('Últimos 4 dígitos (opcional)', { exact: true }).fill('1234');
    await page.getByLabel('Limite total informado (R$)', { exact: true }).fill('2000');
    await page.getByLabel('Limite disponível informado (R$)', { exact: true }).fill('1000');
    let persist = saved((p) => p.manualCards.length === 1);
    await page.getByRole('button', { name: 'Salvar na minha conta', exact: true }).click(); await persist;
    await page.getByLabel('Primeiro mês da projeção').fill('2027-01');
    await page.getByRole('button', { name: 'Adicionar compra / parcelas' }).click();
    await page.getByLabel('Descrição da compra').fill('Notebook de teste');
    await page.getByLabel('Valor de cada parcela (R$)').fill('33.33');
    await page.getByLabel('Quantidade de parcelas').fill('3');
    await page.getByLabel('Primeiro vencimento confirmado por você').fill('2027-01-31');
    persist = saved((p) => p.bills.length === 1);
    await page.getByRole('button', { name: 'Salvar na minha conta', exact: true }).click(); await persist;
    const january = page.locator('article').filter({ has: page.getByRole('heading', { name: '01/2027', exact: true }) });
    await january.getByText('Conferir 1 parcela(s)', { exact: true }).click();
    await january.getByText('Notebook de teste', { exact: true }).waitFor();
    persist = saved((p) => p.bills[0].paid.includes(0));
    await january.getByRole('button', { name: 'Marcar como paga', exact: true }).click(); await persist;
    assert.equal(getPlanning().bills.length, 1); assert.equal(getPlanning().bills[0].installments, 3);
    await page.reload(); await navigate('Contas e cartões'); await page.getByRole('tab', { name: 'Cartões', exact: true }).click();
    await page.getByLabel('Primeiro mês da projeção').fill('2027-01');
    await january.getByText('Conferir 1 parcela(s)', { exact: true }).click();
    await january.getByRole('button', { name: 'Desmarcar pagamento', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ocultar valores', exact: true }).click();
    assert.ok(!(await page.getByRole('region', { name: 'Cartões manuais' }).innerText()).includes('33,33'));
    assert.ok(!(await page.getByRole('region', { name: 'Cartões manuais' }).innerText()).includes('Notebook de teste'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); assert.equal(overflow, false, `${width}px overflow`);
    await page.getByRole('button', { name: 'Mostrar valores', exact: true }).click();
    await page.getByRole('button', { name: 'Editar cartão Cartão de teste' }).click();
    await page.getByLabel('Permitir novas compras neste cartão?').selectOption('Não');
    persist = saved((p) => !p.manualCards[0].active);
    await page.getByRole('button', { name: 'Salvar na minha conta', exact: true }).click(); await persist;
    assert.equal(await page.getByRole('button', { name: 'Adicionar compra / parcelas' }).count(), 0);
    assert.equal(getPlanning().bills.length, 1, 'deactivation must not remove purchase history');
    console.log(`PASS cartões ${width}px: cadastro, compra, projeção, pagamento, recarga, privacidade e desativação`);
    await context.close();
  }
  const { page, context, navigate, saved, getPlanning } = await setup(390, true);
  await page.getByRole('button', { name: 'Fechar avisos' }).waitFor(); await page.getByRole('button', { name: 'Fechar avisos' }).click();
  await navigate('Planejamento'); await page.getByRole('tab', { name: 'Recorrências', exact: true }).click();
  await page.getByText(/Possível mudança no último lançamento/).waitFor();
  await page.getByRole('button', { name: 'Revisar e cadastrar conta', exact: true }).click();
  assert.equal(await page.getByLabel('Valor por mês (R$)').inputValue(), '60');
  await page.getByLabel('Quantidade de meses a cadastrar').fill('12');
  const persist = saved((p) => p.bills.length === 1 && p.bills[0].recurrenceId);
  await page.getByRole('button', { name: 'Salvar na minha conta', exact: true }).click(); await persist;
  await page.getByText('Recorrências acompanhadas', { exact: true }).click();
  await page.getByText(/Possível mudança recente/).waitFor();
  assert.equal(getPlanning().bills[0].amount, 60); assert.equal(getPlanning().bills[0].installments, 12);
  await page.getByRole('button', { name: 'Rever sugestões confirmadas ou ignoradas' }).click();
  await page.getByRole('button', { name: 'Revisar e cadastrar conta', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar na minha conta', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Essa recorrência já está vinculada' }).waitFor();
  assert.equal(getPlanning().bills.length, 1, 'review must not duplicate an existing recurring commitment');
  console.log('PASS recorrências: variação, revisão, último valor, acompanhamento e prevenção de duplicação');
  await context.close(); assert.deepEqual(errors, []); console.log('4 cenários financeiros no navegador aprovados.');
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
