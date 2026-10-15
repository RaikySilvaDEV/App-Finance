import React, { useState } from 'react';
import { HandCoins, RefreshCw } from 'lucide-react';

export function LoansSection({ loans, complete, unsupported, isPrivateMode, onRefresh }: { loans: any[]; complete: boolean; unsupported: boolean; isPrivateMode: boolean; onRefresh: () => Promise<boolean | undefined> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const money = (value: unknown, currency = 'BRL') => isPrivateMode ? '••••' : value == null ? 'Não informado pelo banco' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency });
  async function refresh() {
    setLoading(true); setError('');
    try { if (!(await onRefresh())) setError('Não foi possível atualizar. Tente novamente.'); }
    catch { setError('Não foi possível atualizar. Tente novamente.'); }
    finally { setLoading(false); }
  }
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"><p className="text-sm text-slate-300">{unsupported && !loans.length ? 'Empréstimos não disponíveis pela conexão' : `${loans.length} empréstimos retornados pela conexão`}</p><button disabled={loading} onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>{loading ? 'Atualizando…' : 'Atualizar empréstimos'}</button></div>
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    {!complete && <p role="status" className="rounded-xl border border-amber-500/20 p-4 text-sm text-amber-200">{unsupported ? 'O conector usado por uma ou mais contas não fornece empréstimos. No MeuPluggy, esse produto não é disponibilizado. Suas dívidas nesses bancos ficam fora desta consulta e não podem ser contabilizadas automaticamente no diagnóstico.' : 'A consulta está incompleta ou indisponível em uma das conexões. Podem existir empréstimos que não apareceram aqui.'}</p>}
    {!loans.length && <div className="rounded-xl border border-dashed border-slate-700 px-5 py-10 text-center"><HandCoins className="mx-auto h-8 w-8 text-slate-500"/><h2 className="mt-4 text-base font-medium text-white">Nenhum empréstimo foi informado pela conexão</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">Se você possui um empréstimo no banco, ele ainda não foi fornecido pela Pluggy. Esse resultado não significa que sua dívida foi quitada ou que você não tem empréstimos.</p></div>}
    <div className="grid gap-4 sm:grid-cols-2">{loans.map((loan) => <article key={loan.id} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 p-5"><h2 className="text-sm font-semibold text-white">{loan.productName || 'Empréstimo'}</h2><p className="mt-3 text-xs text-slate-500">Saldo devedor informado</p><p className="mt-1 text-xl font-semibold text-white">{money(loan.payments?.contractOutstandingBalance, loan.currencyCode || 'BRL')}</p><details className="mt-4 text-xs text-slate-400"><summary className="cursor-pointer">Ver detalhes do contrato</summary><dl className="mt-3 space-y-3"><div><dt>Valor originalmente contratado</dt><dd className="mt-1 text-slate-200">{money(loan.contractAmount, loan.currencyCode || 'BRL')}</dd></div><div><dt>Parcelas a vencer</dt><dd className="mt-1 text-slate-200">{isPrivateMode ? '••' : loan.installments?.dueInstallments ?? 'Não informado'}</dd></div><div><dt>Parcelas em atraso</dt><dd className="mt-1 text-slate-200">{isPrivateMode ? '••' : loan.installments?.pastDueInstallments ?? 'Não informado'}</dd></div></dl></details></article>)}</div>
  </section>;
}
