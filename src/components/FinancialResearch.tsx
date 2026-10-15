import React, { useState } from 'react';
export function FinancialResearch() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ answer: string; sources: { title: string; url: string }[]; researchedAt: string } | null>(null);
  async function research(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/ai/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (reason: any) { setError(reason.message || 'Não foi possível pesquisar.'); }
    finally { setLoading(false); }
  }
  return <details className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><summary className="cursor-pointer text-sm font-semibold text-white">Pesquisar na internet com minha IA</summary><p className="mt-3 text-xs leading-relaxed text-slate-400">Pesquise temas financeiros em fontes oficiais. Somente a pergunta abaixo é enviada ao buscador; os saldos e contratos do diagnóstico ficam fora da pesquisa.</p><form onSubmit={research} className="mt-3 space-y-3"><label className="block text-xs text-slate-300">O que você quer entender?<textarea value={question} onChange={(event) => setQuestion(event.target.value)} required minLength={5} maxLength={400} placeholder="Como funciona uma reserva de emergência?" className="mt-2 h-20 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white"/></label><button disabled={loading} className="rounded-lg bg-violet-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">{loading ? 'Pesquisando e preparando resposta…' : 'Pesquisar em fontes oficiais'}</button></form>{error && <p role="alert" className="mt-3 text-xs text-amber-200">{error}</p>}{result && <div className="mt-4 space-y-3"><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{result.answer}</p><p className="text-[11px] text-slate-500">Pesquisa em {new Date(result.researchedAt).toLocaleString('pt-BR')} · resposta baseada nos trechos encontrados</p><ol className="space-y-2 text-xs">{result.sources.map((source, index) => <li key={source.url}><a className="text-violet-300 underline" href={source.url} target="_blank" rel="noreferrer">[{index + 1}] {source.title} ↗</a></li>)}</ol></div>}</details>;
}
