import React, { useState } from 'react';
import { AlertCircle, Building2, ExternalLink, LoaderCircle, ShieldCheck, X } from 'lucide-react';

interface OpenFinanceConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (itemId: string) => Promise<void> | void;
}

export const OpenFinanceConsentModal: React.FC<OpenFinanceConsentModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const [itemId, setItemId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    fetch('/api/open-finance/status').then((response) => response.json()).then((data) => setCredentialsConfigured(Boolean(data.configured))).catch(() => setCredentialsConfigured(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    const normalizedItemId = itemId.trim();
    if (!/^[0-9a-f-]{36}$/i.test(normalizedItemId)) {
      setError('Cole um itemId válido (UUID) copiado da conexão MeuPluggy no Dashboard.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onConnected(normalizedItemId);
      setItemId('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar os dados desse item MeuPluggy.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4">
      <div className="relative max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#101012] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Conectar pelo Meu Pluggy</h2>
            <p className="text-xs text-slate-400">Fluxo pessoal · somente leitura</p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p>Este sistema é para seu uso pessoal. Autorize os bancos no Meu Pluggy; depois, informe aqui o identificador da conexão MeuPluggy criada no Dashboard da Pluggy. O FinPulse consulta os dados com suas credenciais locais do servidor.</p>
          <p className="flex items-start gap-2 text-xs text-cyan-200"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />A conexão desta versão é somente para consulta. Nenhum Pix ou pagamento será iniciado.</p>
        </div>

        <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-slate-400">
          <li><a href="https://meu.pluggy.ai/" target="_blank" rel="noreferrer" className="font-semibold text-cyan-300 hover:underline">Crie/acesse sua conta Meu Pluggy</a> e conecte seus bancos por lá.</li>
          <li>No <a href="https://dashboard.pluggy.ai/" target="_blank" rel="noreferrer" className="font-semibold text-cyan-300 hover:underline">Dashboard Pluggy</a>, abra sua aplicação demo, conecte o conector <strong className="text-slate-200">MeuPluggy</strong> (não escolha o banco diretamente) e copie o `itemId` da conexão.</li>
          <li>As credenciais Client ID/Secret da aplicação demo devem estar no `.env` local. As atualizações do Meu Pluggy são diárias.</li>
        </ol>

        {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}

        {credentialsConfigured === false && <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no arquivo .env e reinicie o servidor para habilitar a conexão real. Não compartilhe essas credenciais no navegador ou no chat.</p>}

        <label htmlFor="pluggy-item-id" className="mt-5 block text-xs font-semibold text-slate-300">itemId da conexão MeuPluggy</label>
        <input id="pluggy-item-id" value={itemId} onChange={(event) => setItemId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" spellCheck={false} className="mt-2 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400" />
        <button onClick={handleConnect} disabled={isLoading || credentialsConfigured === false || !itemId.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          {isLoading ? 'Validando e carregando…' : 'Adicionar minha conexão'}
        </button>
        <button onClick={onClose} className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white">Cancelar</button>
      </div>
    </div>
  );
};
