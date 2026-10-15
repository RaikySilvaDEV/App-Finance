import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Express } from 'express';
import { billOccurrences, brazilDay } from './src/lib/planning.js';
type Storage = { ensure: () => Promise<void>; sql: any; local: () => any; findUser: (email: string) => Promise<any> };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const generic = 'Se houver uma conta para este e-mail, você receberá as instruções de recuperação.';
export function applicationUrl() {
  try {
    const url = new URL(process.env.APP_URL || '');
    if (url.protocol !== 'https:' && !(process.env.VERCEL !== '1' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim() && applicationUrl());
async function sendEmail(to: string, subject: string, text: string, id: string) {
  if (!emailConfigured()) throw new Error('O envio de e-mails aguarda configuração pelo responsável.');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, 'Content-Type': 'application/json', 'Idempotency-Key': id }, body: JSON.stringify({ from: process.env.RESEND_FROM!.trim(), to: [to], subject, text }) });
  if (!response.ok) throw new Error('Não foi possível enviar o e-mail. Tente novamente mais tarde.');
  const body: any = await response.json();
  if (!body.id) throw new Error('Envio não confirmado pelo serviço de e-mail.');
}
export function createEmailIntegration(storage: Storage) {
  let ready: Promise<void> | null = null;
  function ensure() {
    if (!ready) ready = (async () => {
      await storage.ensure();
      const schemas = [
        'CREATE TABLE IF NOT EXISTS password_resets(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,password_at_issue TEXT NOT NULL,expires BIGINT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS email_limits(key TEXT PRIMARY KEY,next_allowed BIGINT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS email_preferences(user_id TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 0,confirmation TEXT,expires BIGINT)',
        'CREATE TABLE IF NOT EXISTS email_deliveries(user_id TEXT NOT NULL,day TEXT NOT NULL,PRIMARY KEY(user_id,day))',
      ];
      for (const schema of schemas) if (storage.sql) await storage.sql.query(schema); else storage.local().exec(schema);
    })().catch((error) => { ready = null; throw error; });
    return ready;
  }
  async function allowed(key: string, duration = 900000) {
    await ensure();
    const now = Date.now(), next = now + duration;
    if (storage.sql) {
      await storage.sql`DELETE FROM email_limits WHERE next_allowed < ${now - 86400000}`;
      const rows = await storage.sql`INSERT INTO email_limits(key,next_allowed) VALUES (${hash(key)},${next}) ON CONFLICT(key) DO UPDATE SET next_allowed=EXCLUDED.next_allowed WHERE email_limits.next_allowed<=${now} RETURNING key`;
      return rows.length > 0;
    }
    const db = storage.local(); db.prepare('DELETE FROM email_limits WHERE next_allowed < ?').run(now - 86400000);
    return db.prepare('INSERT INTO email_limits VALUES (?,?) ON CONFLICT(key) DO UPDATE SET next_allowed=excluded.next_allowed WHERE email_limits.next_allowed<=? RETURNING key').all(hash(key), next, now).length > 0;
  }
  const prefs = async (id: string) => storage.sql ? (await storage.sql`SELECT enabled,confirmation,expires FROM email_preferences WHERE user_id=${id}`)[0] : storage.local().prepare('SELECT enabled,confirmation,expires FROM email_preferences WHERE user_id=?').get(id);
  return {
    public(app: Express) {
      app.get('/api/auth/email-config', (_req, res) => res.json({ configured: emailConfigured() }));
      app.post('/api/auth/forgot-password', async (req, res) => {
        if (!emailConfigured()) return res.status(503).json({ error: 'A recuperação por e-mail aguarda configuração pelo responsável.' });
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });
        try {
          if (!(await allowed(`reset-ip:${req.ip}`, 60000)) || !(await allowed(`reset:${email}`))) return res.json({ message: generic });
          const user = await storage.findUser(email);
          if (user) {
            const token = randomBytes(32).toString('hex'), digest = hash(token), expires = Date.now() + 1800000;
            if (storage.sql) { await storage.sql`DELETE FROM password_resets WHERE expires<${Date.now()}`; await storage.sql`INSERT INTO password_resets VALUES (${digest},${user.id},${user.password},${expires})`; }
            else { const db = storage.local(); db.prepare('DELETE FROM password_resets WHERE expires<?').run(Date.now()); db.prepare('INSERT INTO password_resets VALUES (?,?,?,?)').run(digest, user.id, user.password, expires); }
            try { await sendEmail(email, 'Redefina sua senha do FinPulse', `Você solicitou uma nova senha. Abra o link em até 30 minutos:\n\n${applicationUrl()}/?reset_password=${token}\n\nSe não foi você, ignore este e-mail.`, `password-reset-${digest}`); }
            catch { if (storage.sql) await storage.sql`DELETE FROM password_resets WHERE token=${digest}`; else storage.local().prepare('DELETE FROM password_resets WHERE token=?').run(digest); console.error('Serviço de recuperação de senha indisponível.'); }
          }
          res.json({ message: generic });
        } catch { res.status(503).json({ error: 'Não foi possível processar a recuperação. Tente novamente mais tarde.' }); }
      });
      app.post('/api/auth/reset-password', async (req, res) => {
        const token = String(req.body?.token || ''), password = String(req.body?.password || '');
        if (!/^[a-f0-9]{64}$/.test(token) || password.length < 10 || password.length > 128) return res.status(400).json({ error: 'Informe uma senha de 10 a 128 caracteres e um link válido.' });
        try {
          if (!(await allowed(`reset-submit:${req.ip}`, 3000))) return res.status(429).json({ error: 'Aguarde alguns segundos e tente novamente.' });
          const salt = randomBytes(16).toString('hex'), passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`, digest = hash(token), now = Date.now();
          let changed = false;
          if (storage.sql) {
            const rows = await storage.sql`WITH updated AS (UPDATE users SET password=${passwordHash} FROM password_resets r WHERE r.token=${digest} AND r.expires>${now} AND users.id=r.user_id AND users.password=r.password_at_issue RETURNING users.id), removed_sessions AS (DELETE FROM sessions WHERE user_id IN (SELECT id FROM updated)), removed_tokens AS (DELETE FROM password_resets WHERE user_id IN (SELECT id FROM updated)) SELECT id FROM updated`;
            changed = rows.length === 1;
          } else {
            const db = storage.local(); db.exec('BEGIN IMMEDIATE');
            try { const row = db.prepare('SELECT * FROM password_resets WHERE token=? AND expires>?').get(digest, now); if (row) { const updated = db.prepare('UPDATE users SET password=? WHERE id=? AND password=? RETURNING id').all(passwordHash, row.user_id, row.password_at_issue); changed = updated.length === 1; if (changed) { db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id); db.prepare('DELETE FROM password_resets WHERE user_id=?').run(row.user_id); } } db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
          }
          if (!changed) return res.status(400).json({ error: 'Este link expirou ou já foi usado. Solicite outro.' });
          res.json({ message: 'Senha alterada. Entre novamente com a nova senha.' });
        } catch { res.status(503).json({ error: 'Não foi possível redefinir sua senha. Tente novamente.' }); }
      });
      app.post('/api/auth/confirm-reminders', async (req, res) => {
        const token = String(req.body?.token || '');
        if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'Link inválido.' });
        try {
          await ensure(); const now = Date.now(), digest = hash(token);
          const rows = storage.sql ? await storage.sql`UPDATE email_preferences SET enabled=1,confirmation=NULL,expires=NULL WHERE confirmation=${digest} AND expires>${now} RETURNING user_id` : storage.local().prepare('UPDATE email_preferences SET enabled=1,confirmation=NULL,expires=NULL WHERE confirmation=? AND expires>? RETURNING user_id').all(digest, now);
          if (!rows.length) return res.status(400).json({ error: 'Este link expirou ou já foi usado.' });
          res.json({ message: 'Lembretes ativados. Você pode desativá-los em Minha conta.' });
        } catch { res.status(503).json({ error: 'Não foi possível confirmar os lembretes.' }); }
      });
      app.get('/api/notifications/daily', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        const expected = process.env.CRON_SECRET || '', supplied = String(req.headers.authorization || '');
        if (!expected || expected.length < 32 || Buffer.byteLength(supplied) !== Buffer.byteLength(`Bearer ${expected}`) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(`Bearer ${expected}`))) return res.status(401).json({ error: 'Acesso não autorizado.' });
        if (!emailConfigured()) return res.status(503).json({ error: 'E-mail não configurado.' });
        try {
          await ensure(); const today = brazilDay(), start = new Date(`${today}T12:00:00Z`), end = new Date(start); start.setUTCDate(start.getUTCDate() - 7); end.setUTCDate(end.getUTCDate() + 3);
          const since = start.toISOString().slice(0, 10), until = end.toISOString().slice(0, 10);
          const users = storage.sql ? await storage.sql`SELECT u.id,u.email,u.state FROM users u JOIN email_preferences p ON p.user_id=u.id WHERE p.enabled=1 AND NOT EXISTS(SELECT 1 FROM email_deliveries d WHERE d.user_id=u.id AND d.day=${today}) LIMIT 30` : storage.local().prepare('SELECT u.id,u.email,u.state FROM users u JOIN email_preferences p ON p.user_id=u.id WHERE p.enabled=1 AND NOT EXISTS(SELECT 1 FROM email_deliveries d WHERE d.user_id=u.id AND d.day=?) LIMIT 30').all(today);
          let sent = 0, failed = 0;
          for (const user of users) {
            const planning = JSON.parse(user.state || '{}').planning || {};
            const due = billOccurrences(planning.bills || []).some((bill) => !bill.isPaid && bill.date >= since && bill.date <= until) || (planning.manualLoans || []).some((loan: any) => loan.remaining > 0 && loan.outstanding > 0 && loan.nextDue >= since && loan.nextDue <= until);
            if (!due) continue;
            try {
              await sendEmail(user.email, 'Lembrete de compromissos · FinPulse', `Há compromissos cadastrados com vencimento próximo ou recente. Confira o planejamento e marque os pagamentos já realizados:\n\n${applicationUrl()}/\n\nEste lembrete usa seus cadastros no FinPulse. Não confirma cobrança ou atraso no banco. Para deixar de receber, desative os lembretes em Minha conta.`, `reminders-${user.id}-${today}`);
              if (storage.sql) await storage.sql`INSERT INTO email_deliveries VALUES (${user.id},${today}) ON CONFLICT DO NOTHING`; else storage.local().prepare('INSERT INTO email_deliveries VALUES (?,?) ON CONFLICT DO NOTHING').run(user.id, today);
              sent++;
            } catch { failed++; }
          }
          res.status(failed ? 503 : 200).json({ sent, failed, processed: users.length });
        } catch { res.status(503).json({ error: 'Não foi possível processar os lembretes.' }); }
      });
    },
    private(app: Express) {
      app.get('/api/user/email-preferences', async (_req, res) => {
        try { await ensure(); const preference = await prefs(res.locals.user.id); res.json({ configured: emailConfigured(), enabled: preference?.enabled === 1, pending: Boolean(preference?.confirmation && Number(preference.expires) > Date.now()), scheduled: Boolean(process.env.VERCEL === '1' && (process.env.CRON_SECRET || '').length >= 32) }); }
        catch { res.status(503).json({ error: 'Não foi possível consultar os lembretes.' }); }
      });
      app.put('/api/user/email-preferences', async (req, res) => {
        const { id, email } = res.locals.user;
        if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'Preferência inválida.' });
        try {
          await ensure();
          if (!req.body.enabled) {
            if (storage.sql) await storage.sql`INSERT INTO email_preferences(user_id,enabled) VALUES (${id},0) ON CONFLICT(user_id) DO UPDATE SET enabled=0,confirmation=NULL,expires=NULL`; else storage.local().prepare('INSERT INTO email_preferences(user_id,enabled) VALUES (?,0) ON CONFLICT(user_id) DO UPDATE SET enabled=0,confirmation=NULL,expires=NULL').run(id);
            return res.json({ enabled: false, pending: false });
          }
          if (!emailConfigured()) return res.status(503).json({ error: 'O envio de e-mails aguarda configuração pelo responsável.' });
          if (!(await allowed(`confirm:${id}`))) return res.status(429).json({ error: 'Aguarde 15 minutos antes de solicitar outra confirmação.' });
          const token = randomBytes(32).toString('hex'), digest = hash(token), expires = Date.now() + 1800000;
          if (storage.sql) await storage.sql`INSERT INTO email_preferences VALUES (${id},0,${digest},${expires}) ON CONFLICT(user_id) DO UPDATE SET enabled=0,confirmation=EXCLUDED.confirmation,expires=EXCLUDED.expires`; else storage.local().prepare('INSERT INTO email_preferences VALUES (?,0,?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=0,confirmation=excluded.confirmation,expires=excluded.expires').run(id, digest, expires);
          try { await sendEmail(email, 'Confirme seus lembretes do FinPulse', `Para receber lembretes dos compromissos cadastrados, abra o link e confirme em até 30 minutos:\n\n${applicationUrl()}/?confirm_reminders=${token}\n\nSe não solicitou, ignore este e-mail.`, `confirm-reminders-${digest}`); }
          catch (error) { if (storage.sql) await storage.sql`UPDATE email_preferences SET confirmation=NULL,expires=NULL WHERE user_id=${id} AND confirmation=${digest}`; else storage.local().prepare('UPDATE email_preferences SET confirmation=NULL,expires=NULL WHERE user_id=? AND confirmation=?').run(id, digest); throw error; }
          res.json({ enabled: false, pending: true });
        } catch { res.status(503).json({ error: 'Não foi possível enviar a confirmação. Tente novamente mais tarde.' }); }
      });
    },
  };
}
