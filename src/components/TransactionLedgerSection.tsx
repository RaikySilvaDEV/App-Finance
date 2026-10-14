import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  TrendingUp, 
  ArrowDownLeft, 
  CheckCircle2, 
  FileText, 
  Clock, 
  ShieldCheck, 
  Plus, 
  ExternalLink,
  Copy,
  X
} from 'lucide-react';
import { FinancialTransaction } from '../types/finance';

interface TransactionLedgerSectionProps {
  transactions: FinancialTransaction[];
  onOpenMovementModal: () => void;
  isPrivateMode: boolean;
}

export const TransactionLedgerSection: React.FC<TransactionLedgerSectionProps> = ({
  transactions,
  onOpenMovementModal,
  isPrivateMode,
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialTransaction | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');

  const formatBrl = (val: number) => {
    if (isPrivateMode) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filtered = transactions.filter((t) => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'pix_transfer':
        return { label: 'Pix Entre Contas', icon: ArrowRightLeft, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'invest_aporte':
        return { label: 'Aporte em Ativo', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'invest_resgate':
        return { label: 'Resgate de Ativo', icon: ArrowDownLeft, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      default:
        return { label: 'Transferência', icon: ArrowRightLeft, color: 'text-slate-400 bg-slate-800' };
    }
  };

  const handleCopyReceipt = (tx: FinancialTransaction) => {
    const text = `
COMPROVANTE OFICIAL OPEN FINANCE BRASIL
ID Fim a Fim (SPI): ${tx.endToEndId}
Data: ${tx.timestamp}
Valor: ${formatBrl(tx.amount)}
Origem: ${tx.sourceAccountName}
Destino: ${tx.destinationAccountName}
Autenticação SHA-256: ${tx.autenticationCode}
Liquidado via Sistema de Pagamentos Instantâneos (SPI / Banco Central).
    `.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-[#0c121e] rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-extrabold text-white">
                Extrato de Movimentações Open Finance
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Liquidação SPI / BACEN
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Histórico de transferências Pix entre suas contas, compras e resgates de ativos
            </p>
          </div>
        </div>

        <button
          onClick={onOpenMovementModal}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Movimentação (Pix / Aporte)</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center space-x-1.5 text-xs py-3 border-b border-slate-800/60 overflow-x-auto">
        {[
          { id: 'all', label: 'Todas as Movimentações' },
          { id: 'pix_transfer', label: 'Pix Entre Contas' },
          { id: 'invest_aporte', label: 'Aportes em Ativos' },
          { id: 'invest_resgate', label: 'Resgates' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterType === f.id
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white bg-slate-950/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-slate-800/60 mt-1">
        {filtered.map((tx) => {
          const badge = getTransactionBadge(tx.type);
          const Icon = badge.icon;
          return (
            <div
              key={tx.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-800/20 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-white text-xs">{tx.description}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Origem: <strong className="text-slate-300">{tx.sourceAccountName}</strong> → Destino: <strong className="text-emerald-400">{tx.destinationAccountName}</strong>
                  </p>
                  <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>{tx.timestamp}</span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]" title={tx.endToEndId}>E2E: {tx.endToEndId}</span>
                  </div>
                </div>
              </div>

              {/* Amount and Action */}
              <div className="flex items-center space-x-3 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-base font-extrabold text-white font-mono block">
                    {formatBrl(tx.amount)}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Liquidado SPI
                  </span>
                </div>

                <button
                  onClick={() => setSelectedReceipt(tx)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Visualizar Comprovante Oficial"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Comprovante</span>
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-xs">Nenhuma movimentação realizada nesta categoria.</p>
            <button
              onClick={onOpenMovementModal}
              className="mt-2 text-xs text-emerald-400 hover:underline font-bold"
            >
              + Fazer sua primeira transferência ou aporte
            </button>
          </div>
        )}
      </div>

      {/* RECEIPT MODAL VIEWER */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0e1422] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-sm">Comprovante de Movimentação Oficial</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-2">
              <span className="text-xs text-slate-400 uppercase font-medium">Valor Liquidado</span>
              <div className="text-3xl font-extrabold text-white font-mono mt-0.5">
                {formatBrl(selectedReceipt.amount)}
              </div>
              <span className="text-xs text-emerald-400 font-bold block mt-1">
                Transação Liquidada via SPI / Banco Central do Brasil
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-400">Tipo:</span>
                <span className="text-white font-bold">{selectedReceipt.type}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-400">Data e Hora:</span>
                <span className="text-white">{selectedReceipt.timestamp}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-400">Conta de Origem:</span>
                <span className="text-white">{selectedReceipt.sourceAccountName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-400">Destino:</span>
                <span className="text-emerald-400 font-bold">{selectedReceipt.destinationAccountName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-400">ID Fim a Fim (E2E):</span>
                <span className="text-slate-300 text-[10px] break-all">{selectedReceipt.endToEndId}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Autenticação:</span>
                <span className="text-slate-400 text-[10px] break-all">{selectedReceipt.autenticationCode}</span>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => handleCopyReceipt(selectedReceipt)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
