import React, { useEffect, useId, useRef, useState } from 'react';
import { Bell, Eye, EyeOff, RefreshCw, Menu, Layers, UserRound, LogOut, Landmark } from 'lucide-react';
import { GoogleAccess } from './GoogleAccess';

interface HeaderProps {
  userEmail: string;
  onLogout: () => void;
  isPrivateMode: boolean;
  setIsPrivateMode: (value: boolean) => void;
  isSyncing: boolean;
  onSyncNow: () => void;
  connectedInstitutionsCount: number;
  onOpenBankManagerModal: () => void;
  onToggleSidebar: () => void;
  alertCount: number;
  onOpenAlerts: () => void;
}

export function Header({ isPrivateMode, setIsPrivateMode, onSyncNow, isSyncing, onToggleSidebar,
  onOpenBankManagerModal, connectedInstitutionsCount, userEmail, onLogout, alertCount, onOpenAlerts }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const profileId = useId();

  useEffect(() => {
    if (!profileOpen) return;
    const outside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setProfileOpen(false); profileButton.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [profileOpen]);

  const iconButton = 'relative inline-flex h-10 w-10 min-[375px]:h-11 min-[375px]:w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400';
  const action = 'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400';
  return <header className="sticky top-0 z-40 border-b border-white/5 bg-[#09090b]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
    <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-1 px-2 min-[375px]:gap-2 min-[375px]:px-3 sm:h-16 sm:px-6">
      <div className="flex min-w-0 shrink-0 items-center gap-1 min-[375px]:gap-2">
        <button type="button" onClick={onToggleSidebar} aria-label="Abrir menu" className={`${iconButton} lg:hidden`}><Menu className="h-5 w-5"/></button>
        <div className="flex items-center gap-1 min-[375px]:gap-2"><Layers aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-violet-400 min-[375px]:h-5 min-[375px]:w-5"/><span className="text-sm font-semibold tracking-tight text-white min-[375px]:text-base">FinPulse</span></div>
      </div>
      <div className="flex shrink-0 items-center sm:gap-1">
        <button type="button" onClick={onSyncNow} disabled={isSyncing} aria-label={isSyncing ? 'Atualizando dados' : 'Atualizar dados'} aria-busy={isSyncing} title="Atualizar dados" className={`${iconButton} disabled:opacity-50`}><RefreshCw aria-hidden="true" className={`h-[18px] w-[18px] ${isSyncing ? 'motion-safe:animate-spin' : ''}`}/></button>
        <button type="button" onClick={() => setIsPrivateMode(!isPrivateMode)} aria-label={isPrivateMode ? 'Mostrar valores' : 'Ocultar valores'} aria-pressed={isPrivateMode} title={isPrivateMode ? 'Mostrar valores' : 'Ocultar valores'} className={iconButton}>{isPrivateMode ? <EyeOff aria-hidden="true" className="h-[18px] w-[18px]"/> : <Eye aria-hidden="true" className="h-[18px] w-[18px]"/>}</button>
        {alertCount > 0 && <button type="button" onClick={onOpenAlerts} aria-label={`Abrir avisos: ${alertCount} pendentes`} aria-haspopup="dialog" title="Avisos" className={iconButton}><Bell aria-hidden="true" className="h-[18px] w-[18px]"/><span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500"/></button>}
        <div ref={profileRef} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setProfileOpen(false); }}>
          <button ref={profileButton} type="button" onClick={() => setProfileOpen((open) => !open)} aria-label="Menu da conta" aria-expanded={profileOpen} aria-controls={profileId} className={iconButton}><UserRound aria-hidden="true" className="h-5 w-5"/></button>
          {profileOpen && <section id={profileId} aria-label="Minha conta" className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh_-_9rem_-_env(safe-area-inset-top))] w-72 max-w-[calc(100vw_-_1rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#18181d] p-2 shadow-2xl">
            <p className="break-all border-b border-white/10 px-3 py-3 text-xs text-slate-400">{userEmail}</p>
            <button type="button" onClick={() => { setProfileOpen(false); onOpenBankManagerModal(); }} className={`${action} text-slate-200`}><Landmark aria-hidden="true" className="h-4 w-4"/>Conexões bancárias <span aria-label={`${connectedInstitutionsCount} conexões conectadas`} className="ml-auto text-slate-400">{connectedInstitutionsCount}</span></button>
            <details className="rounded-lg px-3 py-2 text-xs text-slate-400"><summary className="cursor-pointer rounded py-1 focus-visible:outline focus-visible:outline-violet-400">Google e lembretes por e-mail</summary><div className="pb-2 pt-3"><GoogleAccess account inline/></div></details>
            <button type="button" onClick={() => { setProfileOpen(false); onLogout(); }} className={`${action} text-rose-300`}><LogOut aria-hidden="true" className="h-4 w-4"/>Sair</button>
          </section>}
        </div>
      </div>
    </div>
  </header>;
}
