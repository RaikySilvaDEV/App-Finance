import { useCallback, useEffect, useRef, useState } from 'react';

/** One decision per authenticated UI entry. Polling/focus is not a new login. */
export function useEntryAlerts(ready: boolean, count: number) {
  const evaluated = useRef(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (count === 0) setOpen(false);
    if (evaluated.current || (!ready && count === 0)) return;
    evaluated.current = true;
    if (count > 0) setOpen(true);
  }, [ready, count]);
  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => { if (count > 0) setOpen(true); }, [count]);
  return { open: open && count > 0, close, show };
}
