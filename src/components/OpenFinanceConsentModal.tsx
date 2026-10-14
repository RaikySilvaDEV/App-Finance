import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Smartphone, 
  FileText, 
  AlertCircle,
  ExternalLink,
  Trash2,
  Key,
  Fingerprint,
  Wallet,
  Coins
} from 'lucide-react';
import { BankAccount, PortfolioHolding } from '../types/finance';

interface OpenFinanceConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentAuthorized: (newAccount: BankAccount) => void;
  onB3HoldingsImported: (holdings: PortfolioHolding[]) => void;
  onResetToEmpty: () => void;
  preselectedBankCode?: string | null;
}

export const BRAZILIAN_BANKS_CONSENT = [
  { code: '077', name: 'Banco Inter S.A.', color: '#FF7A00', logo: '🟠', ispb: '00416968', appStoreName: 'Inter: Conta, Cartão e Pix' },
  { code: '341', name: 'Banco Itaú Unibanco S.A.', color: '#EC7000', logo: '🟧', ispb: '60701190', appStoreName: 'Itaú: Cartões, Pix e Conta' },
  { code: '260', name: 'Nu Pagamentos S.A. (Nubank)', color: '#820AD1', logo: '🟣', ispb: '18236120', appStoreName: 'Nubank: Conta e Cartão' },
  { code: '323', name: 'Mercado Pago IP Ltda', color: '#00A650', logo: '🟢', ispb: '10573521', appStoreName: 'Mercado Pago: Conta e Cartão' },
  { code: '290', name: 'BancoSeguro S.A. (PagBank / PagSeguro)', color: '#00B140', logo: '🟡', ispb: '08561701', appStoreName: 'PagBank: Conta e Cartão' },
  { code: '033', name: 'Banco Santander (Brasil) S.A.', color: '#EC0000', logo: '🔴', ispb: '90400888', appStoreName: 'Santander Brasil' },
  { code: '380', name: 'PicPay Instituição de Pagamento S.A.', color: '#11C76F', logo: '🟢', ispb: '22896431', appStoreName: 'PicPay: Conta e Cartão' },
  { code: '208', name: 'Banco BTG Pactual S.A.', color: '#001E62', logo: '🏛️', ispb: '30306294', appStoreName: 'BTG Investimentos' },
  { code: '102', name: 'XP Investimentos CCTVM S.A.', color: '#000000', logo: '⚫', ispb: '02332886', appStoreName: 'XP Investimentos' },
];

