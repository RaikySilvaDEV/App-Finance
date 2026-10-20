import React, { useEffect, useRef, useState } from 'react';
import { Bell, Eye, EyeOff, RefreshCw, Menu, Layers, UserRound, LogOut, Landmark, ChevronDown } from 'lucide-react';
import type { InvestorProfile, RealIndicators, BankAccount } from '../types/finance';

interface HeaderProps {
  userEmail: string; onLogout: () => void;
  isPrivateMode: boolean; setIsPrivateMode: (val: boolean) => void;
  investorProfile: InvestorProfile; setInvestorProfile: (val: InvestorProfile) => void;
  onOpenFinanceModal: () => void; isSyncing: boolean; onSyncNow: () => void;
  connectedInstitutionsCount: number; totalInstitutionsCount: number;
  realIndicators: RealIndicators | null; onOpenAddModal: () => void;
  bankAccounts: BankAccount[]; onOpenBankManagerModal: () => void;
  onOpenConsentModal?: () => void; onOpenAcademyModal?: () => void;
  onToggleSidebar: () => void; alertCount: number; onOpenAlerts: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPrivateMode, setIsPrivateMode, onSyncNow, isSyncing, onToggleSidebar,
  onOpenBankManagerModal, connectedInstitutionsCount, userEmail, onLogout,
  alertCount, onOpenAlerts
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!profileOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [profileOpen]);

  const iconButton = 'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400';
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#09090b]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onToggleSidebar} aria-label="Abrir menu" className={iconButton + ' lg:hidden'}><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2"><Layers className="h-5 w-5 text-rose-400"/><span className="text-base font-semibold tracking-tight text-white">FinPulse</span></div>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button type="button" onClick={onSyncNow} disabled={isSyncing} aria-label={isSyncing ? 'Atualizando dados' : 'Atualizar dados'} aria-busy={isSyncing} title="Atualizar dados" className={iconButton + ' disabled:opacity-50'}><RefreshCw className={`h-[18px] w-[18px] ${isSyncing ? 'animate-spin' : ''}`}/></button>
          <button type="button" onClick={() => setIsPrivateMode(!isPrivateMode)} aria-label={isPrivateMode ? 'Mostrar valores' : 'Ocultar valores'} title={isPrivateMode ? 'Mostrar valores' : 'Ocultar valores'} className={iconButton}>{isPrivateMode ? <EyeOff className="h-[18px] w-[18px]"/> : <Eye className="h-[18px] w-[18px]"/>}</button>
          {alertCount > 0 && <button type="button" onClick={onOpenAlerts} aria-label={`Abrir avisos: ${alertCount} pendentes`} title="Avisos" className={iconButton}><Bell className="h-[18px] w-[18px]"/><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" /></button>}
          <div className="relative ml-1" ref={profileRef}>
            <button type="button" onClick={() => setProfileOpen(!profileOpen)} aria-label="Menu da conta" aria-expanded={profileOpen} aria-haspopup="menu" className="flex h-10 items-center gap-1 rounded-xl px-2 text-slate-300 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"><UserRound className="h-5 w-5"/><ChevronDown className="hidden h-3.5 w-3.5 sm:block"/></button>
            {profileOpen && <div role="menu" aria-label="Minha conta" className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-white/10 bg-[#18181d] p-2 shadow-2xl">
              <div className="truncate border-b border-white/10 px-3 py-3 text-xs text-slate-400" title={userEmail}>{userEmail}</div>
              <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); onOpenBankManagerModal(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-slate-200 hover:bg-white/5"><Landmark className="h-4 w-4"/>Conexões <span className="ml-auto text-slate-400">{connectedInstitutionsCount}</span></button>
              <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); onLogout(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-rose-300 hover:bg-white/5"><LogOut className="h-4 w-4"/>Sair</button>
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
};
