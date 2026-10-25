/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { AlertsDialog } from './components/AlertsDialog';
import { usePriceAlerts } from './lib/usePriceAlerts';
import { useEntryAlerts } from './lib/useEntryAlerts';
import { Header } from './components/Header';
import { DataSkeleton } from './components/DataSkeleton';
import { BankLogo } from './components/BankLogo';
import { EmailAccessFlow } from './components/EmailAccess';
import { AuthGate, SavedState } from './components/AuthGate';
import { ConnectedAssets } from './components/ConnectedAssets';
import { LoansSection } from './components/LoansSection';
import { FirstBankSetup } from './components/FirstBankSetup';
import { ConnectionsSection } from './components/ConnectionsSection';
import { BalanceEvolution } from './components/BalanceEvolution';
import { HomeActivity, HomeShortcuts } from './components/HomeActivity';
import { FinancialOverview } from './components/FinancialOverview';
import { PersonalCashPlan } from './components/PersonalCashPlan';
import { PersonalBudgetPanel } from './components/PersonalBudgetPanel';
import { PlanningSection, ManualLoansPanel } from './components/PlanningSection';
import { emptyPlanning, classifyTransactions } from './lib/planning';
import { dailyAlerts } from './lib/dailyControl';
import type { PlanningData } from './lib/planning';
import { MoneyAvailable, SyncStatus } from './components/DailyControl';
import { StatementImport } from './components/StatementImport';
import { ManualCardsPanel } from './components/ManualCardsPanel';
import { AccountsSection } from './components/AccountsSection';
import { useControlData } from './lib/useControlData';
import { finiteValue } from './lib/productMapping';
import { providerTransaction } from './lib/providerTransaction';
import { useFinancialHistory } from './lib/useFinancialHistory';
import { MarketDividends } from './components/MarketDividends';
import { MainTab, Sidebar } from './components/Sidebar';
import { GainsPerformanceCard } from './components/GainsPerformanceCard';
import { BestOpportunitiesSection } from './components/BestOpportunitiesSection';
import { RiskAnalysisModal } from './components/RiskAnalysisModal';
import { PortfolioHoldingsTable } from './components/PortfolioHoldingsTable';
import { AiPortfolioAdvisorModal } from './components/AiPortfolioAdvisorModal';
import { AddHoldingModal } from './components/AddHoldingModal';
import { TransactionLedgerSection } from './components/TransactionLedgerSection';
import { OpenFinanceConsentModal } from './components/OpenFinanceConsentModal';
import { InvestmentAcademySection } from './components/InvestmentAcademySection';


import { 
  Asset,
  PortfolioHolding, 
  InvestorProfile, 
  RealIndicators,
  BankAccount,
  FinancialTransaction 
} from './types/finance';

const LOCAL_STORAGE_KEY_HOLDINGS = 'finpulse_real_holdings_v3';
const LOCAL_STORAGE_KEY_PLUGGY_ITEMS = 'finpulse_meu_pluggy_item_ids_v1';

