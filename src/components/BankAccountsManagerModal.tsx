import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Plus, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  DollarSign, 
  Lock, 
  RefreshCw,
  ExternalLink,
  Coins
} from 'lucide-react';
import { BankAccount } from '../types/finance';

interface BankAccountsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  onAccountLinked: (newAccount: BankAccount) => void;
  onAccountUnlinked: (accountId: string) => void;
  onOpenMovementModal: () => void;
}

const BRAZILIAN_BANKS = [
  { code: '077', name: 'Banco Inter S.A.', color: '#FF7A00', logo: '🟠' },
  { code: '341', name: 'Banco Itaú Unibanco S.A.', color: '#EC7000', logo: '🟧' },
  { code: '260', name: 'Nu Pagamentos S.A. (Nubank)', color: '#820AD1', logo: '🟣' },
  { code: '323', name: 'Mercado Pago IP Ltda', color: '#00A650', logo: '🟢' },
  { code: '290', name: 'BancoSeguro S.A. (PagBank / PagSeguro)', color: '#00B140', logo: '🟡' },
  { code: '033', name: 'Banco Santander (Brasil) S.A.', color: '#EC0000', logo: '🔴' },
  { code: '380', name: 'PicPay Instituição de Pagamento S.A.', color: '#11C76F', logo: '🟢' },
  { code: '208', name: 'Banco BTG Pactual S.A.', color: '#001E62', logo: '🏛️' },
  { code: '102', name: 'XP Investimentos CCTVM S.A.', color: '#000000', logo: '⚫' },
  { code: '001', name: 'Banco do Brasil S.A.', color: '#FFED00', logo: '🟡' },
  { code: '237', name: 'Banco Bradesco S.A.', color: '#CC092F', logo: '🔴' },
  { code: '104', name: 'Caixa Econômica Federal', color: '#0066B3', logo: '🔵' },
  { code: '336', name: 'Banco C6 S.A.', color: '#242424', logo: '🔘' },
];

export const BankAccountsManagerModal: React.FC<BankAccountsManagerModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  onAccountLinked,
  onAccountUnlinked,
  onOpenMovementModal,
}) => {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('260');
  const [accountType, setAccountType] = useState<'corrente' | 'investimento' | 'poupanca'>('corrente');
  const [agency, setAgency] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountDigit, setAccountDigit] = useState<string>('0');
  const [cpfTitular, setCpfTitular] = useState<string>('');
  const [nomeTitular, setNomeTitular] = useState<string>('');
  const [pixKey, setPixKey] = useState<string>('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'email' | 'celular' | 'aleatoria'>('cpf');
  const [initialBalance, setInitialBalance] = useState<string>('1500');

  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalChecking = bankAccounts.reduce((acc, b) => acc + (b.connected ? b.balance : 0), 0);

  const formatBrl = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSaveAccount = async () => {
    if (!agency.trim() || !accountNumber.trim()) {
      setFeedback('Informe agência e número da conta.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    const bankObj = BRAZILIAN_BANKS.find(b => b.code === selectedBankCode) || BRAZILIAN_BANKS[0];

    try {
      const res = await fetch('/api/open-finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: bankObj.name,
          bankCode: bankObj.code,
          accountType,
          agency: agency.trim(),
          accountNumber: accountNumber.trim(),
          accountDigit: accountDigit.trim(),
          cpfTitular: cpfTitular.trim() || '***.***.***-**',
          nomeTitular: nomeTitular.trim() || 'Titular',
          pixKey: pixKey.trim() || undefined,
          pixKeyType,
          initialBalance: parseFloat(initialBalance) || 0,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao vincular conta no backend');
      }

      const data = await res.json();
      onAccountLinked(data.account);
      setIsAdding(false);
      setAgency('');
      setAccountNumber('');
      setAccountDigit('0');
      setPixKey('');
    } catch (err: any) {
      setFeedback(err.message || 'Erro ao salvar conta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-3xl bg-[#101012] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Contas Bancárias Vinculadas</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Open Finance Brasil
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gerencie suas contas correntes e contas de investimentos para movimentações diretas
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
          {/* Summary Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#101012] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Saldo Total em Contas Correntes</span>
              <span className="text-2xl font-extrabold text-white font-mono block mt-0.5">
                {formatBrl(totalChecking)}
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {bankAccounts.length} contas prontas para transferências e aportes
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenMovementModal();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <span>Fazer Movimentação Pix</span>
              </button>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                {isAdding ? 'Fechar Formulário' : '+ Vincular Nova Conta'}
              </button>
            </div>
          </div>

          {/* ADD NEW ACCOUNT FORM */}
          {isAdding && (
            <div className="bg-slate-950/80 p-5 rounded-xl border border-emerald-500/30 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Vincular Nova Conta Bancária via Open Finance
                </h3>
              </div>

              {feedback && (
                <p className="text-xs text-rose-400 font-semibold">{feedback}</p>
              )}

              {/* Bank Select */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Instituição Financeira / Banco:
                </label>
                <select
                  value={selectedBankCode}
                  onChange={(e) => setSelectedBankCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {BRAZILIAN_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.code} — {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Type, Agency, Number */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tipo de Conta:
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="corrente">Conta Corrente</option>
                    <option value="investimento">Conta Investimento</option>
                    <option value="poupanca">Conta Poupança</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Agência (sem dígito):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0001 ou 0342"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Número da Conta:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 4829104"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Dígito Verificador:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2 ou X"
                    value={accountDigit}
                    onChange={(e) => setAccountDigit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Titular & Pix Key */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nome Completo do Titular:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Raiky Silva"
                    value={nomeTitular}
                    onChange={(e) => setNomeTitular(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    CPF do Titular:
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpfTitular}
                    onChange={(e) => setCpfTitular(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Saldo Atual em Conta (R$):
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ex: 1500.00"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Chave Pix Vinculada à Conta:
                </label>
                <div className="flex space-x-2">
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="cpf">CPF</option>
                    <option value="email">E-mail</option>
                    <option value="celular">Celular</option>
                    <option value="aleatoria">Aleatória</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Digite sua chave Pix..."
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAccount}
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Vinculando...' : 'Salvar e Vincular Conta'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ACCOUNTS LIST */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Contas Conectadas ({bankAccounts.length})
            </h3>

            <div className="space-y-2.5">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3.5">
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shadow-md shrink-0"
                      style={{ backgroundColor: `${account.brandColor}25`, border: `1px solid ${account.brandColor}60` }}
                    >
                      {account.logo}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-sm">{account.bankName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {account.accountType === 'corrente' ? 'Conta Corrente' : account.accountType === 'investimento' ? 'Conta Investimentos' : 'Poupança'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Agência: <strong className="text-white">{account.agency}</strong> • Conta: <strong className="text-white">{account.accountNumber}-{account.accountDigit}</strong>
                        {account.pixKey && ` • Pix: ${account.pixKey}`}
                      </p>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Titular: {account.nomeTitular} ({account.cpfTitular})
                      </span>
                    </div>
                  </div>

                  {/* Balance and Action */}
                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-medium block">Saldo em Conta</span>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">
                        {formatBrl(account.balance)}
                      </span>
                    </div>

                    <button
                      onClick={() => onAccountUnlinked(account.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Desvincular conta bancária"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
