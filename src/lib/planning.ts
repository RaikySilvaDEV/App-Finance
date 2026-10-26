import type { FinancialTransaction } from '../types/finance';

export type MovementNature = 'expense' | 'income' | 'own_transfer' | 'transfer' | 'investment' | 'card_payment' | 'loan' | 'refund';
export const natureLabels: Record<MovementNature, string> = { expense: 'Consumo', income: 'Receita', own_transfer: 'Entre minhas contas', transfer: 'Transferência a revisar', investment: 'Aplicação ou resgate', card_payment: 'Pagamento de fatura', loan: 'Empréstimo ou parcela', refund: 'Estorno ou reembolso' };
export const expenseCategories = ['Alimentação', 'Mercado', 'Delivery', 'Transporte', 'Moradia e contas', 'Saúde', 'Educação', 'Serviços digitais', 'Lazer e viagens', 'Compras', 'Pets', 'Tarifas', 'Outros gastos'];
export type CategoryRule = { id: string; text: string; category: string; nature: MovementNature; bank: string };
export type MovementOverride = { category: string; nature: MovementNature };
export type Budget = { id: string; month: string; category: string; limit: number };
export type Bill = { id: string; title: string; bank: string; category: string; amount: number; dueDate: string; installments: number; paid: number[]; cardId?: string; recurrenceId?: string };
export type ManualCard = { id: string; name: string; bank: string; lastFour: string; closingDay: number; dueDay: number; creditLimit: number | null; availableLimit: number | null; active: boolean; updatedAt: string };
export type Goal = { id: string; name: string; target: number; saved: number; targetDate: string };
export type ManualLoan = { id: string; bank: string; title: string; outstanding: number; installment: number; remaining: number; nextDue: string; alsoConnected: boolean; updatedAt: string };
export type CardPaymentForecast = { accountId: string; cardName: string; amount: number | null; dueDay: number | null; kind: 'estimate' | 'confirmed' };
export type MonthlyCashPlan = { incomes: { day: number; amount: number }[]; fixedExpenses: { id: string; title: string; day: number; amount: number }[]; groceries: number; fuel: number; buffer: number; cardPayments?: CardPaymentForecast[] };
export type ConnectedCardSchedule = { accountId: string; closingDay: number; dueDay: number };
export type PriceAlertRule = { ticker: string; dropPct: number; enabled: boolean };
export type PlanningData = { budgets: Budget[]; bills: Bill[]; goals: Goal[]; manualLoans: ManualLoan[]; manualCards?: ManualCard[]; priceAlerts?: PriceAlertRule[]; cardSchedules?: ConnectedCardSchedule[]; monthlyCashPlan?: MonthlyCashPlan; cashPlanMonths?: Record<string, MonthlyCashPlan>; rules: CategoryRule[]; overrides: Record<string, MovementOverride>; recurrenceDecisions?: Record<string, 'ignored' | 'confirmed'> };
export const emptyPlanning = (): PlanningData => ({ budgets: [], bills: [], goals: [], manualLoans: [], rules: [], overrides: {} });
export const normalizedText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function brazilDay(value = new Date().toISOString()) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function installmentDate(date: string, offset: number) {
  const [year, month, day] = date.split('-').map(Number);
  const last = new Date(Date.UTC(year, month + offset, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + offset, Math.min(day, last), 12)).toISOString().slice(0, 10);
}
export function billOccurrences(bills: Bill[]) {
  return bills.flatMap((bill) => Array.from({ length: bill.installments }, (_, index) => ({ ...bill, occurrenceId: `${bill.id}:${index}`, index, date: installmentDate(bill.dueDate, index), isPaid: bill.paid.includes(index) }))).sort((a, b) => a.date.localeCompare(b.date));
}
export function inferredCategory(category = '', description = '') {
  const text = normalizedText(`${category} ${description}`);
  const aliases: [RegExp, string][] = [[/ifood|delivery/, 'Delivery'], [/supermerc|grocery|groceries|food.*store/, 'Mercado'], [/restaur|aliment|food|dining|lanch|padaria|cafe/, 'Alimentação'], [/transport|combust|posto|uber|taxi|pedagio|gas station/, 'Transporte'], [/moradia|housing|aluguel|condominio|energia|utility|internet|telefone/, 'Moradia e contas'], [/saude|health|farmacia|hospital|medic/, 'Saúde'], [/educa|education|escola|curso/, 'Educação'], [/assinatura|subscription|stream|netflix|spotify|digital services/, 'Serviços digitais'], [/lazer|entertain|cinema|viagem|hotel/, 'Lazer e viagens'], [/pet shop|veterinar|pet supplies/, 'Pets'], [/tarifa|fee|juros/, 'Tarifas'], [/compra|shopping|clothing|vestuario/, 'Compras']];
  return aliases.find(([pattern]) => pattern.test(text))?.[1] || (category && !/^(other|others|unknown|outros?)$/i.test(category) ? category : 'Outros gastos');
}
export function classifyTransactions(transactions: FinancialTransaction[], planning: PlanningData) {
  const transfers = new Map<string, { credit: string[]; debit: string[] }>();
  for (const tx of transactions) {
    if (tx.sourceAccountType === 'CREDIT' || tx.status !== 'concluido' || !/pix|transfer|\bted\b|\bdoc\b/.test(normalizedText(`${tx.category || ''} ${tx.description}`))) continue;
    const key = `${brazilDay(tx.timestamp)}:${tx.currencyCode || 'BRL'}:${Math.round(tx.amount * 100)}`;
    const group = transfers.get(key) || { credit: [], debit: [] };
    if (tx.direction) group[tx.direction].push(tx.id);
    transfers.set(key, group);
  }
  const own = new Set<string>();
  const byId = new Map(transactions.map((tx) => [tx.id, tx]));
  for (const group of transfers.values()) if (group.credit.length === 1 && group.debit.length === 1 && byId.get(group.credit[0])?.sourceAccountId !== byId.get(group.debit[0])?.sourceAccountId) { own.add(group.credit[0]); own.add(group.debit[0]); }
  return transactions.map((tx) => {
    const override = planning.overrides[tx.id];
    const rule = planning.rules.find((rule) => (!rule.bank || normalizedText(rule.bank) === normalizedText(tx.sourceAccountName)) && normalizedText(tx.description).includes(normalizedText(rule.text)));
    const text = normalizedText(`${tx.category || ''} ${tx.description}`);
    let nature: MovementNature = tx.direction === 'credit' ? (tx.sourceAccountType === 'CREDIT' ? 'refund' : 'income') : 'expense';
    if (/pag.*fatura|fatura.*pag|credit card payment|card bill payment|pagamento cartao/.test(text)) nature = 'card_payment';
    else if (/resgat|res\s*aplic|aplic\s*aut|aplic.*invest|invest.*aplic|investment|\bcdb\b|\brdb\b/.test(text)) nature = 'investment';
    else if (/emprestim|loan|financiamento/.test(text)) nature = 'loan';
    else if (/estorn|reembolso|refund/.test(text)) nature = 'refund';
    else if (/pix|transfer|\bted\b|\bdoc\b/.test(text)) nature = own.has(tx.id) ? 'own_transfer' : 'transfer';
    const category = inferredCategory(tx.category, tx.description);
    return { ...tx, nature: override?.nature || rule?.nature || nature, displayCategory: override?.category || rule?.category || category, classificationSource: override ? 'manual' : rule ? 'rule' : 'automatic' };
  });
}
export type ClassifiedTransaction = ReturnType<typeof classifyTransactions>[number];
export const isConsumption = (tx: ClassifiedTransaction) => tx.nature === 'expense' && tx.direction === 'debit' && tx.status === 'concluido';

