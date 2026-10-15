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
import { BankLogo } from './components/BankLogo';
import { AuthGate, SavedState } from './components/AuthGate';
import { ConnectedAssets } from './components/ConnectedAssets';
import { LoansSection } from './components/LoansSection';
import { ConnectionsSection } from './components/ConnectionsSection';
import { BalanceEvolution } from './components/BalanceEvolution';
import { FinancialOverview } from './components/FinancialOverview';
import { MainTab, Sidebar } from './components/Sidebar';
import { GainsPerformanceCard } from './components/GainsPerformanceCard';
import { BestOpportunitiesSection } from './components/BestOpportunitiesSection';
import { RiskAnalysisModal } from './components/RiskAnalysisModal';
import { PortfolioHoldingsTable } from './components/PortfolioHoldingsTable';
import { AiPortfolioAdvisorModal } from './components/AiPortfolioAdvisorModal';
import { AddHoldingModal } from './components/AddHoldingModal';
import { TransactionLedgerSection } from './components/TransactionLedgerSection';
import { OpenFinanceConsentModal } from './components/OpenFinanceConsentModal';
import { InvestmentAcademyModal } from './components/InvestmentAcademyModal';


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
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile>(initialState.profile || 'Moderado');
  
  // Real Market Data States
  const [realIndicators, setRealIndicators] = useState<RealIndicators | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [holdings, setHoldings] = useState<PortfolioHolding[]>(initialState.holdings || []);
  const [pluggyItemIds, setPluggyItemIds] = useState<string[]>(initialState.itemIds || []);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingData, setSavingData] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [providerInvestments, setProviderInvestments] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loansComplete, setLoansComplete] = useState(false);
  const [loansUnsupported, setLoansUnsupported] = useState(false);
  const [bankDataLoading, setBankDataLoading] = useState(pluggyItemIds.length > 0);
  const [providerSyncError, setProviderSyncError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  // Modals
  const [selectedAssetForRisk, setSelectedAssetForRisk] = useState<Asset | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  
  // Movement & Bank Modals
  const [isOpenFinanceConsentOpen, setIsOpenFinanceConsentOpen] = useState<boolean>(false);
  const [isAcademyModalOpen, setIsAcademyModalOpen] = useState<boolean>(false);

  // Sync state & feedback
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  async function saveUserData() {
    const response = await fetch('/api/user/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holdings, itemIds: pluggyItemIds, profile: investorProfile }) });
    if (!response.ok) throw new Error('Não foi possível salvar seus dados. Tente novamente antes de sair.');
  }
  useEffect(() => {
    setSavingData(true);
    const timer = setTimeout(() => { saveUserData().then(() => setSaveError(null)).catch((error) => setSaveError(error.message)).finally(() => setSavingData(false)); }, 400);
    return () => clearTimeout(timer);
  }, [holdings, pluggyItemIds, investorProfile]);
  async function logoutSafely() {
    try { await saveUserData(); await onLogout(); } catch (error: any) { setSaveError(error.message); }
  }
  // Fetch real market data and provider-linked accounts.
  useEffect(() => {
    fetchRealMarketData();
  }, []);

  const fetchBankAccounts = async (itemIds = pluggyItemIds) => {
    if (itemIds.length === 0) {
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
        fetch(`/api/open-finance/accounts?${params.toString()}`),
        fetch(`/api/open-finance/transactions?${params.toString()}`),
        fetch(`/api/open-finance/investments?${params.toString()}`),
        fetch(`/api/open-finance/loans?${params.toString()}`),
      ]);
      const accountsData = await accountsResponse.json();
      if (!accountsResponse.ok) throw new Error(accountsData.error || 'Falha ao carregar as contas da Pluggy.');
      const providerAccounts: BankAccount[] = accountsData.accounts || [];
      setBankAccounts(providerAccounts);
      setCreditCards(accountsData.creditCards || []);
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
        const accountsById = new Map(providerAccounts.map((account) => [account.id, account]));
        const providerTransactions: FinancialTransaction[] = (transactionsData.transactions || []).map((transaction: any) => {
          const account = accountsById.get(transaction.accountId);
          const description = transaction.description || transaction.descriptionRaw || transaction.merchant?.name || 'Lançamento bancário';
          const providerStatus = String(transaction.status || '').toUpperCase();
          return {
            id: String(transaction.id),
            type: 'account_transaction',
            amount: Math.abs(Number(transaction.amount) || 0),
            direction: String(transaction.type || '').toUpperCase() === 'DEBIT' || Number(transaction.amount) < 0 ? 'debit' : 'credit',
            category: transaction.category || transaction.operationType || transaction.personalFinanceCategory || transaction.merchant?.category || undefined,
            currencyCode: transaction.currencyCode || 'BRL',
            sourceAccountId: String(transaction.accountId || ''),
            sourceAccountName: account?.bankName || `${transaction.providerAccountName || 'Conta conectada'}${transaction.providerAccountType === 'CREDIT' ? ' (Cartão)' : ''}`,
            destinationAccountName: transaction.merchant?.name || description,
            timestamp: transaction.date || transaction.createdAt || '',
            status: providerStatus === 'POSTED' ? 'concluido' : providerStatus === 'PENDING' ? 'processando' : 'processando',
            description,
          };
        });
        setTransactions(providerTransactions.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      }
      const investmentsData = await investmentsResponse.json();
      if (!investmentsResponse.ok) {
        setProviderInvestments([]);
        syncErrors.push(investmentsData.error || 'Falha ao carregar investimentos da Pluggy.');
      } else {
        setProviderInvestments(investmentsData.investments || []);
      }
      setProviderSyncError(syncErrors.length ? syncErrors.join(' ') : null);
      return true;
    } catch (e) {
      console.warn('Erro ao carregar dados bancários Pluggy:', e);
      const message = e instanceof Error ? e.message : 'Erro ao atualizar os dados da Pluggy.';
      setProviderSyncError(message);
      return false;
    } finally {
      setBankDataLoading(false);
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
          name: ticker,
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
    showToast('Dados autorizados e indicadores atualizados quando disponíveis.');
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

  const handlePluggyConnected = async (itemId: string) => {
    if (pluggyItemIds.includes(itemId)) {
      const loadedExisting = await fetchBankAccounts(pluggyItemIds);
      if (!loadedExisting) throw new Error('Não consegui carregar esta conexão. Confira se o itemId pertence ao conector MeuPluggy e se suas credenciais são da mesma aplicação.');
      return;
    }
    const linked = await fetch('/api/user/connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId }) });
    if (!linked.ok) throw new Error((await linked.json()).error || 'Falha ao salvar a conexão.');
    const nextItemIds = Array.from(new Set([...pluggyItemIds, itemId]));
    setPluggyItemIds(nextItemIds);
    const loaded = await fetchBankAccounts(nextItemIds);
    if (!loaded) throw new Error('Não consegui carregar este itemId. Confira se é uma conexão do conector MeuPluggy e se suas credenciais pertencem à mesma aplicação demo.');

    setPluggyItemIds(nextItemIds);
    showToast('Conexão MeuPluggy adicionada ao painel.');
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

  const visibleProviderInvestments = providerInvestments.filter((investment) => Number.isFinite(Number(investment.balance)) && Math.round(Number(investment.balance) * 100) !== 0);

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-violet-500/20 selection:text-violet-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-3 left-3 z-50 flex items-center space-x-2.5 rounded-xl border border-emerald-500/50 bg-emerald-950/95 px-4 py-3 text-xs font-medium text-emerald-200 shadow-2xl backdrop-blur-md animate-fade-in sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm">
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
        onOpenFinanceModal={() => setIsOpenFinanceConsentOpen(true)}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        connectedInstitutionsCount={bankAccounts.filter(b => b.connected).length}
        totalInstitutionsCount={bankAccounts.length}
        realIndicators={realIndicators}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        bankAccounts={bankAccounts}
        onOpenBankManagerModal={() => setActiveTab('connections')}
        onOpenAcademyModal={() => setIsAcademyModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(true)}
        userEmail={email}
        onLogout={() => void logoutSafely()}
      />

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <Sidebar
          open={isSidebarOpen}
          activeTab={activeTab}
          connectedAccounts={bankAccounts.length}
          onSelectTab={setActiveTab}
          onClose={() => setIsSidebarOpen(false)}
          onConnect={() => setIsOpenFinanceConsentOpen(true)}
          onAcademy={() => setIsAcademyModalOpen(true)}
          onAdvisor={() => setIsAiAdvisorOpen(true)}
        />
      {/* Main Content Area */}
      <main id="overview" className="min-w-0 flex-1 w-full px-4 pt-5 pb-24 sm:px-6 lg:px-7 lg:py-8 space-y-6">
        <div><h1 className="text-2xl font-semibold tracking-tight text-white">{{ overview: 'Visão geral', accounts: 'Contas e cartões', assets: 'Ativos', ledger: 'Fluxo de caixa', market: 'Mercado', portfolio: 'Posições manuais', loans: 'Empréstimos', connections: 'Conexões' }[activeTab]}</h1><p className="mt-2 text-sm text-slate-500">{{ overview: 'Uma visão das suas finanças conectadas.', accounts: 'Saldos bancários, cartões e limites.', assets: 'Seus investimentos conectados, organizados por classe ou instituição.', ledger: 'Acompanhe entradas, despesas e movimentações.', market: 'Indicadores e oportunidades de investimento.', portfolio: 'Acompanhe os ativos que você cadastrou.', loans: 'Confira suas dívidas informadas pelos bancos conectados.', connections: 'Suas instituições, atualizações e autorizações.' }[activeTab]}</p></div>
        {(savingData || saveError) && <p role="status" className="text-xs text-slate-500">{savingData ? 'Salvando seus dados…' : 'Dados ainda não salvos'}</p>}
        {saveError && <div role="alert" className="rounded-lg border border-rose-500/30 p-3 text-sm text-rose-300">{saveError}<button onClick={() => { setSavingData(true); saveUserData().then(() => setSaveError(null)).catch((error) => setSaveError(error.message)).finally(() => setSavingData(false)); }} className="ml-3 underline">Tentar salvar novamente</button></div>}
        {activeTab === 'overview' && <>
        <FinancialOverview accounts={bankAccounts} cards={creditCards} investments={providerInvestments} privateMode={isPrivateMode} onOpenAccounts={() => setActiveTab('accounts')} onOpenAssets={() => setActiveTab('assets')} onConnect={() => setIsOpenFinanceConsentOpen(true)}/>
        <BalanceEvolution accounts={bankAccounts} transactions={transactions} isPrivateMode={isPrivateMode}/>
        {/* 1. Core Performance & Gains Dashboard (Diário, Semanal, Mensal, YTD) */}
        <details className="market-preview rounded-2xl border border-slate-800 bg-slate-900/40">
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 text-sm font-medium text-slate-300">Cotações do mercado <span className="text-xs font-normal text-slate-500">Abrir gráfico +</span></summary>
          <div className="px-4 pb-4"><GainsPerformanceCard
            holdings={holdings}
            isPrivateMode={isPrivateMode}
            assets={assets}
          /></div>
        </details>

        </>}

        {activeTab === 'accounts' && (<>
        <ConnectedAssets section="cards" investments={[]} creditCards={creditCards} isPrivateMode={isPrivateMode} />

        {/* 2. Mapeamento Estratégico dos Seus Bancos (Inter, Itaú, Nubank, Mercado Pago, PagBank, Santander, PicPay) */}
        <section className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">
            {providerSyncError && <p role="alert" className="mb-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">Falha ao sincronizar Pluggy: {providerSyncError}</p>}
            {bankAccounts.length ? 'Saldos carregados diretamente das instituições conectadas pela Pluggy.' : 'Conecte uma instituição pela Pluggy para consultar saldos bancários reais.'}
            {bankAccounts.map((account) => <div key={account.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-white"><div className="flex items-center gap-3"><BankLogo name={account.bankName}/><div><p>{account.bankName} · {account.accountType} · {isPrivateMode ? 'R$ ••••••' : `R$ ${account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</p><p className="mt-1 text-xs text-slate-500">{account.accountNumber} · Atualização informada: {new Date(account.lastSync).toLocaleString('pt-BR')}</p></div></div><button onClick={() => void handleAccountUnlinked(account.id)} className="text-xs text-rose-300 hover:text-rose-200">Remover do painel</button></div>)}
            <a href="https://meu.pluggy.ai/connections" target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs text-cyan-300">Gerenciar autorizações bancárias no Meu Pluggy ↗</a>
          </div>
        </section>

        </>)}

        {activeTab === 'assets' && <ConnectedAssets section="investments" investments={visibleProviderInvestments} creditCards={[]} isPrivateMode={isPrivateMode} />}

        {activeTab === 'loans' && <LoansSection loans={loans} complete={loansComplete} unsupported={loansUnsupported} isPrivateMode={isPrivateMode} onRefresh={() => fetchBankAccounts()} />}
        {activeTab === 'connections' && <ConnectionsSection itemIds={pluggyItemIds} onConnect={() => setIsOpenFinanceConsentOpen(true)} onRemove={(id) => { setPluggyItemIds((items) => items.filter((item) => item !== id)); showToast('Conexão removida do painel. A autorização no banco continua sendo gerenciada no Meu Pluggy.'); }}/>}

        {activeTab === 'ledger' && (<>
        {/* 3. Real Movement Ledger (Extrato de Transferências e Aportes) */}
        <section >
          <TransactionLedgerSection
            transactions={transactions}
            bankAccounts={bankAccounts}
            investments={visibleProviderInvestments}
            isPrivateMode={isPrivateMode}
          />
        </section>

        </>)}

        {activeTab === 'market' && (<>
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

      </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#09090b] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">FinPulse</span>
            <span>•</span>
            <span>Open Finance via Pluggy • somente leitura</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Pagamentos não habilitados. Cotações de mercado consultadas sob demanda.
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

      <AiPortfolioAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        holdings={holdings}
        investorProfile={investorProfile}
        bankAccounts={bankAccounts}
        investments={providerInvestments}
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
        onClose={() => {
          setIsOpenFinanceConsentOpen(false);
        }}
        onConnected={handlePluggyConnected}
      />

      <InvestmentAcademyModal
        isOpen={isAcademyModalOpen}
        onClose={() => setIsAcademyModalOpen(false)}
        selicRateAnnual={realIndicators?.selic.metaAnnualPct}
        cdiRateAnnual={realIndicators ? realIndicators.cdi.annualizedPct : undefined}
      />
    </div>
  );
}



export default function App() {
  return <AuthGate>{(state, user, logout) => <FinanceApp initialState={state} email={user.email} onLogout={logout}/>}</AuthGate>;
}




