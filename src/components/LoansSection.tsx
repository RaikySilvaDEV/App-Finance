import { SectionInfo } from './SectionInfo';
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { normalizeLoan, loanRateLabel } from '../lib/productMapping';
import { LoanContractDetails } from './LoanContractDetails';

export function LoansSection({ loans: sourceLoans, complete, unsupported, isPrivateMode, onRefresh }: { loans: any[]; complete: boolean; unsupported: boolean; isPrivateMode: boolean; onRefresh: () => Promise<boolean | undefined> }) {
  const loans = sourceLoans.map(normalizeLoan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const money = (value: unknown, currency = 'BRL') => isPrivateMode ? '••••' : value == null ? 'Não informado pelo banco' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency });
  async function refresh() {
    setLoading(true); setError('');
    try { if (!(await onRefresh())) setError('Não foi possível atualizar. Tente novamente.'); }
    catch { setError('Não foi possível atualizar. Tente novamente.'); }
    finally { setLoading(false); }
  }
  if (!loans.length) return <section className="space-y-3" aria-label="Disponibilidade de empréstimos conectados">
    <details className="rounded-xl border border-slate-800 px-4 py-3 text-xs text-slate-400">
      <summary className="cursor-pointer">{unsupported ? 'Empréstimos automáticos indisponíveis nesta conexão' : 'Nenhum contrato recebido pela conexão'} · entender</summary>
      <p className="mt-3 max-w-2xl leading-relaxed">{unsupported ? 'Uma ou mais conexões não fornecem dados de empréstimos. Você pode acompanhar o empréstimo cadastrado manualmente acima.' : !complete ? 'A consulta está incompleta ou indisponível. Podem existir contratos que não apareceram aqui.' : 'A conexão não retornou contratos. Se você possui um empréstimo, pode cadastrá-lo manualmente acima.'} A ausência de contratos não confirma que a dívida foi quitada. Os empréstimos manuais são considerados separadamente no diagnóstico.</p>
      <button disabled={loading} onClick={() => void refresh()} className="mt-3 inline-flex items-center gap-2 text-slate-300 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}/>{loading ? 'Consultando…' : 'Consultar novamente'}</button>
    </details>
    {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
  </section>;
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"><p className="text-sm text-slate-300">{unsupported && !loans.length ? 'Empréstimos não disponíveis pela conexão' : `${loans.length} empréstimos retornados pela conexão`}</p><button disabled={loading} onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>{loading ? 'Atualizando…' : 'Atualizar empréstimos'}</button></div>
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    {!complete && <div className="rounded-xl border border-amber-500/20 p-3"><p role="status" className="text-xs text-amber-200">Consulta parcial: podem existir contratos não exibidos.</p><SectionInfo title="Cobertura da conexão">{unsupported ? 'O conector usado por uma ou mais contas não fornece empréstimos. A documentação descreve os campos disponíveis nos conectores que suportam LOANS. Suas conexões MeuPluggy atuais não anunciam esse produto. Os contratos ausentes não entram automaticamente no diagnóstico. Os valores que você cadastrar manualmente são considerados separadamente pela IA.' : 'A consulta está incompleta ou indisponível em uma das conexões. Podem existir empréstimos que não apareceram aqui.'}</SectionInfo></div>}
    <div className="grid gap-4 sm:grid-cols-2">{loans.map((loan) => <article key={loan.id} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 p-5"><h2 className="text-sm font-semibold text-white">{loan.productName || 'Empréstimo'}</h2><p className="mt-3 text-xs text-slate-500">Saldo devedor informado</p><p className="mt-1 text-xl font-semibold text-white">{money(loan.outstandingBalance, loan.currencyCode || 'BRL')}</p><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-slate-500">Juros contratados</dt><dd className="mt-1 text-slate-200">{isPrivateMode ? '••••' : loanRateLabel(loan)}</dd></div><div><dt className="text-slate-500">Próximo vencimento informado</dt><dd className="mt-1 text-slate-200">{loan.nextDueDate ? loan.nextDueDate.split('-').reverse().join('/') : 'Não fornecido pela conexão'}</dd></div></dl>{(loan.pastDueInstallments || 0) > 0 && <p className="mt-3 text-xs text-amber-300">{isPrivateMode ? '••' : loan.pastDueInstallments} parcela(s) em atraso informada(s) pelo banco</p>}<details className="mt-4 text-xs text-slate-400"><summary className="cursor-pointer">Ver detalhes do contrato</summary><div className="mt-4"><LoanContractDetails loan={loan} privateMode={isPrivateMode}/></div></details></article>)}</div>
  </section>;
}
