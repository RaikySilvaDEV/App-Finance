import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PortfolioHolding } from '../types/finance';
import { BankLogo } from './BankLogo';
import { SectionInfo } from './SectionInfo';

interface PortfolioHoldingsTableProps {
  holdings: PortfolioHolding[];
  isPrivateMode: boolean;
  onSelectHoldingForRisk: (holding: PortfolioHolding) => void;
  onOpenAddModal: () => void;
  onRemoveHolding: (holdingId: string) => void;
}
const categories: Record<string, string> = { renda_fixa: 'Renda fixa', fiis: 'FIIs', acoes: 'Ações', global: 'Global', cripto: 'Cripto' };
export function PortfolioHoldingsTable({ holdings, isPrivateMode, onSelectHoldingForRisk, onOpenAddModal, onRemoveHolding }: PortfolioHoldingsTableProps) {
  const [category, setCategory] = useState('all');
  const [confirming, setConfirming] = useState('');
  const visible = holdings.filter((row) => category === 'all' || row.category === category);
  const money = (value: number) => isPrivateMode ? '••••' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-400">{holdings.length} posições manuais</p><button onClick={onOpenAddModal} className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5"/>Cadastrar posição</button></div><details className="rounded-xl border border-slate-800 px-4 py-3 text-xs text-slate-500"><summary className="cursor-pointer">Filtros{category !== 'all' ? ` · ${categories[category]}` : ''}</summary><select aria-label="Categoria das posições manuais" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-3 max-w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300"><option value="all">Todas as categorias</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></details>
    <div className="space-y-3">{visible.map((holding) => <article key={holding.id} className="rounded-xl border border-slate-800 p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><BankLogo name={holding.institutionName}/><div className="min-w-0"><h2 className="truncate text-sm font-medium text-white">{holding.ticker}</h2><p className="mt-1 truncate text-xs text-slate-500">{holding.institutionName} · {categories[holding.category] || holding.category}</p></div></div><p className="shrink-0 text-sm font-semibold text-white tabular-nums">{money(holding.currentValue)}</p></div><details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">Detalhes e ações</summary><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt>Quantidade cadastrada</dt><dd className="mt-1 text-slate-200">{isPrivateMode ? '••' : holding.quantity}</dd></div><div><dt>Preço médio cadastrado</dt><dd className="mt-1 text-slate-200">{money(holding.averagePrice)}</dd></div><div><dt>Último preço disponível</dt><dd className="mt-1 text-slate-200">{money(holding.currentPrice)}</dd></div><div><dt>Custo cadastrado</dt><dd className="mt-1 text-slate-200">{money(holding.totalInvested)}</dd></div></dl><p className="mt-4 text-[11px]">Valor calculado com o preço disponível e a quantidade cadastrada; não é saldo confirmado pela instituição.</p><div className="mt-4 flex flex-wrap gap-4"><button onClick={() => onSelectHoldingForRisk(holding)} className="text-rose-300">Análise do ativo</button>{confirming === holding.id ? <><button onClick={() => { onRemoveHolding(holding.id); setConfirming(''); }} className="text-rose-300">Confirmar exclusão</button><button onClick={() => setConfirming('')}>Cancelar</button></> : <button onClick={() => setConfirming(holding.id)} className="inline-flex items-center gap-1"><Trash2 className="h-3 w-3"/>Excluir</button>}</div></details></article>)}{!visible.length && <p className="py-5 text-sm text-slate-500">Nenhuma posição nesta categoria.</p>}</div>
    <SectionInfo title="Sobre as posições manuais">Valores cadastrados por você, separados da carteira conectada. Preços podem estar desatualizados. Uma posição manual pode repetir um investimento conectado; os dois não devem ser somados automaticamente.</SectionInfo>
  </section>;
}
