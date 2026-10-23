import { useEffect, useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';

type ConnectionAccess = { directConnection: boolean; personalImport: boolean };

export function FirstBankSetup({ onConnect, onManual, onPlanning }: {
  onConnect: () => void;
  onManual: () => void;
  onPlanning: () => void;
}) {
  const [access, setAccess] = useState<ConnectionAccess | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setAccess(null); setError(false);
    fetch('/api/open-finance/status', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setAccess(data);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  const available = access?.directConnection || access?.personalImport;
  return <section aria-labelledby="first-bank-heading" className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#101013] p-6 sm:p-10">
    <Building2 aria-hidden="true" className="h-8 w-8 text-rose-400"/>
    <h2 id="first-bank-heading" className="mt-5 text-xl font-semibold text-white">Seu dinheiro, em um só lugar</h2>
    <p className="mt-3 text-sm leading-relaxed text-slate-400">Conecte seu primeiro banco para acompanhar contas, cartões e investimentos na sua conta FinPulse.</p>
    {available && <ol className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-3"><li>1. Escolha seu banco</li><li>2. Autorize o acesso</li><li>3. Acompanhe seus dados</li></ol>}
    {!access && !error && <p role="status" className="mt-6 text-sm text-slate-400">Verificando a conexão de bancos…</p>}
    {error && <div role="alert" className="mt-6 text-sm text-amber-200">Não foi possível consultar a conexão de bancos. <button onClick={() => setAttempt(value => value + 1)} className="underline">Tentar novamente</button></div>}
    {access && !available && <p className="mt-6 text-sm leading-relaxed text-slate-400">A conexão automática aguarda liberação pelo responsável. Você já pode cadastrar contas, importar extratos e organizar seu planejamento aqui.</p>}
    {access?.personalImport && !access.directConnection && <p className="mt-4 text-xs leading-relaxed text-slate-500">No uso pessoal, a autorização do banco é feita no Meu Pluggy e o vínculo dos dados é concluído aqui.</p>}
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {available && <button onClick={onConnect} className="rounded-lg bg-rose-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-rose-300">{access?.directConnection ? 'Conectar meu banco' : 'Vincular meus bancos'}</button>}
      <button onClick={onManual} className="rounded-lg border border-white/10 px-5 py-3 text-sm text-slate-200 hover:bg-white/5">Cadastrar conta manual</button>
      <button onClick={onPlanning} className="px-3 py-3 text-sm text-slate-400 hover:text-white">Começar pelo planejamento</button>
    </div>
    <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0"/>A conexão consulta dados. Nenhum pagamento é realizado por esse fluxo.</p>
  </section>;
}
