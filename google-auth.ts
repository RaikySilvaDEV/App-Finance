import { OAuth2Client } from 'google-auth-library';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Express, Request, Response } from 'express';

type AuthUser = { id: string; email: string; state: string; password?: string };
type Dependencies = { ensure: () => Promise<void>; sql: any; local: () => any; userFor: (req: Request) => Promise<AuthUser | null>; findUser: (email: string) => Promise<AuthUser | null>; createUser: (user: AuthUser & { password: string }) => Promise<void>; createSession: (res: Response, id: string) => Promise<void> };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const cookieName = 'finpulse_google_flow';
export function googleConfigured() {
  try { const uri = new URL(process.env.GOOGLE_REDIRECT_URI || ''); return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && uri.pathname === '/api/auth/google/callback' && (uri.protocol === 'https:' || (process.env.VERCEL !== '1' && uri.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(uri.hostname)))); } catch { return false; }
}
export function installGoogleAuth(app: Express, storage: Dependencies) {
  let ready: Promise<void> | null = null;
  const ensure = () => {
    if (!ready) ready = (async () => {
      await storage.ensure();
      if (storage.sql) {
        await storage.sql`CREATE TABLE IF NOT EXISTS google_identities (subject TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE)`;
        await storage.sql`CREATE TABLE IF NOT EXISTS google_flows (state_hash TEXT PRIMARY KEY,verifier TEXT NOT NULL,nonce TEXT NOT NULL,user_id TEXT,expires BIGINT NOT NULL)`;
      } else storage.local().exec('CREATE TABLE IF NOT EXISTS google_identities(subject TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE); CREATE TABLE IF NOT EXISTS google_flows(state_hash TEXT PRIMARY KEY,verifier TEXT NOT NULL,nonce TEXT NOT NULL,user_id TEXT,expires INTEGER NOT NULL)');
    })().catch((error) => { ready = null; throw error; });
    return ready;
  };
  app.get('/api/auth/google/config', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const user = await storage.userFor(req);
      let linked = false;
      if (user) { await ensure(); const rows = storage.sql ? await storage.sql`SELECT subject FROM google_identities WHERE user_id=${user.id}` : storage.local().prepare('SELECT subject FROM google_identities WHERE user_id=?').all(user.id); linked = rows.length > 0; }
      res.json({ configured: googleConfigured(), linked });
    } catch { res.status(503).json({ error: 'Não foi possível consultar o acesso Google.' }); }
  });
  app.get('/api/auth/google/start', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!googleConfigured()) return res.redirect('/?auth_error=google_unavailable');
    const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
    const cookieOptions = { httpOnly: true, secure: redirectUri.startsWith('https:'), sameSite: 'lax' as const, path: '/api/auth/google', maxAge: 600000 };
    try {
      // Only the configured application origin can initiate this callback flow.
      if (new URL(redirectUri).host !== req.headers.host) return res.status(400).json({ error: 'Use o endereço principal do aplicativo para entrar com Google.' });
      const user = req.query.link === '1' ? await storage.userFor(req) : null;
      if (req.query.link === '1' && !user) return res.redirect('/?auth_error=google_login_first');
      await ensure();
      const state = randomBytes(32).toString('hex'), nonce = randomBytes(32).toString('hex'), verifier = randomBytes(32).toString('base64url');
      const expires = Date.now() + 600000, userId = user?.id || null;
      if (storage.sql) { await storage.sql`DELETE FROM google_flows WHERE expires < ${Date.now()}`; await storage.sql`INSERT INTO google_flows(state_hash,verifier,nonce,user_id,expires) VALUES (${hash(state)},${verifier},${nonce},${userId},${expires})`; }
      else { const db = storage.local(); db.prepare('DELETE FROM google_flows WHERE expires < ?').run(Date.now()); db.prepare('INSERT INTO google_flows VALUES (?,?,?,?,?)').run(hash(state), verifier, nonce, userId, expires); }
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
      const url = new URL(client.generateAuthUrl({ scope: ['openid', 'email', 'profile'], state, access_type: 'online', prompt: 'select_account' }));
      url.searchParams.set('nonce', nonce); url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url')); url.searchParams.set('code_challenge_method', 'S256');
      res.cookie(cookieName, state, cookieOptions); res.redirect(url.toString());
    } catch { res.redirect('/?auth_error=google_failed'); }
  });
  app.get('/api/auth/google/callback', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
    const provided = typeof req.query.state === 'string' ? req.query.state : '';
    const cookie = String(req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || '';
    res.clearCookie(cookieName, { path: '/api/auth/google', sameSite: 'lax', secure: process.env.GOOGLE_REDIRECT_URI?.startsWith('https:') });
    if (!googleConfigured() || !/^[a-f0-9]{64}$/.test(provided) || !/^[a-f0-9]{64}$/.test(cookie) || !timingSafeEqual(Buffer.from(provided), Buffer.from(cookie))) return res.redirect('/?auth_error=google_invalid');
    try {
      await ensure();
      const flows = storage.sql ? await storage.sql`DELETE FROM google_flows WHERE state_hash=${hash(provided)} AND expires > ${Date.now()} RETURNING verifier,nonce,user_id` : storage.local().prepare('DELETE FROM google_flows WHERE state_hash=? AND expires > ? RETURNING verifier,nonce,user_id').all(hash(provided), Date.now());
      const flow = flows[0];
      if (!flow || req.query.error || typeof req.query.code !== 'string') return res.redirect('/?auth_error=google_cancelled');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
      const { tokens } = await client.getToken({ code: req.query.code, codeVerifier: flow.verifier, redirect_uri: process.env.GOOGLE_REDIRECT_URI });
      if (!tokens.id_token) throw new Error();
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
      const identity = ticket.getPayload();
      if (!identity?.sub || !identity.email || !identity.email_verified || identity.nonce !== flow.nonce || identity.sub.length > 255 || identity.email.length > 254) throw new Error();
      const email = identity.email.trim().toLowerCase();
      const linked = storage.sql ? await storage.sql`SELECT user_id FROM google_identities WHERE subject=${identity.sub}` : storage.local().prepare('SELECT user_id FROM google_identities WHERE subject=?').all(identity.sub);
      let id = linked[0]?.user_id as string | undefined;
      if (flow.user_id) {
        const existing = await storage.findUser(email);
        if (!existing || existing.id !== flow.user_id || (id && id !== flow.user_id)) return res.redirect('/?auth_error=google_link_mismatch');
        id = flow.user_id;
      } else if (!id) {
        // Do not silently attach an external identity to an existing password account.
        if (await storage.findUser(email)) return res.redirect('/?auth_error=google_existing_account');
        id = randomBytes(16).toString('hex');
        const password = `google-only:${randomBytes(64).toString('hex')}`;
        if (storage.sql) await storage.sql.transaction([
          storage.sql`INSERT INTO users(id,email,password,state) VALUES (${id},${email},${password},'{}')`,
          storage.sql`INSERT INTO google_identities(subject,user_id) VALUES (${identity.sub},${id})`,
        ]);
        else { const db = storage.local(); db.exec('BEGIN'); try { db.prepare('INSERT INTO users(id,email,password,state) VALUES (?,?,?,?)').run(id,email,password,'{}'); db.prepare('INSERT INTO google_identities VALUES (?,?)').run(identity.sub,id); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } }
      }
      if (storage.sql) { await storage.sql`INSERT INTO google_identities(subject,user_id) VALUES (${identity.sub},${id}) ON CONFLICT(subject) DO NOTHING`; const rows = await storage.sql`SELECT user_id FROM google_identities WHERE subject=${identity.sub}`; if (rows[0]?.user_id !== id) throw new Error(); }
      else { const db = storage.local(); db.prepare('INSERT INTO google_identities VALUES (?,?) ON CONFLICT(subject) DO NOTHING').run(identity.sub, id!); if ((db.prepare('SELECT user_id FROM google_identities WHERE subject=?').get(identity.sub) as any)?.user_id !== id) throw new Error(); }
      await storage.createSession(res, id!);
      res.redirect(flow.user_id ? '/?auth_message=google_linked' : '/');
    } catch { res.redirect('/?auth_error=google_failed'); }
  });
}
