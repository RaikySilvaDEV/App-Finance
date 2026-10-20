import { useCallback, useEffect, useState } from 'react';
import type { ControlData } from '../components/DailyControl';
export function useControlData(itemIds: string[], version: number) {
  const [data, setData] = useState<ControlData>({ connections: [], sync: {}, error: '' });
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const params = new URLSearchParams(); itemIds.forEach((id) => params.append('itemId', id));
    const results = await Promise.allSettled([fetch('/api/user/sync').then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }), fetch(`/api/open-finance/connections?${params}`).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body.connections || []; })]);
    setData((old) => ({ sync: results[0].status === 'fulfilled' ? results[0].value : old.sync, connections: results[1].status === 'fulfilled' ? results[1].value : old.connections, error: results.some((result) => result.status === 'rejected') ? 'Não foi possível atualizar todos os avisos de conexão. Tente novamente.' : '' }));
    setLoading(false);
  }, [itemIds]);
  useEffect(() => {
    let live = true;
    const refresh = () => { if (live && !document.hidden) void reload(); };
    refresh(); const timer = setInterval(refresh, 300000); window.addEventListener('focus', refresh);
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [reload, version]);
  return { data, reload, loading };
}
