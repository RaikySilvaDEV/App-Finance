import { financeStorage as storage } from './auth.js';
import { ensureConnectionOwners } from './connection-ownership.js';

export type RecordRow = { record_id: string; kind: string; payload: string; observed_at: number };
export async function records(userId: string, kind: string): Promise<RecordRow[]> {
  await storage.ensure();
  return storage.sql
    ? await storage.sql`SELECT record_id,kind,payload,observed_at FROM financial_history WHERE user_id=${userId} AND kind=${kind}` as any
    : storage.local().prepare('SELECT record_id,kind,payload,observed_at FROM financial_history WHERE user_id=? AND kind=?').all(userId, kind) as any;
}
export async function putRecords(userId: string, rows: RecordRow[]) {
  await storage.ensure();
  if (!rows.length) return;
  if (storage.sql) {
    await storage.sql`INSERT INTO financial_history (user_id,record_id,kind,payload,observed_at) SELECT ${userId},record_id,kind,payload,observed_at FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(record_id TEXT,kind TEXT,payload TEXT,observed_at BIGINT) ON CONFLICT (user_id,record_id) DO UPDATE SET kind=EXCLUDED.kind,payload=EXCLUDED.payload,observed_at=EXCLUDED.observed_at WHERE financial_history.kind <> 'deleted' AND financial_history.observed_at <= EXCLUDED.observed_at`;
  } else {
    const db = storage.local(); db.exec('BEGIN IMMEDIATE');
    try {
      const insert = db.prepare("INSERT INTO financial_history (user_id,record_id,kind,payload,observed_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,record_id) DO UPDATE SET kind=excluded.kind,payload=excluded.payload,observed_at=excluded.observed_at WHERE financial_history.kind <> 'deleted' AND financial_history.observed_at <= excluded.observed_at");
      for (const row of rows) insert.run(userId, row.record_id, row.kind, row.payload, row.observed_at);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
}
export const record = (id: string, kind: string, value: unknown, at = Date.now()): RecordRow => ({ record_id: id, kind, payload: JSON.stringify(value), observed_at: at });
export async function owners(itemId: string) {
  await ensureConnectionOwners();
  const users = storage.sql ? await storage.sql`SELECT users.id,users.state FROM users JOIN bank_connections ON bank_connections.user_id=users.id WHERE bank_connections.item_id=${itemId}` : storage.local().prepare('SELECT users.id,users.state FROM users JOIN bank_connections ON bank_connections.user_id=users.id WHERE bank_connections.item_id=?').all(itemId);
  return users.filter((user: any) => (JSON.parse(user.state || '{}').itemIds || []).includes(itemId)) as { id: string; state: string }[];
}

/** A durable lease: retries continue failed jobs; completed deliveries are idempotent. */
export async function claimEvent(id: string, payload: object): Promise<'claimed' | 'done' | 'busy'> {
  await storage.ensure(); const now = Date.now(), key = `event:${id}`, serialized = JSON.stringify(payload);
  if (storage.sql) {
    const rows = await storage.sql`INSERT INTO financial_history(user_id,record_id,kind,payload,observed_at) VALUES ('__system__',${key},'event_pending',${serialized},${now}) ON CONFLICT(user_id,record_id) DO UPDATE SET observed_at=EXCLUDED.observed_at WHERE financial_history.kind='event_pending' AND financial_history.observed_at < ${now - 65000} RETURNING record_id`;
    if (rows.length) return 'claimed';
    const existing = await storage.sql`SELECT kind FROM financial_history WHERE user_id='__system__' AND record_id=${key}`;
    return existing[0]?.kind === 'event_done' ? 'done' : 'busy';
  }
  const db = storage.local();
  const changed = db.prepare("INSERT INTO financial_history(user_id,record_id,kind,payload,observed_at) VALUES ('__system__',?,'event_pending',?,?) ON CONFLICT(user_id,record_id) DO UPDATE SET observed_at=excluded.observed_at WHERE financial_history.kind='event_pending' AND financial_history.observed_at < ?").run(key, serialized, now, now - 65000);
  if (changed.changes) return 'claimed';
  return (db.prepare("SELECT kind FROM financial_history WHERE user_id='__system__' AND record_id=?").get(key) as any)?.kind === 'event_done' ? 'done' : 'busy';
}

export async function releaseEvent(id: string) {
  await storage.ensure();
  if (storage.sql) await storage.sql`UPDATE financial_history SET observed_at=0 WHERE user_id='__system__' AND record_id=${`event:${id}`} AND kind='event_pending'`;
  else storage.local().prepare("UPDATE financial_history SET observed_at=0 WHERE user_id='__system__' AND record_id=? AND kind='event_pending'").run(`event:${id}`);
}
