import React, { useEffect, useState } from 'react';
import { Layers, LogIn, LoaderCircle } from 'lucide-react';
type User = { id: string; email: string };
export type SavedState = { holdings?: any[]; itemIds?: string[]; profile?: any; migrated?: boolean };
const keys = ['finpulse_real_holdings_v3', 'finpulse_meu_pluggy_item_ids_v1'];
function legacy() {
  try { return { holdings: JSON.parse(localStorage.getItem(keys[0]) || '[]'), itemIds: JSON.parse(localStorage.getItem(keys[1]) || '[]'), profile: 'Moderado' }; }
  catch { return { holdings: [], itemIds: [], profile: 'Moderado' }; }
}
export function AuthGate({ children }: { children: (state: SavedState, user: User, logout: () => Promise<void>) => React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<SavedState | null>(null);
  const [checking, setChecking] = useState(true);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [importPending, setImportPending] = useState(false);
  async function load(nextUser: User) {
    const response = await fetch('/api/user/state');
    if (!response.ok) throw new Error('Não foi possível carregar seus dados.');
    const saved = await response.json();
    setState(saved); setUser(nextUser);
    const old = legacy();
    setImportPending(!saved.migrated && (old.holdings.length > 0 || old.itemIds.length > 0));
  }
  useEffect(() => {
    fetch('/api/auth/me').then(async (response) => {
      if (!response.ok) throw new Error('Servidor indisponível.');
      const data = await response.json();
      if (data.user) await load(data.user);
    }).catch((reason) => setError(reason.message)).finally(() => setChecking(false));
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${register ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await load(data.user);
    } catch (reason: any) { setError(reason.message || 'Falha ao entrar.'); }
    finally { setBusy(false); }
  }
  async function migrate() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/user/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(legacy()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setState(data); keys.forEach((key) => localStorage.removeItem(key)); setImportPending(false);
    } catch (reason: any) { setError(reason.message || 'Falha ao importar.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error('Não foi possível sair.');
    setUser(null); setState(null); setError('');
  }
  if (checking) return <div className="flex min-h-screen items-center justify-center gap-3 bg-slate-950 text-sm text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin"/>Carregando sua conta…</div>;
  if (user && state && !importPending) return <React.Fragment key={user.id}>{children(state, user, logout)}</React.Fragment>;
  return <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 py-12"><div className="w-full max-w-sm"><div className="mb-8 flex items-center gap-3 text-white"><Layers className="h-7 w-7 text-violet-400"/><span className="text-xl font-semibold">FinPulse</span></div><div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"><h1 className="text-xl font-semibold text-white">{importPending ? 'Recupere seus dados' : register ? 'Crie sua conta' : 'Entre na sua conta'}</h1><p className="mt-2 text-sm leading-relaxed text-slate-400">{importPending ? 'Encontramos conexões e investimentos cadastrados neste navegador. Importe para salvá-los na sua conta.' : 'Suas conexões e investimentos salvos, em qualquer navegador deste sistema.'}</p>{error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/20 p-3 text-xs text-rose-300">{error}</p>}{importPending ? <div className="mt-6 space-y-3"><button disabled={busy} onClick={() => void migrate()} className="w-full rounded-lg bg-violet-400 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Importando…' : 'Importar meus dados'}</button><button disabled={busy} onClick={() => setImportPending(false)} className="w-full py-2 text-sm text-slate-400">Continuar sem importar</button></div> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs text-slate-300">E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"/></label><label className="block text-xs text-slate-300">Senha<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={10} maxLength={128} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"/></label>{register && <p className="text-xs text-slate-500">Use pelo menos 10 caracteres.</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-400 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"><LogIn className="h-4 w-4"/>{busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}</button><button type="button" onClick={() => { setRegister(!register); setError(''); }} className="w-full py-2 text-xs text-slate-400">{register ? 'Já tenho uma conta' : 'Criar minha conta'}</button></form>}</div><p className="mt-4 text-center text-xs leading-relaxed text-slate-500">Seus dados ficam no servidor deste FinPulse.</p></div></main>;
}
