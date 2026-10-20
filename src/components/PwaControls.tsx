import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, WifiOff, X } from 'lucide-react';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaControls() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const [online, setOnline] = useState(navigator.onLine);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeHelp = useCallback(() => setHelp(false), []);

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const didInstall = () => { setInstalled(true); setPrompt(null); setHelp(false); };
    const connection = () => setOnline(navigator.onLine);
    const display = window.matchMedia('(display-mode: standalone)');
    const displayChanged = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', didInstall);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    display.addEventListener('change', displayChanged);
    return () => {
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', didInstall);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      display.removeEventListener('change', displayChanged);
    };
  }, []);

  async function install() {
    if (!prompt) { setHelp(true); return; }
    setBusy(true);
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { setHelp(true); }
    finally { setPrompt(null); setBusy(false); }
  }

  return <>
    {!online && <p role="status" className="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-slate-950 px-4 py-3 text-xs text-amber-200"><WifiOff className="h-4 w-4 shrink-0"/>Sem conexão. Os dados exibidos podem estar desatualizados; alterações e importações precisam de internet.</p>}
    {!installed && <aside aria-label="Instalar aplicativo" className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#101012] px-4 py-2 sm:px-6"><p className="text-xs text-slate-400">FinPulse no seu celular</p><button disabled={busy} onClick={() => void install()} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-400/10 disabled:opacity-50"><Download className="h-4 w-4"/>{busy ? 'Abrindo…' : 'Instalar app'}</button></aside>}
    {help && <InstallHelp onClose={closeHelp}/>}
  </>;
}

function InstallHelp({ onClose }: { onClose: () => void }) {
  const [dialog] = useState(() => document.createElement('dialog'));
  useEffect(() => {
    dialog.className = 'm-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-300 backdrop:bg-black/80';
    dialog.setAttribute('aria-label', 'Instalar FinPulse');
    document.body.appendChild(dialog);
    const cancel = () => onClose(); dialog.addEventListener('cancel', cancel);
    dialog.showModal();
    return () => { dialog.removeEventListener('cancel', cancel); dialog.close(); dialog.remove(); };
  }, [dialog, onClose]);
  return createPortal(<><button onClick={onClose} aria-label="Fechar instruções" className="float-right rounded-lg p-2 hover:bg-slate-800"><X className="h-5 w-5"/></button><h2 className="pr-8 text-lg font-semibold text-white">Instalar FinPulse</h2><p className="mt-3 text-sm">Abra o site publicado no navegador do celular.</p><ol className="mt-4 list-decimal space-y-3 pl-5 text-sm"><li><strong>Android (Chrome):</strong> abra o menu ⋮ e procure “Instalar aplicativo” ou “Adicionar à tela inicial”.</li><li><strong>iPhone (Safari):</strong> toque em Compartilhar e depois em “Adicionar à Tela de Início”.</li></ol><p className="mt-4 text-xs leading-relaxed text-slate-400">Se a opção não aparecer, confira se você abriu o site em HTTPS no navegador, fora do navegador interno de outro app, ou se o FinPulse já está instalado. A disponibilidade da instalação depende do navegador.</p><p className="mt-3 text-xs text-slate-400">As funções financeiras precisam de conexão à internet.</p><button onClick={onClose} className="mt-5 w-full rounded-lg bg-violet-400 py-3 text-sm font-semibold text-slate-950">Entendi</button></>, dialog);
}

