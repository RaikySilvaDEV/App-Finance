import React, { useEffect, useState } from 'react';
const PluggyConnect = React.lazy(() => import('react-pluggy-connect').then((module) => ({ default: module.PluggyConnect })));
import { X } from 'lucide-react';

interface Props { onManual?: () => void; updateItem?: string; isOpen: boolean; onClose: () => void; onConnected: (itemId: string) => Promise<void> | void }
export const OpenFinanceConsentModal: React.FC<Props> = ({ isOpen, onClose, onConnected, updateItem, onManual }) => {
  const [status, setStatus] = useState<{ configured: boolean; directConnection: boolean; personalImport: boolean } | null>(null);
  const [widget, setWidget] = useState<{ connectToken: string; connectorIds: number[]; isProxy?: boolean } | null>(null);
  const [itemId, setItemId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) { setWidget(null); return; }
    const controller = new AbortController(); setStatus(null); setError('');
    fetch('/api/open-finance/status', { signal: controller.signal }).then(async (res) => { if (!res.ok) throw new Error('Não foi possível consultar a conexão.'); setStatus(await res.json()); }).catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, [isOpen, updateItem]);
  useEffect(() => {
    if (!isOpen || !updateItem) return;
    const controller = new AbortController();
    setWidget(null); setError(''); setBusy(true);
    fetch('/api/open-finance/connect-token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: updateItem }), signal: controller.signal,
    }).then(async (res) => {
      if (!res.headers.get('content-type')?.includes('application/json')) throw new Error('O servidor não conseguiu abrir a autorização. Tente novamente.');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível abrir a autorização.');
      if (!controller.signal.aborted) setWidget(data);
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [isOpen, updateItem]);
  async function save(id: string) { setBusy(true); setError(''); try { if (updateItem && id !== updateItem) throw new Error('A autorização retornou uma conexão diferente. Tente novamente.'); await onConnected(id); setItemId(''); setWidget(null); onClose(); } catch (reason: any) { setWidget(null); setError(reason.message || 'Não foi possível salvar a conexão.'); } finally { setBusy(false); } }
  async function connect() {
    setBusy(true); setError('');
    try { const res = await fetch('/api/open-finance/connect-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: updateItem }) }); if (!res.headers.get('content-type')?.includes('application/json')) throw new Error('O servidor não conseguiu abrir a autorização. Tente novamente.'); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Não foi possível abrir a autorização.'); setWidget(data); }
    catch (reason: any) { setError(reason.message || 'Não foi possível iniciar a conexão.'); }
    finally { setBusy(false); }
  }
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"><section role="dialog" aria-modal="true" aria-labelledby="bank-connect-title" className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-[#101012] p-6 text-slate-300">
    <button onClick={() => { setWidget(null); onClose(); }} aria-label="Fechar" className="absolute right-3 top-3 p-2"><X className="h-5 w-5"/></button>
    <h2 id="bank-connect-title" className="pr-8 text-lg font-semibold text-white">{updateItem ? 'Atualizar conexão' : 'Conectar banco'}</h2>
    <p className="mt-2 text-sm text-slate-400">Suas contas, em um só lugar. Somente leitura.</p>
    {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
    {!status && !error && <p className="mt-5 text-sm" role="status">Carregando…</p>}
    {!updateItem && (status?.directConnection ? <div className="mt-6"><p className="text-sm">Escolha seu banco e autorize o acesso aos seus dados na conexão segura da Pluggy.</p><button disabled={busy || !!widget} onClick={() => void connect()} className="mt-5 w-full rounded-lg bg-violet-400 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Aguarde…' : 'Escolher meu banco'}</button></div> : status && !status.personalImport ? <p className="mt-6 text-sm">A conexão de bancos para novos usuários aguarda ativação pelo responsável. Você já pode cadastrar sua conta manual e importar extratos OFX/CSV, sem contratar uma integração bancária.{onManual && <button onClick={onManual} className="mt-4 block w-full rounded-lg bg-violet-400 p-3 font-semibold text-slate-950">Cadastrar conta e importar extrato</button>}</p> : null)}
    {!updateItem && status?.personalImport && !status.directConnection && <div className="mt-6 space-y-4"><p className="text-sm">Autorize seus bancos no Meu Pluggy e vincule os dados ao seu painel.</p><a href="https://meu.pluggy.ai/connections" target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm text-white">1. Autorizar banco no Meu Pluggy ↗</a><button disabled={busy || !!widget || !status.configured} onClick={() => void connect()} className="w-full rounded-lg bg-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Abrindo…' : '2. Vincular pelo MeuPluggy'}</button><p className="text-xs text-slate-500">Dados reais. Atualizações do Meu Pluggy a cada 24 horas.</p></div>}
    {!updateItem && status?.personalImport && <details className="mt-6 rounded-lg border border-white/10 p-3"><summary className="cursor-pointer text-sm">Importar conexão pessoal existente</summary><p className="mt-3 text-xs text-slate-400">No Dashboard, abra sua aplicação → Demo, conecte MeuPluggy e copie o itemId. Esta opção é pessoal.</p><a href="https://dashboard.pluggy.ai/applications" target="_blank" rel="noreferrer" className="mt-3 block text-xs text-violet-300">Abrir Dashboard Pluggy ↗</a><label className="mt-4 block text-xs" htmlFor="personal-item">Identificador da conexão</label><input id="personal-item" value={itemId} onChange={(event) => setItemId(event.target.value)} placeholder="itemId" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"/><button disabled={busy || !status.configured || !/^[0-9a-f-]{36}$/i.test(itemId.trim())} onClick={() => void save(itemId.trim())} className="mt-3 w-full rounded-lg bg-violet-400 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Carregando…' : 'Importar conexão'}</button></details>}
    {updateItem && busy && <p role="status" className="mt-5 text-sm">Abrindo autorização da Pluggy…</p>}
    {updateItem && !widget && !busy && <button onClick={() => void connect()} className="mt-5 rounded-lg border border-slate-700 px-4 py-3 text-sm">Tentar abrir autorização</button>}
    {widget?.isProxy && <p className="mt-5 text-sm leading-relaxed text-slate-400">Esta conexão usa o Meu Pluggy. O widget renova o vínculo de acesso; a atualização do banco acontece na conexão original. <a href="https://meu.pluggy.ai/connections" target="_blank" rel="noreferrer" className="text-rose-300 underline">Abrir conexão original ↗</a></p>}
    {widget && <React.Suspense fallback={<p role="status">Abrindo conexão segura…</p>}><PluggyConnect connectToken={widget.connectToken} updateItem={updateItem} forceAskForCredentials={Boolean(updateItem)} connectorIds={widget.connectorIds} includeSandbox={false} countries={['BR']} language="pt" theme="dark" onSuccess={({ item }) => save(item.id)} onClose={() => setWidget(null)} onError={() => { setWidget(null); setError('Não foi possível concluir a autorização. Tente novamente.'); }}/></React.Suspense>}
  </section></div>;
};
