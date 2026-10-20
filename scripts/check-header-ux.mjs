import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// Serve the production build locally. Every API is mocked in the browser: these
// scenarios never connect to Neon, Pluggy, Google or a real user's account.
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    res.end(await readFile(filename));
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}) });
const screenshots = process.env.FINPULSE_UX_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
const errors = [];
let scenarios = 0;

async function session(width, options = {}) {
  const context = await browser.newContext({ viewport: { width, height: 740 }, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block', timezoneId: 'America/Sao_Paulo' });
  if (options.standalone) await context.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => { const result = original(query); if (query === '(display-mode: standalone)') Object.defineProperty(result, 'matches', { value: true }); return result; };
  });
  const page = await context.newPage(); page.on('pageerror', (error) => errors.push(error.message));
  const state = { signedIn: options.signedIn !== false, connections: options.connections || [], syncCalls: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const planning = { budgets: [], bills: Array.from({ length: options.alerts || 0 }, (_, i) => ({ id: `fixture-${i}`, title: `Conta de teste ${i}`, bank: 'Banco de teste', category: 'Moradia', amount: 1234.56, dueDate: today, installments: 1, paid: [] })), goals: [], manualLoans: [], rules: [], overrides: {}, recurrenceDecisions: {} };
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const user = { id: 'test-user', email: 'usuario-com-email-muito-longo-para-teste-de-layout@example.invalid' };
    let body = {}, status = 200;
    switch (url.pathname) {
      case '/api/auth/me': body = { user: state.signedIn ? user : null }; break;
      case '/api/auth/login': state.signedIn = true; body = { user }; break;
      case '/api/auth/logout': state.signedIn = false; body = { ok: true }; break;
      case '/api/auth/google/config': body = { configured: true, linked: false }; break;
      case '/api/user/email-preferences': body = { configured: false, enabled: false, pending: false, scheduled: false }; break;
      case '/api/user/state': body = route.request().method() === 'PUT' ? { ok: true, itemIds: [] } : { holdings: [], itemIds: [], profile: 'Moderado', planning }; break;
      case '/api/user/history': body = { transactions: [], snapshots: [], deletedIds: [], transactionCount: 0, next: null }; break;
      case '/api/user/sync': body = { cache: [] }; break;
      case '/api/manual/accounts': body = { accounts: [], premium: false }; break;
      case '/api/open-finance/connections':
        if (options.delayed) await new Promise((resolve) => setTimeout(resolve, 250));
        body = { connections: state.connections }; break;
      case '/api/open-finance/status': body = { configured: false, directConnection: false, personalImport: false }; break;
      case '/api/market/real-indicators': state.syncCalls++; status = 503; body = { error: 'Mercado indisponível no teste' }; break;
      default: status = 503; body = { error: 'Serviço externo desativado no teste' };
    }
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(origin);
  return { context, page, state };
}
const wait = (page) => page.getByRole('heading', { name: 'Visão geral', exact: true }).waitFor();
const bell = (page) => page.getByRole('button', { name: /Abrir avisos:/ });
async function fit(page) {
  const dimensions = await page.locator('header').evaluate((header) => {
    const buttons = [...header.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => { const r = b.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
    const [brand, actions] = [...header.firstElementChild.children].map((node) => node.getBoundingClientRect());
    return { viewport: innerWidth, width: header.clientWidth, scroll: header.scrollWidth, buttons, brandRight: brand.right, actionsLeft: actions.left };
  });
  assert.ok(dimensions.scroll <= dimensions.width, JSON.stringify(dimensions));
  assert.ok(dimensions.brandRight <= dimensions.actionsLeft + 1, 'logo overlaps actions');
  for (const b of dimensions.buttons) assert.ok(b.left >= 0 && b.right <= dimensions.viewport + 1, 'button outside viewport');
  for (let i = 1; i < dimensions.buttons.length; i++) assert.ok(dimensions.buttons[i - 1].right <= dimensions.buttons[i].left + 1, 'buttons overlap');
}
try {
  for (const width of [320, 375, 390, 768, 1440]) {
    for (const count of [0, 1]) {
      const { context, page } = await session(width, { alerts: count, delayed: true, standalone: width === 390 });
      await wait(page);
      if (count) {
        const dialog = page.getByRole('dialog', { name: 'Seus avisos' }); await dialog.waitFor();
        assert.equal(await dialog.locator('button').count(), 3);
        if (screenshots && [320, 390].includes(width)) await page.screenshot({ path: path.join(screenshots, `avisos-${width}.png`) });
        const bounds = await dialog.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
        assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
        assert.equal(await bell(page).count(), 1);
      } else {
        await page.waitForTimeout(450);
        assert.equal(await bell(page).count(), 0); assert.equal(await page.getByRole('dialog').count(), 0);
        assert.equal(await page.getByText(/Nenhum aviso pendente|Tudo em dia com os dados disponíveis/).count(), 0);
      }
      assert.equal(await page.locator('header').count(), 1); await fit(page);
      await page.getByRole('button', { name: 'Menu da conta', exact: true }).click();
      const profile = page.getByRole('region', { name: 'Minha conta', exact: true }); await profile.waitFor();
      const box = await profile.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
      await profile.getByText('Google e lembretes por e-mail', { exact: true }).click();
      await profile.getByRole('link', { name: 'Vincular minha conta Google' }).waitFor();
      await profile.getByText('Lembretes por e-mail', { exact: true }).waitFor();
      if (screenshots && !count && [320, 390, 1440].includes(width)) await page.screenshot({ path: path.join(screenshots, `perfil-${width}.png`) });
      await page.keyboard.press('Escape'); assert.equal(await profile.count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Menu da conta', exact: true }).evaluate((b) => b === document.activeElement), true);
      await page.getByRole('button', { name: 'Menu da conta', exact: true }).click();
      await page.getByRole('button', { name: /Conexões bancárias/ }).click();
      await page.getByRole('heading', { name: 'Conexões', exact: true }).waitFor();
      const syncResponse = page.waitForResponse((response) => response.url().endsWith('/api/market/real-indicators'));
      await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click(); await syncResponse;
      await page.getByRole('button', { name: 'Ocultar valores', exact: true }).click();
      if (count) {
        await bell(page).click(); const dialog = page.getByRole('dialog', { name: 'Seus avisos' });
        await dialog.getByText('Detalhes ocultos no modo privacidade.').waitFor();
        assert.ok(!(await dialog.innerText()).includes('1.234,56'));
        for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); assert.equal(await dialog.evaluate((d) => d.contains(document.activeElement)), true, 'modal focus escaped'); }
        await dialog.getByRole('button', { name: /Conferir no planejamento/ }).click();
        await page.getByRole('heading', { name: 'Planejamento', exact: true }).waitFor();
      }
      scenarios++; console.log(`PASS ${width}px · ${count ? 'pendências' : 'sem avisos'}${width === 390 ? ' · standalone emulado' : ''}`);
      await context.close();
    }
  }
  // New authenticated mounts show existing notices again, polling/focus does not.
  const { context, page } = await session(390, { alerts: 1, signedIn: false });
  async function login() { await page.getByLabel('E-mail', { exact: true }).fill('teste@example.invalid'); await page.getByLabel('Senha', { exact: true }).fill('test-password-1234'); await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await page.getByRole('dialog', { name: 'Seus avisos' }).waitFor(); }
  await login(); await page.getByRole('button', { name: 'Fechar avisos' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForTimeout(400);
  assert.equal(await page.getByRole('dialog', { name: 'Seus avisos' }).count(), 0);
  await page.getByRole('button', { name: 'Menu da conta' }).click(); await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByRole('heading', { name: 'Entre na sua conta' }).waitFor(); await login();
  await page.getByRole('button', { name: 'Fechar avisos' }).click(); await page.reload();
  await page.getByRole('dialog', { name: 'Seus avisos' }).waitFor(); scenarios++; console.log('PASS login, logout, nova entrada, recarga e ausência de reabertura no foco');
  await context.close();

  const empty = await session(320); await wait(empty.page); await empty.page.waitForTimeout(400);
  empty.state.connections = [{ id: 'duplicate-fixture', status: 'LOGIN_ERROR', institution: 'Banco de teste' }, { id: 'duplicate-fixture', status: 'LOGIN_ERROR', institution: 'Banco de teste' }];
  await empty.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await bell(empty.page).waitFor(); assert.equal(await bell(empty.page).getAttribute('aria-label'), 'Abrir avisos: 1 pendentes');
  assert.equal(await empty.page.getByRole('dialog', { name: 'Seus avisos' }).count(), 0);
  await bell(empty.page).click(); await empty.page.getByRole('dialog', { name: 'Seus avisos' }).waitFor();
  empty.state.connections = []; await empty.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await empty.page.getByRole('dialog', { name: 'Seus avisos' }).waitFor({ state: 'detached' }); assert.equal(await bell(empty.page).count(), 0);
  scenarios++; console.log('PASS deduplicação, resolução e ausência de modal vazio'); await empty.context.close();
  const many = await session(320, { alerts: 30 });
  const longDialog = many.page.getByRole('dialog', { name: 'Seus avisos' }); await longDialog.waitFor();
  const scroll = await longDialog.locator('.overflow-y-auto').evaluate((element) => ({ content: element.scrollHeight, view: element.clientHeight }));
  assert.ok(scroll.content > scroll.view, 'long notices must scroll inside the modal');
  const footer = await longDialog.getByRole('button', { name: 'Continuar para o FinPulse' }).boundingBox();
  assert.ok(footer.y + footer.height <= 740, 'modal footer outside screen');
  await many.page.getByRole('button', { name: 'Fechar avisos' }).click();
  assert.notEqual(await many.page.evaluate(() => document.body.style.overflow), 'hidden');
  scenarios++; console.log('PASS lista longa, rolagem interna e restauração da página'); await many.context.close();
  assert.deepEqual(errors, [], 'uncaught browser errors');
  console.log(`${scenarios} cenários de UX aprovados; nenhum erro JavaScript não tratado.`);
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
