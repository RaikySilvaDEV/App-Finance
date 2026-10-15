export type AssetCategory = 'renda_fixa' | 'fiis' | 'acoes' | 'global' | 'cripto';

export type RiskRating = 'Muito Baixo' | 'Baixo' | 'Moderado' | 'Alto' | 'Muito Alto';

export type InvestorProfile = 'Conservador' | 'Moderado' | 'Arrojado';

export interface RealIndicators {
  selic: {
    metaAnnualPct: number;
    date: string;
    source: string;
  };
  cdi: {
    dailyPct: number;
    annualizedPct: number;
    date: string;
    source: string;
  };
  dolar: {
    ptaxBrl: number;
    date: string;
    source: string;
  };
  ipca: {
    lastMonthlyPct: number;
    accumulated12mPct: number;
    date: string;
    source: string;
  };
  poupanca: {
    dailyEstimatedPct: number;
    monthlyPct: number;
    rule: string;
  };
  isLive: boolean;
  lastSync: string;
}

export interface BankAccount {
  id: string;
  providerItemId?: string;
  bankName: string;
  currencyCode?: string;
  bankData?: { closingBalance?: number; automaticallyInvestedBalance?: number; overdraftContractedLimit?: number; overdraftUsedLimit?: number; hasReservedBalance?: boolean };
  bankCode: string; // e.g. "260" Nubank, "341" Itaú, "208" BTG, "077" Inter, "102" XP, "001" BB, "237" Bradesco
  accountType: 'corrente' | 'investimento' | 'poupanca';
  agency: string;
  accountNumber: string;
  accountDigit: string;
  cpfTitular: string;
  nomeTitular: string;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'email' | 'celular' | 'aleatoria';
  balance: number; // Saldo em Conta Corrente
  availableForInvestment: number;
  lastSync: string;
  connected: boolean;
  brandColor: string;
  logo: string;
  authMethod?: 'open_finance_itp' | 'api_connector' | 'pix_direto';
}

export interface FinancialTransaction {
  creditCardMetadata?: { installmentNumber?: number; totalInstallments?: number; totalAmount?: number; purchaseDate?: string; billId?: string; cardNumber?: string };
  sourceAccountType?: 'BANK' | 'CREDIT';
  providerItemId?: string;
  id: string;
  type: 'pix_transfer' | 'ted_transfer' | 'invest_aporte' | 'invest_resgate' | 'account_transaction';
  amount: number;
  /** Direção informada pela instituição; ausente em movimentos locais antigos. */
  direction?: 'debit' | 'credit';
  /** Categoria original retornada pelo provedor bancário. */
  category?: string;
  currencyCode?: string;
  sourceAccountId: string;
  sourceAccountName: string;
  destinationAccountId?: string;
  destinationAccountName?: string;
  destinationPixKey?: string;
  assetTicker?: string;
  assetName?: string;
  sharesCount?: number;
  unitPrice?: number;
  timestamp: string;
  status: 'concluido' | 'processando' | 'falha';
  endToEndId?: string;
  autenticationCode?: string;
  description: string;
}

export interface Asset {
  source?: string;
  quoteDate?: string;
  id: string;
  ticker: string;
  name: string;
  category: AssetCategory;
  currentPrice: number;
  variationDailyPct: number;
  variationWeeklyPct: number;
  variationMonthlyPct: number;
  annualReturnPct: number;
  dividendYieldAnnualPct: number;
  dailyYieldEstimatedPct: number;
  monthlyYieldEstimatedPct: number;
  liquidity: string;
  riskScore: number;
  riskRating: RiskRating;
  fgcInsured: boolean;
  minInvestmentBrl: number;
  description: string;
  whyInvestNow: string;
  benchmarkTarget: string;
  tags: string[];
  isLiveQuote?: boolean;
}

export interface PortfolioHolding {
  id: string;
  assetId: string;
  ticker: string;
  name: string;
  category: AssetCategory;
  institutionId: string;
  institutionName: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  totalReturnBrl: number;
  totalReturnPct: number;
  dailyReturnBrl: number | null;
  dailyReturnPct: number;
  weeklyReturnBrl: number | null;
  weeklyReturnPct: number;
  monthlyReturnBrl: number | null;
  monthlyReturnPct: number;
  nextDividendBrl?: number;
  nextDividendDate?: string;
  isLiveSynced?: boolean;
}

export interface OpenFinanceInstitution {
  id: string;
  name: string;
  brandColor: string;
  logo: string;
  connected: boolean;
  lastSync: string;
  consentExpiry: string;
  consentId: string;
  accountType: string;
  holdingsCount: number;
  totalBalance: number;
}

export interface RiskAnalysisData {
  ticker: string;
  currentPrice?: number;
  riskScore: number;
  riskLevel: RiskRating;
  sharpeRatio: string;
  volatilityAnnual: string;
  liquidityTerm: string;
  macroSensitivity: {
    selicUp: string;
    inflationUp: string;
    exchangeRate: string;
  };
  executiveVerdict: string;
  pros: string[];
  cons: string[];
  scenarios: {
    conservativeGain30d: string;
    baseGain30d: string;
    optimisticGain30d: string;
  };
  isAiGenerated?: boolean;
  realDataSource?: string;
}

export interface DividendEvent {
  id: string;
  ticker: string;
  name: string;
  type: 'Rendimento FII' | 'Juros sobre Capital Próprio' | 'Dividendo' | 'Rendimento Diário Renda Fixa';
  amountPerShare?: number;
  totalPayoutBrl: number;
  paymentDate: string;
  status: 'creditado' | 'previsto';
}
