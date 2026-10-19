import { randomUUID, createHash } from 'node:crypto';
import type { Express } from 'express';
import { financeStorage as storage } from './auth.js';
import { parseStatement, type ParsedStatement } from './statement-parser.js';
import type { BankAccount, FinancialTransaction } from './src/types/finance.js';

let ready: Promise<void> | undefined;
export function ensureManualFinance() {
  return ready ??= (async () => {
    await storage.ensure();
    const schema = [
      'CREATE TABLE IF NOT EXISTS finance_entitlements (user_id TEXT PRIMARY KEY, premium_until BIGINT NOT NULL DEFAULT 0, manual_account_count INTEGER NOT NULL DEFAULT 0)',
      'CREATE TABLE IF NOT EXISTS manual_accounts (user_id TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(user_id,id))',
      'CREATE TABLE IF NOT EXISTS statement_batches (user_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, payload TEXT NOT NULL, expires BIGINT NOT NULL, PRIMARY KEY(user_id,id))',
    ];
    if (storage.sql) {
      await storage.sql`CREATE TABLE IF NOT EXISTS finance_entitlements (user_id TEXT PRIMARY KEY, premium_until BIGINT NOT NULL DEFAULT 0, manual_account_count INTEGER NOT NULL DEFAULT 0)`;
      await storage.sql`CREATE TABLE IF NOT EXISTS manual_accounts (user_id TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(user_id,id))`;
      await storage.sql`CREATE TABLE IF NOT EXISTS statement_batches (user_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, payload TEXT NOT NULL, expires BIGINT NOT NULL, PRIMARY KEY(user_id,id))`;
    } else for (const statement of schema) storage.local().exec(statement);
  })().catch((error) => { ready = undefined; throw error; });
}
export async function premiumEnabled(userId: string) {
  await ensureManualFinance();
  const rows = storage.sql ? await storage.sql`SELECT premium_until FROM finance_entitlements WHERE user_id=${userId}` : storage.local().prepare('SELECT premium_until FROM finance_entitlements WHERE user_id=?').all(userId);
  return Number(rows[0]?.premium_until || 0) > Date.now();
}
export async function manualAccounts(userId: string): Promise<BankAccount[]> {
  await ensureManualFinance();
  const rows = storage.sql ? await storage.sql`SELECT payload FROM manual_accounts WHERE user_id=${userId} ORDER BY id` : storage.local().prepare('SELECT payload FROM manual_accounts WHERE user_id=? ORDER BY id').all(userId);
  return rows.map((r: any) => JSON.parse(r.payload));
}
async function accountFor(userId: string, id: string): Promise<BankAccount | undefined> {
  if (typeof id !== 'string') return;
  return (await manualAccounts(userId)).find((a) => a.id === id);
}
class ManualFinanceError extends Error {}
const errorMessage = (error: unknown) => error instanceof ManualFinanceError ? error.message : 'Não foi possível concluir a operação. Tente novamente.';
const accountText = (value: unknown, max = 120) => typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
const transactionId = (accountId: string, fingerprint: string) => `import:${createHash('sha256').update(`${accountId}:${fingerprint}`).digest('hex')}`;