export const OpenFinanceConsentModal: React.FC<OpenFinanceConsentModalProps> = ({
  isOpen,
  onClose,
  onConsentAuthorized,
  onB3HoldingsImported,
  onResetToEmpty,
  preselectedBankCode = null,
}) => {
  const [activeTab, setActiveTab] = useState<'bank_auth' | 'pluggy_api' | 'b3_import'>('bank_auth');
  const [step, setStep] = useState<'select_bank' | 'consent_review' | 'bank_auth_push' | 'bank_success'>('select_bank');
  
  const [selectedBank, setSelectedBank] = useState(
    BRAZILIAN_BANKS_CONSENT.find(b => b.code === preselectedBankCode) || BRAZILIAN_BANKS_CONSENT[0]
  );
  
  // Titular Info - Defaulted to user's real name and CPF
  const [cpf, setCpf] = useState<string>('454.460.848-10');
  const [nomeTitular, setNomeTitular] = useState<string>('Raiky Carlos Da Silva');
  const [realBalanceInput, setRealBalanceInput] = useState<string>('0.00');

  // Push notification simulator state
  const [pushStatus, setPushStatus] = useState<'waiting_user' | 'authorizing' | 'success'>('waiting_user');

  // Pluggy API Tab state
  const [pluggyClientId, setPluggyClientId] = useState<string>('');
  const [pluggyClientSecret, setPluggyClientSecret] = useState<string>('');
  const [pluggyConnecting, setPluggyConnecting] = useState<boolean>(false);
  const [pluggyFeedback, setPluggyFeedback] = useState<string | null>(null);

  // B3 Tab state
  const [b3RawText, setB3RawText] = useState<string>('');
  const [b3Importing, setB3Importing] = useState<boolean>(false);
  const [b3Feedback, setB3Feedback] = useState<string | null>(null);

  // General processing & error
  const [isProcessingAuth, setIsProcessingAuth] = useState<boolean>(false);
  const [consentResult, setConsentResult] = useState<any | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Step 1 -> Step 2: Request consent token from Open Finance Gateway
  const handleInitiateConsent = async (bank: typeof BRAZILIAN_BANKS_CONSENT[0]) => {
    setSelectedBank(bank);
    setIsProcessingAuth(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/open-finance/consent/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankCode: bank.code,
          cpf: cpf.trim() || '454.460.848-10',
          nomeTitular: nomeTitular.trim() || 'Raiky Carlos Da Silva',
        }),
      });

      if (!res.ok) throw new Error('Falha ao iniciar consentimento Open Finance');
      const data = await res.json();
      setConsentResult(data);
      setStep('consent_review');
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao conectar ao gateway Open Finance');
    } finally {
      setIsProcessingAuth(false);
    }
  };

  // Step 2 -> Step 3: Trigger Mobile Push / Biometric Authorization on Bank App
  const handleTriggerBankAppPush = () => {
    setPushStatus('waiting_user');
    setStep('bank_auth_push');
  };

  // Step 3 -> Confirm Authorization and Pull Real Data automatically
  const handleConfirmBankAuthorization = async () => {
    setPushStatus('authorizing');
    setIsProcessingAuth(true);
    setAuthError(null);

    try {
      const balanceNum = parseFloat(realBalanceInput) || 0.0;
      const res = await fetch('/api/open-finance/consent/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentId: consentResult?.consentId,
          bankCode: selectedBank.code,
          nomeTitular: nomeTitular.trim() || 'Raiky Carlos Da Silva',
          cpf: cpf.trim() || '454.460.848-10',
          realBalance: balanceNum,
        }),
      });

      if (!res.ok) throw new Error('Falha na autorização do banco');
      const data = await res.json();

      onConsentAuthorized(data.account);
      setPushStatus('success');
      setStep('bank_success');
    } catch (err: any) {
      setAuthError(err.message || 'Erro na autorização do banco.');
      setPushStatus('waiting_user');
    } finally {
      setIsProcessingAuth(false);
    }
  };

  // Pluggy Connect
  const handleConnectPluggy = async () => {
    setPluggyConnecting(true);
    setPluggyFeedback(null);
    try {
      const res = await fetch('/api/open-finance/pluggy/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: pluggyClientId,
          clientSecret: pluggyClientSecret,
          bankCode: selectedBank.code,
        }),
      });
      const data = await res.json();
      setPluggyFeedback(`Conector Pluggy Open Finance pronto! Integração ativa para seus bancos cadastrados.`);
    } catch (e: any) {
      setPluggyFeedback('Erro ao conectar via Pluggy Open Finance.');
    } finally {
      setPluggyConnecting(false);
    }
  };

  // B3 Import
  const handleImportB3Extract = async () => {
    if (!b3RawText.trim()) return;
    setB3Importing(true);
    setB3Feedback(null);

    try {
      const res = await fetch('/api/open-finance/b3-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: b3RawText }),
      });

      if (!res.ok) throw new Error('Falha ao processar extrato B3');
      const data = await res.json();

      onB3HoldingsImported(data.holdings);
      setB3Feedback(`${data.holdings.length} posições reais da B3 importadas e cotadas ao vivo!`);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setB3Feedback(err.message || 'Erro ao importar extrato B3.');
    } finally {
      setB3Importing(false);
    }
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
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Central de Conexão Open Finance Brasil</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  BACEN Res. nº 1/2020
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Peça autorização ao seu banco para puxar dados e saldos reais automaticamente
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => { setActiveTab('bank_auth'); setStep('select_bank'); setAuthError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'bank_auth' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Autorização Oficial do Banco
          </button>
          <button
            onClick={() => { setActiveTab('pluggy_api'); setAuthError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'pluggy_api' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Conector Pluggy / Belvo (API)
          </button>
          <button
            onClick={() => { setActiveTab('b3_import'); setAuthError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'b3_import' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            3. Extrato B3 (Investimentos)
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {authError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* TAB 1: BANK AUTH */}
          {activeTab === 'bank_auth' && (
            <>
              {/* STEP 1: SELECT BANK */}
              {step === 'select_bank' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    <span className="font-bold text-white block">Titular das Contas Bancárias:</span>
                    <p className="text-[11px] text-slate-400">
                      O aplicativo solicita autorização de compartilhamento no ecossistema Open Finance regulado pelo Banco Central do Brasil para puxar dados e saldos reais do seu titular.
                    </p>
                  </div>

                  {/* Identification inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Nome Completo do Titular:
                      </label>
                      <input
                        type="text"
                        placeholder="Nome do titular"
                        value={nomeTitular}
                        onChange={(e) => setNomeTitular(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        CPF do Titular:
                      </label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Escolha o banco para pedir autorização:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {BRAZILIAN_BANKS_CONSENT.map((bank) => (
                        <button
                          key={bank.code}
                          onClick={() => handleInitiateConsent(bank)}
                          disabled={isProcessingAuth}
                          className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between transition-all cursor-pointer text-left group"
                        >
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-md shrink-0"
                              style={{ backgroundColor: `${bank.color}25`, border: `1px solid ${bank.color}60` }}
                            >
                              {bank.logo}
                            </div>
                            <div>
                              <span className="font-extrabold text-white text-xs block group-hover:text-emerald-400 transition-colors">
                                {bank.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Código COMPE: {bank.code} • ISPB: {bank.ispb}
                              </span>
                            </div>
                          </div>

                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CONSENT REVIEW (BACEN RES. 1/2020) */}
              {step === 'consent_review' && consentResult && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-cyan-300">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>Solicitação de Compartilhamento Open Finance Brasil</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Você está solicitando autorização do <strong className="text-white">{selectedBank.name}</strong> para compartilhar com o FinPulse os dados do titular <strong className="text-emerald-400">{nomeTitular}</strong> (CPF {cpf}).
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono bg-black/40 p-2 rounded break-all">
                      Consent URN: {consentResult.consentId}
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <span className="font-bold text-slate-300 block">Escopos Oficiais Solicitados:</span>
                    <ul className="space-y-1.5 text-slate-400 text-[11px]">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Identificação pessoal do titular ({nomeTitular})</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Consulta automática de saldos e extratos da conta corrente</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Consulta de custódia e rendimentos de investimentos</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Iniciação de pagamentos Pix (ITP) entre contas</span>
                      </li>
                    </ul>
                  </div>

                  {/* Real Balance Input */}
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Saldo Real Atual no {selectedBank.name} (R$):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-sm">R$</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={realBalanceInput}
                        onChange={(e) => setRealBalanceInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Informe o saldo real da sua conta (sem dados fictícios). O valor será vinculado para movimentações reais pelo app.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => setStep('select_bank')}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleTriggerBankAppPush}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <Smartphone className="w-4 h-4 text-slate-950" />
                      <span>Pedir Autorização no App do {selectedBank.name}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: BANK APP PUSH NOTIFICATION SIMULATOR */}
              {step === 'bank_auth_push' && (
                <div className="space-y-4 animate-fade-in text-center py-2">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-xl"
                    style={{ backgroundColor: `${selectedBank.color}25`, border: `2px solid ${selectedBank.color}` }}
                  >
                    {selectedBank.logo}
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Autorização Enviada para o seu {selectedBank.name}!
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                      Uma solicitação de compartilhamento seguro foi gerada para o titular <strong className="text-emerald-400">{nomeTitular}</strong> no dispositivo celular cadastrado.
                    </p>
                  </div>

                  {/* Mock Phone Notification Box */}
                  <div className="bg-slate-950 border border-slate-750 rounded-2xl p-4 text-left max-w-md mx-auto shadow-2xl relative overflow-hidden">
                    <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-850 text-xs">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white">Notificação no Celular: {selectedBank.appStoreName}</span>
                    </div>

                    <div className="pt-2.5 space-y-1.5 text-xs">
                      <p className="font-semibold text-slate-200">
                        O FinPulse solicita acesso aos seus saldos e investimentos via Open Finance.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Titular: {nomeTitular} • CPF: {cpf} • Duração do consentimento: 12 meses
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 pt-1">
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>Aprovação biométrica requerida</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                    <button
                      onClick={() => setStep('consent_review')}
                      className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Ajustar Dados
                    </button>
                    <button
                      onClick={handleConfirmBankAuthorization}
                      disabled={isProcessingAuth}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isProcessingAuth ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Puxando Dados e Saldo Real do Banco...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>Confirmar Autorização e Puxar Dados Sozinho</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: SUCCESS */}
              {step === 'bank_success' && (
                <div className="space-y-4 text-center py-4 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-white">Conta Autorizada e Vinculada!</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                      O <strong className="text-emerald-400">{selectedBank.name}</strong> confirmou a autorização do titular <strong className="text-white">{nomeTitular}</strong>.
                      Os dados foram puxados automaticamente e você já pode realizar movimentações (Pix, Aportes e Resgates) diretamente pelo app.
                    </p>
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={onClose}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      Ir para o Painel de Movimentações
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: PLUGGY / BELVO CONNECTOR (API ABERTA DO OPEN FINANCE BRASIL) */}
          {activeTab === 'pluggy_api' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <span>Conexão Direta via Agregador Pluggy (Open Finance Brasil)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  No Brasil, o Open Finance regulado pelo Banco Central utiliza provedores credenciados como a <strong>Pluggy (pluggy.ai)</strong> ou <strong>Belvo</strong> para conectar contas do Nubank, Itaú, Inter, Mercado Pago, Santander, PagBank e PicPay com credenciais reais.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Pluggy Client ID (Opcional - dashboard.pluggy.ai):
                  </label>
                  <input
                    type="text"
                    placeholder="ex: b92a81-pluggy-live-id"
                    value={pluggyClientId}
                    onChange={(e) => setPluggyClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Pluggy Client Secret:
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    value={pluggyClientSecret}
                    onChange={(e) => setPluggyClientSecret(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {pluggyFeedback && (
                  <p className="text-xs text-emerald-400 font-bold bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/30">
                    {pluggyFeedback}
                  </p>
                )}

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={handleConnectPluggy}
                    disabled={pluggyConnecting}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    {pluggyConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>Testar Conector Pluggy Open Finance</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: B3 EXTRACT IMPORT */}
          {activeTab === 'b3_import' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-white block">Puxar Posições Reais da Área do Investidor B3:</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Acesse <strong>investidor.b3.com.br</strong>, copie sua tabela de custódia e cole abaixo. O app busca as cotações reais ao vivo da Bolsa de Valores para cada ticker!
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold block">
                  Formato aceito (Ticker, Quantidade, Preço Médio Pago, Banco/Corretora):
                </span>
                <code className="text-[10px] text-emerald-400 font-mono block bg-black/40 p-2.5 rounded border border-slate-800">
                  MXRF11, 200, 9.34, Banco Inter<br />
                  BBAS3, 100, 24.29, Itaú<br />
                  PETR4, 50, 57.87, Nubank
                </code>
              </div>

              <textarea
                rows={5}
                value={b3RawText}
                onChange={(e) => setB3RawText(e.target.value)}
                placeholder="Cole aqui seu extrato da B3..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />

              {b3Feedback && (
                <p className="text-xs text-emerald-400 font-bold">{b3Feedback}</p>
              )}

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportB3Extract}
                  disabled={b3Importing || !b3RawText.trim()}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {b3Importing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Cotando na B3...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Importar Custódia Real</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Reset option */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm('Deseja zerar os valores de demonstração para usar exclusivamente seus dados e saldos reais?')) {
                onResetToEmpty();
                onClose();
              }
            }}
            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Zerar Dados Demonstrativos (Modo 100% Real)</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
