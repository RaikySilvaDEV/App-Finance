import React from 'react';

export function SectionInfo({ children, title = 'Entenda os dados' }: { children: React.ReactNode; title?: string }) {
  return <details className="text-xs text-slate-500"><summary className="cursor-pointer py-1">{title}</summary><div className="mt-2 max-w-3xl space-y-2 text-xs leading-relaxed text-slate-400">{children}</div></details>;
}
