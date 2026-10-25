import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { neon } from '@neondatabase/serverless';
import type { Express, Request, Response } from 'express';
import { validatePlanning } from './src/lib/planning.js';
import { installHistory } from './history.js';
import { createEmailIntegration } from './email.js';
import { installGoogleAuth } from './google-auth.js';
import { ownedConnections, appendUserConnection } from './connection-ownership.js';
import { premiumEnabled } from './manual-finance.js';

type UserRecord = { id: string; email: string; password: string; state: string };
type SessionUser = Pick<UserRecord, 'id' | 'email' | 'state'>;

const scrypt = promisify(scryptCallback);
const dataDirectory = path.resolve(process.env.FINPULSE_DATA_DIR || 'data');
const databaseUrl = [process.env.DATABASE_URL, process.env.DATABASE_URL_POOLED]
  .map((value) => value?.trim()).find(Boolean);
const sql = databaseUrl ? neon(databaseUrl) : null;
let db: DatabaseSync | null = null;
let schemaReady: Promise<void> | null = null;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const cookieName = 'finpulse_session';
const lifetime = 7 * 24 * 60 * 60 * 1000;
const attempts = new Map<string, { count: number; until: number }>();

function databaseError() {
  return process.env.VERCEL === '1' && !databaseUrl
    ? 'A conexão do banco não chegou a esta implantação. Configure DATABASE_URL ou DATABASE_URL_POOLED no ambiente Production do projeto app-finance e faça um novo deploy.'
    : 'Não foi possível acessar o banco de dados. Tente novamente.';
}

function localDatabase() {
  if (process.env.VERCEL === '1') throw new Error(databaseError());
  if (!db) {
    mkdirSync(dataDirectory, { recursive: true });
    db = new DatabaseSync(path.join(dataDirectory, 'finance.sqlite'));
    db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, state TEXT NOT NULL DEFAULT '{}'); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);`);
    db.exec('CREATE TABLE IF NOT EXISTS financial_history (user_id TEXT NOT NULL, record_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, observed_at INTEGER NOT NULL, PRIMARY KEY (user_id,record_id))');
  }
  return db;
}

async function ensureDatabase() {
  if (!sql) {
    localDatabase();
    return;
  }
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, state TEXT NOT NULL DEFAULT '{}')`;
      await sql`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires BIGINT NOT NULL)`;
      await sql`CREATE TABLE IF NOT EXISTS financial_history (user_id TEXT NOT NULL, record_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, observed_at BIGINT NOT NULL, PRIMARY KEY (user_id,record_id))`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export const financeStorage = { ensure: ensureDatabase, sql, local: localDatabase };

async function userFor(req: Request): Promise<SessionUser | null> {
  const token = String(req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token) return null;
  await ensureDatabase();
  if (sql) {
    const rows = await sql`SELECT users.id, users.email, users.state FROM users JOIN sessions ON users.id = sessions.user_id WHERE sessions.token = ${digest(token)} AND sessions.expires > ${Date.now()} LIMIT 1`;
    return sanitizeSession((rows[0] as SessionUser | undefined) || null);
  }
  const row = localDatabase().prepare('SELECT users.id, users.email, users.state FROM users JOIN sessions ON users.id = sessions.user_id WHERE sessions.token = ? AND sessions.expires > ?').get(digest(token), Date.now());
  return sanitizeSession((row as SessionUser | undefined) || null);
}

async function sanitizeSession(user: SessionUser | null): Promise<SessionUser | null> {
  if (!user) return null;
  const allowed = new Set(await ownedConnections(user.id));
  const state = JSON.parse(user.state || '{}');
  return { ...user, state: JSON.stringify({ ...state, itemIds: (state.itemIds || []).filter((id: string) => allowed.has(id)) }) };
}

async function createSession(res: Response, id: string) {
  const token = randomBytes(32).toString('hex');
  const tokenDigest = digest(token);
  const expires = Date.now() + lifetime;
  await ensureDatabase();
  if (sql) {
    await sql`DELETE FROM sessions WHERE expires <= ${Date.now()}`;
    await sql`INSERT INTO sessions (token, user_id, expires) VALUES (${tokenDigest}, ${id}, ${expires})`;
  } else {
    const local = localDatabase();
    local.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
    local.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(tokenDigest, id, expires);
  }
  res.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: lifetime, path: '/' });
}

