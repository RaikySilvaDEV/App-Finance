import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  PieChart, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  Layers, 
  ShieldCheck,
  RefreshCw 
} from 'lucide-react';
import { PortfolioHolding, InvestorProfile, BankAccount } from '../types/finance';
import { FinancialResearch } from './FinancialResearch';

interface AiPortfolioAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: PortfolioHolding[];
  investorProfile: InvestorProfile;
  bankAccounts: BankAccount[];
  investments: any[];
  creditCards: any[];
  loans: any[];
  loansComplete: boolean;
  dataLoading: boolean;
}

export const AiPortfolioAdvisorModal: React.FC<AiPortfolioAdvisorModalProps> = ({
  isOpen,
  onClose,
  holdings,
  investorProfile,
  bankAccounts, investments, creditCards, loans, loansComplete, dataLoading,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [provider, setProvider] = useState('local');
  const [diagnostic, setDiagnostic] = useState<{
    diversificationScore: number;
    diagnostic: string;
    suggestedActions: string[];
    dailyYieldHealth: string;
  } | null>(null);

  const totalValue = holdings.reduce((acc, h) => acc + h.currentValue, 0);

  // Group allocations
  const allocations = holdings.reduce((acc, h) => {
    acc[h.category] = (acc[h.category] || 0) + h.currentValue;
    return acc;
  }, {} as Record<string, number>);

  const financialSnapshot = {
            currency: 'BRL',
            bankBalance: bankAccounts.filter((account) => (account.currencyCode || 'BRL') === 'BRL').reduce((sum, account) => sum + account.balance, 0),
            connectedInvestments: investments.filter((asset) => (asset.currencyCode || 'BRL') === 'BRL').reduce((sum, asset) => sum + (Number(asset.balance) || 0), 0),
            creditCardBalance: creditCards.filter((card) => card.currencyCode === 'BRL').reduce((sum, card) => sum + (Number(card.balance) || 0), 0),
            knownLoanBalance: loans.filter((loan) => (loan.currencyCode || 'BRL') === 'BRL' && loan.payments?.contractOutstandingBalance != null).reduce((sum, loan) => sum + Number(loan.payments.contractOutstandingBalance), 0),
            loansReturned: loans.length,
            loansWithoutBalance: loans.filter((loan) => loan.payments?.contractOutstandingBalance == null).length,
            loanQueryComplete: loansComplete,
            note: 'Ausência de registros não comprova ausência de empréstimos. Valores somente em BRL; posições manuais podem duplicar investimentos conectados.',
          };
  useEffect(() => {
    if (isOpen) {
      if (dataLoading) { setLoading(true); return; }
      setDiagnostic(null); setError(null); setCopiedSummary(false);
      fetch('/api/ai/status').then(async (response) => {
        if (!response.ok) throw new Error('Entre na sua conta para continuar.');
        const data = await response.json();
        setProvider(data.provider || 'local');
        if (data.configured) void runDiagnostic();
        else { setLoading(false); setError(data.reason || 'A análise automática ainda não está configurada. Você pode usar sua conta ChatGPT com o resumo abaixo.'); }
      }).catch((reason) => { setLoading(false); setError(reason.message); });
    }
  }, [isOpen, dataLoading]);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    setDiagnostic(null);
    try {
      const response = await fetch('/api/ai/portfolio-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalPatrimony: totalValue,
          allocations,
          profile: investorProfile,
          financialSnapshot,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível gerar o diagnóstico.');
      setDiagnostic(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar o diagnóstico.');
    } finally {
      setLoading(false);
    }
  };

  const summaryText = `Ajude-me a entender e organizar minhas finanças em português simples, com foco no controle diário.
Perfil: ${investorProfile}.
Valores resumidos em reais:
Saldo das contas: ${financialSnapshot.bankBalance}.
Investimentos conectados: ${financialSnapshot.connectedInvestments}.
Saldo informado nos cartões: ${financialSnapshot.creditCardBalance}.
Saldo devedor conhecido de empréstimos: ${financialSnapshot.knownLoanBalance}.
Empréstimos retornados: ${financialSnapshot.loansReturned}; sem saldo devedor informado: ${financialSnapshot.loansWithoutBalance}.
Consulta de empréstimos completa: ${loansComplete ? 'sim, nos dados disponibilizados pela conexão' : 'não'}.
Posições cadastradas manualmente: ${totalValue}; distribuição: ${JSON.stringify(allocations)}.
As posições manuais podem duplicar investimentos conectados; não some automaticamente. Ausência de empréstimos na conexão não significa que não tenho dívidas. Indique dados faltantes, explique as obrigações e proponha passos gerais de organização. Não invente rendimentos ou saldos nem recomende compras de investimentos.`;
  async function copySummary() {
    try { await navigator.clipboard.writeText(summaryText); setCopiedSummary(true); }
    catch { setError('Não foi possível copiar. Abra o resumo abaixo e copie o texto manualmente.'); }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-[#101012] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Diagnóstico financeiro com IA</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {provider === 'local' ? 'IA local' : 'OpenAI'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Contas, investimentos, cartões e empréstimos informados
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

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          <FinancialResearch />
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><h3 className="text-sm font-semibold text-white">Usar na minha conta ChatGPT</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">Copie o resumo, abra o ChatGPT e cole em uma conversa. Você escolhe quando enviar os dados.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void copySummary()} className="rounded-lg bg-violet-400 px-3 py-2 text-xs font-semibold text-slate-950">{copiedSummary ? 'Resumo copiado' : 'Copiar resumo'}</button><a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">Abrir ChatGPT ↗</a></div><details className="mt-3 text-xs text-slate-400"><summary className="cursor-pointer">Conferir resumo antes de enviar</summary><textarea readOnly aria-label="Resumo para o ChatGPT" value={summaryText} className="mt-2 h-48 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300"/></details></div>
          <p className="text-xs leading-relaxed text-slate-400">{provider === 'local' ? 'O diagnóstico é processado pela IA neste computador.' : 'Na análise automática, os totais resumidos em reais são enviados à OpenAI.'} Empréstimos: {loansComplete ? `${loans.length} retornados pela conexão; somente saldos devedores informados entram na análise.` : 'consulta incompleta ou indisponível; não é possível avaliar todas as dívidas.'} Posições manuais são avaliadas separadamente para evitar somar o mesmo investimento duas vezes.</p>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-9 h-9 rounded-full border-2 border-violet-400 border-t-transparent animate-spin"></div>
              <p className="text-xs text-slate-400 animate-pulse">
                {dataLoading ? 'Atualizando seus dados bancários antes da análise…' : 'Preparando seu diagnóstico financeiro…'}
              </p>
            </div>
          ) : error ? (
            <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{error}</p>
          ) : diagnostic ? (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  ['Saldo das contas', financialSnapshot.bankBalance],
                  ['Investimentos conectados', financialSnapshot.connectedInvestments],
                  ['Saldo informado nos cartões', financialSnapshot.creditCardBalance],
                ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><dt className="text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-white">{Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd></div>)}
              </dl>
              {/* Score */}
              {totalValue > 0 && <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#101012] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Nota de Diversificação da Carteira</span>
                  <div className="flex items-baseline space-x-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {diagnostic.diversificationScore}
                    </span>
                    <span className="text-xs text-slate-400">/ 100 pontos</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Estimativa qualitativa · perfil {investorProfile}
                  </span>
                </div>

                <div className="w-14 h-14 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 flex items-center justify-center font-bold text-white text-sm">
                  {diagnostic.diversificationScore}%
                </div>
              </div>}

              {/* Executive Diagnostic */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="text-violet-400 font-bold block mb-1">Diagnóstico Executivo:</span>
                {diagnostic.diagnostic}
              </div>

              {/* Daily Yield Health */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-xl text-xs text-slate-300">
                <span className="text-emerald-400 font-bold block mb-1 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Saúde do Fluxo Diário de Rendimentos:
                </span>
                {diagnostic.dailyYieldHealth}
              </div>

              {/* Recommended Rebalancing Steps */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Ações Recomendadas para Otimizar Seus Ganhos:
                </span>
                <div className="space-y-2">
                  {diagnostic.suggestedActions.map((action, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-start space-x-2.5 text-xs text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/70 flex items-center justify-between">
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reavaliar com IA</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
};


