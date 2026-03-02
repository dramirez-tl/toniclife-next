'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useState, useEffect, useRef } from 'react';

interface FilterDefaults {
  [key: string]: string;
}

export function useQueryFilters(defaults: FilterDefaults = {}) {
  // useSearchParams() only for initial hydration (triggers Suspense once on page load)
  const serverParams = useSearchParams();

  // Local state is the source of truth after hydration — avoids re-suspending
  const [localParams, setLocalParams] = useState<URLSearchParams>(
    () => new URLSearchParams(serverParams.toString()),
  );

  // Flag: only sync URL for user-initiated changes (not popstate/hydration)
  const shouldSyncUrl = useRef(false);

  // Sync from server params on hydration
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      setLocalParams(new URLSearchParams(serverParams.toString()));
    }
  }, [serverParams]);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      setLocalParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Sync URL AFTER render (not during) to avoid "setState during render" error
  useEffect(() => {
    if (shouldSyncUrl.current) {
      shouldSyncUrl.current = false;
      const qs = localParams.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, '', url);
    }
  }, [localParams]);

  const get = useCallback(
    (key: string): string => localParams.get(key) || defaults[key] || '',
    [localParams, defaults],
  );

  const getNumber = useCallback(
    (key: string): number => Number(localParams.get(key)) || Number(defaults[key]) || 0,
    [localParams, defaults],
  );

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      shouldSyncUrl.current = true;
      setLocalParams((prev) => {
        const next = new URLSearchParams(prev.toString());
        for (const [key, val] of Object.entries(updates)) {
          if (val === null || val === '' || val === defaults[key]) {
            next.delete(key);
          } else {
            next.set(key, val);
          }
        }
        if (!('page' in updates)) {
          next.delete('page');
        }
        return next;
      });
    },
    [defaults],
  );

  return { searchParams: localParams, get, getNumber, setParams };
}
