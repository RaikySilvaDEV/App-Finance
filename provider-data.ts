import { pluggyRequest } from './pluggy.js';

export async function readAccounts(ids: string[]) {
  if (!ids.length) return { accounts: [], creditCards: [], unavailableItems: [] };
  try {
    const accounts: any[] = [];
    const creditCards: any[] = [];
    const unavailableItems: string[] = [];
    for (const itemId of ids) {
      try {
      const [item, firstPage] = await Promise.all([
        pluggyRequest(`/items/${encodeURIComponent(itemId)}`),
        pluggyRequest(`/accounts?itemId=${encodeURIComponent(itemId)}&page=1&pageSize=100`),
      ]);
      const totalPages = Number(firstPage.totalPages) || 1;
      const pages = await Promise.all(Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
        pluggyRequest(`/accounts?itemId=${encodeURIComponent(itemId)}&page=${index + 2}&pageSize=100`)
      ));
      const connector = item.connector || {};
      for (const account of [ ...(firstPage.results || []), ...pages.flatMap((page: any) => page.results || []) ]) {
        if (account.type === 'CREDIT') {
          creditCards.push({ id: account.id, providerItemId: itemId, name: account.marketingName || account.name || 'Cartão', number: String(account.number || '').slice(-4), currencyCode: account.currencyCode || 'BRL', balance: account.balance, creditData: account.creditData || {}, institution: connector.name });
        }
        if (account.type !== 'BANK') continue;
        const rawNumber = String(account.number || '');
        const institutionName = String(account.marketingName || account.name || connector.name || item.connectorName || 'Instituição conectada');
        const normalizedInstitution = institutionName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const bankName = normalizedInstitution.includes('mercado pago') ? 'Mercado Pago'
          : normalizedInstitution.includes('santander') ? 'Santander'
          : normalizedInstitution.includes('nu pagamentos') || normalizedInstitution.includes('nubank') ? 'Nubank'
          : normalizedInstitution.includes('itau') ? 'Itaú'
          : /\bneon\b/.test(normalizedInstitution) ? 'Neon'
          : institutionName;
        accounts.push({
          id: account.id,
          providerItemId: itemId,
          bankName,
          currencyCode: account.currencyCode || 'BRL',
          bankData: account.bankData || {},
          bankCode: String(connector.id || ''),
          accountType: account.subtype === 'SAVINGS_ACCOUNT' ? 'poupanca' : 'corrente',
          agency: '',
          accountNumber: rawNumber ? `••••${rawNumber.slice(-4)}` : '',
          accountDigit: '',
          cpfTitular: '',
          nomeTitular: '',
          balance: Number(account.balance) || 0,
          availableForInvestment: Number(account.balance) || 0,
          lastSync: account.updatedAt || account.createdAt || new Date().toISOString(),
          connected: true,
          brandColor: '#0891b2',
          logo: '🏦',
        });
      }
      } catch { unavailableItems.push(itemId); }
    }
    return ({
      accounts,
      creditCards,
      unavailableItems,
      totalCheckingBalance: accounts.reduce((total, account) => total + account.balance, 0),
      totalAccounts: accounts.length,
      activeAccounts: accounts.length,
    });
  } catch (error) { throw error; }
}

