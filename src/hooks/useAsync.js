import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async service call and tracks loading / error / data.
 *   const { data, loading, error, reload, setData } = useAsync(() => getShops({ category }), [category]);
 * Ignores results from stale calls (e.g. fast typing in search).
 * Pass `{ immediate: false }` to only run when reload() is called.
 */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: undefined, loading: immediate, error: null });
  const callId = useRef(0);
  const mounted = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(async () => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (mounted.current && id === callId.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (mounted.current && id === callId.current) setState((s) => ({ ...s, loading: false, error }));
      return undefined;
    }
  }, [run]);

  useEffect(() => {
    mounted.current = true;
    if (immediate) reload();
    return () => {
      mounted.current = false;
    };
  }, [reload, immediate]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
