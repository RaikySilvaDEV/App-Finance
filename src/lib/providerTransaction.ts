import type { BankAccount, FinancialTransaction } from '../types/finance';

/** Shared by browser imports and server background synchronization. */
export function providerTransaction(transaction: any, accounts: BankAccount[] = []): FinancialTransaction {
  const account = accounts.find((row) => row.id === transaction.accountId);
  const description = transaction.description || transaction.descriptionRaw || transaction.merchant?.name || 'Lançamento bancário';
  const kind = String(transaction.type || '').toUpperCase();
  const card = transaction.providerAccountType === 'CREDIT';
  return {
    id: String(transaction.id), type: 'account_transaction', amount: Math.abs(Number(transaction.amount) || 0),
    direction: kind === 'DEBIT' ? 'debit' : kind === 'CREDIT' ? 'credit' : (card ? Number(transaction.amount) >= 0 : Number(transaction.amount) < 0) ? 'debit' : 'credit',
    category: typeof transaction.category === 'string' ? transaction.category : transaction.operationType,
    currencyCode: transaction.currencyCode || 'BRL', sourceAccountId: String(transaction.accountId || ''),
    sourceAccountType: card ? 'CREDIT' : 'BANK', providerItemId: transaction.providerItemId || account?.providerItemId,
    sourceAccountName: account?.bankName || transaction.providerBankName || transaction.providerAccountName || 'Conta conectada',
    destinationAccountName: transaction.merchant?.name || description, timestamp: transaction.date || transaction.createdAt || '',
    status: String(transaction.status).toUpperCase() === 'POSTED' ? 'concluido' : 'processando', description,
    creditCardMetadata: transaction.creditCardMetadata || undefined,
  };
}
