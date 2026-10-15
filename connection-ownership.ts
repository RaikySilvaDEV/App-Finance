import { financeStorage as storage } from './auth.js';

let ready: Promise<void> | null = null;
export function ensureConnectionOwners() {
  if (!ready) ready = (async () => {
    await storage.ensure();
    if (storage.sql) await storage.sql`CREATE TABLE IF NOT EXISTS bank_connections (item_id TEXT PRIMARY KEY, user_id TEXT NOT NULL)`;
    else storage.local().exec('CREATE TABLE IF NOT EXISTS bank_connections (item_id TEXT PRIMARY KEY, user_id TEXT NOT NULL)');
    const users = storage.sql ? await storage.sql`SELECT id,state FROM users` : storage.local().prepare('SELECT id,state FROM users').all();
    const candidates = new Map<string, string>(), conflicts = new Set<string>();
    for (const user of users as any[]) for (const id of JSON.parse(user.state || '{}').itemIds || []) {
      if (candidates.has(id) && candidates.get(id) !== user.id) conflicts.add(id);
      else candidates.set(id, user.id);
    }
    // Preserve existing unique ownership. Ambiguous legacy links fail closed.
    for (const [itemId, userId] of candidates) if (!conflicts.has(itemId)) {
      if (storage.sql) await storage.sql`INSERT INTO bank_connections(item_id,user_id) VALUES (${itemId},${userId}) ON CONFLICT(item_id) DO NOTHING`;
      else storage.local().prepare('INSERT INTO bank_connections(item_id,user_id) VALUES (?,?) ON CONFLICT(item_id) DO NOTHING').run(itemId, userId);
    }
  })().catch((error) => { ready = null; throw error; });
  return ready;
}
export async function ownedConnections(userId: string): Promise<string[]> {
  await ensureConnectionOwners();
  const rows = storage.sql ? await storage.sql`SELECT item_id FROM bank_connections WHERE user_id=${userId}` : storage.local().prepare('SELECT item_id FROM bank_connections WHERE user_id=?').all(userId);
  return rows.map((row: any) => row.item_id);
}
export async function reserveConnection(itemId: string, userId: string) {
  await ensureConnectionOwners();
  if (storage.sql) {
    await storage.sql`INSERT INTO bank_connections(item_id,user_id) VALUES (${itemId},${userId}) ON CONFLICT(item_id) DO NOTHING`;
    const rows = await storage.sql`SELECT user_id FROM bank_connections WHERE item_id=${itemId}`;
    if (rows[0]?.user_id !== userId) throw new Error('Esta conexão não pertence à sua conta.');
  } else {
    const db = storage.local(); db.prepare('INSERT INTO bank_connections(item_id,user_id) VALUES (?,?) ON CONFLICT(item_id) DO NOTHING').run(itemId, userId);
    if ((db.prepare('SELECT user_id FROM bank_connections WHERE item_id=?').get(itemId) as any)?.user_id !== userId) throw new Error('Esta conexão não pertence à sua conta.');
  }
}
export async function personalOwner(user: { id: string; email: string }) {
  const configured = process.env.FINPULSE_OWNER_EMAIL?.trim().toLowerCase();
  if (configured) return user.email.toLowerCase() === configured;
  await ensureConnectionOwners();
  const rows = storage.sql ? await storage.sql`SELECT DISTINCT user_id FROM bank_connections` : storage.local().prepare('SELECT DISTINCT user_id FROM bank_connections').all();
  return rows.length === 1 && rows[0].user_id === user.id;
}
export const businessConnectionsEnabled = () => process.env.PLUGGY_CONNECTION_MODE === 'business' && process.env.PLUGGY_BUSINESS_ENABLED === 'true';

export async function appendUserConnection(userId: string, itemId: string) {
  await reserveConnection(itemId, userId);
  if (storage.sql) {
    await storage.sql`UPDATE users SET state=jsonb_set(state::jsonb,'{itemIds}',COALESCE(state::jsonb->'itemIds','[]'::jsonb) || jsonb_build_array(${itemId}::text),true)::text WHERE id=${userId} AND NOT (COALESCE(state::jsonb->'itemIds','[]'::jsonb) @> jsonb_build_array(${itemId}::text))`;
  } else {
    const db = storage.local();
    const row = db.prepare('SELECT state FROM users WHERE id=?').get(userId) as any;
    if (!row) throw new Error('Conta não encontrada.');
    const state = JSON.parse(row.state || '{}');
    state.itemIds = [...new Set([...(state.itemIds || []), itemId])];
    db.prepare('UPDATE users SET state=? WHERE id=?').run(JSON.stringify(state), userId);
  }
}
