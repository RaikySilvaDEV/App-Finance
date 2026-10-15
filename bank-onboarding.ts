import type { Express } from 'express';
import { pluggyRequest } from './pluggy.js';
import { businessConnectionsEnabled, ownedConnections, personalOwner, reserveConnection, appendUserConnection } from './connection-ownership.js';
import { financeStorage } from './auth.js';

export async function authorizeConnection(itemId: string, user: { id: string; email: string }) {
  const owned = await ownedConnections(user.id);
  if (owned.includes(itemId)) return;
  const item = await pluggyRequest(`/items/${itemId}`);
  if (businessConnectionsEnabled()) {
    if (item.clientUserId !== user.id || item.connector?.name === 'MeuPluggy' || item.connector?.isSandbox) throw new Error('Conexão não pertence à sua conta.');
  } else if (process.env.PLUGGY_CONNECTION_MODE === 'business' || !(await personalOwner(user))) {
    throw new Error('A conexão de bancos para novos usuários ainda não está habilitada.');
  }
  await reserveConnection(itemId, user.id);
}

/** Bind newly created provider items only using identity read from the provider. */
export async function attachProviderConnection(itemId: string) {
  if (!businessConnectionsEnabled()) return;
  const item = await pluggyRequest(`/items/${itemId}`);
  const userId = item.clientUserId;
  if (typeof userId !== 'string' || !/^[a-f0-9]{32}$/.test(userId) || item.connector?.name === 'MeuPluggy' || item.connector?.isSandbox) return;
  await financeStorage.ensure();
  const rows = financeStorage.sql ? await financeStorage.sql`SELECT id FROM users WHERE id=${userId}` : financeStorage.local().prepare('SELECT id FROM users WHERE id=?').all(userId);
  if (rows.length) await appendUserConnection(userId, itemId);
}

export function installBankOnboarding(app: Express) {
  app.post('/api/open-finance/connect-token', async (req, res) => {
    if (!businessConnectionsEnabled()) return res.status(503).json({ error: 'Conexão direta de bancos aguardando habilitação da aplicação.' });
    if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) return res.status(503).json({ error: 'Conexão bancária indisponível no momento.' });
    try {
      const userId = res.locals.user.id;
      const itemId = req.body?.itemId;
      if (itemId && (typeof itemId !== 'string' || !(await ownedConnections(userId)).includes(itemId) || !JSON.parse(res.locals.user.state || '{}').itemIds?.includes(itemId))) return res.status(403).json({ error: 'Conexão não pertence à sua conta.' });
      const connectorIds: number[] = [];
      for (let page = 1; ; page++) {
        const list = await pluggyRequest(`/connectors?countries=BR&sandbox=false&page=${page}`);
        for (const connector of list.results || []) if (!connector.isSandbox && connector.name !== 'MeuPluggy' && connector.type === 'PERSONAL_BANK') connectorIds.push(connector.id);
        if (page >= (list.totalPages || 1)) break;
        if (page >= 20) throw new Error('Lista de bancos incompleta.');
      }
      if (!connectorIds.length) throw new Error('Nenhum banco disponível.');
      const result = await pluggyRequest('/connect_token', { method: 'POST', body: JSON.stringify({ ...(itemId ? { itemId } : {}), options: { clientUserId: userId, avoidDuplicates: false } }) });
      if (!result.accessToken) throw new Error();
      res.json({ connectToken: result.accessToken, connectorIds });
    } catch { res.status(503).json({ error: 'Não foi possível iniciar a conexão com o banco. Tente novamente.' }); }
  });
}
