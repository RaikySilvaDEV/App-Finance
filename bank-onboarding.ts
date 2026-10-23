import type { Express } from 'express';
import { pluggyRequest } from './pluggy.js';
import { businessConnectionsEnabled, ownedConnections, personalOwner, reserveConnection, appendUserConnection } from './connection-ownership.js';
import { financeStorage } from './auth.js';

export async function authorizeConnection(itemId: string, user: { id: string; email: string }) {
  const owned = await ownedConnections(user.id);
  if (owned.includes(itemId)) return;
  const item = await pluggyRequest(`/items/${itemId}`);
  if (item.connector?.isSandbox) throw new Error('Conecte uma conta real pelo MeuPluggy.');
  if (businessConnectionsEnabled()) {
    if (item.clientUserId !== user.id || item.connector?.name === 'MeuPluggy' || item.connector?.isSandbox) throw new Error('Conexão não pertence à sua conta.');
  } else if (process.env.PLUGGY_CONNECTION_MODE === 'business' || item.connector?.name !== 'MeuPluggy' || !(await personalOwner(user))) {
    throw new Error('A conexão de bancos para novos usuários ainda não está habilitada.');
  }
  await reserveConnection(itemId, user.id);
}

/** Bind newly created provider items only using identity read from the provider. */
export async function attachProviderConnection(itemId: string) {
  const item = await pluggyRequest(`/items/${itemId}`);
  if (item.connector?.isSandbox) return;
  await financeStorage.ensure();
  let user: { id: string; email: string } | undefined;
  if (businessConnectionsEnabled()) {
    const userId = item.clientUserId;
    if (typeof userId !== 'string' || !/^[a-f0-9]{32}$/.test(userId) || item.connector?.name === 'MeuPluggy') return;
    const rows = financeStorage.sql ? await financeStorage.sql`SELECT id,email FROM users WHERE id=${userId}` : financeStorage.local().prepare('SELECT id,email FROM users WHERE id=?').all(userId);
    user = rows[0] as { id: string; email: string } | undefined;
  } else {
    if (process.env.PLUGGY_CONNECTION_MODE === 'business' || item.connector?.name !== 'MeuPluggy') return;
    // Personal Dashboard items may omit clientUserId. Their authenticated
    // application belongs only to the configured/unique personal owner.
    const rows = financeStorage.sql ? await financeStorage.sql`SELECT id,email FROM users` : financeStorage.local().prepare('SELECT id,email FROM users').all();
    for (const candidate of rows) if (await personalOwner(candidate as { id: string; email: string })) {
      if (user) return;
      user = candidate as { id: string; email: string } | undefined;
    }
    if (item.clientUserId && item.clientUserId !== user?.id) return;
  }
  if (!user || (await ownedConnections(user.id)).includes(itemId)) return;
  await appendUserConnection(user.id, itemId);
}

export function installBankOnboarding(app: Express) {
  app.post('/api/open-finance/connect-token', async (req, res) => {
    if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) return res.status(503).json({ error: 'Conexão bancária indisponível no momento.' });
    try {
      const personal = !businessConnectionsEnabled();
      if (personal && (process.env.PLUGGY_CONNECTION_MODE === 'business' || !(await personalOwner(res.locals.user)))) return res.status(403).json({ error: 'A conexão de bancos para novos usuários aguarda habilitação.' });
      const userId = res.locals.user.id;
      const itemId = req.body?.itemId;
      if (itemId && (typeof itemId !== 'string' || !(await ownedConnections(userId)).includes(itemId) || !JSON.parse(res.locals.user.state || '{}').itemIds?.includes(itemId))) return res.status(403).json({ error: 'Conexão não pertence à sua conta.' });
      // Updates are restricted to an existing connection owned by this user.
      // Use its connector, rather than the list intended for new connections.
      if (itemId) {
        const item = await pluggyRequest(`/items/${itemId}`);
        if (item.connector?.isSandbox) return res.status(400).json({ error: 'Esta conexão não é de um banco real.' });
        const result = await pluggyRequest('/connect_token', { method: 'POST', body: JSON.stringify({ itemId }) });
        if (!result.accessToken) throw new Error();
        return res.json({ connectToken: result.accessToken, connectorIds: [item.connector.id], isProxy: item.connector.name === 'MeuPluggy' });
      }
      const connectorIds: number[] = [];
      for (let page = 1; ; page++) {
        const list = await pluggyRequest(`/connectors?countries=BR&sandbox=false&page=${page}`);
        for (const connector of list.results || []) if (!connector.isSandbox && (personal ? connector.name === 'MeuPluggy' : connector.name !== 'MeuPluggy' && connector.type === 'PERSONAL_BANK')) connectorIds.push(connector.id);
        if (page >= (list.totalPages || 1)) break;
        if (page >= 20) throw new Error('Lista de bancos incompleta.');
      }
      if (!connectorIds.length) return res.status(503).json({ error: personal ? 'O conector MeuPluggy não está disponível nesta aplicação. Ative-o em Customization → Connectors no Dashboard ou use a importação por identificador.' : 'Nenhum banco disponível nesta aplicação.' });
      const result = await pluggyRequest('/connect_token', { method: 'POST', body: JSON.stringify({ ...(itemId ? { itemId } : {}), options: { clientUserId: userId, avoidDuplicates: false } }) });
      if (!result.accessToken) throw new Error();
      res.json({ connectToken: result.accessToken, connectorIds });
    } catch { res.status(503).json({ error: 'Não foi possível abrir o conector nesta aplicação. Para uso pessoal, use a autorização no Meu Pluggy e a importação pelo Dashboard abaixo.' }); }
  });
}
