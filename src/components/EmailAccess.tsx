import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
const input = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white';
const button = 'w-full rounded-lg bg-rose-400 py-3 text-sm font-semibold text-white disabled:opacity-50';
function AccessCard({ children, title, caption }: { children: React.ReactNode; title: string; caption: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12"><section className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6"><KeyRound className="mb-5 h-6 w-6 text-rose-300"/><h1 className="text-xl font-semibold text-white">{title}</h1><p className="mt-2 text-sm leading-relaxed text-slate-400">{caption}</p>{children}</section></main>;
}
async function request(path: string, body: object) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a solicitação.');
  return result;
}
export function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => { const controller = new AbortController(); fetch('/api/auth/email-config', { signal: controller.signal }).then(async (response) => { if (response.ok) setConfigured((await response.json()).configured); }).catch(() => {}); return () => controller.abort(); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const email = new FormData(event.currentTarget).get('email'); setBusy(true); setError('');
    try { const data = await request('/api/auth/forgot-password', { email }); setMessage(data.message); }
    catch (reason: any) { setError(reason.name === 'TimeoutError' ? 'A solicitação demorou. Tente novamente.' : reason.message); } finally { setBusy(false); }
  }
  return <AccessCard title="Recuperar senha" caption="Receba um link para criar uma nova senha.">{configured === false && <p role="status" className="mt-4 text-xs text-amber-300">A recuperação por e-mail aguarda configuração pelo responsável.</p>}{message ? <p role="status" className="mt-5 text-sm text-slate-300">{message}</p> : <form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-xs text-slate-300">E-mail da conta<input className={input} name="email" type="email" autoComplete="email" required maxLength={254}/></label>{error && <p role="alert" className="text-xs text-rose-300">{error}</p>}<button className={button} disabled={busy || configured === false}>{busy ? 'Solicitando…' : 'Enviar link'}</button></form>}<button onClick={onBack} className="mt-5 inline-flex items-center gap-2 text-xs text-slate-400"><ArrowLeft className="h-3.5 w-3.5"/>Voltar ao login</button></AccessCard>;
}
export function EmailAccessFlow({ children }: { children: React.ReactNode }) {
  const [flow, setFlow] = useState(() => { const url = new URL(window.location.href); return { reset: url.searchParams.get('reset_password') || '', confirm: url.searchParams.get('confirm_reminders') || '' }; });
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => { if (!flow.reset && !flow.confirm) return; const url = new URL(window.location.href); url.searchParams.delete('reset_password'); url.searchParams.delete('confirm_reminders'); history.replaceState(null, '', url.pathname + url.search + url.hash); }, []);
  if (!flow.reset && !flow.confirm) return <>{children}</>;
  const reset = Boolean(flow.reset);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); const form = new FormData(event.currentTarget);
    if (reset && form.get('password') !== form.get('confirmation')) { setError('As senhas precisam ser iguais.'); return; }
    setBusy(true);
    try { const data = await request(`/api/auth/${reset ? 'reset-password' : 'confirm-reminders'}`, { token: reset ? flow.reset : flow.confirm, ...(reset ? { password: form.get('password') } : {}) }); setMessage(data.message); }
    catch (reason: any) { setError(reason.name === 'TimeoutError' ? 'A solicitação demorou. Tente novamente.' : reason.message); } finally { setBusy(false); }
  }
  return <AccessCard title={reset ? 'Crie sua nova senha' : 'Confirmar lembretes'} caption={reset ? 'Use pelo menos 10 caracteres.' : 'Receba lembretes dos compromissos que você cadastrou. Você pode desativar em Minha conta.'}>{message ? <p role="status" className="mt-5 text-sm text-slate-300">{message}</p> : <form onSubmit={submit} className="mt-5 space-y-4">{reset && <><label className="block text-xs text-slate-300">Nova senha<input type="password" name="password" required minLength={10} maxLength={128} autoComplete="new-password" className={input}/></label><label className="block text-xs text-slate-300">Confirme a senha<input type="password" name="confirmation" required minLength={10} maxLength={128} autoComplete="new-password" className={input}/></label></>}{error && <p role="alert" className="text-xs text-rose-300">{error}</p>}<button className={button} disabled={busy}>{busy ? 'Aguarde…' : reset ? 'Salvar nova senha' : 'Confirmar recebimento'}</button></form>}<button onClick={() => { setFlow({ reset: '', confirm: '' }); window.location.replace('/'); }} className="mt-5 text-xs text-slate-400">{message ? 'Continuar para o FinPulse' : 'Voltar ao login'}</button></AccessCard>;
}
export function EmailPreferences() {
  const [state, setState] = useState<{ configured: boolean; enabled: boolean; pending: boolean; scheduled: boolean } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); fetch('/api/user/email-preferences', { signal: controller.signal }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setState(data); }).catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); }); return () => controller.abort(); }, []);
  async function update(enabled: boolean) {
    setBusy(true); setError('');
    try { const response = await fetch('/api/user/email-preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setState((old) => old ? { ...old, ...data } : old); }
    catch (reason: any) { setError(reason.message); } finally { setBusy(false); }
  }
  return <div className="mt-4 border-t border-slate-800 pt-4"><p className="flex items-center gap-2 text-xs text-slate-300"><Mail className="h-3.5 w-3.5"/>Lembretes por e-mail</p>{state && <><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{!state.configured ? 'Envio aguardando configuração.' : state.pending ? 'Confirme o link enviado ao e-mail da sua conta.' : state.enabled ? 'Ativados para seus compromissos cadastrados.' : 'Receba lembretes de vencimentos cadastrados.'}</p>{(state.configured || state.enabled || state.pending) && <button disabled={busy} onClick={() => void update(!state.enabled && !state.pending)} className="mt-3 text-xs text-rose-300 disabled:opacity-50">{busy ? 'Aguarde…' : state.enabled || state.pending ? 'Desativar' : 'Ativar e confirmar e-mail'}</button>}{state.enabled && !state.scheduled && <p className="mt-2 text-[10px] text-slate-500">Agendamento aguardando configuração no servidor publicado.</p>}</>}{error && <p role="alert" className="mt-2 text-[11px] text-rose-300">{error}</p>}</div>;
}
