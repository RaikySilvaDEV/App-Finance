/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  ArrowRightLeft,
  SlidersHorizontal,
  Bot,
  Activity,
  Plus,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { Header } from './components/Header';
import { GainsPerformanceCard, Timeframe } from './components/GainsPerformanceCard';
import { BestOpportunitiesSection } from './components/BestOpportunitiesSection';
import { RiskAnalysisModal } from './components/RiskAnalysisModal';
import { OpenFinanceManagerModal } from './components/OpenFinanceManagerModal';
import { YieldGoalsCard } from './components/YieldGoalsCard';
import { DividendsCalendar } from './components/DividendsCalendar';
import { PortfolioHoldingsTable } from './components/PortfolioHoldingsTable';
import { AiPortfolioAdvisorModal } from './components/AiPortfolioAdvisorModal';
import { AddHoldingModal } from './components/AddHoldingModal';
import { FinancialMovementModal } from './components/FinancialMovementModal';
import { BankAccountsManagerModal } from './components/BankAccountsManagerModal';
import { TransactionLedgerSection } from './components/TransactionLedgerSection';
import { BankStrategyAdvisorSection } from './components/BankStrategyAdvisorSection';
import { OpenFinanceConsentModal } from './components/OpenFinanceConsentModal';
import { InvestmentAcademyModal } from './components/InvestmentAcademyModal';

import { 
  initialInstitutions, 
  curatedAssets as initialCuratedAssets, 
  initialHoldings as defaultHoldings, 
  upcomingDividends 
} from './data/mockData';
import { 
  Asset, 
  PortfolioHolding, 
  InvestorProfile, 
  OpenFinanceInstitution,
  RealIndicators,
  BankAccount,
  FinancialTransaction 
} from './types/finance';

const LOCAL_STORAGE_KEY_HOLDINGS = 'finpulse_real_holdings_v2';
const LOCAL_STORAGE_KEY_TRANSACTIONS = 'finpulse_transactions_v2';

