import React, { useMemo, useState } from 'react';
import { 
  ArrowRightLeft, 
  TrendingUp, 
  ArrowDownLeft, 
  CheckCircle2, 
  FileText, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  Copy,
  X,
  Wallet,
  Landmark,
  Tags,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { BankAccount, FinancialTransaction } from '../types/finance';
import { BankLogo } from './BankLogo';

interface TransactionLedgerSectionProps {
  transactions: FinancialTransaction[];
  bankAccounts: BankAccount[];
  investments: Array<{ id: string; name?: string; balance?: number; currencyCode?: string }>;
  isPrivateMode: boolean;
}

const brazilDateKey = (timestamp: string) => {
  if (!timestamp) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const currentBrazilMonth = () => brazilDateKey(new Date().toISOString()).slice(0, 7);

export const TransactionLedgerSection: React.FC<TransactionLedgerSectionProps> = ({
  transactions,
  bankAccounts,
  investments,
  isPrivateMode,
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialTransaction | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [filterBank, setFilterBank] = useState('all');
  const [spendPeriod, setSpendPeriod] = useState<'month' | 'all' | 'custom'>('month');
  const [spendFrom, setSpendFrom] = useState('');
  const [spendTo, setSpendTo] = useState('');
  const [spendBank, setSpendBank] = useState('all');
  const [spendView, setSpendView] = useState<'banks' | 'categories'>('banks');
  const [cashMonth, setCashMonth] = useState(currentBrazilMonth);
  const [selectedDay, setSelectedDay] = useState(() => brazilDateKey(new Date().toISOString()));

  const formatBrl = (val: number) => {
    if (isPrivateMode) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const transactionBanks = Array.from(new Set(transactions.map((transaction) => transaction.sourceAccountName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const cashMonthTransactions = useMemo(() => transactions.filter((transaction) => transaction.type === 'account_transaction' && brazilDateKey(transaction.timestamp).slice(0, 7) === cashMonth), [transactions, cashMonth]);
  const cashFlowTransactions = cashMonthTransactions.filter((transaction) => filterBank === 'all' || transaction.sourceAccountName === filterBank);
  const filtered = cashFlowTransactions.filter((transaction) => {
    if (filterType !== 'all' && (transaction.type !== 'account_transaction' || transaction.direction !== filterType)) return false;
    if (filterBank !== 'all' && transaction.sourceAccountName !== filterBank) return false;
    return true;
  });
  const dailyTransactions = transactions.filter((transaction) => {
    const transactionDay = brazilDateKey(transaction.timestamp);
    return transactionDay === selectedDay && transaction.type === 'account_transaction';
  });
  const dailyTotals = dailyTransactions.reduce((totals, transaction) => {
    const currency = transaction.currencyCode || 'BRL';
    const amount = transaction.amount;
    const sum = totals.get(currency) || { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
    if (transaction.status !== 'concluido') return totals;
    if (transaction.direction === 'debit') { sum.expense += amount; sum.expenseCount += 1; }
    if (transaction.direction === 'credit') { sum.income += amount; sum.incomeCount += 1; }
    totals.set(currency, sum);
    return totals;
  }, new Map<string, { income: number; expense: number; incomeCount: number; expenseCount: number }>());
  const investmentTotals = investments.reduce((totals, investment) => {
    const currency = investment.currencyCode || 'BRL';
    totals.set(currency, (totals.get(currency) || 0) + (Number(investment.balance) || 0));
    return totals;
  }, new Map<string, number>());
  const monthlyTotals = cashFlowTransactions.reduce((totals, transaction) => {
    const currency = transaction.currencyCode || 'BRL';
    const sum = totals.get(currency) || { income: 0, expense: 0, pendingExpense: 0, incomeCount: 0, expenseCount: 0, pendingCount: 0 };
    if (transaction.status === 'processando' && transaction.direction === 'debit') { sum.pendingExpense += transaction.amount; sum.pendingCount += 1; }
    if (transaction.status === 'concluido' && transaction.direction === 'debit') { sum.expense += transaction.amount; sum.expenseCount += 1; }
    if (transaction.status === 'concluido' && transaction.direction === 'credit') { sum.income += transaction.amount; sum.incomeCount += 1; }
    totals.set(currency, sum);
    return totals;
  }, new Map<string, { income: number; expense: number; pendingExpense: number; incomeCount: number; expenseCount: number; pendingCount: number }>());
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, { total: number; currency: string; count: number }>();
    for (const transaction of cashFlowTransactions) {
      if (transaction.direction !== 'debit' || transaction.status !== 'concluido') continue;
      const category = getExpenseCategory(transaction.category, transaction.description);
      const currency = transaction.currencyCode || 'BRL';
      const key = `${category}::${currency}`;
      const current = totals.get(key) || { total: 0, currency, count: 0 };
      current.total += transaction.amount;
      current.count += 1;
      totals.set(key, current);
    }
    return Array.from(totals, ([key, value]) => ({ category: key.split('::')[0], ...value })).sort((a, b) => b.total - a.total);
  }, [cashFlowTransactions]);
  const pendingCategoryTotals = useMemo(() => {
    const totals = new Map<string, { total: number; currency: string; count: number }>();
    for (const transaction of cashFlowTransactions) {
      if (transaction.direction !== 'debit' || transaction.status !== 'processando') continue;
      const category = getExpenseCategory(transaction.category, transaction.description);
      const currency = transaction.currencyCode || 'BRL';
      const key = `${category}::${currency}`;
      const current = totals.get(key) || { total: 0, currency, count: 0 };
      current.total += transaction.amount;
      current.count += 1;
      totals.set(key, current);
    }
    return Array.from(totals, ([key, value]) => ({ category: key.split('::')[0], ...value })).sort((a, b) => b.total - a.total);
  }, [cashFlowTransactions]);

  const spend = useMemo(() => {
    const categories = new Map<string, { bank: string; count: number; total: number; currency: string }>();
    for (const tx of transactions) {
      if (tx.type !== 'account_transaction' || tx.direction !== 'debit' || tx.status !== 'concluido') continue;
      const date = new Date(tx.timestamp);
      if (!Number.isFinite(date.getTime())) continue;
      if (spendPeriod === 'month' && brazilDateKey(tx.timestamp).slice(0, 7) !== cashMonth) continue;
      if (spendPeriod === 'custom' && spendFrom && date < new Date(`${spendFrom}T00:00:00`)) continue;
      if (spendPeriod === 'custom' && spendTo && date > new Date(`${spendTo}T23:59:59.999`)) continue;
      const currency = tx.currencyCode || 'BRL';
      const bank = tx.sourceAccountName || 'Banco não identificado';
      const category = getExpenseCategory(tx.category, tx.description);
      const key = `${bank}::${category}::${currency}`;
      const current = categories.get(key) || { bank, count: 0, total: 0, currency };
      current.count += 1;
      current.total += tx.amount;
      categories.set(key, current);
    }
    return Array.from(categories, ([key, value]) => ({ category: key.split('::')[1], ...value }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, spendPeriod, spendFrom, spendTo, cashMonth]);

  const bankSpend = useMemo(() => {
    const totals = new Map<string, { total: number; currency: string; count: number }>();
    for (const row of spend) {
      const key = `${row.bank}::${row.currency}`;
      const current = totals.get(key) || { total: 0, currency: row.currency, count: 0 };
      current.total += row.total;
      current.count += row.count;
      totals.set(key, current);
    }
    return Array.from(totals, ([key, value]) => ({ bank: key.split('::')[0], ...value })).sort((a, b) => b.total - a.total);
  }, [spend]);
  const banks = Array.from(new Set(spend.map((row) => row.bank))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const visibleSpend = spendBank === 'all' ? spend : spend.filter((row) => row.bank === spendBank);
  const groupedMovements = Array.from(filtered.slice(0, visibleCount).reduce((groups, transaction) => {
    const day = brazilDateKey(transaction.timestamp) || 'Data não informada';
    const group = groups.get(day) || [];
    group.push(transaction);
    groups.set(day, group);
    return groups;
  }, new Map<string, FinancialTransaction[]>()).entries()).sort(([a], [b]) => b.localeCompare(a));
  const cashMonthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${cashMonth}-01T12:00:00Z`));
  const shiftCashMonth = (delta: number) => {
    const date = new Date(`${cashMonth}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setCashMonth(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  };
  const formatMovementDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? timestamp : new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    }).format(date);
  };

  function getExpenseCategory(providerCategory: string | undefined, description: string) {
    const raw = `${providerCategory || ''} ${description}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const aliases: Array<[RegExp, string]> = [
      [/resgat|res aplic|redemption/, 'Resgate de investimento'],
      [/aplic.*invest|invest.*aplic/, 'Aplicação de investimento'],
      [/supermerc|mercado|grocery|groceries|food.*store/, 'Mercado'],
      [/restaurante|aliment|food|dining|lanch|padaria|cafe|eating out/, 'Alimentação'],
      [/food delivery|delivery|ifood/, 'Delivery'],
      [/gas station|gasoline|transporte|transport|combust|posto|uber|taxi|ride.?hailing|estacionamento|pedagio/, 'Transporte'],
      [/moradia|housing|aluguel|condominio|energia|agua|gas|internet|telefone|utility|conta/, 'Moradia e contas'],
      [/saude|health|farmacia|hospital|medic/, 'Saúde'],
      [/educacao|education|escola|curso|livraria/, 'Educação'],
      [/digital services|assinatura|subscription|stream|netflix|spotify|software/, 'Serviços digitais'],
      [/lazer|entertain|cinema|viagem|hotel|turismo/, 'Lazer e viagens'],
      [/electronics|eletronic/, 'Eletrônicos'],
      [/office supplies|papelaria/, 'Material de escritório'],
      [/pet supplies|pet supplies and vet|veterinar|pet shop/, 'Pets'],
      [/compra|shopping|varejo|clothing|vestuario/, 'Compras'],
      [/transfer|pix/, 'Transferências'],
      [/invest|investment|aplicacao|aplicação/, 'Investimentos'],
    ];
    for (const [pattern, label] of aliases) if (pattern.test(raw)) return label;
    if (providerCategory?.trim() && !/^(other|others|unknown|miscellaneous|outros?)$/i.test(providerCategory.trim())) {
      return providerCategory.trim().replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('pt-BR'));
    }
    return 'Outros gastos';
  }

  const formatCurrency = (value: number, currency: string) => isPrivateMode
    ? `${currency} ••••••`
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'pix_transfer':
        return { label: 'Pix Entre Contas', icon: ArrowRightLeft, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'invest_aporte':
        return { label: 'Aporte em Ativo', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'invest_resgate':
        return { label: 'Resgate de Ativo', icon: ArrowDownLeft, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'account_transaction':
        return { label: 'Lançamento bancário', icon: ArrowRightLeft, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      default:
        return { label: 'Transferência', icon: ArrowRightLeft, color: 'text-slate-400 bg-slate-800' };
    }
  };

  const handleCopyReceipt = (tx: FinancialTransaction) => {
    const text = `
Lançamento bancário consultado pela Pluggy
Referência da transação: ${tx.id}
Data: ${tx.timestamp}
Valor: ${formatBrl(tx.amount)}
Origem: ${tx.sourceAccountName}
Destino: ${tx.destinationAccountName}
Descrição: ${tx.description}
    `.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-extrabold text-white">
                Extrato bancário
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Dados consultados via Pluggy
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Lançamentos retornados pelas instituições conectadas
            </p>
          </div>
        </div>

      </div>

      <section className="my-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40" aria-labelledby="cashflow-heading">
        <div className="flex flex-col gap-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3"><div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300"><CalendarDays className="h-4 w-4" /></div><div><h4 id="cashflow-heading" className="text-sm font-bold text-white">Fluxo de caixa</h4><p className="mt-1 text-[11px] text-slate-400">Entradas, saídas e pendências do mês</p></div></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="cashflow-account">Conta do fluxo de caixa</label>
            <select id="cashflow-account" value={filterBank} onChange={(event) => setFilterBank(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"><option value="all">Todas as contas</option>{transactionBanks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}</select>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950 px-1.5 py-1">
              <button type="button" onClick={() => shiftCashMonth(-1)} aria-label="Mês anterior" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
              <label className="relative flex items-center gap-2 px-1 text-xs font-semibold capitalize text-slate-200"><span>{cashMonthLabel}</span><input aria-label="Selecionar mês do fluxo" type="month" value={cashMonth} onChange={(event) => event.target.value && setCashMonth(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
              <button type="button" onClick={() => shiftCashMonth(1)} aria-label="Próximo mês" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        {monthlyTotals.size ? <div className="space-y-4 p-4 sm:p-5">
          <p className="text-[10px] text-slate-500">Totais por moeda, conforme os dados recebidos das instituições. Pendências não são somadas às entradas/saídas confirmadas.</p>
          {Array.from(monthlyTotals, ([currency, totals]) => <div key={currency} className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{currency}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3"><span className="text-[10px] text-slate-400">Entradas confirmadas</span><strong className="mt-1 block text-base font-bold text-emerald-300 tabular-nums">{formatCurrency(totals.income, currency)}</strong><span className="text-[10px] text-slate-500">{totals.incomeCount} créditos</span></div>
              <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-3"><span className="text-[10px] text-slate-400">Saídas confirmadas</span><strong className="mt-1 block text-base font-bold text-rose-300 tabular-nums">{formatCurrency(totals.expense, currency)}</strong><span className="text-[10px] text-slate-500">{totals.expenseCount} débitos</span></div>
              <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] p-3"><span className="text-[10px] text-slate-400">Diferença do período</span><strong className={`mt-1 block text-base font-bold tabular-nums ${totals.income - totals.expense < 0 ? 'text-rose-300' : 'text-cyan-200'}`}>{formatCurrency(totals.income - totals.expense, currency)}</strong><span className="text-[10px] text-slate-500">Entradas menos saídas</span></div>
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3"><span className="text-[10px] text-slate-400">Saídas pendentes</span><strong className="mt-1 block text-base font-bold text-amber-200 tabular-nums">{formatCurrency(totals.pendingExpense, currency)}</strong><span className="text-[10px] text-slate-500">{totals.pendingCount} lançamentos</span></div>
            </div>
          </div>)}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><h5 className="mb-3 text-xs font-semibold text-white">Despesas por categoria</h5>{categoryTotals.length ? <div className="space-y-3">{categoryTotals.map((row) => { const max = Math.max(...categoryTotals.filter((item) => item.currency === row.currency).map((item) => item.total), 1); return <div key={`${row.category}-${row.currency}`}><div className="mb-1 flex items-center justify-between gap-3 text-[10px]"><span className="truncate text-slate-300">{row.category} · {row.currency}</span><span className="shrink-0 font-semibold text-slate-200 tabular-nums">{formatCurrency(row.total, row.currency)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.max(3, row.total / max * 100)}%` }} /></div></div>})}</div> : <p className="text-[11px] text-slate-500">Sem despesas confirmadas neste mês.</p>}</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><h5 className="mb-3 text-xs font-semibold text-white">Despesas futuras</h5>{pendingCategoryTotals.length ? <div className="space-y-3">{pendingCategoryTotals.map((row) => { const max = Math.max(...pendingCategoryTotals.filter((item) => item.currency === row.currency).map((item) => item.total), 1); return <div key={`${row.category}-${row.currency}`}><div className="mb-1 flex items-center justify-between gap-3 text-[10px]"><span className="truncate text-slate-300">{row.category} · {row.currency}</span><span className="shrink-0 font-semibold text-slate-200 tabular-nums">{formatCurrency(row.total, row.currency)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.max(3, row.total / max * 100)}%` }} /></div></div>})}</div> : <p className="text-[11px] text-slate-500">Sem despesas pendentes neste mês.</p>}</div>
          </div>
        </div> : <p className="p-5 text-xs text-slate-500">Nenhuma movimentação para {cashMonthLabel} nesta conta.</p>}
      </section>

      <details className="my-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:p-5" aria-labelledby="daily-money-heading">
        <summary className="cursor-pointer text-sm font-medium text-slate-200">Ver meu dia</summary>
        <div className="mt-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h4 id="daily-money-heading" className="text-sm font-bold text-white">Resumo do dia</h4><p className="mt-1 text-[11px] text-slate-400">Saldo atual, dinheiro que entrou ou saiu e investimentos conectados</p></div>
          <label className="flex items-center gap-2 text-[11px] text-slate-400">Dia<input type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 [color-scheme:dark]" /></label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {bankAccounts.map((account) => <div key={account.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><span className="flex items-center gap-2 text-[10px] text-slate-400"><BankLogo name={account.bankName} className="h-6 w-6"/>Saldo atual · {account.bankName}</span><strong className="mt-2 block text-base font-bold text-white tabular-nums">{formatCurrency(account.balance, 'BRL')}</strong></div>)}
          {Array.from(dailyTotals, ([currency, values]) => <React.Fragment key={currency}>
            <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-3"><span className="text-[10px] text-slate-400">Saídas (gastos) · {currency}</span><strong className="mt-2 block text-base font-bold text-rose-300 tabular-nums">{formatCurrency(values.expense, currency)}</strong><span className="mt-1 block text-[10px] text-slate-500">{values.expenseCount} débitos registrados</span></div>
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3"><span className="text-[10px] text-slate-400">Créditos registrados · {currency}</span><strong className="mt-2 block text-base font-bold text-emerald-300 tabular-nums">{formatCurrency(values.income, currency)}</strong><span className="mt-1 block text-[10px] text-slate-500">{values.incomeCount} créditos · diferença após débitos {formatCurrency(values.income - values.expense, currency)}</span></div>
          </React.Fragment>)}
          {Array.from(investmentTotals, ([currency, total]) => <div key={`invest-${currency}`} className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-3"><span className="flex items-center gap-2 text-[10px] text-slate-400"><TrendingUp className="h-3.5 w-3.5 text-violet-300" />Investido · {currency}</span><strong className="mt-2 block text-base font-bold text-violet-200 tabular-nums">{formatCurrency(total, currency)}</strong><span className="mt-1 block text-[10px] text-slate-500">{investments.length} posições conectadas</span></div>)}
          {!dailyTransactions.some((transaction) => transaction.status === 'concluido') && !dailyTransactions.some((transaction) => transaction.status === 'processando') && <p className="rounded-xl border border-dashed border-slate-800 p-3 text-[11px] text-slate-500 sm:col-span-2">Nenhuma movimentação bancária retornada para este dia. Escolha outra data para consultar.</p>}
          {!bankAccounts.length && !investmentTotals.size && <p className="rounded-xl border border-dashed border-slate-800 p-3 text-[11px] text-slate-500">Conecte contas para acompanhar saldos e investimentos nesta visão.</p>}
        </div>
        {dailyTransactions.some((transaction) => transaction.status === 'concluido' && transaction.direction === 'debit') && <div className="mt-4 border-t border-slate-800 pt-4">
          <h5 className="mb-2 text-xs font-semibold text-white">O que saiu da conta neste dia</h5>
          <div className="space-y-2">
            {dailyTransactions.filter((transaction) => transaction.status === 'concluido' && transaction.direction === 'debit').map((transaction) => <div key={transaction.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2.5">
              <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{transaction.description || 'Débito bancário'}</p><p className="mt-1 truncate text-[10px] text-slate-500">{getExpenseCategory(transaction.category, transaction.description)} · {transaction.sourceAccountName}</p></div>
              <strong className="shrink-0 text-xs font-semibold text-rose-300 tabular-nums">−{formatCurrency(transaction.amount, transaction.currencyCode || 'BRL')}</strong>
            </div>)}
          </div>
        </div>}
        {dailyTransactions.some((transaction) => transaction.status === 'concluido' && transaction.direction === 'credit') && <div className="mt-4 border-t border-slate-800 pt-4">
          <h5 className="mb-1 text-xs font-semibold text-white">Créditos lançados neste dia</h5>
          <p className="mb-2 text-[10px] text-slate-500">Pode incluir resgates e transferências; crédito não significa renda ou lucro.</p>
          <div className="space-y-2">
            {dailyTransactions.filter((transaction) => transaction.status === 'concluido' && transaction.direction === 'credit').map((transaction) => <div key={transaction.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2.5">
              <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{transaction.description || 'Crédito bancário'}</p><p className="mt-1 truncate text-[10px] text-slate-500">{getExpenseCategory(transaction.category, transaction.description)} · {transaction.sourceAccountName}</p></div>
              <strong className="shrink-0 text-xs font-semibold text-emerald-300 tabular-nums">+{formatCurrency(transaction.amount, transaction.currencyCode || 'BRL')}</strong>
            </div>)}
          </div>
        </div>}
        {dailyTransactions.some((transaction) => transaction.status === 'processando') && <div className="mt-4 border-t border-amber-500/20 pt-4">
          <h5 className="mb-1 text-xs font-semibold text-amber-200">Aguardando confirmação do banco</h5>
          <p className="mb-2 text-[10px] text-slate-500">Esses lançamentos ainda não entram nos totais de entradas e saídas.</p>
          <div className="space-y-2">{dailyTransactions.filter((transaction) => transaction.status === 'processando').map((transaction) => <div key={transaction.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-amber-500/[0.03] px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{transaction.description || 'Movimentação pendente'}</p><p className="mt-1 truncate text-[10px] text-slate-500">{transaction.sourceAccountName}</p></div><strong className="shrink-0 text-xs text-amber-200 tabular-nums">{transaction.direction === 'debit' ? '−' : '+'}{formatCurrency(transaction.amount, transaction.currencyCode || 'BRL')}</strong></div>)}</div>
        </div>}
        </div>
      </details>

      <details className="my-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40" aria-labelledby="spend-heading"><summary className="cursor-pointer px-4 py-4 text-sm font-medium text-slate-200">Comparar gastos por banco</summary>
        <div className="flex flex-col gap-4 border-b border-slate-800 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-950/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300"><Wallet className="h-4 w-4" /></div>
            <div><h4 id="spend-heading" className="text-sm font-bold text-white">Análise de gastos</h4><p className="mt-0.5 text-[11px] text-slate-400">Compare seus bancos e veja para onde vai seu dinheiro</p></div>
          </div>
          <div className="flex flex-col gap-1 self-start sm:min-w-48 sm:self-auto">
            <label htmlFor="spend-period" className="text-[10px] font-medium text-slate-400">Período dos gastos</label>
            <select id="spend-period" value={spendPeriod} onChange={(event) => setSpendPeriod(event.target.value as 'month' | 'all' | 'custom')} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200">
              <option value="month">Mesmo mês do fluxo de caixa</option><option value="all">Histórico completo</option><option value="custom">Escolher intervalo…</option>
            </select>
          </div>
        </div>
        {spendPeriod === 'custom' && <div className="flex flex-col gap-2 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-end sm:px-5">
          <label className="flex flex-1 flex-col gap-1 text-[10px] font-medium text-slate-400">De<input type="date" value={spendFrom} max={spendTo || undefined} onChange={(event) => setSpendFrom(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 [color-scheme:dark]" /></label>
          <label className="flex flex-1 flex-col gap-1 text-[10px] font-medium text-slate-400">Até<input type="date" value={spendTo} min={spendFrom || undefined} onChange={(event) => setSpendTo(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 [color-scheme:dark]" /></label>
          <p className="pb-2 text-[10px] text-slate-500">Preencha uma ou as duas datas para filtrar.</p>
        </div>}
        {spend.length ? <>
          <div className="flex gap-2 border-b border-slate-800 px-4 pt-3 sm:px-5" role="tablist" aria-label="Visão dos gastos">
            {([{ id: 'banks', label: 'Resumo por banco', Icon: Landmark }, { id: 'categories', label: 'Gastos por categoria', Icon: Tags }] as const).map(({ id, label, Icon }) => <button key={id} role="tab" aria-selected={spendView === id} onClick={() => setSpendView(id)} className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${spendView === id ? 'border-cyan-400 text-cyan-200' : 'border-transparent text-slate-400 hover:text-white'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
          </div>
          <div className="p-4 sm:p-5">
            {spendView === 'banks' ? <><p className="mb-3 text-[11px] text-slate-400">Selecione um banco para ver em quais categorias você gastou.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {bankSpend.map((bank, index) => <button key={`${bank.bank}-${bank.currency}`} onClick={() => { setSpendBank(bank.bank); setSpendView('categories'); }} className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-500/40 hover:bg-slate-900 ${index === 0 ? 'border-cyan-500/30 bg-gradient-to-br from-cyan-950/50 to-slate-950' : 'border-slate-800 bg-slate-950/60'}`}>
                {index === 0 && <span className="absolute right-3 top-3 rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-cyan-200">Maior gasto</span>}
                <BankLogo name={bank.bank}/>
                <span className="mt-3 block truncate text-xs font-semibold text-slate-200">{bank.bank}</span>
                <strong className="mt-1 block text-xl font-bold tracking-tight text-white tabular-nums">{formatCurrency(bank.total, bank.currency)}</strong>
                <span className="mt-1 block text-[10px] text-slate-500">{bank.count} despesas · ver categorias <span className="text-cyan-300 transition-transform group-hover:translate-x-0.5">→</span></span>
              </button>)}
            </div></> : <>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-white">Para onde foi seu dinheiro</p><p className="mt-0.5 text-[10px] text-slate-500">{spendBank === 'all' ? 'Categorias detalhadas por banco' : `Categorias em ${spendBank}`}</p></div><select aria-label="Filtrar gastos por banco" value={spendBank} onChange={(event) => setSpendBank(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 sm:w-auto sm:min-w-48"><option value="all">Todos os bancos</option>{banks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}</select></div>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-slate-500"><tr>{spendBank === 'all' && <th className="px-4 py-3 font-semibold">Banco</th>}<th className="px-4 py-3 font-semibold">Tipo de gasto</th><th className="px-4 py-3 text-right font-semibold">Despesas</th><th className="px-4 py-3 text-right font-semibold">Total</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {visibleSpend.map((row) => <tr key={`${row.bank}-${row.category}-${row.currency}`} className="text-slate-200 transition-colors hover:bg-slate-900/60">{spendBank === 'all' && <td className="px-4 py-3 font-medium">{row.bank}</td>}<td className="px-4 py-3"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />{row.category}</span></td><td className="px-4 py-3 text-right text-slate-400">{row.count}</td><td className="px-4 py-3 text-right font-bold text-white tabular-nums">{formatCurrency(row.total, row.currency)}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>}
          </div>
        </> : <p className="rounded-xl border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">Nenhum débito encontrado para este período.</p>}
      </details>

      {/* Filter tabs */}
      <div className="flex flex-col gap-2 border-b border-slate-800/60 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] font-semibold text-slate-300">Movimentações de {cashMonthLabel}</div>
        <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-1 sm:w-auto">
          {([{ id: 'all', label: 'Tudo' }, { id: 'debit', label: 'Despesas' }, { id: 'credit', label: 'Entradas' }] as const).map((filter) => (
            <button key={filter.id} onClick={() => setFilterType(filter.id)} aria-pressed={filterType === filter.id} className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:flex-none ${filterType === filter.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-slate-800/60 mt-1">
        {groupedMovements.map(([day, dayTransactions]) => <React.Fragment key={day}>
          <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-900/95 px-2 py-2 backdrop-blur">
            <h5 className="text-[11px] font-semibold capitalize text-slate-300">{day === 'Data não informada' ? day : new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}</h5>
            <span className="text-[10px] text-slate-500">{dayTransactions.length} lançamentos</span>
          </div>
          {dayTransactions.map((tx) => {
          const badge = getTransactionBadge(tx.type);
          const Icon = badge.icon;
          return (
            <div
              key={tx.id}
              className="my-2 flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3 transition-all hover:border-slate-700 hover:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between sm:p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tx.direction === 'debit' ? 'border-rose-500/20 bg-rose-500/10 text-rose-300' : tx.direction === 'credit' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="max-w-full truncate text-xs font-bold text-white sm:max-w-[25rem]">{tx.description}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${badge.color}`}>
                      {tx.type === 'account_transaction' ? getExpenseCategory(tx.category, tx.description) : badge.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-slate-400">
                    <span className="text-slate-500">Banco</span> <strong className="inline-flex items-center gap-1.5 font-medium text-slate-300"><BankLogo name={tx.sourceAccountName} className="h-5 w-5"/>{tx.sourceAccountName}</strong>
                  </p>
                  <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px] text-slate-500">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="truncate">{formatMovementDate(tx.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Amount and Action */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-800/70 pt-2 sm:justify-end sm:border-0 sm:pt-0">
                <div className="text-left sm:text-right">
                  <span className={`block font-mono text-sm font-bold tabular-nums sm:text-base ${tx.direction === 'debit' ? 'text-rose-300' : tx.direction === 'credit' ? 'text-emerald-300' : 'text-white'}`}>
                    {tx.direction === 'debit' ? '−' : tx.direction === 'credit' ? '+' : ''}{formatBrl(tx.amount)}
                  </span>
                  <span className={`mt-0.5 flex items-center gap-1 text-[9px] font-semibold sm:justify-end ${tx.status === 'processando' ? 'text-amber-300' : tx.direction === 'debit' ? 'text-rose-400/80' : 'text-emerald-400/80'}`}>
                    <CheckCircle2 className="h-3 w-3" />{tx.status === 'processando' ? 'Pendente' : tx.direction === 'debit' ? 'Saída' : tx.direction === 'credit' ? 'Entrada' : 'Confirmado'}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedReceipt(tx)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-300 transition-colors hover:border-cyan-500/40 hover:bg-slate-800 hover:text-white"
                  title="Ver detalhes do lançamento"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Detalhes</span>
                </button>
              </div>
            </div>
          );
          })}
        </React.Fragment>)}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-xs">Nenhuma movimentação encontrada para este mês e filtro.</p>
            <p className="mt-2 text-xs text-slate-500">Use as setas acima para consultar outro mês ou altere a conta selecionada.</p>
          </div>
        )}
      </div>

      {/* Transaction details */}
      {filtered.length > visibleCount && <button onClick={() => setVisibleCount((count) => count + 20)} className="mt-4 w-full rounded-lg border border-slate-700 py-3 text-xs text-slate-300 hover:bg-slate-800">Mostrar mais movimentações</button>}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-sm">Detalhes do lançamento</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-2">
              <span className="text-xs text-slate-400 uppercase font-medium">Valor</span>
              <div className="text-3xl font-extrabold text-white font-mono mt-0.5">
                {formatBrl(selectedReceipt.amount)}
              </div>
              <span className="text-xs text-emerald-400 font-bold block mt-1">
                Registro retornado pela instituição financeira
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
                <span className="text-slate-400">Referência:</span>
                <span className="text-slate-300 text-[10px] break-all">{selectedReceipt.id}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Descrição:</span>
                <span className="text-slate-400 text-[10px] break-all">{selectedReceipt.description}</span>
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


