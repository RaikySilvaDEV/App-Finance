import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { Express, Request, Response } from 'express';

const scrypt = promisify(scryptCallback);
const dataDirectory = path.resolve(process.env.FINPULSE_DATA_DIR || 'data');
mkdirSync(dataDirectory, { recursive: true });
const db = new DatabaseSync(path.join(dataDirectory, 'finance.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, state TEXT NOT NULL DEFAULT '{}'); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);`);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const cookieName = 'finpulse_session';
const lifetime = 7 * 24 * 60 * 60 * 1000;
const attempts = new Map<string, { count: number; until: number }>();
function userFor(req: Request): any {
  const token = String(req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token) return null;
  return db.prepare('SELECT users.id, users.email, users.state FROM users JOIN sessions ON users.id = sessions.user_id WHERE sessions.token = ? AND sessions.expires > ?').get(digest(token), Date.now());
}
function session(res: Response, id: string) {
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(token), id, Date.now() + lifetime);
  res.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: lifetime, path: '/' });
}
function readState(user: any) { return JSON.parse(user.state || '{}'); }
function safeState(value: any) {
  if (!value || !Array.isArray(value.holdings) || !Array.isArray(value.itemIds) || value.holdings.length > 1000 || value.itemIds.length > 100) throw new Error('Dados inválidos.');
  if (!value.itemIds.every((id: unknown) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))) throw new Error('Conexão inválida.');
  return { holdings: value.holdings, itemIds: [...new Set<string>(value.itemIds)], profile: ['Moderado', 'Conservador', 'Arrojado'].includes(value.profile) ? value.profile : 'Moderado' };
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
      const token = String(req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
      if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(digest(token));
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
        try { db.prepare('INSERT INTO users (id,email,password) VALUES (?,?,?)').run(id, email, `${salt}:${hashed.toString('hex')}`); } catch { return res.status(409).json({ error: 'Não foi possível cadastrar esse e-mail. Tente entrar.' }); }
        session(res, id); return res.json({ user: { id, email } });
      }
      const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      const [salt, hash] = (user?.password || `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
      const hashed = (await scrypt(password, salt, 64)) as Buffer;
      if (!user || !timingSafeEqual(hashed, Buffer.from(hash, 'hex'))) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      attempts.delete(key); session(res, user.id); return res.json({ user: { id: user.id, email } });
    } catch { return res.status(500).json({ error: 'Não foi possível entrar. Tente novamente.' }); }
  });
  app.get('/api/auth/me', (req, res) => { const user = userFor(req); res.json({ user: user ? { id: user.id, email: user.email } : null }); });
  app.use('/api', (req, res, next) => {
    const user = userFor(req);
    if (!user) return res.status(401).json({ error: 'Entre na sua conta para continuar.' });
    res.locals.user = user; next();
  });
  app.get('/api/user/state', (_req, res) => res.json(readState(res.locals.user)));
  app.put('/api/user/state', (req, res) => {
    try {
      const state = safeState(req.body);
      const owned = readState(res.locals.user).itemIds || [];
      const migrated = readState(res.locals.user).migrated || false;
      if (state.itemIds.some((id) => !owned.includes(id))) return res.status(403).json({ error: 'Adicione a conexão antes de salvar.' });
      db.prepare('UPDATE users SET state = ? WHERE id = ?').run(JSON.stringify({ ...state, migrated }), res.locals.user.id); res.json({ ok: true });
    } catch { res.status(400).json({ error: 'Não foi possível salvar os dados.' }); }
  });
  app.post('/api/user/import', async (req, res) => {
    try {
      const state = safeState(req.body);
      const existing = readState(res.locals.user);
      if (existing.migrated) return res.status(409).json({ error: 'Esta conta já importou os dados do navegador.' });
      for (const id of state.itemIds) await validateItem(id);
      const combined = { ...state, holdings: [...(existing.holdings || []), ...state.holdings], itemIds: [...new Set([...(existing.itemIds || []), ...state.itemIds])], migrated: true };
      db.prepare('UPDATE users SET state = ? WHERE id = ?').run(JSON.stringify(combined), res.locals.user.id); res.json(combined);
    } catch { res.status(400).json({ error: 'Falha ao importar. Seus dados antigos continuam neste navegador.' }); }
  });
  app.post('/api/user/connections', async (req, res) => {
    const id = String(req.body.itemId || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Conexão inválida.' });
    try {
      await validateItem(id);
      const state = readState(res.locals.user);
      state.itemIds = [...new Set([...(state.itemIds || []), id])];
      db.prepare('UPDATE users SET state = ? WHERE id = ?').run(JSON.stringify(state), res.locals.user.id); res.json({ ok: true });
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
