import React from 'react';
import { Activity, ArrowLeftRight, BarChart3, BookOpen, Building2, BriefcaseBusiness, LayoutDashboard, X, HandCoins, Link2 } from 'lucide-react';
export type MainTab = 'overview' | 'accounts' | 'assets' | 'ledger' | 'market' | 'portfolio' | 'loans' | 'connections';
interface Props { open: boolean; activeTab: MainTab; connectedAccounts: number; onSelectTab: (tab: MainTab) => void; onClose: () => void; onConnect: () => void; onAcademy: () => void; onAdvisor: () => void; }
const links: { id: MainTab; label: string; Icon: React.ComponentType<{className?: string}> }[] = [
  { id: 'overview', label: 'Visão geral', Icon: LayoutDashboard },
  { id: 'accounts', label: 'Contas e cartões', Icon: Building2 },
  { id: 'assets', label: 'Ativos', Icon: BriefcaseBusiness },
  { id: 'ledger', label: 'Fluxo de caixa', Icon: ArrowLeftRight },
  { id: 'loans', label: 'Empréstimos', Icon: HandCoins },
  { id: 'connections', label: 'Conexões', Icon: Link2 },
  { id: 'market', label: 'Mercado', Icon: BarChart3 },
  { id: 'portfolio', label: 'Posições manuais', Icon: BriefcaseBusiness },
];
export const Sidebar: React.FC<Props> = ({ open, activeTab, connectedAccounts, onSelectTab, onClose, onConnect, onAcademy, onAdvisor }) => {
  const chooseTab = (tab: MainTab) => { onSelectTab(tab); onClose(); };
  const content = <div className="flex h-full flex-col overflow-y-auto p-4">
    <div className="mb-5 flex items-center justify-between px-2"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Seu dinheiro</p></div><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden" onClick={onClose} aria-label="Fechar menu"><X className="h-5 w-5"/></button></div>
    <nav className="space-y-1" aria-label="Navegação principal">{links.map(({id,label,Icon}) => <button key={id} onClick={() => chooseTab(id)} aria-current={activeTab===id ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${activeTab===id ? 'bg-white/[0.055] font-semibold text-white' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}`}><Icon className="h-4 w-4"/>{label}</button>)}</nav>
    <div className="mt-6 border-t border-slate-800 pt-5"><p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Ferramentas</p>
      <button onClick={() => { onAcademy(); onClose(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-slate-400 hover:bg-slate-800 hover:text-white"><BookOpen className="h-4 w-4"/>Aprender</button>
      <button onClick={() => { onAdvisor(); onClose(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-slate-400 hover:bg-slate-800 hover:text-white"><Activity className="h-4 w-4"/>Diagnóstico com IA</button>
    </div>
    <div className="mt-auto border-t border-slate-800 px-2 pt-5 pb-2"><div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><span className="h-2 w-2 rounded-full bg-cyan-400"/>Conexões bancárias</div><p className="mt-2 text-xs leading-relaxed text-slate-400">{connectedAccounts} {connectedAccounts === 1 ? 'conexão ativa' : 'conexões ativas'}</p><button onClick={() => { onConnect(); onClose(); }} className="mt-3 w-full rounded-lg border border-slate-700 bg-white/[0.025] px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800">Adicionar conexão</button></div>
  </div>;
  return <>
    <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-48 shrink-0 border-r border-slate-800/80 bg-[#0c0c0f]/70 lg:block">{content}</aside>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-black/70" aria-label="Fechar menu" onClick={onClose}/><aside className="absolute inset-y-0 left-0 w-[min(84vw,320px)] border-r border-slate-700 bg-[#0c0c0f] shadow-2xl">{content}</aside></div>}
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-700/80 bg-[#0c0c0f]/95 px-1 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-0.5">{links.filter((link) => link.id !== 'portfolio' && link.id !== 'connections' && link.id !== 'market').map(({ id, label, Icon }) => <button key={id} onClick={() => chooseTab(id)} aria-current={activeTab === id ? 'page' : undefined} aria-label={label} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[10px] leading-tight transition-colors ${activeTab === id ? 'bg-cyan-400/10 font-semibold text-cyan-200' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}`}><Icon className="h-5 w-5 shrink-0"/><span className="max-w-full truncate">{{ overview: 'Início', accounts: 'Contas', assets: 'Ativos', ledger: 'Extrato', market: 'Mercado', portfolio: 'Carteira', loans: 'Dívidas', connections: 'Conexões' }[id]}</span></button>)}</div>
    </nav>
  </>;
};