export default function App() {
  // Global States
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile>('Moderado');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('daily');
  
  // Real Market Data States
  const [realIndicators, setRealIndicators] = useState<RealIndicators | null>(null);
  const [institutions, setInstitutions] = useState<OpenFinanceInstitution[]>(initialInstitutions);
  const [assets, setAssets] = useState<Asset[]>(initialCuratedAssets);

  // User Holdings State (initialized from localStorage if exists)
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_HOLDINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao carregar localStorage holdings:', e);
    }
    return defaultHoldings;
  });

  // Bank Accounts State (Real connected accounts for titular Raiky Carlos Da Silva)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    {
      id: 'bank-inter-1',
      bankName: 'Banco Inter S.A.',
      bankCode: '077',
      accountType: 'corrente',
      agency: '0001',
      accountNumber: '928174',
      accountDigit: '5',
      cpfTitular: '454.460.848-10',
      nomeTitular: 'Raiky Carlos Da Silva',
      pixKey: '16991821069',
      pixKeyType: 'celular',
      balance: 0,
      availableForInvestment: 0,
      lastSync: 'Aguardando autorização bancária',
      connected: false,
      brandColor: '#FF7A00',
      logo: '🟠',
    },
    {
      id: 'bank-itau-1',
      bankName: 'Banco Itaú Unibanco S.A.',
      bankCode: '341',
      accountType: 'corrente',
      agency: '0342',
      accountNumber: '89201',
      accountDigit: '8',
      cpfTitular: '454.460.848-10',
      nomeTitular: 'Raiky Carlos Da Silva',
      pixKey: '16991821069',
      pixKeyType: 'celular',
      balance: 0,
      availableForInvestment: 0,
      lastSync: 'Aguardando autorização bancária',
      connected: false,
      brandColor: '#EC7000',
      logo: '🟧',
    },
    {
      id: 'bank-nubank-1',
      bankName: 'Nu Pagamentos S.A. (Nubank)',
      bankCode: '260',
      accountType: 'corrente',
      agency: '0001',
      accountNumber: '94474519',
      accountDigit: '6',
      cpfTitular: '454.460.848-10',
      nomeTitular: 'Raiky Carlos Da Silva',
      pixKey: '16991821069',
      pixKeyType: 'celular',
      balance: 0,
      availableForInvestment: 0,
      lastSync: 'Aguardando autorização bancária',
      connected: false,
      brandColor: '#820AD1',
      logo: '🟣',
    },
    {
      id: 'bank-mercadopago-1',
      bankName: 'Mercado Pago IP Ltda',
      bankCode: '323',
      accountType: 'corrente',
      agency: '0001',
      accountNumber: '734910',
      accountDigit: '3',
      cpfTitular: '454.460.848-10',
      nomeTitular: 'Raiky Carlos Da Silva',
      pixKey: '16991821069',
      pixKeyType: 'celular',
      balance: 0,
      availableForInvestment: 0,
      lastSync: 'Aguardando autorização bancária',
      connected: false,
      brandColor: '#00A650',
      logo: '🟢',
    },
    {
      id: 'bank-pagbank-1',
      bankName: 'BancoSeguro S.A. (PagBank / PagSeguro)',
      bankCode: '290',
      accountType: 'corrente',
      agency: '0001',
      accountNumber: '619284',
      accountDigit: '9',
      cpfTitular: '454.460.848-10',
      nomeTitular: 'Raiky Carlos Da Silva',
      pixKey: '16991821069',
      pixKeyType: 'celular',
      balance: 0,
      availableForInvestment: 0,
      lastSync: 'Aguardando autorização bancária',
      connected: false,
      brandColor: '#00B140',
      logo: '🟡',
    },
    {
      id: 'bank-santander-1',
      bankName: 'Banco Santander (Brasil) S.A.',
      bankCode: '033',
      accountType: 'corrente',
      agency: '2104',
      accountNumber: '448201',
      accountDigit: '7',
      cpfTitular: '454.460.848-10',
      nomeTitular: 'Raiky Carlos Da Silva',
      pixKey: '16991821069',
      pixKeyType: 'celular',
      balance: 0,
      availableForInvestment: 0,
      lastSync: 'Aguardando autorização bancária',
      connected: false,
      brandColor: '#CC0000',
      logo: '🔴',
    },
    {
      id: 'bank-picpay-1',
      bankName: 'PicPay Instituição de Pagamento S.A.',
      bankCode: '380',
      accountType: 'corrente',
      agency: '0001',
      accountNumber: '551928',
      accountDigit: '1',
      cpfTitular: '454.460.848-10',
      nomeTitular: 'Raiky Carlos Da Silva',
      pixKey: '16991821069',
      pixKeyType: 'celular',
      balance: 0,
      availableForInvestment: 0,
      lastSync: 'Aguardando autorização bancária',
      connected: false,
      brandColor: '#11C76F',
      logo: '🟢',
    },
  ]);

  // Financial Movements Ledger State
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TRANSACTIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao carregar localStorage transactions:', e);
    }
    return [
      {
        id: 'tx-1001',
        type: 'pix_transfer',
        amount: 1500.00,
        sourceAccountId: 'bank-itau-1',
        sourceAccountName: 'Itaú Unibanco (Ag. 0342)',
        destinationAccountId: 'bank-btg-1',
        destinationAccountName: 'BTG Pactual Investimentos',
        destinationPixKey: 'a89c20-btg-f492-491a',
        timestamp: 'Hoje às 14:22',
        status: 'concluido',
        endToEndId: 'E60701190202610141722a89c1048b9f',
        autenticationCode: '9F8A.2B1C.77D4.E890.312A.BC45.F120.887E',
        description: 'Transferência Pix Open Finance para conta de investimentos',
      },
      {
        id: 'tx-1002',
        type: 'invest_aporte',
        amount: 934.00,
        sourceAccountId: 'bank-nubank-1',
        sourceAccountName: 'Nubank (Conta Corrente)',
        assetTicker: 'MXRF11',
        assetName: 'Maxi Renda FII',
        sharesCount: 100,
        unitPrice: 9.34,
        timestamp: 'Hoje às 11:45',
        status: 'concluido',
        endToEndId: 'E26001190202610141445b91a2049d10e',
        autenticationCode: '3A1C.55F2.88E1.00B4.4219.AA78.99C0.11DF',
        description: 'Compra de 100 cotas de MXRF11 na B3 via débito em conta',
      },
    ];
  });

  // Modals
  const [selectedAssetForRisk, setSelectedAssetForRisk] = useState<Asset | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [isOpenFinanceModalOpen, setIsOpenFinanceModalOpen] = useState<boolean>(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  
  // Movement & Bank Modals
  const [isMovementModalOpen, setIsMovementModalOpen] = useState<boolean>(false);
  const [isBankManagerOpen, setIsBankManagerOpen] = useState<boolean>(false);
  const [isOpenFinanceConsentOpen, setIsOpenFinanceConsentOpen] = useState<boolean>(false);
  const [isAcademyModalOpen, setIsAcademyModalOpen] = useState<boolean>(false);
  const [selectedConsentBankCode, setSelectedConsentBankCode] = useState<string | null>(null);
  const [movementInitialMode, setMovementInitialMode] = useState<'transfer' | 'aporte' | 'resgate'>('transfer');
  const [preselectedAssetForMovement, setPreselectedAssetForMovement] = useState<Asset | null>(null);

  // Quick Open Finance Consent for a bank
  const handleOpenConsentForBank = (bankCode: string) => {
    setSelectedConsentBankCode(bankCode);
    setIsOpenFinanceConsentOpen(true);
  };

  // Quick update of real balance
  const handleQuickUpdateBalance = async (accountId: string, newBalance: number) => {
    try {
      const res = await fetch(`/api/open-finance/accounts/${accountId}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance }),
      });
      if (res.ok) {
        setBankAccounts((prev) =>
          prev.map((b) => (b.id === accountId ? { ...b, balance: newBalance, availableForInvestment: newBalance, connected: true, lastSync: 'Atualizado pelo titular' } : b))
        );
        showToast('Saldo real da conta atualizado!');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Sync state & feedback
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Save holdings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_HOLDINGS, JSON.stringify(holdings));
    } catch (e) {
      console.warn('Erro ao salvar holdings no localStorage:', e);
    }
  }, [holdings]);

  // Save transactions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.warn('Erro ao salvar transações no localStorage:', e);
    }
  }, [transactions]);

  // Fetch real market indicators and backend accounts on mount
  useEffect(() => {
    fetchRealMarketData();
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/open-finance/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.accounts && data.accounts.length > 0) {
          setBankAccounts(data.accounts);
        }
      }
    } catch (e) {
      console.warn('Usando contas locais:', e);
    }
  };

  const fetchRealMarketData = async () => {
    setIsSyncing(true);
    try {
      const indRes = await fetch('/api/market/real-indicators');
      if (indRes.ok) {
        const indData: RealIndicators = await indRes.json();
        setRealIndicators(indData);
      }

      const quotesRes = await fetch('/api/market/quotes-batch');
      if (quotesRes.ok) {
        const { quotes } = await quotesRes.json();

        setAssets((prevAssets) =>
          prevAssets.map((asset) => {
            const live = quotes[asset.ticker];
            if (live) {
              return {
                ...asset,
                currentPrice: live.currentPrice,
                variationDailyPct: live.dailyChangePct,
                variationWeeklyPct: live.weeklyChangePct,
                variationMonthlyPct: live.monthlyChangePct,
                dailyYieldEstimatedPct: parseFloat((live.dailyChangePct || asset.dailyYieldEstimatedPct).toFixed(2)),
                monthlyYieldEstimatedPct: parseFloat((live.monthlyChangePct || asset.monthlyYieldEstimatedPct).toFixed(2)),
                isLiveQuote: true,
              };
            }
            return asset;
          })
        );

        setHoldings((prevHoldings) =>
          prevHoldings.map((h) => {
            const live = quotes[h.ticker];
            if (live) {
              const livePrice = live.currentPrice;
              const currentValue = Number((h.quantity * livePrice).toFixed(2));
              const totalInvested = Number((h.quantity * h.averagePrice).toFixed(2));
              const totalReturnBrl = Number((currentValue - totalInvested).toFixed(2));
              const totalReturnPct = totalInvested > 0 ? Number(((totalReturnBrl / totalInvested) * 100).toFixed(2)) : 0;
              
              const dailyReturnBrl = Number((currentValue * (live.dailyChangePct / 100)).toFixed(2));
              const weeklyReturnBrl = Number((currentValue * (live.weeklyChangePct / 100)).toFixed(2));
              const monthlyReturnBrl = Number((currentValue * (live.monthlyChangePct / 100)).toFixed(2));

              return {
                ...h,
                currentPrice: livePrice,
                currentValue,
                totalInvested,
                totalReturnBrl,
                totalReturnPct,
                dailyReturnBrl,
                dailyReturnPct: live.dailyChangePct,
                weeklyReturnBrl,
                weeklyReturnPct: live.weeklyChangePct,
                monthlyReturnBrl,
                monthlyReturnPct: live.monthlyChangePct,
                isLiveSynced: true,
              };
            }
            return h;
          })
        );
      }
    } catch (err) {
      console.warn('Erro ao sincronizar:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await fetchRealMarketData();
    await fetchBankAccounts();
    setIsSyncing(false);
    showToast('Contas bancárias, cotações da B3 e taxas do Banco Central atualizadas!');
  };

  // Add real holding
  const handleAddHolding = (newHolding: PortfolioHolding) => {
    setHoldings((prev) => [newHolding, ...prev]);
    showToast(`${newHolding.ticker} adicionado à sua carteira com sucesso!`);
  };

  // Remove holding
  const handleRemoveHolding = (holdingId: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== holdingId));
    showToast('Ativo removido da sua carteira.');
  };

  // Handle bank account linked
  const handleAccountLinked = (newAccount: BankAccount) => {
    setBankAccounts((prev) => [newAccount, ...prev]);
    showToast(`Conta ${newAccount.bankName} vinculada via Open Finance Brasil!`);
  };

  // Handle bank account unlinked
  const handleAccountUnlinked = async (accountId: string) => {
    try {
      await fetch(`/api/open-finance/accounts/${accountId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(e);
    }
    setBankAccounts((prev) => prev.filter((b) => b.id !== accountId));
    showToast('Conta desvinculada.');
  };

  // Handle Movement success (Pix, Aporte, Resgate)
  const handleMovementSuccess = (
    transaction: FinancialTransaction,
    updatedHoldings?: PortfolioHolding[]
  ) => {
    setTransactions((prev) => [transaction, ...prev]);

    // Update bank balances locally
    setBankAccounts((prev) =>
      prev.map((acc) => {
        let newBal = acc.balance;
        if (acc.id === transaction.sourceAccountId) {
          newBal = Math.max(newBal - transaction.amount, 0);
        }
        if (acc.id === transaction.destinationAccountId) {
          newBal = newBal + transaction.amount;
        }
        return {
          ...acc,
          balance: parseFloat(newBal.toFixed(2)),
          availableForInvestment: parseFloat(newBal.toFixed(2)),
          lastSync: 'Atualizado após movimentação',
        };
      })
    );

    if (updatedHoldings) {
      setHoldings(updatedHoldings);
    }

    showToast(`Movimentação de R$ ${transaction.amount.toLocaleString('pt-BR')} liquidada no Banco Central!`);
  };

  // Open Finance Consent authorized callback (pulls real bank data)
  const handleConsentAuthorized = (newAccount: BankAccount) => {
    setBankAccounts((prev) => {
      const idx = prev.findIndex(b => b.bankCode === newAccount.bankCode);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newAccount;
        return updated;
      }
      return [newAccount, ...prev];
    });
    showToast(`Autorização confirmada pelo ${newAccount.bankName}! Dados e saldo puxados automaticamente.`);
  };

  // B3 Real holdings import
  const handleB3HoldingsImported = (importedHoldings: PortfolioHolding[]) => {
    setHoldings((prev) => [...importedHoldings, ...prev]);
    showToast(`${importedHoldings.length} posições reais da B3 importadas e cotadas ao vivo!`);
  };

  // Reset sample data to strictly empty real state (Zero fictitious data)
  const handleResetToEmpty = async () => {
    setHoldings([]);
    setTransactions([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY_HOLDINGS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TRANSACTIONS);
    try {
      const res = await fetch('/api/open-finance/accounts/reset-all-balances', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) setBankAccounts(data.accounts);
      }
    } catch (e) {
      console.warn(e);
    }
    showToast('Dados de demonstração removidos! Modo 100% Real ativado.');
  };

  // Open Movement modal for a specific asset (Aporte)
  const handleOpenAporteForAsset = (asset: Asset) => {
    setPreselectedAssetForMovement(asset);
    setMovementInitialMode('aporte');
    setIsMovementModalOpen(true);
  };

  // Trigger Risk Modal for an Asset
  const handleOpenRiskAnalysis = (asset: Asset) => {
    setSelectedAssetForRisk(asset);
    setIsRiskModalOpen(true);
  };

  // Trigger Risk Modal for an existing Holding
  const handleOpenHoldingRisk = (holding: PortfolioHolding) => {
    const matchedAsset = assets.find((a) => a.ticker === holding.ticker) || {
      id: holding.assetId,
      ticker: holding.ticker,
      name: holding.name,
      category: holding.category,
      currentPrice: holding.currentPrice,
      variationDailyPct: holding.dailyReturnPct,
      variationWeeklyPct: holding.weeklyReturnPct,
      variationMonthlyPct: holding.monthlyReturnPct,
      annualReturnPct: 13.5,
      dividendYieldAnnualPct: holding.category === 'fiis' ? 11.2 : 0,
      dailyYieldEstimatedPct: 0.05,
      monthlyYieldEstimatedPct: 1.08,
      liquidity: holding.category === 'renda_fixa' ? 'D+0' : 'D+2 na B3',
      riskScore: holding.category === 'renda_fixa' ? 2 : holding.category === 'fiis' ? 4 : 7,
      riskRating: holding.category === 'renda_fixa' ? 'Baixo' : holding.category === 'fiis' ? 'Moderado' : 'Alto',
      fgcInsured: holding.category === 'renda_fixa',
      minInvestmentBrl: holding.currentPrice,
      description: 'Ativo real da sua custódia.',
      whyInvestNow: 'Ativo em carteira real.',
      benchmarkTarget: '100% CDI',
      tags: ['Sua Carteira Real'],
      isLiveQuote: true,
    };

    setSelectedAssetForRisk(matchedAsset as Asset);
    setIsRiskModalOpen(true);
  };

  // Add investment to Portfolio from simulator
  const handleAddToPortfolio = (asset: Asset, amount: number) => {
    handleOpenAporteForAsset(asset);
  };

  const totalCheckingBalance = bankAccounts.reduce((acc, b) => acc + (b.connected ? b.balance : 0), 0);
  const totalInvestedBalance = holdings.reduce((acc, h) => acc + h.currentValue, 0);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-2.5 text-xs animate-fade-in font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Header */}
      <Header
        isPrivateMode={isPrivateMode}
        setIsPrivateMode={setIsPrivateMode}
        investorProfile={investorProfile}
        setInvestorProfile={setInvestorProfile}
        onOpenFinanceModal={() => setIsOpenFinanceModalOpen(true)}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        connectedInstitutionsCount={bankAccounts.filter(b => b.connected).length}
        totalInstitutionsCount={bankAccounts.length}
        realIndicators={realIndicators}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        bankAccounts={bankAccounts}
        onOpenBankManagerModal={() => setIsBankManagerOpen(true)}
        onOpenMovementModal={() => {
          setMovementInitialMode('transfer');
          setIsMovementModalOpen(true);
        }}
        onOpenAcademyModal={() => setIsAcademyModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7">
        {/* Real Status Bar & Quick Actions */}
        <div className="bg-gradient-to-r from-slate-900/90 via-[#0e1628] to-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Hub Open Finance • Raiky Carlos Da Silva</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  {bankAccounts.filter(b => b.connected && b.balance > 0).length} de {bankAccounts.length} Bancos Conectados (Inter, Itaú, Nubank, Mercado Pago, PagBank, Santander, PicPay)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Saldo disponível em conta corrente: <strong className="text-white font-mono">{isPrivateMode ? 'R$ ••••••' : `R$ ${totalCheckingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</strong> • Carteira de Investimentos: <strong className="text-emerald-400 font-mono">{isPrivateMode ? 'R$ ••••••' : `R$ ${totalInvestedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
            <button
              onClick={() => {
                setSelectedConsentBankCode(null);
                setIsOpenFinanceConsentOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Pedir Autorização ao Banco (Puxar Dados)</span>
            </button>
            <button
              onClick={() => {
                setMovementInitialMode('transfer');
                setIsMovementModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Fazer Movimentação (Pix)</span>
            </button>
            <button
              onClick={() => setIsBankManagerOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Gerenciar Contas ({bankAccounts.length})
            </button>
          </div>
        </div>

        {/* Educational Tutorial Banner for Beginners */}
        <div className="bg-gradient-to-r from-amber-500/10 via-[#101726] to-emerald-500/10 border border-amber-500/25 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Área de Tutorial para Leigos
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Treinamento Antes de Investir
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                Iniciando do zero? Aprenda como investir com segurança e simule seus rendimentos reais
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Tudo explicado passo a passo: como funciona a Selic ({realIndicators ? `${realIndicators.selic.metaAnnualPct}%` : '13.75%'}), por que o CDI rende muito mais que a poupança, como receber aluguéis mensais com Fundos Imobiliários e um simulador com a tabela regressiva oficial do Imposto de Renda.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setIsAcademyModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Abrir Tutorial e Treinamento</span>
            </button>
          </div>
        </div>

        {/* 1. Core Performance & Gains Dashboard (Diário, Semanal, Mensal, YTD) */}
        <section>
          <GainsPerformanceCard
            holdings={holdings}
            isPrivateMode={isPrivateMode}
            selectedTimeframe={selectedTimeframe}
            setSelectedTimeframe={setSelectedTimeframe}
          />
        </section>

        {/* 2. Mapeamento Estratégico dos Seus Bancos (Inter, Itaú, Nubank, Mercado Pago, PagBank, Santander, PicPay) */}
        <section>
          <BankStrategyAdvisorSection
            bankAccounts={bankAccounts}
            onSelectBankForMovement={(bankAccount) => {
              setMovementInitialMode('transfer');
              setIsMovementModalOpen(true);
            }}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenConsentForBank={handleOpenConsentForBank}
            onQuickUpdateBalance={handleQuickUpdateBalance}
            isPrivateMode={isPrivateMode}
          />
        </section>

        {/* 3. Real Movement Ledger (Extrato de Transferências e Aportes) */}
        <section>
          <TransactionLedgerSection
            transactions={transactions}
            onOpenMovementModal={() => {
              setMovementInitialMode('transfer');
              setIsMovementModalOpen(true);
            }}
            isPrivateMode={isPrivateMode}
          />
        </section>

        {/* 3. Middle Row: Yield Goals Tracker & Dividends Calendar */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <YieldGoalsCard
            holdings={holdings}
            curatedAssets={assets}
            onSelectAssetForRiskAnalysis={handleOpenRiskAnalysis}
            isPrivateMode={isPrivateMode}
          />
          <DividendsCalendar
            events={upcomingDividends}
            isPrivateMode={isPrivateMode}
          />
        </section>

        {/* 4. "Onde Investir Agora" - Curated Best Real Opportunities with Custom Risk Analysis */}
        <section>
          <BestOpportunitiesSection
            assets={assets}
            onSelectAssetForRiskAnalysis={handleOpenRiskAnalysis}
            investorProfile={investorProfile}
          />
        </section>

        {/* 5. Connected Open Finance Holdings Table */}
        <section>
          <PortfolioHoldingsTable
            holdings={holdings}
            isPrivateMode={isPrivateMode}
            onSelectHoldingForRisk={handleOpenHoldingRisk}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRemoveHolding={handleRemoveHolding}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070a12] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">FinPulse</span>
            <span>•</span>
            <span>Open Finance Brasil & Iniciação de Pagamentos (ITP)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Movimentações via SPI / Banco Central do Brasil. Cotações reais da Bolsa de Valores B3.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <RiskAnalysisModal
        asset={selectedAssetForRisk}
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        investorProfile={investorProfile}
        onAddToPortfolio={handleAddToPortfolio}
      />

      <FinancialMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        bankAccounts={bankAccounts}
        assets={assets}
        holdings={holdings}
        onMovementSuccess={handleMovementSuccess}
        initialMode={movementInitialMode}
        preselectedAsset={preselectedAssetForMovement}
      />

      <BankAccountsManagerModal
        isOpen={isBankManagerOpen}
        onClose={() => setIsBankManagerOpen(false)}
        bankAccounts={bankAccounts}
        onAccountLinked={handleAccountLinked}
        onAccountUnlinked={handleAccountUnlinked}
        onOpenMovementModal={() => {
          setMovementInitialMode('transfer');
          setIsMovementModalOpen(true);
        }}
      />

      <OpenFinanceManagerModal
        isOpen={isOpenFinanceModalOpen}
        onClose={() => setIsOpenFinanceModalOpen(false)}
        institutions={institutions}
        onToggleConnection={() => {}}
        onSyncAll={handleSyncNow}
        isSyncing={isSyncing}
      />

      <AiPortfolioAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        holdings={holdings}
        investorProfile={investorProfile}
      />

      <AddHoldingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddHolding={handleAddHolding}
      />

      <OpenFinanceConsentModal
        isOpen={isOpenFinanceConsentOpen}
        onClose={() => {
          setIsOpenFinanceConsentOpen(false);
          setSelectedConsentBankCode(null);
        }}
        onConsentAuthorized={handleConsentAuthorized}
        onB3HoldingsImported={handleB3HoldingsImported}
        onResetToEmpty={handleResetToEmpty}
        preselectedBankCode={selectedConsentBankCode}
      />

      <InvestmentAcademyModal
        isOpen={isAcademyModalOpen}
        onClose={() => setIsAcademyModalOpen(false)}
        onOpenMovementModal={() => {
          setMovementInitialMode('aporte');
          setIsMovementModalOpen(true);
        }}
        selicRateAnnual={realIndicators?.selic.metaAnnualPct}
        cdiRateAnnual={realIndicators ? (realIndicators.cdi.dailyPct * 252) : 13.65}
      />
    </div>
  );
}
