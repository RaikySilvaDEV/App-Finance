import React, { useState } from 'react';
import { 
  Building2, 
  ArrowRightLeft, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Coins, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Award,
  Zap,
  ExternalLink,
  Smartphone,
  Edit3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { BankAccount } from '../types/finance';

interface BankStrategyAdvisorSectionProps {
  bankAccounts: BankAccount[];
  onSelectBankForMovement: (bankAccount: BankAccount) => void;
  onOpenAddModal: () => void;
  onOpenConsentForBank: (bankCode: string) => void;
  onQuickUpdateBalance: (accountId: string, newBalance: number) => void;
  isPrivateMode: boolean;
}

interface BankStrategyGuide {
  bankKey: string;
  bestFor: string;
  recommendedAssets: string[];
  yieldEdge: string;
  goldenRule: string;
}

const STRATEGY_GUIDES: Record<string, BankStrategyGuide> = {
  '077': { // Inter
    bankKey: 'Inter',
    bestFor: 'LCIs Isentas de Imposto de Renda e Home Broker Grátis B3',
    recommendedAssets: ['LCI 94% CDI Isenta', 'FIIs na B3 (MXRF11, HGLG11)', 'Ações B3'],
    yieldEdge: 'Economiza 15% a 22,5% de IR com liquidez pós-carência de 90 dias.',
    goldenRule: 'Compre ações e FIIs pelo Inter para aproveitar a corretagem ZERO na Bolsa de Valores.',
  },
  '341': { // Itaú
    bankKey: 'Itaú',
    bestFor: 'Tesouro Direto, CDBs de Alta Solidez e Gestão Kinea',
    recommendedAssets: ['Tesouro Selic 2029', 'Tesouro IPCA+ 2035', 'CDB Itaú 100% CDI'],
    yieldEdge: 'Solidez máxima e integração com a maior gestora de FIIs do país.',
    goldenRule: 'Excelente para centralizar os títulos públicos do Tesouro Direto com liquidez D+0.',
  },
  '260': { // Nubank
    bankKey: 'Nubank',
    bestFor: 'Reserva de Emergência com Liquidez Imediata 24/7',
    recommendedAssets: ['Caixinha Reserva de Emergência 100% CDI', 'RDB Diário'],
    yieldEdge: 'Rendimento diário ininterrupto com resgate imediato até no fim de semana.',
    goldenRule: 'Mantenha sua reserva tática aqui para resgates urgentes em qualquer horário.',
  },
  '323': { // Mercado Pago
    bankKey: 'Mercado Pago',
    bestFor: 'Rendimento Automático Diário Turbinado (105% do CDI)',
    recommendedAssets: ['Conta Remunerada 105% CDI', 'CDB Promocional'],
    yieldEdge: 'Supera o rendimento padrão dos grandes bancos sem precisar aplicar em produto separado.',
    goldenRule: 'Deixe o dinheiro do dia a dia parado aqui para render 105% do CDI automaticamente.',
  },
  '290': { // PagBank / PagSeguro
    bankKey: 'PagBank',
    bestFor: 'CDBs Promocionais de Alta Taxa (110% a 130% do CDI)',
    recommendedAssets: ['CDB PagBank 110% CDI com Liquidez Diária', 'CDB Prazo Fechado 130%'],
    yieldEdge: 'Taxas agressivas com cobertura de até R$ 250.000 pelo FGC.',
    goldenRule: 'Aproveite os CDBs promocionais para turbinar o rendimento de médio prazo.',
  },
  '380': { // PicPay
    bankKey: 'PicPay',
    bestFor: 'Cofrinhos com Rentabilidade de 102% CDI Diária',
    recommendedAssets: ['Cofrinho 102% CDI com Resgate Imediato'],
    yieldEdge: 'Rende mais que a poupança e mais que o CDI padrão de 100%.',
    goldenRule: 'Separe metas específicas em cofrinhos individuais (ex: IPVA, Viagem).',
  },
  '033': { // Santander
    bankKey: 'Santander',
    bestFor: 'Crédito Estruturado e Títulos Privados',
    recommendedAssets: ['CDB Santander', 'Debêntures Incentivadas'],
    yieldEdge: 'Acesso a grandes emissões corporativas de infraestrutura.',
    goldenRule: 'Utilize para diversificar entre bancões tradicionais.',
  },
};

export const BankStrategyAdvisorSection: React.FC<BankStrategyAdvisorSectionProps> = ({
  bankAccounts,
  onSelectBankForMovement,
  onOpenAddModal,
  onOpenConsentForBank,
  onQuickUpdateBalance,
  isPrivateMode,
}) => {
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState<string>('');

  const formatBrl = (val: number) => {
    if (isPrivateMode) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleStartEdit = (account: BankAccount) => {
    setEditingAccountId(account.id);
    setEditBalanceValue(account.balance.toString());
  };

  const handleSaveEdit = (accountId: string) => {
    const num = parseFloat(editBalanceValue);
    if (!isNaN(num) && num >= 0) {
      onQuickUpdateBalance(accountId, num);
    }
    setEditingAccountId(null);
  };

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-[#101012] rounded-2xl border border-slate-800 p-5 sm:p-7 shadow-xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ecossistema dos Seus Bancos • Titular Raiky Carlos Da Silva</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-cyan-400 font-semibold">Open Finance Brasil</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Suas Contas Bancárias (Inter, Itaú, Nubank, Mercado Pago, PagSeguro, Santander e PicPay)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Peça autorização do seu banco para puxar os dados e saldos reais sozinho. Utilize qualquer conta para fazer transferências Pix e investir direto nos ativos sugeridos.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="self-start px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Vincular Outro Banco</span>
        </button>
      </div>

      {/* Grid of the user's specific banks with strategies and direct actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map((account) => {
          const guide = STRATEGY_GUIDES[account.bankCode];
          const isConnected = account.connected && account.balance > 0;

          return (
            <div
              key={account.id}
              className={`bg-slate-950/70 border rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all group ${
                isConnected 
                  ? 'border-slate-800 hover:border-emerald-500/50' 
                  : 'border-slate-800/90 hover:border-cyan-500/50 bg-[#101012]'
              }`}
            >
              <div>
                {/* Header: Bank Logo + Name + Balance */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-md shrink-0"
                      style={{ backgroundColor: `${account.brandColor}25`, border: `1px solid ${account.brandColor}60` }}
                    >
                      {account.logo}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{account.bankName}</h4>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Ag. {account.agency} • Conta {account.accountNumber}-{account.accountDigit}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Titular: {account.nomeTitular}
                      </span>
                    </div>
                  </div>

                  {/* Status & Balance */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Saldo Real</span>
                    {editingAccountId === account.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          step="any"
                          value={editBalanceValue}
                          onChange={(e) => setEditBalanceValue(e.target.value)}
                          className="w-20 bg-slate-900 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(account.id)}
                          className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`text-sm font-extrabold font-mono ${isConnected ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {formatBrl(account.balance)}
                        </span>
                        <button
                          onClick={() => handleStartEdit(account)}
                          className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors cursor-pointer"
                          title="Ajustar saldo real da conta"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection Status Badge */}
                <div className="mb-2">
                  {account.connected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Autorizado & Vinculado via Open Finance
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="w-3 h-3" />
                      Aguardando Solicitação de Autorização
                    </span>
                  )}
                </div>

                {/* Strategy Box */}
                {guide && (
                  <div className="space-y-2 text-xs py-2 border-y border-slate-900 my-2">
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Melhor Função para Seus Investimentos:
                      </span>
                      <p className="text-xs font-semibold text-slate-200 mt-0.5">
                        {guide.bestFor}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <p><strong className="text-slate-300">Dica Prática:</strong> {guide.goldenRule}</p>
                      <p><strong className="text-cyan-400">Vantagem de Rendimento:</strong> {guide.yieldEdge}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenConsentForBank(account.bankCode)}
                    className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Pedir Autorização</span>
                  </button>

                  <button
                    onClick={() => onSelectBankForMovement(account)}
                    className="py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Movimentar (Pix)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Advisory: Quais bancos mais criar se precisar para investimentos? */}
      <div className="bg-gradient-to-r from-violet-950/30 via-slate-950 to-cyan-950/30 border border-violet-500/30 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Quais outros bancos vale a pena abrir se precisar para investimentos?
            </h3>
            <p className="text-xs text-slate-400">
              Avaliação de especialistas para complementar seus 7 bancos (Inter, Itaú, Nubank, Mercado Pago, PagBank, Santander, PicPay)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Recommendation 1: BTG Pactual */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white text-sm flex items-center gap-2">
                🏛️ BTG Pactual (Banco 208)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Mais Recomendado
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Maior banco de investimentos da América Latina. Oferece a maior prateleira de CDBs de bancos médios do país (120% a 130% do CDI cobertos pelo FGC), além de relatórios profissionais de análise para FIIs e Ações B3.
            </p>
            <span className="text-[11px] text-emerald-400 font-semibold block">
              Ideal para: Renda Fixa de alta taxa (CDBs 124%+) e Fundos Imobiliários.
            </span>
          </div>

          {/* Recommendation 2: XP Investimentos */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white text-sm flex items-center gap-2">
                ⚫ XP Investimentos (Banco 102)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                Plataforma Global
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Maior ecossistema de investimentos do Brasil. Permite investir diretamente em Fundos Exclusivos, Ofertas Públicas da B3 (IPOs e emissões de FIIs com desconto) e Conta Internacional em Dólar nos EUA.
            </p>
            <span className="text-[11px] text-cyan-400 font-semibold block">
              Ideal para: Ofertas primárias de FIIs, Fundos Multimercado e Dolarização.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
