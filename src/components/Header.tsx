import React from 'react';
import { 
  Building2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  SlidersHorizontal,
  ArrowRightLeft,
  Plus,
  Coins,
  GraduationCap
} from 'lucide-react';
import { InvestorProfile, RealIndicators, BankAccount } from '../types/finance';

interface HeaderProps {
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
  onOpenMovementModal: () => void;
  onOpenConsentModal?: () => void;
  onOpenAcademyModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPrivateMode,
  setIsPrivateMode,
  investorProfile,
  setInvestorProfile,
  onOpenFinanceModal,
  isSyncing,
  onSyncNow,
  connectedInstitutionsCount,
  totalInstitutionsCount,
  realIndicators,
  onOpenAddModal,
  bankAccounts,
  onOpenBankManagerModal,
  onOpenMovementModal,
  onOpenConsentModal,
  onOpenAcademyModal,
}) => {
  const totalChecking = bankAccounts.reduce((acc, b) => acc + (b.connected ? b.balance : 0), 0);

  const formatBrl = (val: number) => {
    if (isPrivateMode) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#090d18]/95 border-b border-slate-800/80 transition-all">
      {/* Top Real Market Ticker Banner */}
      <div className="bg-[#050810] border-b border-slate-850 px-4 lg:px-8 py-1.5 text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto gap-4">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-white uppercase tracking-wider text-[10px]">
              Dados Oficiais Reais (BACEN & B3):
            </span>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-6 text-slate-300 font-mono text-[11px] shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Selic Meta:</span>
              <strong className="text-emerald-400 font-bold">
                {realIndicators ? `${realIndicators.selic.metaAnnualPct}% a.a.` : '13.75% a.a.'}
              </strong>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">CDI Diário:</span>
              <strong className="text-cyan-400 font-bold">
                {realIndicators ? `${realIndicators.cdi.dailyPct}%/dia` : '0.0508%/dia'}
              </strong>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Dólar PTAX:</span>
              <strong className="text-violet-400 font-bold">
                {realIndicators ? `R$ ${realIndicators.dolar.ptaxBrl.toFixed(2)}` : 'R$ 5.04'}
              </strong>
            </div>

            <div className="flex items-center space-x-1.5 hidden md:flex">
              <span className="text-slate-500">IPCA Acum.:</span>
              <strong className="text-amber-400 font-bold">
                {realIndicators ? `${realIndicators.ipca.accumulated12mPct}% a.a.` : '4.42%'}
              </strong>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 hidden lg:block shrink-0">
            Iniciação de Pagamentos (ITP) regulada pelo Banco Central
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Logo & Open Finance Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-slate-950 font-bold" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  FinPulse
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  Open Finance Ativo
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Contas bancárias vinculadas e movimentações financeiras diretas
              </p>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={onOpenAcademyModal}
              className="p-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 text-xs font-bold"
              title="Tutorial e Treinamento para Leigos"
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span className="text-[11px]">Aprender</span>
            </button>
            <button
              onClick={onOpenMovementModal}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold"
            >
              Movimentar
            </button>
            <button
              onClick={onOpenBankManagerModal}
              className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold"
            >
              Contas ({bankAccounts.length})
            </button>
            <button
              onClick={() => setIsPrivateMode(!isPrivateMode)}
              className="p-2 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60"
            >
              {isPrivateMode ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Right Controls */}
        <div className="hidden md:flex items-center space-x-2.5">
          {/* Investment Academy / Tutorial for Beginners */}
          <button
            onClick={onOpenAcademyModal}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer group shadow-sm shadow-amber-500/10"
            title="Área de Treinamento e Tutorial de Investimentos para Iniciantes"
          >
            <GraduationCap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Treinamento para Leigos</span>
          </button>

          {/* Movement Trigger (Core Feature) */}
          <button
            onClick={onOpenMovementModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Fazer Movimentação (Pix / Aporte)</span>
          </button>

          {/* Linked Bank Accounts */}
          <button
            onClick={onOpenBankManagerModal}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer group"
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Contas Bancárias:</span>
            <span className="font-bold text-emerald-400">
              {bankAccounts.length} Vinculadas
            </span>
          </button>

          {/* Add Real Investment */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Ativo B3</span>
          </button>

          {/* Live Sync Trigger */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isSyncing 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-300 hover:text-white'
            }`}
            title="Atualizar cotações reais e saldos bancários"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Profile Select */}
          <div className="relative flex items-center bg-slate-800/60 border border-slate-700/70 rounded-xl px-2.5 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-violet-400 mr-1.5" />
            <select
              value={investorProfile}
              onChange={(e) => setInvestorProfile(e.target.value as InvestorProfile)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
            >
              <option value="Conservador" className="bg-slate-900 text-white">Conservador</option>
              <option value="Moderado" className="bg-slate-900 text-white">Moderado</option>
              <option value="Arrojado" className="bg-slate-900 text-white">Arrojado</option>
            </select>
          </div>

          {/* Privacy Toggle */}
          <button
            onClick={() => setIsPrivateMode(!isPrivateMode)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isPrivateMode 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-300 hover:text-white'
            }`}
            title={isPrivateMode ? "Valores ocultos" : "Ocultar valores"}
          >
            {isPrivateMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
