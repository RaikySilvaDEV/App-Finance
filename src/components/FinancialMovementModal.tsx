import React, { useState } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  TrendingUp, 
  ArrowDownLeft, 
  CheckCircle2, 
  Building2, 
  DollarSign, 
  ShieldCheck, 
  Coins, 
  Copy, 
  Printer, 
  Clock, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { BankAccount, Asset, FinancialTransaction, PortfolioHolding } from '../types/finance';

interface FinancialMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  assets: Asset[];
  holdings: PortfolioHolding[];
  onMovementSuccess: (transaction: FinancialTransaction, updatedHoldings?: PortfolioHolding[]) => void;
  initialMode?: 'transfer' | 'aporte' | 'resgate';
  preselectedAsset?: Asset | null;
}

export const FinancialMovementModal: React.FC<FinancialMovementModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  assets,
  holdings,
  onMovementSuccess,
  initialMode = 'transfer',
  preselectedAsset = null,
}) => {
  const [movementType, setMovementType] = useState<'transfer' | 'aporte' | 'resgate'>(initialMode);
  
  // Transfer state
  const [sourceAccountId, setSourceAccountId] = useState<string>(bankAccounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState<string>(bankAccounts[1]?.id || '');
  const [useExternalPix, setUseExternalPix] = useState<boolean>(false);
  const [externalPixKey, setExternalPixKey] = useState<string>('');
  
  // Aporte / Invest state
  const [targetAssetTicker, setTargetAssetTicker] = useState<string>(preselectedAsset?.ticker || assets[0]?.ticker || 'MXRF11');
  
  // Resgate state
  const [sourceHoldingId, setSourceHoldingId] = useState<string>(holdings[0]?.id || '');
  const [destinationReceiveAccountId, setDestinationReceiveAccountId] = useState<string>(bankAccounts[0]?.id || '');

  // Amount & Description
  const [amount, setAmount] = useState<string>('500');
  const [description, setDescription] = useState<string>('');
  
  // Process states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<FinancialTransaction | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  if (!isOpen) return null;

  const sourceAccount = bankAccounts.find(b => b.id === sourceAccountId) || bankAccounts[0];
  const destAccount = bankAccounts.find(b => b.id === destinationAccountId);
  const selectedAsset = assets.find(a => a.ticker === targetAssetTicker) || assets[0];
  const selectedHolding = holdings.find(h => h.id === sourceHoldingId) || holdings[0];

  const formatBrl = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleExecuteMovement = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Informe um valor válido maior que R$ 0,00.');
      return;
    }

    if (movementType !== 'resgate' && sourceAccount && sourceAccount.balance < numAmount) {
      setErrorMessage(`Saldo insuficiente em ${sourceAccount.bankName}. Saldo disponível: ${formatBrl(sourceAccount.balance)}.`);
      return;
    }

    if (movementType === 'resgate' && selectedHolding && selectedHolding.currentValue < numAmount) {
      setErrorMessage(`Valor solicitado maior que a posição atual em ${selectedHolding.ticker} (${formatBrl(selectedHolding.currentValue)}).`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let payload: any = {
        amount: numAmount,
        description: description.trim(),
      };

      if (movementType === 'transfer') {
        payload.type = 'pix_transfer';
        payload.sourceAccountId = sourceAccountId;
        if (useExternalPix) {
          payload.destinationPixKey = externalPixKey;
        } else {
          payload.destinationAccountId = destinationAccountId;
        }
      } else if (movementType === 'aporte') {
        payload.type = 'invest_aporte';
        payload.sourceAccountId = sourceAccountId;
        payload.assetTicker = selectedAsset.ticker;
        payload.assetName = selectedAsset.name;
        payload.unitPrice = selectedAsset.currentPrice;
        payload.sharesCount = Number((numAmount / selectedAsset.currentPrice).toFixed(2));
      } else {
        // Resgate
        payload.type = 'invest_resgate';
        payload.destinationAccountId = destinationReceiveAccountId;
        payload.assetTicker = selectedHolding.ticker;
        payload.assetName = selectedHolding.name;
      }

      const res = await fetch('/api/open-finance/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao processar movimentação');
      }

      const data = await res.json();
      setCompletedReceipt(data.transaction);

      // Handle portfolio holding update if it was an aporte or resgate
      let updatedHoldings = [...holdings];
      if (movementType === 'aporte') {
        const existingIdx = updatedHoldings.findIndex(h => h.ticker === selectedAsset.ticker);
        const sharesBought = Number((numAmount / selectedAsset.currentPrice).toFixed(2));

        if (existingIdx >= 0) {
          const ex = updatedHoldings[existingIdx];
          const newQty = ex.quantity + sharesBought;
          const newInvested = ex.totalInvested + numAmount;
          const newAvgPrice = Number((newInvested / newQty).toFixed(2));
          const newCurVal = Number((newQty * selectedAsset.currentPrice).toFixed(2));

          updatedHoldings[existingIdx] = {
            ...ex,
            quantity: newQty,
            averagePrice: newAvgPrice,
            totalInvested: newInvested,
            currentValue: newCurVal,
            currentPrice: selectedAsset.currentPrice,
          };
        } else {
          updatedHoldings.unshift({
            id: `hold-${Date.now()}`,
            assetId: selectedAsset.id,
            ticker: selectedAsset.ticker,
            name: selectedAsset.name,
            category: selectedAsset.category,
            institutionId: sourceAccount?.id || 'nubank',
            institutionName: sourceAccount?.bankName || 'Nubank',
            quantity: sharesBought,
            averagePrice: selectedAsset.currentPrice,
            currentPrice: selectedAsset.currentPrice,
            totalInvested: numAmount,
            currentValue: numAmount,
            totalReturnBrl: 0,
            totalReturnPct: 0,
            dailyReturnBrl: numAmount * (selectedAsset.dailyYieldEstimatedPct / 100),
            dailyReturnPct: selectedAsset.dailyYieldEstimatedPct,
            weeklyReturnBrl: numAmount * (selectedAsset.variationWeeklyPct / 100),
            weeklyReturnPct: selectedAsset.variationWeeklyPct,
            monthlyReturnBrl: numAmount * (selectedAsset.monthlyYieldEstimatedPct / 100),
            monthlyReturnPct: selectedAsset.monthlyYieldEstimatedPct,
            isLiveSynced: true,
          });
        }
      } else if (movementType === 'resgate') {
        const idx = updatedHoldings.findIndex(h => h.id === selectedHolding.id);
        if (idx >= 0) {
          const ex = updatedHoldings[idx];
          const sharesSold = Number((numAmount / ex.currentPrice).toFixed(2));
          const remQty = Math.max(ex.quantity - sharesSold, 0);

          if (remQty <= 0.01) {
            updatedHoldings.splice(idx, 1);
          } else {
            updatedHoldings[idx] = {
              ...ex,
              quantity: remQty,
              currentValue: Number((remQty * ex.currentPrice).toFixed(2)),
              totalInvested: Number((remQty * ex.averagePrice).toFixed(2)),
            };
          }
        }
      }

      onMovementSuccess(data.transaction, updatedHoldings);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao liquidar transferência no Banco Central.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!completedReceipt) return;
    const text = `
COMPROVANTE DE MOVIMENTAÇÃO OPEN FINANCE BRASIL
ID Fim a Fim (SPI): ${completedReceipt.endToEndId}
Data/Hora: ${completedReceipt.timestamp}
Valor: ${formatBrl(completedReceipt.amount)}
Tipo: ${completedReceipt.type}
Origem: ${completedReceipt.sourceAccountName}
Destino: ${completedReceipt.destinationAccountName}
Autenticação SHA-256: ${completedReceipt.autenticationCode}
Liquidado via Banco Central do Brasil.
    `.trim();
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-[#0c111e] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Movimentação Financeira Open Finance</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  SPI / BACEN
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transfira entre contas, aporte em ativos ou resgate valores diretamente pelo app
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

        {/* Movement Type Tabs */}
        {!completedReceipt && (
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
            <button
              onClick={() => { setMovementType('transfer'); setErrorMessage(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                movementType === 'transfer'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Pix Entre Contas</span>
            </button>
            <button
              onClick={() => { setMovementType('aporte'); setErrorMessage(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                movementType === 'aporte'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Aporte em Ativo B3</span>
            </button>
            <button
              onClick={() => { setMovementType('resgate'); setErrorMessage(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                movementType === 'resgate'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Resgate para Conta</span>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {completedReceipt ? (
            /* COMPROVANTE OFICIAL OPEN FINANCE */
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-white">Movimentação Concluída com Sucesso!</h3>
                <p className="text-xs text-emerald-300">
                  Transação liquidada no Sistema de Pagamentos Instantâneos (SPI) do Banco Central do Brasil.
                </p>
                <div className="text-2xl font-extrabold text-white font-mono pt-1">
                  {formatBrl(completedReceipt.amount)}
                </div>
              </div>

              {/* Receipt details */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs space-y-2.5 font-mono">
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">ID Fim a Fim (E2E):</span>
                  <span className="text-slate-200 font-bold break-all text-right max-w-[280px]">
                    {completedReceipt.endToEndId}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Data e Horário:</span>
                  <span className="text-slate-200 font-semibold">{completedReceipt.timestamp}</span>
                </div>

                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Origem:</span>
                  <span className="text-slate-200 font-semibold">{completedReceipt.sourceAccountName}</span>
                </div>

                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Destino:</span>
                  <span className="text-emerald-400 font-semibold">{completedReceipt.destinationAccountName}</span>
                </div>

                {completedReceipt.assetTicker && (
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-400">Ativo Adquirido:</span>
                    <span className="text-cyan-400 font-bold">
                      {completedReceipt.sharesCount} cotas de {completedReceipt.assetTicker}
                    </span>
                  </div>
                )}

                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">Autenticação:</span>
                  <span className="text-slate-400 text-[10px] break-all">
                    {completedReceipt.autenticationCode}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={handleCopyReceipt}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedReceipt ? 'Copiado!' : 'Copiar Comprovante'}</span>
                </button>
                <button
                  onClick={() => { setCompletedReceipt(null); onClose(); }}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Concluir & Voltar ao Painel
                </button>
              </div>
            </div>
          ) : (
            /* FORM DE MOVIMENTAÇÃO */
            <div className="space-y-4">
              {/* Error banner */}
              {errorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* MODE 1: TRANSFERÊNCIA ENTRE CONTAS */}
              {movementType === 'transfer' && (
                <div className="space-y-3">
                  {/* Source Bank */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      1. Conta Bancária de Origem (Débito):
                    </label>
                    <select
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} (Ag. {b.agency} • CC {b.accountNumber}) — Saldo: {formatBrl(b.balance)}
                        </option>
                      ))}
                    </select>
                    {sourceAccount && (
                      <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                        Saldo disponível para movimentar: <strong>{formatBrl(sourceAccount.balance)}</strong>
                      </p>
                    )}
                  </div>

                  {/* Destination Bank or External Pix */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        2. Destino do Dinheiro:
                      </label>
                      <button
                        onClick={() => setUseExternalPix(!useExternalPix)}
                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer font-medium"
                      >
                        {useExternalPix ? 'Escolher entre minhas contas' : 'Digitar Chave Pix externa'}
                      </button>
                    </div>

                    {useExternalPix ? (
                      <input
                        type="text"
                        placeholder="Chave Pix de destino (CPF, Celular, E-mail ou Aleatória)..."
                        value={externalPixKey}
                        onChange={(e) => setExternalPixKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    ) : (
                      <select
                        value={destinationAccountId}
                        onChange={(e) => setDestinationAccountId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {bankAccounts
                          .filter((b) => b.id !== sourceAccountId)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.bankName} (Ag. {b.agency} • CC {b.accountNumber}) — Chave: {b.pixKey || 'Não cadastrada'}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* MODE 2: APORTE EM ATIVO */}
              {movementType === 'aporte' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      1. Debitar de qual Conta Bancária:
                    </label>
                    <select
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} — Saldo: {formatBrl(b.balance)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      2. Selecione o Ativo para Investir:
                    </label>
                    <select
                      value={targetAssetTicker}
                      onChange={(e) => setTargetAssetTicker(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {assets.map((a) => (
                        <option key={a.id} value={a.ticker}>
                          {a.ticker} — {a.name} (Cotação B3: {formatBrl(a.currentPrice)})
                        </option>
                      ))}
                    </select>
                    {selectedAsset && (
                      <div className="mt-2 p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs flex justify-between items-center">
                        <span className="text-slate-400">Preço da Cota:</span>
                        <span className="font-extrabold text-white font-mono">{formatBrl(selectedAsset.currentPrice)}</span>
                        <span className="text-slate-400">• Rendimento Mensal:</span>
                        <span className="font-bold text-emerald-400">+{selectedAsset.monthlyYieldEstimatedPct}%/mês</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODE 3: RESGATE DE ATIVO */}
              {movementType === 'resgate' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      1. Selecione o Investimento para Resgatar:
                    </label>
                    <select
                      value={sourceHoldingId}
                      onChange={(e) => setSourceHoldingId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {holdings.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.ticker} ({h.name}) — Posição: {formatBrl(h.currentValue)} ({h.quantity} un.)
                        </option>
                      ))}
                    </select>
                    {selectedHolding && (
                      <p className="text-[11px] text-cyan-400 mt-1 font-medium">
                        Total disponível para resgate: <strong>{formatBrl(selectedHolding.currentValue)}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      2. Creditar em qual Conta Bancária:
                    </label>
                    <select
                      value={destinationReceiveAccountId}
                      onChange={(e) => setDestinationReceiveAccountId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} (Ag. {b.agency} • CC {b.accountNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Value Input & Presets */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Valor da Movimentação (R$):
                  </label>
                  {sourceAccount && movementType !== 'resgate' && (
                    <button
                      onClick={() => setAmount(sourceAccount.balance.toString())}
                      className="text-[11px] text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      Usar Saldo Máximo ({formatBrl(sourceAccount.balance)})
                    </button>
                  )}
                  {selectedHolding && movementType === 'resgate' && (
                    <button
                      onClick={() => setAmount(selectedHolding.currentValue.toString())}
                      className="text-[11px] text-cyan-400 hover:underline font-bold cursor-pointer"
                    >
                      Resgatar Tudo ({formatBrl(selectedHolding.currentValue)})
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-lg font-mono font-extrabold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Presets */}
                <div className="flex items-center space-x-2">
                  {[100, 500, 1000, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        amount === preset.toString()
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                      }`}
                    >
                      R$ {preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                </div>

                {movementType === 'aporte' && selectedAsset && amount && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    Equivalente à compra de <strong className="text-white font-mono">{(parseFloat(amount || '0') / selectedAsset.currentPrice).toFixed(2)} cotas</strong> de {selectedAsset.ticker}.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Descrição / Motivo (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aporte mensal para aposentadoria, Reserva de emergência..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Regulatory Notice */}
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-slate-300 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Movimentação autorizada pelo titular via <strong>Open Finance Iniciação de Pagamentos (ITP)</strong>. Liquidação instantânea pelo SPI do Banco Central do Brasil.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!completedReceipt && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handleExecuteMovement}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Liquidando no Banco Central...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Confirmar e Liquidar Movimentação</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