export async function readTransactions(ids: string[]) {
  if (!ids.length) return { transactions: [], complete: true };
  try {
    const transactions: any[] = [];
    const unavailableItems: string[] = [];
    const truncatedItems: string[] = [];
    for (const itemId of ids) {
      try {
      const accountPage = await pluggyRequest(`/accounts?itemId=${encodeURIComponent(itemId)}&page=1&pageSize=100`);
      const moreAccounts = await Promise.all(Array.from({ length: Math.max(0, Number(accountPage.totalPages || 1) - 1) }, (_, index) => pluggyRequest(`/accounts?itemId=${encodeURIComponent(itemId)}&page=${index + 2}&pageSize=100`)));
      const itemAccounts = [...(accountPage.results || []), ...moreAccounts.flatMap((page: any) => page.results || [])];
      const bankLabel = String(itemAccounts.find((account: any) => account.type === 'BANK')?.marketingName || itemAccounts.find((account: any) => account.type === 'BANK')?.name || 'Conta conectada');
      const normalized = bankLabel.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const providerBankName = /nubank|nu pagamentos|nu financeira/.test(normalized) ? 'Nubank' : normalized.includes('itau') ? 'Itaú' : normalized.includes('santander') ? 'Santander' : normalized.includes('mercado pago') ? 'Mercado Pago' : normalized.includes('neon') ? 'Neon' : bankLabel;
      for (const account of itemAccounts) {
        let next: string | null = `/v2/transactions?accountId=${encodeURIComponent(account.id)}`;
        let pagesRead = 0;
        while (next && pagesRead < 100) {
          const page = await pluggyRequest(next);
          transactions.push(...(page.results || []).map((transaction: any) => ({
            ...transaction,
            providerAccountName: account.marketingName || account.name || 'Conta conectada',
            providerAccountType: account.type,
            providerBankName,
            providerItemId: itemId,
          })));
          if (page.next) {
            // Pluggy returns a query string (for example, ?accountId=…&after=…);
            // keep it on the v2 endpoint instead of requesting the API root.
            const nextUrl = new URL(String(page.next), 'https://api.pluggy.ai/v2/transactions');
            if (nextUrl.origin !== 'https://api.pluggy.ai' || nextUrl.pathname !== '/v2/transactions') {
              throw new Error('A Pluggy retornou um cursor de paginação inválido.');
            }
            next = `${nextUrl.pathname}${nextUrl.search}`;
          } else {
            next = null;
          }
          pagesRead += 1;
        }
        if (next) truncatedItems.push(itemId);
      }
      } catch { unavailableItems.push(itemId); }
    }
    return ({ transactions, unavailableItems, truncatedItems, complete: unavailableItems.length === 0 && truncatedItems.length === 0 });
  } catch (error) { throw error; }
}

export async function readInvestments(ids: string[]) {
  if (!ids.length) return { investments: [], complete: true };
  try {
    const investments: any[] = [];
    const unavailableItems: string[] = [];
    for (const itemId of ids) {
      try {
      const firstPage = await pluggyRequest(`/investments?itemId=${encodeURIComponent(itemId)}&page=1&pageSize=100`);
      const pages = await Promise.all(Array.from({ length: Math.max(0, (Number(firstPage.totalPages) || 1) - 1) }, (_, index) =>
        pluggyRequest(`/investments?itemId=${encodeURIComponent(itemId)}&page=${index + 2}&pageSize=100`)
      ));
      investments.push(...[...(firstPage.results || []), ...pages.flatMap((page: any) => page.results || [])].map((asset: any) => ({ ...asset, providerItemId: itemId })));
      } catch { unavailableItems.push(itemId); }
    }
    return ({ investments, unavailableItems, complete: unavailableItems.length === 0 });
  } catch (error) { throw error; }
}

export async function readLoans(ids: string[]) {
  if (!ids.length) return { loans: [], complete: false, unsupportedItems: [] };
  const loans: any[] = [];
  const unavailableItems: string[] = [];
  const unsupportedItems: string[] = [];
  for (const itemId of ids) {
    try {
      const item = await pluggyRequest(`/items/${itemId}`);
      if (Array.isArray(item.connector?.products) && !item.connector.products.includes('LOANS')) {
        unsupportedItems.push(itemId);
        unavailableItems.push(itemId);
        continue;
      }
      const collected: any[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const result = await pluggyRequest(`/loans?itemId=${itemId}&page=${page}&pageSize=100`);
        collected.push(...(result.results || []));
        totalPages = Number(result.totalPages) || 1;
        page += 1;
      } while (page <= totalPages && page <= 100);
      if (page <= totalPages) unavailableItems.push(itemId);
      loans.push(...collected.map((loan: any) => ({ ...loan, institution: item.connector?.name || 'Instituição conectada' })));
    } catch { unavailableItems.push(itemId); }
  }
  return ({ loans, complete: ids.length > 0 && unavailableItems.length === 0, unavailableItems, unsupportedItems });
}
