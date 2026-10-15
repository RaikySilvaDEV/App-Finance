import React, { useEffect, useState } from 'react';
const PluggyConnect = React.lazy(() => import('react-pluggy-connect').then((module) => ({ default: module.PluggyConnect })));
import { X } from 'lucide-react';

interface Props { updateItem?: string; isOpen: boolean; onClose: () => void; onConnected: (itemId: string) => Promise<void> | void }
export const OpenFinanceConsentModal: React.FC<Props> = ({ isOpen, onClose, onConnected, updateItem }) => {
  const [status, setStatus] = useState<{ configured: boolean; directConnection: boolean; personalImport: boolean } | null>(null);
  const [widget, setWidget] = useState<{ connectToken: string; connectorIds: number[] } | null>(null);
  const [itemId, setItemId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) { setWidget(null); return; }
    const controller = new AbortController(); setStatus(null); setError('');
    fetch('/api/open-finance/status', { signal: controller.signal }).then(async (res) => { if (!res.ok) throw new Error('Não foi possível consultar a conexão.'); setStatus(await res.json()); }).catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, [isOpen]);
  async function save(id: string) { setBusy(true); setError(''); try { await onConnected(id); setItemId(''); setWidget(null); onClose(); } catch (reason: any) { setWidget(null); setError(reason.message || 'Não foi possível salvar a conexão.'); } finally { setBusy(false); } }
  async function connect() {
    setBusy(true); setError('');
    try { const res = await fetch('/api/open-finance/connect-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: updateItem }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setWidget(data); }
    catch (reason: any) { setError(reason.message || 'Não foi possível iniciar a conexão.'); }
    finally { setBusy(false); }
  }
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"><section role="dialog" aria-modal="true" aria-labelledby="bank-connect-title" className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-[#101012] p-6 text-slate-300">
    <button onClick={() => { setWidget(null); onClose(); }} aria-label="Fechar" className="absolute right-3 top-3 p-2"><X className="h-5 w-5"/></button>
    <h2 id="bank-connect-title" className="pr-8 text-lg font-semibold text-white">Conectar banco</h2>
    <p className="mt-2 text-sm text-slate-400">Suas contas, em um só lugar. Somente leitura.</p>
    {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
    {!status && !error && <p className="mt-5 text-sm" role="status">Carregando…</p>}
    {status?.directConnection ? <div className="mt-6"><p className="text-sm">Escolha seu banco e autorize o acesso aos seus dados na conexão segura da Pluggy.</p><button disabled={busy || !!widget} onClick={() => void connect()} className="mt-5 w-full rounded-lg bg-violet-400 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Aguarde…' : 'Escolher meu banco'}</button></div> : status && !status.personalImport ? <p className="mt-6 text-sm">A conexão de bancos para novos usuários aguarda ativação pelo responsável. Você já pode usar os cadastros manuais e o planejamento.</p> : null}
    {status?.personalImport && <details className="mt-6 rounded-lg border border-white/10 p-3"><summary className="cursor-pointer text-sm">Importar conexão pessoal existente</summary><p className="mt-3 text-xs text-slate-400">Use o itemId da sua conexão MeuPluggy no Dashboard. Esta opção está disponível apenas para o responsável pelo sistema.</p><label className="mt-4 block text-xs" htmlFor="personal-item">Identificador da conexão</label><input id="personal-item" value={itemId} onChange={(event) => setItemId(event.target.value)} placeholder="itemId" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"/><button disabled={busy || !status.configured || !/^[0-9a-f-]{36}$/i.test(itemId.trim())} onClick={() => void save(itemId.trim())} className="mt-3 w-full rounded-lg bg-violet-400 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Carregando…' : 'Importar conexão'}</button></details>}
    {widget && <React.Suspense fallback={<p role="status">Abrindo conexão segura…</p>}><PluggyConnect connectToken={widget.connectToken} updateItem={updateItem} connectorIds={widget.connectorIds} includeSandbox={false} countries={['BR']} language="pt" theme="dark" onSuccess={({ item }) => save(item.id)} onClose={() => setWidget(null)} onError={() => { setWidget(null); setError('Não foi possível concluir a autorização. Tente novamente.'); }}/></React.Suspense>}
  </section></div>;
};
