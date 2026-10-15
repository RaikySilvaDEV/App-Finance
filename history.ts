import type { Express } from 'express';
import { brazilDay } from './src/lib/planning.js';

export function installHistory(app: Express, storage: { ensure: () => Promise<void>; sql: any; local: () => any }) {
  app.get('/api/user/history', async (req, res) => {
    try {
      await storage.ensure();
      const userId = res.locals.user.id;
      const after = typeof req.query.after === 'string' ? req.query.after.slice(0, 150) : '';
      let rows: any[], snapshots: any[], counts: any[];
      if (storage.sql) {
        rows = await storage.sql`SELECT record_id,payload,observed_at FROM financial_history WHERE user_id=${userId} AND kind='transaction' AND record_id > ${after} ORDER BY record_id LIMIT 501`;
        snapshots = await storage.sql`SELECT record_id,payload,observed_at FROM financial_history WHERE user_id=${userId} AND kind='snapshot' ORDER BY record_id DESC LIMIT 180`;
        counts = await storage.sql`SELECT COUNT(*) AS total FROM financial_history WHERE user_id=${userId} AND kind='transaction'`;
      } else {
        const db = storage.local();
        rows = db.prepare("SELECT record_id,payload,observed_at FROM financial_history WHERE user_id=? AND kind='transaction' AND record_id > ? ORDER BY record_id LIMIT 501").all(userId, after);
        snapshots = db.prepare("SELECT record_id,payload,observed_at FROM financial_history WHERE user_id=? AND kind='snapshot' ORDER BY record_id DESC LIMIT 180").all(userId);
        counts = [db.prepare("SELECT COUNT(*) AS total FROM financial_history WHERE user_id=? AND kind='transaction'").get(userId)];
      }
      const page = rows.slice(0, 500);
      res.json({ transactions: page.map((row) => JSON.parse(row.payload)), next: rows.length > 500 ? page[499].record_id : null, transactionCount: Number(counts[0]?.total || 0), snapshots: snapshots.map((row) => ({ ...JSON.parse(row.payload), capturedAt: new Date(Number(row.observed_at)).toISOString() })) });
    } catch { res.status(503).json({ error: 'Não foi possível carregar o histórico salvo.' }); }
  });
  app.post('/api/user/history', async (req, res) => {
    try {
      const userId = res.locals.user.id;
      const owned: string[] = JSON.parse(res.locals.user.state || '{}').itemIds || [];
      const transactions = req.body.transactions || [];
      const snapshot = req.body.snapshot;
      if (!Array.isArray(transactions) || transactions.length > 100) throw new Error();
      const now = Date.now();
      const records: { record_id: string; kind: string; payload: string; observed_at: number }[] = [];
      for (const tx of transactions) {
        if (!tx || typeof tx.id !== 'string' || tx.id.length > 100 || typeof tx.sourceAccountId !== 'string' || typeof tx.description !== 'string' || tx.description.length > 2000 || typeof tx.amount !== 'number' || !Number.isFinite(tx.amount) || tx.amount < 0 || tx.amount > 1e12 || !owned.includes(tx.providerItemId) || !['concluido', 'processando', 'falha'].includes(tx.status) || !['credit', 'debit'].includes(tx.direction) || !brazilDay(tx.timestamp)) throw new Error();
        records.push({ record_id: `tx:${tx.id}`, kind: 'transaction', payload: JSON.stringify(tx), observed_at: now });
      }
      if (snapshot) {
        if (!Array.isArray(snapshot.accounts) || snapshot.accounts.length > 100 || !snapshot.accounts.every((account: any) => owned.includes(account.providerItemId) && Number.isFinite(account.balance)) || JSON.stringify(snapshot).length > 500000) throw new Error();
        records.push({ record_id: `snapshot:${brazilDay()}`, kind: 'snapshot', payload: JSON.stringify({ ...snapshot, date: brazilDay() }), observed_at: now });
      }
      await storage.ensure();
      if (records.length && storage.sql) {
        await storage.sql`INSERT INTO financial_history (user_id,record_id,kind,payload,observed_at) SELECT ${userId},record_id,kind,payload,observed_at FROM jsonb_to_recordset(${JSON.stringify(records)}::jsonb) AS x(record_id TEXT,kind TEXT,payload TEXT,observed_at BIGINT) ON CONFLICT (user_id,record_id) DO UPDATE SET payload=EXCLUDED.payload,observed_at=EXCLUDED.observed_at`;
      } else if (records.length) {
        const db = storage.local();
        db.exec('BEGIN IMMEDIATE');
        try {
          const insert = db.prepare('INSERT INTO financial_history (user_id,record_id,kind,payload,observed_at) VALUES (?,?,?,?,?) ON CONFLICT (user_id,record_id) DO UPDATE SET payload=excluded.payload,observed_at=excluded.observed_at');
          for (const row of records) insert.run(userId, row.record_id, row.kind, row.payload, row.observed_at);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
      res.json({ ok: true, saved: records.length, capturedAt: new Date(now).toISOString() });
    } catch { res.status(400).json({ error: 'Não foi possível guardar esta atualização no histórico. Confira sua conexão e tente atualizar novamente.' }); }
  });
}
