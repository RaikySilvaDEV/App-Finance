import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { neon } from '@neondatabase/serverless';
import type { Express, Request, Response } from 'express';

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
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

async function userFor(req: Request): Promise<SessionUser | null> {
  const token = String(req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token) return null;
  await ensureDatabase();
  if (sql) {
    const rows = await sql`SELECT users.id, users.email, users.state FROM users JOIN sessions ON users.id = sessions.user_id WHERE sessions.token = ${digest(token)} AND sessions.expires > ${Date.now()} LIMIT 1`;
    return (rows[0] as SessionUser | undefined) || null;
  }
  const row = localDatabase().prepare('SELECT users.id, users.email, users.state FROM users JOIN sessions ON users.id = sessions.user_id WHERE sessions.token = ? AND sessions.expires > ?').get(digest(token), Date.now());
  return (row as SessionUser | undefined) || null;
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

function safeState(value: any) {
  if (!value || !Array.isArray(value.holdings) || !Array.isArray(value.itemIds) || value.holdings.length > 1000 || value.itemIds.length > 100) throw new Error('Dados inválidos.');
  if (!value.itemIds.every((id: unknown) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))) throw new Error('Conexão inválida.');
  return { holdings: value.holdings, itemIds: [...new Set<string>(value.itemIds)], profile: ['Moderado', 'Conservador', 'Arrojado'].includes(value.profile) ? value.profile : 'Moderado' };
}

function isDuplicateUser(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    && ['23505', 'SQLITE_CONSTRAINT_UNIQUE'].includes(String(error.code));
}

export function installAuth(app: Express, validateItem: (id: string) => Promise<void>, investmentItem: (id: string) => Promise<string>) {
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: 'Origem inválida.' }); } catch { return res.status(403).json({ error: 'Origem inválida.' }); }
    }
    next();
  });
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
  app.get('/api/user/state', (_req, res) => res.json(readState(res.locals.user)));
  app.put('/api/user/state', async (req, res) => {
    try {
      const state = safeState(req.body);
      const owned = readState(res.locals.user).itemIds || [];
      const migrated = readState(res.locals.user).migrated || false;
      if (state.itemIds.some((id) => !owned.includes(id))) return res.status(403).json({ error: 'Adicione a conexão antes de salvar.' });
      await saveState(res.locals.user.id, { ...state, migrated }); res.json({ ok: true });
    } catch { res.status(400).json({ error: 'Não foi possível salvar os dados.' }); }
  });
  app.post('/api/user/import', async (req, res) => {
    try {
      const state = safeState(req.body);
      const existing = readState(res.locals.user);
      if (existing.migrated) return res.status(409).json({ error: 'Esta conta já importou os dados do navegador.' });
      for (const id of state.itemIds) await validateItem(id);
      const combined = { ...state, holdings: [...(existing.holdings || []), ...state.holdings], itemIds: [...new Set([...(existing.itemIds || []), ...state.itemIds])], migrated: true };
      await saveState(res.locals.user.id, combined); res.json(combined);
    } catch { res.status(400).json({ error: 'Falha ao importar. Seus dados antigos continuam neste navegador.' }); }
  });
  app.post('/api/user/connections', async (req, res) => {
    const id = String(req.body.itemId || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Conexão inválida.' });
    try {
      await validateItem(id);
      const state = readState(res.locals.user);
      state.itemIds = [...new Set([...(state.itemIds || []), id])];
      await saveState(res.locals.user.id, state); res.json({ ok: true });
    } catch { res.status(400).json({ error: 'Não foi possível validar esta conexão.' }); }
  });
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
