import { useEffect, useState } from 'react';
import { Building2, ChevronRight, FileUp, CalendarDays, ShieldCheck } from 'lucide-react';

type ConnectionAccess = { configured: boolean; directConnection: boolean; personalImport: boolean };

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
  const available = Boolean(access?.configured && (access.directConnection || access.personalImport));
  const actionClass = 'group flex min-h-24 w-full min-w-0 items-center gap-4 rounded-xl border border-white/[0.07] bg-[#0e0e10] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.025] sm:p-5';
  return <section aria-labelledby="first-bank-heading" className="space-y-5">
    <header>
      <h2 id="first-bank-heading" className="text-base font-semibold tracking-tight text-white">Comece por aqui</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">Escolha como adicionar suas informações ao FinPulse.</p>
    </header>
    <div className={`grid gap-3 ${available ? 'xl:grid-cols-3' : 'md:grid-cols-2'}`}>
      {available && <button type="button" onClick={onConnect} className={actionClass}>
        <Building2 aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-400"/>
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-200">{access?.directConnection ? 'Conectar banco' : 'Vincular Meu Pluggy'}</span><span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{access?.directConnection ? 'Autorize e acompanhe suas contas.' : 'Traga suas conexões pessoais.'}</span></span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-rose-300"/>
      </button>}
      <button type="button" onClick={onManual} className={actionClass}>
        <FileUp aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-400"/>
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-200">Contas e extratos</span><span className="mt-1.5 block text-xs leading-relaxed text-slate-500">Cadastre sua conta e importe OFX ou CSV.</span></span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-rose-300"/>
      </button>
      <button type="button" onClick={onPlanning} className={actionClass}>
        <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-400"/>
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-200">Meu planejamento</span><span className="mt-1.5 block text-xs leading-relaxed text-slate-500">Organize contas, orçamento e metas.</span></span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-rose-300"/>
      </button>
    </div>
    {!access && !error && <p role="status" className="text-xs text-slate-500">Consultando conexão bancária…</p>}
    {error && <p role="alert" className="text-xs leading-relaxed text-slate-400">Não foi possível consultar a conexão bancária. <button type="button" onClick={() => setAttempt(value => value + 1)} className="text-rose-300 underline underline-offset-4">Tentar novamente</button></p>}
    {access && (!available || !access.directConnection) && <details className="rounded-xl border border-white/[0.07] px-4 text-xs text-slate-500">
      <summary className="cursor-pointer py-4 text-slate-400">{available ? 'Sobre a conexão pelo Meu Pluggy' : 'Conexão automática em preparação'}<span className="ml-2 text-slate-600">· Saiba mais</span></summary>
      <p className="max-w-2xl pb-4 leading-relaxed">{available ? 'Autorize seus bancos no Meu Pluggy e conclua o vínculo aqui. As atualizações bancárias são feitas na plataforma deles.' : 'A conexão de bancos aguarda liberação pelo responsável. Enquanto isso, você pode cadastrar contas, importar extratos e planejar seus pagamentos.'}</p>
    </details>}
    <p className="flex items-center gap-2 text-[11px] text-slate-500"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0"/>Seus cadastros ficam salvos na sua conta FinPulse.</p>
  </section>;
}