async function deleteSession(req: Request) {
  const token = String(req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token) return;
  await ensureDatabase();
  if (sql) await sql`DELETE FROM sessions WHERE token = ${digest(token)}`;
  else localDatabase().prepare('DELETE FROM sessions WHERE token = ?').run(digest(token));
}

async function findUser(email: string): Promise<UserRecord | null> {
  await ensureDatabase();
  if (sql) {
    const rows = await sql`SELECT id, email, password, state FROM users WHERE email = ${email} LIMIT 1`;
    return (rows[0] as UserRecord | undefined) || null;
  }
  const row = localDatabase().prepare('SELECT id, email, password, state FROM users WHERE email = ?').get(email);
  return (row as UserRecord | undefined) || null;
}

async function createUser(user: UserRecord) {
  await ensureDatabase();
  if (sql) {
    await sql`INSERT INTO users (id, email, password) VALUES (${user.id}, ${user.email}, ${user.password})`;
    return;
  }
  localDatabase().prepare('INSERT INTO users (id,email,password) VALUES (?,?,?)').run(user.id, user.email, user.password);
}

async function saveState(id: string, state: object) {
  await ensureDatabase();
  const serialized = JSON.stringify(state);
  if (sql) await sql`UPDATE users SET state = ${serialized} WHERE id = ${id}`;
  else localDatabase().prepare('UPDATE users SET state = ? WHERE id = ?').run(serialized, id);
}

function readState(user: SessionUser) { return JSON.parse(user.state || '{}'); }

async function enforceInvestmentLimit(user: SessionUser, holdings: any[]) {
  if (await premiumEnabled(user.id)) return;
  const key = (row: any) => `${row?.id}:${row?.assetId}:${row?.institutionId}`;
  if (holdings.some((row) => !row || typeof row.id !== 'string' || !row.id || row.id.length > 100) || new Set(holdings.map((row) => row.id)).size !== holdings.length) throw new Error('Posições manuais inválidas.');
  const incoming = new Set(holdings.map(key));
  const existing = new Set((readState(user).holdings || []).map(key));
  if (incoming.size > 2 && [...incoming].some((id) => !existing.has(id))) throw new Error('O Free permite até 2 posições manuais. Seus dados existentes foram preservados. Premium planejado: R$ 39,90/mês, ainda sem contratação.');
}

function safeState(value: any, previousPlanning?: ReturnType<typeof validatePlanning>) {
  if (!value || !Array.isArray(value.holdings) || !Array.isArray(value.itemIds) || value.holdings.length > 1000 || value.itemIds.length > 100) throw new Error('Dados inválidos.');
  if (!value.itemIds.every((id: unknown) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))) throw new Error('Conexão inválida.');
  let planning = value.planning;
  // An already-open older client does not know these optional fields. Preserve
  // server-owned saved metadata when it omits them while editing a commitment.
  if (planning && previousPlanning && typeof planning === 'object' && !Array.isArray(planning)) {
    const previousBills = new Map((previousPlanning.bills || []).map((bill) => [bill.id, bill]));
    planning = { ...planning, cardSchedules: planning.cardSchedules === undefined ? previousPlanning.cardSchedules || [] : planning.cardSchedules, priceAlerts: planning.priceAlerts === undefined ? previousPlanning.priceAlerts || [] : planning.priceAlerts, manualCards: planning.manualCards === undefined ? previousPlanning.manualCards || [] : planning.manualCards,
      bills: Array.isArray(planning.bills) ? planning.bills.map((bill: any) => {
        if (!bill || typeof bill !== 'object') return bill;
        const previous = previousBills.get(bill.id);
        return { ...bill, ...(bill.cardId === undefined && previous?.cardId ? { cardId: previous.cardId } : {}), ...(bill.recurrenceId === undefined && previous?.recurrenceId ? { recurrenceId: previous.recurrenceId } : {}) };
      }) : planning.bills };
  }
  return { holdings: value.holdings, itemIds: [...new Set<string>(value.itemIds)], profile: ['Moderado', 'Conservador', 'Arrojado'].includes(value.profile) ? value.profile : 'Moderado', planning: planning === undefined ? undefined : validatePlanning(planning) };
}