export function installManualFinance(app: Express) {
  app.get('/api/manual/accounts', async (_req, res) => {
    try { res.json({ accounts: await manualAccounts(res.locals.user.id), premium: await premiumEnabled(res.locals.user.id), premiumMonthlyCents: 3990 }); }
    catch { res.status(503).json({ error: 'Não foi possível carregar suas contas manuais.' }); }
  });
  app.post('/api/manual/accounts', async (req, res) => {
    try {
      const input = req.body || {}, bankName = accountText(input.bankName), balance = input.balance;
      if (!bankName || typeof balance !== 'number' || !Number.isFinite(balance) || Math.abs(balance) > 1e12 || !['corrente', 'poupanca', 'investimento'].includes(input.accountType)) throw new ManualFinanceError('Informe o banco, o tipo de conta e um saldo válido.');
      await ensureManualFinance();
      const userId = res.locals.user.id, id = `manual:${randomUUID()}`;
      const account: BankAccount = { id, source: 'manual', bankName, bankCode: '', accountType: input.accountType, agency: '', accountNumber: accountText(input.accountNumber, 40), accountDigit: '', cpfTitular: '', nomeTitular: '', balance, availableForInvestment: 0, lastSync: new Date().toISOString(), connected: false, brandColor: '#a78bfa', logo: '🏦' };
      const payload = JSON.stringify(account), now = Date.now(); let inserted = false;
      if (storage.sql) {
        await storage.sql`INSERT INTO finance_entitlements(user_id) VALUES (${userId}) ON CONFLICT DO NOTHING`;
        // UPDATE rechecks the quota after waiting on concurrent writers. Allocation
        // and account creation are one statement, so a failed insert rolls back both.
        const result = await storage.sql`WITH quota AS (UPDATE finance_entitlements SET manual_account_count=manual_account_count+1 WHERE user_id=${userId} AND manual_account_count < CASE WHEN premium_until > ${now} THEN 100 ELSE 1 END RETURNING user_id) INSERT INTO manual_accounts(user_id,id,payload) SELECT user_id,${id},${payload} FROM quota RETURNING id`;
        inserted = result.length > 0;
      } else {
        const db = storage.local(); db.exec('BEGIN IMMEDIATE');
        try {
          db.prepare('INSERT INTO finance_entitlements(user_id) VALUES (?) ON CONFLICT DO NOTHING').run(userId);
          const result = db.prepare('UPDATE finance_entitlements SET manual_account_count=manual_account_count+1 WHERE user_id=? AND manual_account_count < CASE WHEN premium_until > ? THEN 100 ELSE 1 END').run(userId, now);
          inserted = Number(result.changes) > 0;
          if (inserted) db.prepare('INSERT INTO manual_accounts(user_id,id,payload) VALUES (?,?,?)').run(userId, id, payload);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
      if (!inserted) return res.status(403).json({ code: 'PLAN_LIMIT', error: 'Seu plano atingiu o limite de contas. O Free permite 1 conta manual. Premium planejado: R$ 39,90/mês; contratação ainda indisponível.' });
      res.status(201).json({ account });
    } catch (error) { res.status(400).json({ error: errorMessage(error) }); }
  });
  app.patch('/api/manual/accounts/:id', async (req, res) => {
    try {
      const userId = res.locals.user.id, account = await accountFor(userId, req.params.id);
      if (!account) return res.status(404).json({ error: 'Conta não encontrada.' });
      const balance = req.body?.balance;
      if (typeof balance !== 'number' || !Number.isFinite(balance) || Math.abs(balance) > 1e12) throw new ManualFinanceError('Saldo inválido.');
      const bankName = req.body.bankName === undefined ? account.bankName : accountText(req.body.bankName);
      if (!bankName) throw new ManualFinanceError('Informe o nome do banco / conta.');
      const accountNumber = req.body.accountNumber === undefined ? account.accountNumber : accountText(req.body.accountNumber, 40);
      const updated = { ...account, bankName, accountNumber, balance, lastSync: new Date().toISOString() }, payload = JSON.stringify(updated);
      if (storage.sql) await storage.sql`UPDATE manual_accounts SET payload=${payload} WHERE user_id=${userId} AND id=${account.id}`;
      else storage.local().prepare('UPDATE manual_accounts SET payload=? WHERE user_id=? AND id=?').run(payload, userId, account.id);
      res.json({ account: updated });
    } catch (error) { res.status(400).json({ error: errorMessage(error) }); }
  });
  app.post('/api/manual/imports/preview', async (req, res) => {
    try {
      const userId = res.locals.user.id, account = await accountFor(userId, req.body?.accountId);
      if (!account) return res.status(404).json({ error: 'Conta não encontrada.' });
      const filename = accountText(req.body.filename, 200);
      let parsed: ParsedStatement;
      try { parsed = parseStatement(filename, req.body.content, { delimiter: req.body.delimiter, decimal: req.body.decimal }); }
      catch (error) { throw new ManualFinanceError(error instanceof Error ? error.message : 'Extrato inválido.'); }
      if (parsed.accountNumber && account.accountNumber && parsed.accountNumber.replace(/\W/g, '') !== account.accountNumber.replace(/\W/g, '')) throw new ManualFinanceError('A conta informada no OFX difere da conta selecionada. Confira os números antes de importar.');
      const batchId = randomUUID(), expires = Date.now() + 30 * 60 * 1000, payload = JSON.stringify(parsed);
      if (storage.sql) {
        await storage.sql`DELETE FROM statement_batches WHERE user_id=${userId} AND expires < ${Date.now()}`;
        await storage.sql`INSERT INTO statement_batches(user_id,id,account_id,payload,expires) VALUES (${userId},${batchId},${account.id},${payload},${expires})`;
      } else {
        const db = storage.local(); db.prepare('DELETE FROM statement_batches WHERE user_id=? AND expires < ?').run(userId, Date.now());
        db.prepare('INSERT INTO statement_batches(user_id,id,account_id,payload,expires) VALUES (?,?,?,?,?)').run(userId, batchId, account.id, payload, expires);
      }
      const ids = parsed.rows.map((r) => `tx:${transactionId(account.id, r.fingerprint)}`);
      const existing = storage.sql ? await storage.sql`SELECT record_id FROM financial_history WHERE user_id=${userId} AND record_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))` : storage.local().prepare(`SELECT record_id FROM financial_history WHERE user_id=? AND record_id IN (${ids.map(() => '?').join(',')})`).all(userId, ...ids);
      const seen = new Set(existing.map((r: any) => r.record_id));
      res.json({ batchId, expires, accountNumber: parsed.accountNumber, warnings: parsed.warnings, rows: parsed.rows.map((row, index) => ({ index, date: row.date, description: row.description, amount: row.signedCents / 100, transfer: row.transfer, duplicate: seen.has(ids[index]) })) });
    } catch (error) { res.status(400).json({ error: errorMessage(error) }); }
  });
  app.post('/api/manual/imports/confirm', async (req, res) => {
    try {
      await ensureManualFinance();
      const userId = res.locals.user.id, batchId = req.body?.batchId;
      if (typeof batchId !== 'string') throw new ManualFinanceError('Importação inválida.');
      const rows = storage.sql ? await storage.sql`SELECT account_id,payload,expires FROM statement_batches WHERE user_id=${userId} AND id=${batchId}` : storage.local().prepare('SELECT account_id,payload,expires FROM statement_batches WHERE user_id=? AND id=?').all(userId, batchId);
      const batch = rows[0];
      if (!batch || Number(batch.expires) <= Date.now()) return res.status(410).json({ error: 'Conferência expirada. Envie o arquivo novamente.' });
      const account = await accountFor(userId, batch.account_id);
      if (!account) return res.status(404).json({ error: 'Conta não encontrada.' });
      const parsed: ParsedStatement = JSON.parse(batch.payload), selection = req.body.indices;
      if (!Array.isArray(selection) || !selection.length || selection.length > 2000 || new Set(selection).size !== selection.length || !selection.every((n) => Number.isInteger(n) && n >= 0 && n < parsed.rows.length)) throw new ManualFinanceError('Selecione as movimentações que deseja importar.');
      const observedAt = Date.now();
      const entries = selection.map((index: number) => {
        const row = parsed.rows[index], id = transactionId(account.id, row.fingerprint);
        const tx: FinancialTransaction = { id, source: 'import', sourceAccountType: 'BANK', type: 'account_transaction', sourceAccountId: account.id, sourceAccountName: account.bankName, amount: Math.abs(row.signedCents) / 100, direction: row.signedCents < 0 ? 'debit' : 'credit', currencyCode: 'BRL', timestamp: row.date, status: 'concluido', description: row.description, category: row.transfer ? 'Transferência a revisar' : 'Não categorizado' };
        return { record_id: `tx:${id}`, payload: JSON.stringify(tx) };
      });
      let imported = 0;
      if (storage.sql) {
        const result = await storage.sql`INSERT INTO financial_history(user_id,record_id,kind,payload,observed_at) SELECT ${userId},record_id,'transaction',payload,${observedAt} FROM jsonb_to_recordset(${JSON.stringify(entries)}::jsonb) AS x(record_id TEXT,payload TEXT) ON CONFLICT(user_id,record_id) DO NOTHING RETURNING record_id`;
        imported = result.length;
      } else {
        const db = storage.local(); db.exec('BEGIN IMMEDIATE');
        try {
          const insert = db.prepare("INSERT INTO financial_history(user_id,record_id,kind,payload,observed_at) VALUES (?,?,'transaction',?,?) ON CONFLICT(user_id,record_id) DO NOTHING");
          for (const entry of entries) imported += Number(insert.run(userId, entry.record_id, entry.payload, observedAt).changes);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
      const updatedAt = new Date(observedAt).toISOString();
      if (storage.sql) await storage.sql`UPDATE manual_accounts SET payload=jsonb_set(payload::jsonb,'{lastImportAt}',to_jsonb(${updatedAt}::text))::text WHERE user_id=${userId} AND id=${account.id}`;
      else storage.local().prepare("UPDATE manual_accounts SET payload=json_set(payload,'$.lastImportAt',?) WHERE user_id=? AND id=?").run(updatedAt, userId, account.id);
      res.json({ imported, duplicates: entries.length - imported, updatedAt });
    } catch (error) { res.status(400).json({ error: errorMessage(error) }); }
  });
}
