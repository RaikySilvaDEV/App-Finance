import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Plus, 
  Lock, 
  ExternalLink, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { OpenFinanceInstitution } from '../types/finance';

interface OpenFinanceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions: OpenFinanceInstitution[];
  onToggleConnection: (institutionId: string) => void;
  onSyncAll: () => void;
  isSyncing: boolean;
}

export const OpenFinanceManagerModal: React.FC<OpenFinanceManagerModalProps> = ({
  isOpen,
  onClose,
  institutions,
  onToggleConnection,
  onSyncAll,
  isSyncing,
}) => {
  const [syncStep, setSyncStep] = useState<string>('');
  const [connectingBankId, setConnectingBankId] = useState<string | null>(null);

  if (!isOpen) return null;

  const connectedCount = institutions.filter(i => i.connected).length;
  const totalBalance = institutions
    .filter(i => i.connected)
    .reduce((acc, i) => acc + i.totalBalance, 0);

  const formatBrl = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleConnect = (instId: string) => {
    setConnectingBankId(instId);
    setTimeout(() => {
      onToggleConnection(instId);
      setConnectingBankId(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-3xl bg-[#0c111d] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Central Open Finance Brasil</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Regulado pelo Banco Central
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gerencie conexões seguras de dados bancários, investimentos e proventos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Summary Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#0e1626] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Patrimônio Consolidado via Open Finance</span>
              <span className="text-2xl font-extrabold text-white mt-0.5 block font-mono">
                {formatBrl(totalBalance)}
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {connectedCount} de {institutions.length} instituições autorizadas
              </span>
            </div>

            <button
              onClick={onSyncAll}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando BCB...' : 'Sincronizar Todas as Contas'}</span>
            </button>
          </div>

          {/* Security & Regulatory notice */}
          <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-start space-x-2.5 text-xs text-slate-300">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-cyan-300">Segurança de Nível Bancário:</strong> Seus dados são transmitidos via criptografia ponta a ponta mTLS com autenticação OAuth 2.0 padrão Open Finance Brasil. Nós nunca temos acesso a senhas ou permissão de movimentação financeira.
            </div>
          </div>

          {/* Institutions List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Instituições Conectadas e Disponíveis
            </h3>

            <div className="space-y-2.5">
              {institutions.map((inst) => {
                const isConnecting = connectingBankId === inst.id;
                return (
                  <div
                    key={inst.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-md shrink-0"
                        style={{ backgroundColor: `${inst.brandColor}25`, border: `1px solid ${inst.brandColor}60` }}
                      >
                        {inst.logo}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">{inst.name}</span>
                          {inst.connected ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Conectado
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                              Não conectado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {inst.accountType} • {inst.holdingsCount} ativos sincronizados
                        </p>
                        {inst.connected && (
                          <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Última sync: {inst.lastSync}
                            </span>
                            <span>•</span>
                            <span>Consentimento até: {inst.consentExpiry}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      {inst.connected ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white font-mono hidden sm:inline">
                            {formatBrl(inst.totalBalance)}
                          </span>
                          <button
                            onClick={() => onToggleConnection(inst.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Desconectar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnect(inst.id)}
                          disabled={isConnecting}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isConnecting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Autorizando...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Conectar via Open Finance</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Concluir & Voltar ao Painel
          </button>
        </div>
      </div>
    </div>
  );
};