function FinanceApp({ initialState, email, onLogout }: { initialState: SavedState; email: string; onLogout: () => Promise<void> }) {
  // Global States
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [accountsView, setAccountsView] = useState<'accounts' | 'cards' | 'bills'>('accounts');
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [menuTransitioning, setMenuTransitioning] = useState(false);
  const menuTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (menuTransitionTimer.current) clearTimeout(menuTransitionTimer.current); }, []);
  function navigateToTab(tab: MainTab) {
    if (tab === activeTab) return;
    if (menuTransitionTimer.current) clearTimeout(menuTransitionTimer.current);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setMenuTransitioning(!reduceMotion);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (!reduceMotion) menuTransitionTimer.current = setTimeout(() => setMenuTransitioning(false), 180);
  }

  const [investorProfile, setInvestorProfile] = useState<InvestorProfile>(initialState.profile || 'Moderado');
  
  // Real Market Data States
  const [realIndicators, setRealIndicators] = useState<RealIndicators | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [holdings, setHoldings] = useState<PortfolioHolding[]>(initialState.holdings || []);
  const [pluggyItemIds, setPluggyItemIds] = useState<string[]>(initialState.itemIds || []);
  const connectionBase = useRef<string[]>(initialState.itemIds || []);
  function receiveConnections(ids: string[]) {
    const added = ids.filter((id) => !connectionBase.current.includes(id));
    connectionBase.current = [...new Set([...connectionBase.current, ...ids])];
    if (added.length) setPluggyItemIds((previous) => [...new Set([...previous, ...added])]);
  }
  async function reloadConnections() {
    const response = await fetch('/api/user/state');
    if (!response.ok) throw new Error('Não foi possível consultar suas conexões salvas.');
    const state = await response.json();
    const ids: string[] = state.itemIds || [];
    receiveConnections(ids);
    return ids;
  }
  useEffect(() => {
    const refresh = () => { if (!document.hidden) void reloadConnections().catch((reason) => setProviderSyncError(reason.message)); };
    const interval = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);
  const [planning, setPlanning] = useState<PlanningData>({ ...emptyPlanning(), ...initialState.planning });
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);
  const [syncVersion, setSyncVersion] = useState(0);
  const controls = useControlData(pluggyItemIds, syncVersion);
  const [historyComplete, setHistoryComplete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingData, setSavingData] = useState(false);
  const [providerBankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [manualBankAccounts, setManualBankAccounts] = useState<BankAccount[]>([]);
  const [manualPremium, setManualPremium] = useState(false);
  const holdingCount = useRef(holdings.length);
  holdingCount.current = holdings.length;
  const [manualError, setManualError] = useState('');
  const [importVersion, setImportVersion] = useState(0);
  const bankAccounts = useMemo(() => [...providerBankAccounts, ...manualBankAccounts], [providerBankAccounts, manualBankAccounts]);
  async function reloadManualAccounts(signal?: AbortSignal) {
    const response = await fetch('/api/manual/accounts', { signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar suas contas manuais.');
    if (signal?.aborted) return;
    setManualBankAccounts(data.accounts || []); setManualPremium(data.premium === true); setManualError('');
  }
  async function manualChanged() { await reloadManualAccounts(); setImportVersion((v) => v + 1); }
  useEffect(() => {
    const controller = new AbortController();
    reloadManualAccounts(controller.signal).catch((error) => { if (!controller.signal.aborted) setManualError(error.message); });
    return () => controller.abort();
  }, []);
  const [providerInvestments, setProviderInvestments] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loansComplete, setLoansComplete] = useState(false);
  const [loansUnsupported, setLoansUnsupported] = useState(false);
  const [hasLoadedBankData, setHasLoadedBankData] = useState(pluggyItemIds.length === 0);
  const [bankDataLoading, setBankDataLoading] = useState(pluggyItemIds.length > 0);
  const [providerSyncError, setProviderSyncError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const history = useFinancialHistory(syncVersion, transactions, { accounts: providerBankAccounts, investments: providerInvestments, creditCards, loans }, historyComplete, pluggyItemIds, manualBankAccounts.map((a) => a.id), importVersion);
  const classifiedTransactions = useMemo(() => classifyTransactions(history.allTransactions, planning), [history.allTransactions, planning]);
  useEffect(() => {
    if (hasLoadedBankData || !controls.data.sync.cache?.length) return;
    const saved = controls.data.sync.cache.filter((row) => pluggyItemIds.includes(row.itemId));
    if (!saved.length) return;
    setBankAccounts(saved.flatMap((row) => row.accounts || []));
    setCreditCards(saved.flatMap((row) => row.creditCards || []));
    setProviderInvestments(saved.flatMap((row) => row.investments || []));
    setLoans(saved.flatMap((row) => row.loans || []));
    setHasLoadedBankData(true);
  }, [controls.data.sync.cache, hasLoadedBankData, pluggyItemIds]);
  const controlView = { ...controls.data, loans };
  const priceMonitor = usePriceAlerts(holdings, planning.priceAlerts);
  const currentAlerts = useMemo(() => [...new Map([...priceMonitor.alerts, ...dailyAlerts(planning, classifiedTransactions, controlView.connections, undefined, controlView.loans)].map((alert) => [alert.id, alert])).values()], [planning, classifiedTransactions, controlView.connections, controlView.loans, priceMonitor.alerts]);
  const alerts = useEntryAlerts(!history.loading && !bankDataLoading && !controls.loading, currentAlerts.length);
  // Modals
  const [selectedAssetForRisk, setSelectedAssetForRisk] = useState<Asset | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  
  // Movement & Bank Modals
  const [marketChartOpen, setMarketChartOpen] = useState(false);
  const [reviewPriceAlert, setReviewPriceAlert] = useState(false);
  useEffect(() => { if (reviewPriceAlert && activeTab === 'overview' && !menuTransitioning) { document.getElementById('market-quotes')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); setReviewPriceAlert(false); } }, [reviewPriceAlert, activeTab, menuTransitioning]);
  function openPriceReview() { alerts.close(); navigateToTab('overview'); setMarketChartOpen(true); setReviewPriceAlert(true); }
  const [bankRevision, setBankRevision] = useState(0);
  const [reconnectItem, setReconnectItem] = useState<string | undefined>();
  const [isOpenFinanceConsentOpen, setIsOpenFinanceConsentOpen] = useState<boolean>(false);

  // Sync state & feedback
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  function saveUserData() {
    const body = JSON.stringify({ holdings, connectionBase: connectionBase.current, itemIds: pluggyItemIds, profile: investorProfile, planning });
    const operation = saveQueue.current.catch(() => {}).then(async () => {
      const response = await fetch('/api/user/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Não foi possível salvar seus dados. Tente novamente antes de sair.'); }
      const result = await response.json();
      if (Array.isArray(result.itemIds)) receiveConnections(result.itemIds);
    });
    saveQueue.current = operation;
    return operation;
  }
  useEffect(() => {
    const revision = ++saveRevision.current;
    setSavingData(true);
    const timer = setTimeout(() => { saveUserData().then(() => { if (revision === saveRevision.current) setSaveError(null); }).catch((error) => { if (revision === saveRevision.current) setSaveError(error.message); }).finally(() => { if (revision === saveRevision.current) setSavingData(false); }); }, 400);
    return () => clearTimeout(timer);
  }, [holdings, pluggyItemIds, investorProfile, planning]);
  async function logoutSafely() {
    try { await saveUserData(); await onLogout(); } catch (error: any) { setSaveError(error.message); }
  }
  // Fetch real market data and provider-linked accounts.
  useEffect(() => {
    fetchRealMarketData();
  }, []);

  const bankRequest = useRef<AbortController | null>(null);
  useEffect(() => () => bankRequest.current?.abort(), []);
  const fetchBankAccounts = async (itemIds = pluggyItemIds) => {
    bankRequest.current?.abort();
    const controller = new AbortController();
    bankRequest.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]);
    if (itemIds.length === 0) {
      setHasLoadedBankData(true);
      setBankDataLoading(false);
      setProviderSyncError(null);
      setBankAccounts([]);
      setTransactions([]);
      setProviderInvestments([]);
      setCreditCards([]);
      setLoans([]);
      setLoansComplete(false);
      setLoansUnsupported(false);
      return;
    }

    try {
      setBankDataLoading(true);
      setProviderSyncError(null);
      const params = new URLSearchParams();
      itemIds.forEach((itemId) => params.append('itemId', itemId));
      const [accountsResponse, transactionsResponse, investmentsResponse, loansResponse] = await Promise.all([
        fetch(`/api/open-finance/accounts?${params.toString()}`, { signal }),
        fetch(`/api/open-finance/transactions?${params.toString()}`, { signal }),
        fetch(`/api/open-finance/investments?${params.toString()}`, { signal }),
        fetch(`/api/open-finance/loans?${params.toString()}`, { signal }),
      ]);
      const accountsData = await accountsResponse.json();
      if (!accountsResponse.ok) throw new Error(accountsData.error || 'Falha ao carregar as contas da Pluggy.');
      const providerAccounts: BankAccount[] = accountsData.accounts || [];
      setBankAccounts((old) => [...providerAccounts, ...old.filter((row) => accountsData.unavailableItems?.includes(row.providerItemId))]);
      setCreditCards((old) => [...(accountsData.creditCards || []), ...old.filter((row) => accountsData.unavailableItems?.includes(row.providerItemId))]);
      const loansData = await loansResponse.json();
      setLoans(loansResponse.ok ? loansData.loans || [] : []);
      setLoansComplete(loansResponse.ok && loansData.complete === true);
      setLoansUnsupported(loansResponse.ok && (loansData.unsupportedItems || []).length > 0);

      // A conexão bancária continua válida mesmo quando a Pluggy não libera
      // extratos ou investimentos para algum item. Preserve as contas e mostre
      // separadamente quais conjuntos de dados não puderam ser sincronizados.
      const syncErrors: string[] = [];
      if (accountsData.unavailableItems?.length) syncErrors.push('Uma conexão salva está indisponível. Reconecte esse banco para recuperar seus dados.');
      const transactionsData = await transactionsResponse.json();
      if (!transactionsResponse.ok) {
        setTransactions([]);
        syncErrors.push(transactionsData.error || 'Falha ao carregar o extrato da Pluggy.');
      } else {
        const providerTransactions: FinancialTransaction[] = (transactionsData.transactions || []).map((transaction: any) => providerTransaction(transaction, providerAccounts));
        if (transactionsData.unavailableItems?.length || transactionsData.truncatedItems?.length) syncErrors.push('O extrato está parcial em uma ou mais conexões. O histórico salvo foi preservado.');
        setTransactions(providerTransactions.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      }
      const investmentsData = await investmentsResponse.json();
      if (!investmentsResponse.ok) {
        setProviderInvestments([]);
        syncErrors.push(investmentsData.error || 'Falha ao carregar investimentos da Pluggy.');
      } else {
        setProviderInvestments((old) => [...(investmentsData.investments || []), ...old.filter((row) => investmentsData.unavailableItems?.includes(row.providerItemId))]);
        if (investmentsData.unavailableItems?.length) syncErrors.push('Investimentos indisponíveis em uma ou mais conexões.');
      }
      setProviderSyncError(syncErrors.length ? syncErrors.join(' ') : null);
      setHistoryComplete(syncErrors.length === 0);
      setSyncVersion((version) => version + 1);
      return true;
    } catch (e) {
      if (controller.signal.aborted) return false;
      controller.abort();
      console.warn('Erro ao carregar dados bancários Pluggy:', e);
      const message = e instanceof Error && e.name === 'TimeoutError' ? 'A atualização demorou mais que o esperado. Os dados anteriores foram mantidos; tente atualizar novamente.' : e instanceof Error ? e.message : 'Erro ao atualizar os dados da Pluggy.';
      setProviderSyncError(message);
      return false;
    } finally {
      if (bankRequest.current === controller) {
        setHasLoadedBankData(true);
        setBankDataLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBankAccounts(pluggyItemIds);
  }, [pluggyItemIds]);

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

        setAssets(Object.entries(quotes).map(([ticker, live]: [string, any]) => ({
          id: ticker,
          ticker,
          name: live.name || ticker,
          source: live.source,
          quoteDate: live.lastUpdated,
          category: ticker.endsWith('11') ? 'fiis' : 'acoes',
          currentPrice: live.currentPrice,
          variationDailyPct: live.dailyChangePct,
          variationWeeklyPct: live.weeklyChangePct,
          variationMonthlyPct: live.monthlyChangePct,
          annualReturnPct: 0,
          dividendYieldAnnualPct: 0,
          dailyYieldEstimatedPct: 0,
          monthlyYieldEstimatedPct: 0,
          liquidity: 'Não informado',
          riskScore: 0,
          riskRating: 'Moderado',
          fgcInsured: false,
          minInvestmentBrl: live.currentPrice,
          description: 'Cotação de mercado consultada sob demanda.',
          whyInvestNow: '',
          benchmarkTarget: '',
          tags: [],
          isLiveQuote: true,
        })));

        setHoldings((prevHoldings) =>
          prevHoldings.map((h) => {
            const live = quotes[h.ticker];
            if (live) {
              const livePrice = live.currentPrice;
              const currentValue = Number((h.quantity * livePrice).toFixed(2));
              const totalInvested = Number((h.quantity * h.averagePrice).toFixed(2));
              const totalReturnBrl = Number((currentValue - totalInvested).toFixed(2));
              const totalReturnPct = totalInvested > 0 ? Number(((totalReturnBrl / totalInvested) * 100).toFixed(2)) : 0;
              
              const dailyReturnBrl = live.dailyChangePct == null ? null : Number((currentValue * (live.dailyChangePct / 100)).toFixed(2));
              const weeklyReturnBrl = live.weeklyChangePct == null ? null : Number((currentValue * (live.weeklyChangePct / 100)).toFixed(2));
              const monthlyReturnBrl = live.monthlyChangePct == null ? null : Number((currentValue * (live.monthlyChangePct / 100)).toFixed(2));

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
    if (pluggyItemIds.length) {
      void fetchRealMarketData();
      if (pluggyItemIds.length === 1) { setReconnectItem(pluggyItemIds[0]); setIsOpenFinanceConsentOpen(true); }
      else { navigateToTab('connections'); showToast('Escolha a conexão que deseja atualizar.'); }
      return;
    }
    setIsSyncing(true);
    await fetchRealMarketData();
    try { const ids = await reloadConnections(); await fetchBankAccounts([...new Set([...pluggyItemIds, ...ids])]); } catch (reason: any) { setProviderSyncError(reason.message); }
    setIsSyncing(false);
    showToast('Dados autorizados e indicadores atualizados quando disponíveis.');
  };

  // Add real holding
  const handleAddHolding = (newHolding: PortfolioHolding) => {
    if (!manualPremium && holdingCount.current >= 2) { showToast('O Free permite até 2 posições manuais. Premium de R$ 39,90/mês ainda não está disponível para contratação.'); return false; }
    holdingCount.current++;
    setHoldings((prev) => [newHolding, ...prev]);
    showToast(`${newHolding.ticker} adicionado à sua carteira com sucesso!`);
    return true;
  };

  // Remove holding
  const handleRemoveHolding = (holdingId: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== holdingId));
    showToast('Ativo removido da sua carteira.');
  };

  const handlePluggyConnected = async (itemId: string) => {
    if (pluggyItemIds.includes(itemId)) {
      setBankRevision(value => value + 1);
      const loadedExisting = await fetchBankAccounts(pluggyItemIds);
      if (!loadedExisting) throw new Error('Não consegui carregar esta conexão. Confira se o itemId pertence ao conector MeuPluggy e se suas credenciais são da mesma aplicação.');
      return;
    }
    const linked = await fetch('/api/user/connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId }) });
    if (!linked.ok) throw new Error((await linked.json()).error || 'Falha ao salvar a conexão.');
    const serverIds = await reloadConnections();
    const nextItemIds = Array.from(new Set([...pluggyItemIds, ...serverIds, itemId]));
    setPluggyItemIds(nextItemIds);
    const loaded = await fetchBankAccounts(nextItemIds);
    if (!loaded) throw new Error('A conexão foi salva, mas os dados ainda não puderam ser carregados. Aguarde a sincronização e atualize o painel.');

    setPluggyItemIds(nextItemIds);
    navigateToTab('overview');
    showToast('Banco conectado à sua conta FinPulse.');
  };

  const handleAccountUnlinked = async (accountId: string) => {
    const itemId = bankAccounts.find((account) => account.id === accountId)?.providerItemId;
    if (!itemId) return;
    const nextItemIds = pluggyItemIds.filter((id) => id !== itemId);

    setPluggyItemIds(nextItemIds);
    showToast('Conexão removida deste painel. Para revogar o acesso bancário, desconecte-a no Meu Pluggy.');
  };
  // Trigger Risk Modal for an Asset
  const handleOpenRiskAnalysis = (asset: Asset) => {
    setSelectedAssetForRisk(asset);
    setIsRiskModalOpen(true);
  };

  // Trigger Risk Modal for an existing Holding
  const handleOpenHoldingRisk = (holding: PortfolioHolding) => {
    const matchedAsset = assets.find((a) => a.ticker === holding.ticker);
    if (!matchedAsset) { showToast('Não há cotação atual disponível para este ativo.'); return; }
    setSelectedAssetForRisk(matchedAsset);
    setIsRiskModalOpen(true);
  };

  const handleAddToPortfolio = (_asset: Asset, _amount: number) => {
    showToast('A compra de ativos não é executada por este aplicativo.');
  };

  const visibleProviderInvestments = providerInvestments.filter((investment) => finiteValue(investment.balance) == null || Math.round(Number(investment.balance) * 100) !== 0);

  const initialDataLoading = (!hasLoadedBankData && bankDataLoading) || (history.loading && history.allTransactions.length === 0 && pluggyItemIds.length > 0);
  const showDataSkeleton = menuTransitioning || (initialDataLoading && ['overview', 'accounts', 'assets', 'ledger', 'loans', 'planning'].includes(activeTab)) || (activeTab === 'market' && isSyncing && assets.length === 0);

  return (
    <div className="finpulse-workspace min-h-dvh bg-[#09090b] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-violet-500/20 selection:text-violet-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-3 left-3 z-50 flex items-center space-x-2.5 rounded-xl border border-emerald-500/50 bg-emerald-950/95 px-4 py-3 text-xs font-medium text-emerald-200 shadow-2xl backdrop-blur-md animate-fade-in sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <AlertsDialog open={alerts.open} alerts={currentAlerts} privateMode={isPrivateMode} onClose={alerts.close}
        onSelect={(alert) => { alerts.close(); if (alert.target === 'market') { openPriceReview(); } else navigateToTab('planning'); }}/>

      {/* Global Header */}
      <Header
        isPrivateMode={isPrivateMode}
        setIsPrivateMode={setIsPrivateMode}
        isSyncing={isSyncing || bankDataLoading}
        onSyncNow={handleSyncNow}
        connectedInstitutionsCount={pluggyItemIds.length}
        onOpenBankManagerModal={() => navigateToTab('connections')}
        onToggleSidebar={() => setIsSidebarOpen(true)}
        alertCount={currentAlerts.length}
        onOpenAlerts={alerts.show}
        userEmail={email}
        onLogout={() => void logoutSafely()}
      />

      <div className="mx-auto flex w-full max-w-[1680px] flex-1">
        <Sidebar
          open={isSidebarOpen}
          activeTab={activeTab}
          connectedAccounts={pluggyItemIds.length}
          onSelectTab={navigateToTab}
          onClose={() => setIsSidebarOpen(false)}
          onConnect={() => setIsOpenFinanceConsentOpen(true)}
          onAcademy={() => navigateToTab('learn')}
          onAdvisor={() => setIsAiAdvisorOpen(true)}
        />
      {/* Main Content Area */}
      <main data-view={activeTab} id="overview" aria-busy={showDataSkeleton} className="min-w-0 flex-1 w-full px-4 pt-5 pb-24 sm:px-6 lg:px-7 lg:py-8 space-y-6">
        <div className="workspace-title"><p className="workspace-eyebrow">FINPULSE / {{ overview: 'SEU DIA FINANCEIRO', accounts: 'SUAS INSTITUIÇÕES', ledger: 'MOVIMENTAÇÕES', planning: 'SEUS PLANOS' }[activeTab as string] || 'SEU ESPAÇO FINANCEIRO'}</p><h1 className="text-2xl font-semibold tracking-tight text-white">{{ overview: 'Visão geral', accounts: 'Contas e cartões', assets: 'Ativos', ledger: 'Fluxo de caixa', market: 'Mercado', portfolio: 'Posições manuais', loans: 'Empréstimos', connections: 'Conexões', planning: 'Planejamento', 'personal-budget': 'Meu dinheiro', learn: 'Aprender' }[activeTab]}</h1></div>
        {priceMonitor.alerts.length > 0 && (activeTab !== 'overview' || !marketChartOpen) && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.04] px-4 py-3"><p className="text-xs text-rose-300">{isPrivateMode ? 'Um limite de perda foi atingido nos dados disponíveis.' : `${priceMonitor.alerts.length} ativo(s) atingiram sua margem de perda nos dados disponíveis.`}</p><button type="button" onClick={openPriceReview} className="min-h-10 text-xs font-medium text-rose-300 hover:underline">Revisar ativos →</button></div>}
        {(savingData || saveError) && <p role="status" className="text-xs text-slate-500">{savingData ? 'Salvando seus dados…' : 'Dados ainda não salvos'}</p>}
        {saveError && <div role="alert" className="rounded-lg border border-rose-500/30 p-3 text-sm text-rose-300">{saveError}<button onClick={() => { setSavingData(true); saveUserData().then(() => setSaveError(null)).catch((error) => setSaveError(error.message)).finally(() => setSavingData(false)); }} className="ml-3 underline">Tentar salvar novamente</button></div>}
        {providerSyncError && <p role="alert" className="rounded-xl border border-amber-500/20 p-3 text-xs text-amber-200">{providerSyncError}</p>}
        {history.error && <p role="alert" className="rounded-xl border border-amber-500/20 p-3 text-xs text-amber-200">{history.error} Os dados consultados continuam visíveis, mas esta atualização pode não ter sido salva no histórico.</p>}
        {showDataSkeleton ? <DataSkeleton label={menuTransitioning ? 'Abrindo seção…' : 'Carregando seus dados financeiros…'} variant={activeTab === 'overview' ? 'overview' : activeTab === 'connections' ? 'connections' : activeTab === 'ledger' || activeTab === 'planning' ? 'ledger' : 'list'}/> : <div key={activeTab} className="menu-content space-y-6">
        {activeTab === 'learn' && <InvestmentAcademySection selicRateAnnual={realIndicators?.selic.metaAnnualPct} cdiRateAnnual={realIndicators?.cdi.annualizedPct}/>}
        {activeTab === 'personal-budget' && <PersonalBudgetPanel mode="cards" privateMode={isPrivateMode} itemIds={pluggyItemIds} cards={creditCards} accounts={bankAccounts} onOpenCards={() => { setAccountsView('cards'); navigateToTab('accounts'); }}/>}
        {activeTab === 'planning' && <><PersonalCashPlan data={planning} onChange={setPlanning} privateMode={isPrivateMode}/><PlanningSection data={planning} onChange={setPlanning} transactions={classifiedTransactions} privateMode={isPrivateMode} history={history} controls={controlView} onConnections={() => navigateToTab('connections')} onLoans={() => navigateToTab('loans')}/></>}
        {activeTab === 'overview' && (!pluggyItemIds.length && !bankAccounts.length && !creditCards.length && !holdings.length && !planning.manualCards?.length ? <FirstBankSetup onConnect={() => { setReconnectItem(undefined); setIsOpenFinanceConsentOpen(true); }} onManual={() => navigateToTab('accounts')} onPlanning={() => navigateToTab('planning')}/> : <>
        <HomeShortcuts onNavigate={navigateToTab} onCards={() => { setAccountsView('cards'); navigateToTab('accounts'); }}/>
        <MoneyAvailable accounts={bankAccounts} cards={creditCards} investments={providerInvestments} loans={loans} data={planning} privateMode={isPrivateMode}/>
        <FinancialOverview manualCardCount={planning.manualCards?.length || 0} accounts={bankAccounts} cards={creditCards} investments={providerInvestments} privateMode={isPrivateMode} onOpenAccounts={() => { setAccountsView('accounts'); navigateToTab('accounts'); }} onOpenCards={() => { setAccountsView('cards'); navigateToTab('accounts'); }} onOpenAssets={() => navigateToTab('assets')} onConnect={() => setIsOpenFinanceConsentOpen(true)}/>
        <HomeActivity data={planning} transactions={classifiedTransactions} privateMode={isPrivateMode} onNavigate={navigateToTab} onCards={() => { setAccountsView('cards'); navigateToTab('accounts'); }}/>
        {providerBankAccounts.length > 0 && <BalanceEvolution accounts={providerBankAccounts} transactions={history.allTransactions} isPrivateMode={isPrivateMode} snapshots={history.snapshots}/>}
        {/* 1. Core Performance & Gains Dashboard (Diário, Semanal, Mensal, YTD) */}
        <details id="market-quotes" open={marketChartOpen} onToggle={event => setMarketChartOpen(event.currentTarget.open)} className="scroll-mt-20 market-preview rounded-2xl border border-slate-800 bg-slate-900/40">
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 text-sm font-medium text-slate-300">Cotações do mercado <span className="text-xs font-normal text-slate-500">Abrir gráfico +</span></summary>
          <div className="px-4 pb-4"><GainsPerformanceCard
            holdings={holdings}
            connectedInvestments={providerInvestments}
            priceRules={planning.priceAlerts || []}
            onPriceRulesChange={(rules) => setPlanning(old => ({ ...old, priceAlerts: rules }))}
            priceMonitor={priceMonitor}
            onManageHoldings={() => navigateToTab('portfolio')}
            isPrivateMode={isPrivateMode}
            assets={assets}
          /></div>
        </details>

        </>)}

        {activeTab === 'accounts' && <AccountsSection cardSchedules={planning.cardSchedules || []} onCardSchedulesChange={(cardSchedules) => setPlanning(old => ({ ...old, cardSchedules }))} cardTools={<ManualCardsPanel data={planning} onChange={setPlanning} privateMode={isPrivateMode} connectedCardCount={creditCards.length}/>} initialTab={accountsView} manualTools={<>{manualError && <p role="alert" className="text-rose-300">{manualError}</p>}<StatementImport accounts={manualBankAccounts} onChanged={manualChanged} privateMode={isPrivateMode}/></>} accounts={bankAccounts} cards={creditCards} itemIds={pluggyItemIds} privateMode={isPrivateMode} onRemove={handleAccountUnlinked}/>}

        {activeTab === 'assets' && <ConnectedAssets snapshots={history.snapshots} section="investments" accounts={bankAccounts} investments={visibleProviderInvestments} creditCards={[]} isPrivateMode={isPrivateMode} />}

        {activeTab === 'loans' && <><ManualLoansPanel data={planning} onChange={setPlanning} privateMode={isPrivateMode}/><LoansSection loans={loans} complete={loansComplete} unsupported={loansUnsupported} isPrivateMode={isPrivateMode} onRefresh={() => fetchBankAccounts()} /></>}
        {activeTab === 'connections' && <><SyncStatus data={controls.data} reload={controls.reload}/><ConnectionsSection onReload={async () => { if (!await fetchBankAccounts()) throw new Error('Não foi possível consultar todos os dados bancários. Tente novamente.'); }} refreshKey={bankRevision} onManual={() => navigateToTab('accounts')} onReconnect={(id) => { setReconnectItem(id); setIsOpenFinanceConsentOpen(true); }} itemIds={pluggyItemIds} onConnect={() => setIsOpenFinanceConsentOpen(true)} onRemove={(id) => { setPluggyItemIds((items) => items.filter((item) => item !== id)); showToast('Conexão removida do painel. A autorização bancária continua ativa.'); }}/></>}

        {activeTab === 'ledger' && (<>
        {/* 3. Real Movement Ledger (Extrato de Transferências e Aportes) */}
        <section >
          <TransactionLedgerSection
            transactions={history.allTransactions}
            planning={planning}
            onPlanningChange={setPlanning}
            bankAccounts={bankAccounts}
            investments={visibleProviderInvestments}
            isPrivateMode={isPrivateMode}
          />
        </section>

        </>)}

        {activeTab === 'market' && (<>
        <MarketDividends privateMode={isPrivateMode}/>
        {/* 4. "Onde Investir Agora" - Curated Best Real Opportunities with Custom Risk Analysis */}
        <section >
          <BestOpportunitiesSection
            assets={assets}
            onSelectAssetForRiskAnalysis={handleOpenRiskAnalysis}
            investorProfile={investorProfile}
          />
        </section>

        </>)}

        {activeTab === 'portfolio' && (<>
        {/* 5. Connected Open Finance Holdings Table */}
        <section >
          <PortfolioHoldingsTable
            holdings={holdings}
            isPrivateMode={isPrivateMode}
            onSelectHoldingForRisk={handleOpenHoldingRisk}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRemoveHolding={handleRemoveHolding}
          />
        </section>
        </>)}

        </div>}
      </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#09090b] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">FinPulse</span>
            <span>•</span>
            <span>Controle financeiro • contas manuais e extratos</span>
          </div>
          
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

      <AiPortfolioAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        holdings={holdings}
        investorProfile={investorProfile}
        bankAccounts={bankAccounts}
        investments={providerInvestments}
        manualLoans={planning.manualLoans}
        creditCards={creditCards}
        loans={loans}
        loansComplete={loansComplete}
        dataLoading={bankDataLoading}
      />

      <AddHoldingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddHolding={handleAddHolding}
      />

      <OpenFinanceConsentModal
        isOpen={isOpenFinanceConsentOpen}
        onManual={() => { setIsOpenFinanceConsentOpen(false); navigateToTab('accounts'); }}
        updateItem={reconnectItem}
        onClose={() => {
          setIsOpenFinanceConsentOpen(false); setReconnectItem(undefined);
        }}
        onConnected={handlePluggyConnected}
      />


    </div>
  );
}



export default function App() {
  return <EmailAccessFlow><AuthGate>{(state, user, logout) => <FinanceApp initialState={state} email={user.email} onLogout={logout}/>}</AuthGate></EmailAccessFlow>;
}