function isDuplicateUser(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    && ['23505', 'SQLITE_CONSTRAINT_UNIQUE'].includes(String(error.code));
}

export function installAuth(app: Express, validateItem: (id: string, user: SessionUser) => Promise<void>, investmentItem: (id: string) => Promise<string>) {
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: 'Origem inválida.' }); } catch { return res.status(403).json({ error: 'Origem inválida.' }); }
    }
    next();
  });
  const emailIntegration = createEmailIntegration({ ensure: ensureDatabase, sql, local: localDatabase, findUser });
  emailIntegration.public(app);
  installGoogleAuth(app, { ensure: ensureDatabase, sql, local: localDatabase, userFor, findUser, createUser, createSession });
  app.post('/api/auth/:action', async (req, res) => {
    const action = req.params.action;
    if (action === 'logout') {
      try { await deleteSession(req); } catch { return res.status(503).json({ error: databaseError() }); }
      res.clearCookie(cookieName, { path: '/' }); return res.json({ ok: true });
    }
    if (!['login', 'register'].includes(action)) return res.status(404).json({ error: 'Ação inválida.' });
    const key = req.ip || 'local';
    const attempt = attempts.get(key);
    if (attempt && attempt.until > Date.now() && attempt.count >= 10) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
    attempts.set(key, { count: attempt && attempt.until > Date.now() ? attempt.count + 1 : 1, until: Date.now() + 900000 });
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 10 || password.length > 128) return res.status(400).json({ error: 'Informe um e-mail válido e uma senha de 10 a 128 caracteres.' });
    try {
      if (action === 'register') {
        const salt = randomBytes(16).toString('hex');
        const hashed = (await scrypt(password, salt, 64)) as Buffer;
        const id = randomBytes(16).toString('hex');
        try { await createUser({ id, email, password: `${salt}:${hashed.toString('hex')}`, state: '{}' }); }
        catch (error) {
          if (isDuplicateUser(error)) return res.status(409).json({ error: 'Não foi possível cadastrar esse e-mail. Tente entrar.' });
          throw error;
        }
        await createSession(res, id); return res.json({ user: { id, email } });
      }
      const user = await findUser(email);
      const [salt, hash] = (user?.password || `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
      const hashed = (await scrypt(password, salt, 64)) as Buffer;
      if (!user || !timingSafeEqual(hashed, Buffer.from(hash, 'hex'))) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      attempts.delete(key); await createSession(res, user.id); return res.json({ user: { id: user.id, email } });
    } catch {
      console.error('Falha ao autenticar usuário.');
      return res.status(process.env.VERCEL === '1' && !databaseUrl ? 503 : 500).json({ error: databaseError() });
    }
  });
  app.get('/api/auth/me', async (req, res) => {
    try {
      const user = await userFor(req);
      res.json({ user: user ? { id: user.id, email: user.email } : null });
    } catch {
      console.error('Falha ao consultar a sessão do usuário.');
      res.status(process.env.VERCEL === '1' && !databaseUrl ? 503 : 500).json({ error: databaseError() });
    }
  });
  app.use('/api', async (req, res, next) => {
    try {
      const user = await userFor(req);
      if (!user) return res.status(401).json({ error: 'Entre na sua conta para continuar.' });
      res.locals.user = user; next();
    } catch {
      console.error('Falha ao consultar o banco de autenticação.');
      res.status(process.env.VERCEL === '1' && !databaseUrl ? 503 : 500).json({ error: databaseError() });
    }
  });
  emailIntegration.private(app);
  app.get('/api/user/state', (_req, res) => res.json(readState(res.locals.user)));
  app.put('/api/user/state', async (req, res) => {
    try {
      const state = safeState(req.body, readState(res.locals.user).planning);
      await enforceInvestmentLimit(res.locals.user, state.holdings);
      const owned = readState(res.locals.user).itemIds || [];
      const migrated = readState(res.locals.user).migrated || false;
      if (state.itemIds.some((id) => !owned.includes(id))) return res.status(403).json({ error: 'Adicione a conexão antes de salvar.' });
      const base = req.body.connectionBase ?? owned;
      if (!Array.isArray(base) || base.length > 1000 || !base.every((id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))) throw new Error();
      const removed = base.filter((id: string) => !state.itemIds.includes(id));
      const patch = { ...state, planning: state.planning ?? readState(res.locals.user).planning, migrated };
      // Preserve items attached by callbacks/webhooks after this browser loaded.
      // Only explicit removals from the browser's known base can remove a link.
      if (sql) {
        const rows = await sql`UPDATE users SET state=jsonb_set(state::jsonb || ${JSON.stringify(patch)}::jsonb,'{itemIds}',COALESCE((SELECT jsonb_agg(DISTINCT value) FROM jsonb_array_elements_text(COALESCE(users.state::jsonb->'itemIds','[]'::jsonb) || ${JSON.stringify(state.itemIds)}::jsonb) AS link(value) WHERE NOT (${JSON.stringify(removed)}::jsonb ? value)),'[]'::jsonb))::text WHERE id=${res.locals.user.id} RETURNING state`;
        return res.json({ ok: true, itemIds: JSON.parse(rows[0].state).itemIds });
      }
      const db = localDatabase();
      const current = JSON.parse((db.prepare('SELECT state FROM users WHERE id=?').get(res.locals.user.id) as any).state || '{}');
      const itemIds = [...new Set<string>([...(current.itemIds || []), ...state.itemIds])].filter((id) => !removed.includes(id));
      await saveState(res.locals.user.id, { ...current, ...patch, itemIds }); res.json({ ok: true, itemIds });
    } catch (error) { res.status(400).json({ error: error instanceof Error && (error.message.startsWith('O Free permite') || error.message === 'Posições manuais inválidas.') ? error.message : 'Não foi possível salvar os dados.' }); }
  });
  app.post('/api/user/import', async (req, res) => {
    try {
      const state = safeState(req.body);
      const existing = readState(res.locals.user);
      if (existing.migrated) return res.status(409).json({ error: 'Esta conta já importou os dados do navegador.' });
      for (const id of state.itemIds) await validateItem(id, res.locals.user);
      const combined = { ...state, planning: existing.planning ?? state.planning, holdings: [...(existing.holdings || []), ...state.holdings], itemIds: [...new Set([...(existing.itemIds || []), ...state.itemIds])], migrated: true };
      await enforceInvestmentLimit(res.locals.user, combined.holdings);
      await saveState(res.locals.user.id, combined); res.json(combined);
    } catch { res.status(400).json({ error: 'Falha ao importar. Seus dados antigos continuam neste navegador.' }); }
  });
  app.post('/api/user/connections', async (req, res) => {
    const id = String(req.body.itemId || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Conexão inválida.' });
    try {
      await validateItem(id, res.locals.user);
      await appendUserConnection(res.locals.user.id, id); res.json({ ok: true });
    } catch { res.status(400).json({ error: 'Não foi possível validar esta conexão.' }); }
  });
  installHistory(app, { ensure: ensureDatabase, sql, local: localDatabase });
  app.use('/api/open-finance', async (req, res, next) => {
    const ids = (Array.isArray(req.query.itemId) ? req.query.itemId : req.query.itemId ? [req.query.itemId] : []).map(String);
    if (ids.some((id) => !(readState(res.locals.user).itemIds || []).includes(id))) return res.status(403).json({ error: 'Conexão não pertence a este usuário.' });
    if (req.query.investmentId) {
      const id = String(req.query.investmentId);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Investimento inválido.' });
      try {
        const itemId = await investmentItem(id);
        if (!(readState(res.locals.user).itemIds || []).includes(itemId)) return res.status(403).json({ error: 'Investimento não pertence a este usuário.' });
      } catch { return res.status(503).json({ error: 'Não foi possível validar o investimento.' }); }
    }
    next();
  });
}
