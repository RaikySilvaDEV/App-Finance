import { useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import type { DailyAlert } from '../lib/dailyControl';

export function AlertsDialog({ open, alerts, privateMode, onClose, onSelect }: {
  open: boolean; alerts: DailyAlert[]; privateMode: boolean;
  onClose: () => void; onSelect: (alert: DailyAlert) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = open && alerts.length > 0;
  useEffect(() => {
    const element = dialog.current;
    if (!visible || !element) return;
    const overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; };
  }, [visible]);
  if (!visible) return null;
  return <dialog ref={dialog} aria-labelledby="finpulse-alert-title" onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((element) => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}
    className="m-auto max-h-[min(85dvh,720px)] w-[calc(100%_-_2rem)] max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#141419] p-0 text-slate-300 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm">
    <div className="flex max-h-[min(85dvh,720px)] flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
        <div className="min-w-0"><h2 id="finpulse-alert-title" className="flex items-center gap-2 text-lg font-semibold text-white"><Bell aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-400"/>Seus avisos</h2><p className="mt-1 text-xs text-slate-400">{alerts.length} {alerts.length === 1 ? 'item para conferir' : 'itens para conferir'}</p></div>
        <button type="button" autoFocus onClick={onClose} aria-label="Fechar avisos" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"><X aria-hidden="true" className="h-5 w-5"/></button>
      </div>
      <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {alerts.map((alert) => <button key={alert.id} type="button" onClick={() => onSelect(alert)} className="w-full break-words rounded-xl border border-white/10 p-4 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">
          <span className={`block text-sm font-medium ${alert.severity === 'warning' ? 'text-amber-200' : 'text-white'}`}>{alert.title}</span>
          <span className="mt-2 block text-xs leading-relaxed text-slate-400">{privateMode ? 'Detalhes ocultos no modo privacidade.' : alert.detail}</span>
          <span className="mt-2 block text-xs text-rose-300">Conferir no planejamento →</span>
        </button>)}
      </div>
      <div className="shrink-0 border-t border-white/10 p-4"><button type="button" onClick={onClose} className="w-full rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Continuar para o FinPulse</button></div>
    </div>
  </dialog>;
}
