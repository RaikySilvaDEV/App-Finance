import React from 'react';
import { Eye, EyeOff, RefreshCw, Menu, Layers, Plus } from 'lucide-react';
import { InvestorProfile, RealIndicators, BankAccount } from '../types/finance';
interface HeaderProps {
  userEmail: string;
  onLogout: () => void;
  isPrivateMode: boolean;
  setIsPrivateMode: (val: boolean) => void;
  investorProfile: InvestorProfile;
  setInvestorProfile: (val: InvestorProfile) => void;
  onOpenFinanceModal: () => void;
  isSyncing: boolean;
  onSyncNow: () => void;
  connectedInstitutionsCount: number;
  totalInstitutionsCount: number;
  realIndicators: RealIndicators | null;
  onOpenAddModal: () => void;
  bankAccounts: BankAccount[];
  onOpenBankManagerModal: () => void;
  onOpenConsentModal?: () => void;
  onOpenAcademyModal?: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isPrivateMode, setIsPrivateMode, onSyncNow, isSyncing, onToggleSidebar, onOpenBankManagerModal, bankAccounts, userEmail, onLogout }) => (
  <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#09090b]/95 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
      <div className="flex items-center gap-3"><button onClick={onToggleSidebar} aria-label="Abrir menu" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"><Menu className="h-5 w-5" /></button><div className="flex items-center gap-2.5"><Layers className="h-6 w-6 text-violet-400"/><span className="text-base font-semibold tracking-tight text-white">FinPulse</span></div></div>
      <div className="flex items-center gap-1.5 sm:gap-3"><button onClick={onOpenBankManagerModal} className="flex items-center gap-2 rounded-lg border border-slate-800 px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800"><Layers className="h-3.5 w-3.5 text-slate-500"/><span className="hidden sm:inline">Conexões</span><span>{bankAccounts.length}</span></button><button onClick={onSyncNow} disabled={isSyncing} aria-label="Atualizar dados" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}/></button><button onClick={() => setIsPrivateMode(!isPrivateMode)} aria-label={isPrivateMode ? 'Mostrar valores' : 'Ocultar valores'} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">{isPrivateMode ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div>
      <button onClick={onLogout} title={userEmail} className="shrink-0 rounded-lg px-2 py-2 text-xs text-slate-400 hover:bg-slate-800">Sair</button>
    </div>
  </header>
);
