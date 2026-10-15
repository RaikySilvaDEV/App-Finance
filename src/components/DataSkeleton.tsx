import React from 'react';

function Block({ className = '' }: { className?: string }) {
  return <div className={`skeleton-block rounded-md ${className}`}/>;
}
export function DataSkeleton({ variant = 'overview', label = 'Carregando seus dados financeiros…' }: { variant?: 'overview' | 'list' | 'ledger' | 'connections'; label?: string }) {
  const row = (index: number) => <div key={index} className="flex items-center justify-between gap-4 border-t border-slate-800/60 py-4"><div className="flex min-w-0 flex-1 items-center gap-3"><Block className="h-8 w-8 shrink-0 rounded-lg"/><div className="w-full max-w-48 space-y-2"><Block className="h-3 w-3/4"/><Block className="h-2 w-1/2"/></div></div><Block className="h-4 w-20 shrink-0"/></div>;
  return <section role="status" aria-live="polite" aria-label={label} className="space-y-5">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="space-y-5">
      {variant === 'overview' ? <><Block className="h-14 w-full rounded-xl"/><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((card) => <div key={card} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/50 p-5"><Block className="h-3 w-32"/><Block className="mt-4 h-8 w-36"/><Block className="mt-3 mb-6 h-2 w-40"/>{Array.from({ length: card === 0 ? 4 : 2 }, (_, index) => row(index))}</div>)}</div><div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"><div className="flex justify-between gap-5"><Block className="h-4 w-40"/><Block className="h-8 w-32"/></div><Block className="mt-8 h-52 w-full rounded-xl"/></div></>
      : variant === 'connections' ? <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((card) => <div key={card} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"><div className="flex items-center gap-4"><Block className="h-16 w-16 rounded-xl"/><div className="flex-1 space-y-3"><Block className="h-4 w-28"/><Block className="h-2 w-20"/></div></div><Block className="mt-6 h-3 w-36"/><Block className="mt-4 h-2 w-48 max-w-full"/><Block className="mt-6 h-3 w-28"/></div>)}</div>
      : <><div className={`grid gap-4 ${variant === 'ledger' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>{[0, 1, ...(variant === 'ledger' ? [2] : [])].map((card) => <div key={card} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"><Block className="h-3 w-28"/><Block className="mt-4 h-7 w-32"/></div>)}</div><div className="rounded-xl border border-slate-800 bg-slate-900/50 px-5 pt-5"><Block className="mb-5 h-8 w-36"/>{Array.from({ length: 5 }, (_, index) => row(index))}</div></>}
    </div>
  </section>;
}
export function AppLoadingSkeleton() {
  return <div className="min-h-screen bg-slate-950 text-slate-100"><header aria-hidden="true" className="flex h-16 items-center justify-between border-b border-slate-800 px-6"><span className="text-base font-semibold">FinPulse</span><Block className="h-7 w-28"/></header><div className="mx-auto flex max-w-[1440px]"><aside aria-hidden="true" className="hidden min-h-[calc(100dvh-64px)] w-48 shrink-0 space-y-6 border-r border-slate-800 px-5 py-8 lg:block">{Array.from({ length: 7 }, (_, index) => <Block key={index} className="h-4 w-full"/>)}</aside><main className="min-w-0 flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-7"><div aria-hidden="true" className="space-y-3"><Block className="h-7 w-40"/><Block className="h-3 w-60 max-w-full"/></div><DataSkeleton label="Carregando sua conta e seus dados…"/></main></div></div>;
}