export function validateMonthlyCashPlan(value: unknown): MonthlyCashPlan {
  const cash = value as MonthlyCashPlan;
  const amount = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e12;
  const day = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 31;
  const text = (v: unknown, max = 160) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!cash || typeof cash !== 'object' || !Array.isArray(cash.incomes) || cash.incomes.length !== 2 || !cash.incomes.every(row => row && day(row.day) && amount(row.amount) && row.amount > 0) || cash.incomes[0].day >= cash.incomes[1].day || !Array.isArray(cash.fixedExpenses) || cash.fixedExpenses.length > 30 || new Set(cash.fixedExpenses.map(row => row?.id)).size !== cash.fixedExpenses.length || !cash.fixedExpenses.every(row => row && text(row.id, 80) && text(row.title) && day(row.day) && amount(row.amount)) || !amount(cash.groceries) || !amount(cash.fuel) || !amount(cash.buffer)) throw new Error('Confira as rendas, datas e despesas do plano.');
  const cards = cash.cardPayments || [];
  if (!Array.isArray(cards) || cards.length > 100 || new Set(cards.map(row => row?.accountId)).size !== cards.length || !cards.every(row => row && typeof row.accountId === 'string' && /^[0-9a-f-]{36}$/i.test(row.accountId) && text(row.cardName) && (row.amount === null || amount(row.amount)) && (row.dueDay === null || day(row.dueDay)) && (row.amount === null || row.amount === 0 || row.dueDay !== null) && ['estimate', 'confirmed'].includes(row.kind))) throw new Error('Confira os cartões. Informe o vencimento quando preencher um valor a pagar.');
  return { incomes: cash.incomes.map(({ day, amount }) => ({ day, amount })), fixedExpenses: cash.fixedExpenses.map(({ id, title, day, amount }) => ({ id, title: title.trim(), day, amount })), groceries: cash.groceries, fuel: cash.fuel, buffer: cash.buffer, cardPayments: cards.map(({ accountId, cardName, amount, dueDay, kind }) => ({ accountId, cardName: cardName.trim(), amount, dueDay, kind })) };
}

