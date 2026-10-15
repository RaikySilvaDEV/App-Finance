/** App aliases preserve the original Pluggy fields alongside normalized values. */
export function finiteValue(value: unknown): number | null {
  if (value == null || value === '' || (typeof value !== 'number' && typeof value !== 'string')) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function calendarDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const stamp = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(stamp.getTime()) || stamp.toISOString().slice(0, 10) !== day ? null : day;
}
export function normalizeLoan(loan: any) {
  const interestRateTerms = (Array.isArray(loan.interestRates) ? loan.interestRates : []).map((rate: any) => ({
    preFixedPercent: finiteValue(rate.preFixedRate) == null ? null : Number(rate.preFixedRate) * 100,
    postFixedPercent: finiteValue(rate.postFixedRate) == null ? null : Number(rate.postFixedRate) * 100,
    periodicity: rate.taxPeriodicity || null,
    indexer: rate.referentialRateIndexerType || null,
    indexerSubtype: rate.referentialRateIndexerSubType || null,
    taxType: rate.taxType || null,
  }));
  const single = interestRateTerms.length === 1 ? interestRateTerms[0] : null;
  // Composite and multiple rates must not be collapsed into an invented single rate.
  const simplePre = single && (single.postFixedPercent == null || single.postFixedPercent === 0);
  const simplePost = single && (single.preFixedPercent == null || single.preFixedPercent === 0);
  const interestRate = simplePre ? single.preFixedPercent ?? single.postFixedPercent : simplePost ? single.postFixedPercent : null;
  return { ...loan,
    outstandingBalance: finiteValue(loan.payments?.contractOutstandingBalance) ?? finiteValue(loan.outstandingBalance),
    interestRate, interestRateTerms,
    interestRateBasis: interestRate == null ? null : simplePre && single.preFixedPercent != null ? 'PERCENT' : 'PERCENT_OF_INDEXER',
    interestRatePeriodicity: single?.periodicity || null,
    // Neither the contract end nor the first installment is the next installment.
    nextDueDate: calendarDate(loan.nextDueDate),
    pastDueInstallments: finiteValue(loan.installments?.pastDueInstallments),
  };
}
export function loanRateLabel(raw: any): string {
  const loan = normalizeLoan(raw);
  if (!loan.interestRateTerms.length) return 'Não informada';
  const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
  return loan.interestRateTerms.map((term: any) => {
    const parts: string[] = [];
    if (term.postFixedPercent != null) parts.push(`${number(term.postFixedPercent)}% de ${term.indexerSubtype || term.indexer || 'indexador não informado'}`);
    if (term.preFixedPercent != null) parts.push(`${number(term.preFixedPercent)}%`);
    const period = term.periodicity === 'MONTHLY' ? 'ao mês' : term.periodicity === 'YEARLY' ? 'ao ano' : 'periodicidade não informada';
    return parts.length ? `${parts.join(' + ')} · ${period}` : 'Taxa não informada';
  }).join('; ');
}
export function normalizeInvestment(asset: any) {
  const type = String(asset.type || '').toUpperCase(), subtype = String(asset.subtype || '').toUpperCase();
  const text = String(asset.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const fixed = type === 'FIXED_INCOME';
  const treasurySelic = fixed && subtype === 'TREASURY' && /\bselic\b|\blft\b/.test(text);
  const eligibleFgc = fixed && ['CDB', 'RDB', 'LCI', 'LCA', 'LC', 'LCD', 'LH'].includes(subtype);
  // Product eligibility is not confirmation of an issuer's membership or remaining guarantee limit.
  const conservativeCandidate = (asset.currencyCode || 'BRL') === 'BRL' && (treasurySelic || eligibleFgc);
  const indexedRate = finiteValue(asset.rate), annual = finiteValue(asset.fixedAnnualRate);
  return { ...asset, type, subtype,
    balance_amount: finiteValue(asset.balance) ?? finiteValue(asset.balance_amount),
    yield_rate: indexedRate ?? annual,
    yield_rate_basis: indexedRate != null ? (asset.rateType ? `PERCENT_OF_${asset.rateType}` : 'UNSPECIFIED') : annual != null ? 'ANNUAL_PERCENT' : null,
    yield_fixed_annual_rate: annual,
    conservativeCandidate,
    protection: treasurySelic ? 'treasury' : eligibleFgc ? 'fgc_eligible' : 'unverified',
    protectionConfirmed: false,
  };
}
export function investmentRateLabel(raw: any) {
  const asset = normalizeInvestment(raw), pieces: string[] = [];
  const percent = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  const indexed = finiteValue(asset.rate), annual = asset.yield_fixed_annual_rate;
  if (indexed != null) pieces.push(`${percent(indexed)}%${asset.rateType ? ` de ${asset.rateType}` : ' (base não informada)'}`);
  if (annual != null) pieces.push(`${percent(annual)}% ao ano`);
  return pieces.join(' + ') || 'Não informada';
}
