import React, { useEffect, useState } from 'react';

export function GoogleAccess({ account = false }: { account?: boolean }) {
  const [config, setConfig] = useState<{ configured: boolean; linked: boolean } | null>(null);
  useEffect(() => { const controller = new AbortController(); fetch('/api/auth/google/config', { signal: controller.signal }).then(async (response) => { if (response.ok) setConfig(await response.json()); }).catch(() => {}); return () => controller.abort(); }, []);
  if (account) return <details className="rounded-lg border border-white/10 bg-[#101012] p-3 text-xs text-slate-300"><summary className="cursor-pointer">Minha conta</summary><div className="absolute right-0 top-14 z-50 w-64 rounded-lg border border-white/10 bg-[#101012] p-4 shadow-xl">{config?.linked ? 'Google vinculado à sua conta.' : config?.configured ? <a className="text-violet-300" href="/api/auth/google/start?link=1">Vincular minha conta Google</a> : 'O acesso Google aguarda configuração pelo responsável.'}</div></details>;
  return config?.configured ? <a href="/api/auth/google/start" className="mt-5 block w-full rounded-lg border border-slate-600 py-3 text-center text-sm text-white hover:bg-white/5">Continuar com Google</a> : <button type="button" disabled title="O responsável precisa configurar as credenciais Google." className="mt-5 w-full rounded-lg border border-slate-800 py-3 text-sm text-slate-500">Google · em configuração</button>;
}