export function validatePlanning(value: unknown): PlanningData {
  if (value == null) return emptyPlanning();
  const data = value as PlanningData;
  const text = (v: unknown, max = 160) => typeof v === 'string' && v.length <= max;
  const amount = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e12;
  const date = (v: unknown, optional = false) => (optional && v === '') || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v);
  const identity = (row: any) => row && text(row.id, 80) && row.id.length > 0;
  for (const key of ['budgets', 'bills', 'goals', 'manualLoans', 'rules'] as const) if (!Array.isArray(data[key]) || data[key].length > 500 || new Set(data[key].map((row) => row.id)).size !== data[key].length) throw new Error('Lista de planejamento inválida.');
  if (!data.budgets.every((row) => identity(row) && /^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) && text(row.category) && amount(row.limit) && row.limit > 0)) throw new Error('Orçamento inválido.');
  if (!data.bills.every((row) => identity(row) && text(row.title) && text(row.bank) && text(row.category) && amount(row.amount) && row.amount > 0 && date(row.dueDate) && Number.isInteger(row.installments) && row.installments >= 1 && row.installments <= 360 && Array.isArray(row.paid) && row.paid.length <= 360 && row.paid.every((index) => Number.isInteger(index) && index >= 0 && index < row.installments))) throw new Error('Conta a pagar inválida.');
  if (!data.goals.every((row) => identity(row) && text(row.name) && amount(row.target) && row.target > 0 && amount(row.saved) && date(row.targetDate, true))) throw new Error('Meta inválida.');
  if (!data.manualLoans.every((row) => identity(row) && text(row.bank) && text(row.title) && amount(row.outstanding) && amount(row.installment) && Number.isInteger(row.remaining) && row.remaining >= 0 && row.remaining <= 1200 && date(row.nextDue, true) && typeof row.alsoConnected === 'boolean' && text(row.updatedAt, 40))) throw new Error('Empréstimo inválido.');
  if (!data.rules.every((row) => identity(row) && text(row.text, 100) && row.text.trim().length >= 3 && text(row.bank) && text(row.category) && row.category.trim().length > 0 && Object.hasOwn(natureLabels, row.nature))) throw new Error('Regra inválida.');
  if (!data.overrides || typeof data.overrides !== 'object' || Array.isArray(data.overrides) || Object.keys(data.overrides).length > 20000 || !Object.entries(data.overrides).every(([key, row]) => text(key, 100) && row && text(row.category) && row.category.trim().length > 0 && Object.hasOwn(natureLabels, row.nature))) throw new Error('Classificação inválida.');
  const decisions = data.recurrenceDecisions || {};
  if (typeof decisions !== 'object' || Array.isArray(decisions) || Object.keys(decisions).length > 1000 || !Object.entries(decisions).every(([key, value]) => text(key, 500) && ['ignored', 'confirmed'].includes(value))) throw new Error('Recorrência inválida.');
  const manualCards = data.manualCards || [];
  if (!Array.isArray(manualCards) || manualCards.length > 50 || new Set(manualCards.map((row) => row?.id)).size !== manualCards.length || !manualCards.every((row) => identity(row) && text(row.name) && row.name.trim() && text(row.bank) && row.bank.trim() && /^\d{0,4}$/.test(row.lastFour) && (row.lastFour.length === 0 || row.lastFour.length === 4) && Number.isInteger(row.closingDay) && row.closingDay >= 1 && row.closingDay <= 31 && Number.isInteger(row.dueDay) && row.dueDay >= 1 && row.dueDay <= 31 && (row.creditLimit === null || amount(row.creditLimit)) && (row.availableLimit === null || amount(row.availableLimit)) && (row.creditLimit === null || row.availableLimit === null || row.availableLimit <= row.creditLimit) && typeof row.active === 'boolean' && text(row.updatedAt, 40) && Number.isFinite(Date.parse(row.updatedAt)))) throw new Error('Cartão manual inválido.');
  if (!data.bills.every((bill) => (bill.cardId === undefined || manualCards.some((card) => card.id === bill.cardId)) && (bill.recurrenceId === undefined || text(bill.recurrenceId, 500)))) throw new Error('Vínculo da conta inválido.');
  if (!data.bills.every((bill) => !bill.cardId || (bill.installments <= 120 && bill.amount <= 1e9 && Math.abs(bill.amount * 100 - Math.round(bill.amount * 100)) < .0001))) throw new Error('Parcela de cartão inválida. Use até 120 parcelas e valores em centavos.');
  const priceAlerts = data.priceAlerts || [];
  if (!Array.isArray(priceAlerts) || priceAlerts.length > 1000 || new Set(priceAlerts.map(row => row?.ticker)).size !== priceAlerts.length || !priceAlerts.every(row => row && typeof row.ticker === 'string' && /^[A-Z0-9.^-]{1,15}$/.test(row.ticker) && typeof row.dropPct === 'number' && Number.isFinite(row.dropPct) && row.dropPct >= 0.1 && row.dropPct <= 99 && typeof row.enabled === 'boolean')) throw new Error('Alerta de cotação inválido. Use uma margem entre 0,1% e 99%.');
  const cardSchedules = data.cardSchedules || [];
  if (!Array.isArray(cardSchedules) || cardSchedules.length > 100 || new Set(cardSchedules.map(row => row?.accountId)).size !== cardSchedules.length || !cardSchedules.every(row => row && typeof row.accountId === 'string' && /^[0-9a-f-]{36}$/i.test(row.accountId) && Number.isInteger(row.closingDay) && row.closingDay >= 1 && row.closingDay <= 31 && Number.isInteger(row.dueDay) && row.dueDay >= 1 && row.dueDay <= 31)) throw new Error('Datas do cartão inválidas. Use dias entre 1 e 31.');
  const safeSchedules = cardSchedules.map(({ accountId, closingDay, dueDay }) => ({ accountId, closingDay, dueDay }));
  const safeCash = data.monthlyCashPlan === undefined ? undefined : validateMonthlyCashPlan(data.monthlyCashPlan);
  const monthPlans = data.cashPlanMonths || {};
  if (typeof monthPlans !== 'object' || Array.isArray(monthPlans) || Object.keys(monthPlans).length > 120 || !Object.keys(monthPlans).every(month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))) throw new Error('Meses do planejamento inválidos.');
  const safeMonthPlans = Object.fromEntries(Object.entries(monthPlans).map(([month, cash]) => [month, validateMonthlyCashPlan(cash)]));
  const safePriceAlerts = priceAlerts.map(({ ticker, dropPct, enabled }) => ({ ticker, dropPct, enabled }));
  const safeCards = manualCards.map(({ id, name, bank, lastFour, closingDay, dueDay, creditLimit, availableLimit, active, updatedAt }) => ({ id, name: name.trim(), bank: bank.trim(), lastFour, closingDay, dueDay, creditLimit, availableLimit, active, updatedAt }));
  return { budgets: data.budgets, bills: data.bills, goals: data.goals, manualLoans: data.manualLoans, manualCards: safeCards, priceAlerts: safePriceAlerts, cardSchedules: safeSchedules, cashPlanMonths: safeMonthPlans, ...(safeCash ? { monthlyCashPlan: safeCash } : {}), rules: data.rules, overrides: data.overrides, recurrenceDecisions: decisions };
}
