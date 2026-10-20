import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronRight, CreditCard, Landmark, ListFilter, Target } from 'lucide-react';
import type { ClassifiedTransaction, PlanningData } from '../lib/planning';
import { billOccurrences, brazilDay } from '../lib/planning';
import type { MainTab } from './Sidebar';

/** Read-only shortcuts and previews; all edits stay in their existing screens. */
export function HomeActivity({ data, transactions, privateMode, onNavigate, onCards }: {
  data: PlanningData; transactions: ClassifiedTransaction[]; privateMode: boolean;
  onNavigate: (tab: MainTab) => void; onCards: () => void;
}) {
  const today = brazilDay();
  const upcoming = billOccurrences(data.bills).filter((row) => !row.isPaid && row.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const recent = [...transactions].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);
  const money = (value: number, currency = 'BRL') => privateMode ? '••••' : value.toLocaleString('pt-BR', { style: 'currency', currency });
  return <>

    <div className="activity-grid">
      <section className="workspace-surface" aria-label="Atividade recente">
        <div className="surface-heading"><div><h2>Atividade recente</h2><p>Últimos lançamentos do seu histórico</p></div><button className="subtle-action" onClick={() => onNavigate('ledger')}>Ver extrato <ChevronRight aria-hidden="true"/></button></div>
        {recent.map((tx) => <button key={tx.id} className="activity-row" onClick={() => onNavigate('ledger')}><span className={`activity-icon ${tx.direction === 'credit' ? 'text-emerald-400' : 'text-slate-400'}`}>{tx.direction === 'credit' ? <ArrowDownLeft/> : <ArrowUpRight/>}</span><span className="activity-description"><strong>{privateMode ? 'Descrição oculta' : tx.description}</strong><small>{tx.sourceAccountName} · {tx.displayCategory}</small></span><span className={`activity-amount ${tx.direction === 'credit' ? 'text-emerald-400' : 'text-slate-200'}`}>{money(tx.amount, tx.currencyCode || 'BRL')}</span></button>)}
        {!recent.length && <p className="surface-empty">Seu histórico aparecerá aqui ao conectar um banco ou importar um extrato.</p>}
      </section>
      <section className="workspace-surface" aria-label="Próximos compromissos">
        <div className="surface-heading"><div><h2>Próximos compromissos</h2><p>Contas e parcelas cadastradas por você</p></div><CalendarDays className="h-4 w-4 shrink-0 text-rose-400"/></div>
        {upcoming.map((row) => <button key={row.occurrenceId} className="activity-row" onClick={() => onNavigate('planning')}><span className="due-date"><strong>{row.date.slice(8)}</strong><small>{row.date.slice(5, 7)}/{row.date.slice(0, 4)}</small></span><span className="activity-description"><strong>{privateMode ? 'Descrição oculta' : row.title}</strong><small>{row.installments > 1 ? `Parcela ${row.index + 1}/${row.installments}` : 'Conta cadastrada'}</small></span><span className="activity-amount text-slate-200">{money(row.amount)}</span></button>)}
        {!upcoming.length && <p className="surface-empty">Organize os próximos vencimentos no seu planejamento.</p>}
        <button className="surface-footer" onClick={() => onNavigate('planning')}>Abrir planejamento <ChevronRight aria-hidden="true"/></button>
      </section>
    </div>
  </>;
}

export function HomeShortcuts({ onNavigate, onCards }: { onNavigate: (tab: MainTab) => void; onCards: () => void }) {
  return (<nav aria-label="Atalhos financeiros" className="quick-actions">
      {([{ label: 'Minhas contas', Icon: Landmark, action: () => onNavigate('accounts') }, { label: 'Meus cartões', Icon: CreditCard, action: onCards }, { label: 'Ver extrato', Icon: ListFilter, action: () => onNavigate('ledger') }, { label: 'Planejar', Icon: Target, action: () => onNavigate('planning') }]).map(({ label, Icon, action }) => <button key={label} onClick={action}><span><Icon aria-hidden="true"/></span>{label}<ChevronRight aria-hidden="true" className="quick-chevron"/></button>)}
    </nav>);
}
