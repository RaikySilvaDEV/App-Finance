import type { Express } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { records, putRecords, record, owners, claimEvent, releaseEvent } from './sync-store.js';
import { readAccounts, readTransactions, readInvestments, readLoans } from './provider-data.js';
import { pluggyRequest } from './pluggy.js';
import { providerTransaction } from './src/lib/providerTransaction.js';
import { brazilDay } from './src/lib/planning.js';

const publicUrl = 'https://app-finance-ruby-one.vercel.app/api/integrations/pluggy';
const supported = new Set(['item/created', 'item/updated', 'item/error', 'item/deleted', 'item/waiting_user_input', 'item/waiting_user_action', 'transactions/created', 'transactions/updated', 'transactions/deleted']);
async function config() { return JSON.parse((await records('__system__', 'integration')).find((row) => row.record_id === 'pluggy')?.payload || '{}'); }
export async function activatePluggySync() {
  const current = await config();
  const token = current.token || randomBytes(32).toString('hex');
  // Persist before registering: Pluggy can deliver immediately after registration.
  await putRecords('__system__', [record('pluggy', 'integration', { ...current, token })]);
  const list = await pluggyRequest('/webhooks');
  const existing = (list.results || (Array.isArray(list) ? list : [])).find((row: any) => row.url === publicUrl && row.event === 'all');
  const body = JSON.stringify({ url: publicUrl, event: 'all', headers: { 'X-Finpulse-Webhook': token } });
  const webhook = await pluggyRequest(existing ? `/webhooks/${existing.id}` : '/webhooks', { method: existing ? 'PATCH' : 'POST', body });
  await putRecords('__system__', [record('pluggy', 'integration', { token, id: webhook.id || existing?.id, activatedAt: new Date().toISOString() })]);
  return { active: true };
}
export async function syncItem(userId: string, itemId: string) {
  const started = Date.now();
  const [accounts, movements, investments, loans, item] = await Promise.all([
    readAccounts([itemId]), readTransactions([itemId]), readInvestments([itemId]), readLoans([itemId]), pluggyRequest(`/items/${itemId}`),
  ]);
  if (accounts.unavailableItems?.length || !movements.complete || !investments.complete) throw new Error('Sincronização parcial; os dados anteriores foram preservados.');
  const old = (await records(userId, 'bank_cache')).map((row) => JSON.parse(row.payload));
  const cache = { itemId, accounts: accounts.accounts, creditCards: accounts.creditCards || [], investments: investments.investments, loans: loans.loans, lastUpdatedAt: item.lastUpdatedAt || item.updatedAt, status: item.status, capturedAt: new Date().toISOString() };
  const transactions = movements.transactions.map((tx: any) => providerTransaction(tx, accounts.accounts));
  await putRecords(userId, [record(`cache:${itemId}`, 'bank_cache', cache, started), ...transactions.map((tx: any) => record(`tx:${tx.id}`, 'transaction', tx, started))]);
  const currentOwners = await owners(itemId);
  const owned = JSON.parse(currentOwners.find((row) => row.id === userId)?.state || '{}').itemIds || [];
  const caches = [...old.filter((row) => row.itemId !== itemId && owned.includes(row.itemId)), cache];
  if (owned.length && owned.every((id: string) => caches.some((row) => row.itemId === id))) {
    // Daily snapshots preserve the actual observation dates, including each bank's freshness.
    await putRecords(userId, [record(`snapshot:${brazilDay()}`, 'snapshot', { date: brazilDay(), accounts: caches.flatMap((row) => row.accounts), creditCards: caches.flatMap((row) => row.creditCards), investments: caches.flatMap((row) => row.investments), loans: caches.flatMap((row) => row.loans) })]);
  }
  return { saved: transactions.length };
}

/** Installed before session middleware; only this authenticated webhook is public. */
export function installSync(app: Express) {
  app.post('/api/integrations/pluggy', async (req, res) => {
    let claimedId = '';
    try {
      const settings = await config(), provided = String(req.headers['x-finpulse-webhook'] || '');
      if (!settings.token || !/^[a-f0-9]{64}$/.test(provided) || provided.length !== settings.token.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(settings.token))) return res.status(401).json({ error: 'Notificação não autorizada.' });
      const { event, eventId, itemId, transactionIds } = req.body || {};
      if (!supported.has(event)) return res.json({ ignored: true });
      if (!/^[0-9a-f-]{36}$/i.test(itemId) || typeof eventId !== 'string' || eventId.length > 100 || !eventId.length) return res.status(400).json({ error: 'Evento inválido.' });
      if (event === 'transactions/deleted' && (!Array.isArray(transactionIds) || transactionIds.length > 10000 || !transactionIds.every((id: any) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))) return res.status(400).json({ error: 'Transações inválidas.' });
      const users = await owners(itemId);
      if (!users.length) return res.json({ ignored: true });
      const lease = await claimEvent(eventId, { event, itemId, transactionIds });
      if (lease === 'done') return res.json({ ok: true, duplicate: true });
      if (lease === 'busy') return res.status(503).json({ error: 'Evento em processamento. Tente novamente.' });
      claimedId = eventId;
      for (const user of users) {
        if (event === 'transactions/deleted') {
          const all = await records(user.id, 'transaction');
          const existing = new Map(all.map((row) => [row.record_id, JSON.parse(row.payload)]));
          await putRecords(user.id, transactionIds.filter((id: string) => !existing.has(`tx:${id}`) || existing.get(`tx:${id}`).providerItemId === itemId).map((id: string) => record(`tx:${id}`, 'deleted', { id, providerItemId: itemId })));
        } else if (['item/error', 'item/waiting_user_input', 'item/waiting_user_action', 'item/deleted'].includes(event)) {
          await putRecords(user.id, [record(`connection:${itemId}`, 'connection_alert', { itemId, event, at: new Date().toISOString() })]);
        } else {
          await syncItem(user.id, itemId);
          await putRecords(user.id, [record(`connection:${itemId}`, 'connection_alert', { itemId, event: 'item/updated', at: new Date().toISOString() })]);
        }
      }
      await putRecords('__system__', [record(`event:${eventId}`, 'event_done', { event, itemId })]);
      res.json({ ok: true });
    } catch {
      if (claimedId) await releaseEvent(claimedId).catch(() => {});
      // Non-2xx preserves Pluggy retry delivery; never acknowledge before saving.
      res.status(503).json({ error: 'Não foi possível salvar a atualização. Reenvie o evento.' });
    }
  });
}

/** Installed after session and ownership middleware. No credentials leave the server. */
export function installSyncUser(app: Express) {
  app.get('/api/user/sync', async (_req, res) => {
    try {
      const userId = res.locals.user.id, owned = JSON.parse(res.locals.user.state || '{}').itemIds || [];
      const [settings, cache, alerts] = await Promise.all([config(), records(userId, 'bank_cache'), records(userId, 'connection_alert')]);
      res.json({ active: Boolean(settings.id), activatedAt: settings.activatedAt, cache: cache.map((row) => JSON.parse(row.payload)).filter((row) => owned.includes(row.itemId)), alerts: alerts.map((row) => JSON.parse(row.payload)).filter((row) => owned.includes(row.itemId)) });
    } catch { res.status(503).json({ error: 'Não foi possível consultar a sincronização.' }); }
  });
  app.post('/api/user/sync/activate', async (_req, res) => {
    try { res.json(await activatePluggySync()); }
    catch { res.status(503).json({ error: 'Não foi possível ativar a sincronização na Pluggy. Verifique as credenciais da aplicação e tente novamente.' }); }
  });
}
