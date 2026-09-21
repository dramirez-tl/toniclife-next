'use client';

// useRouteDraft — borrador en memoria de las rutas de surtido.
//
// Sin ediciones el borrador ES lo guardado (derivado del GET, sin efectos).
// La primera edición congela la versión con la que se empezó a editar: esa es
// la `expectedVersion` del PUT, así que si otra persona guarda mientras tanto
// el API responde 409 FUL_VERSION_CONFLICT aunque el GET se haya refrescado.

import { useCallback, useMemo, useState } from 'react';
import { draftFromServer, isDraftDirty, type RouteDraft } from '@/lib/fulfillment/route-draft';
import type { FulfillmentRoutesResponse } from '@/types/fulfillment';

interface DraftState {
  draft: RouteDraft;
  baseVersion: string;
}

export function useRouteDraft(data: FulfillmentRoutesResponse | undefined) {
  const [state, setState] = useState<DraftState | null>(null);
  const base = useMemo(() => (data ? draftFromServer(data) : null), [data]);
  const version = data?.version ?? null;

  const update = useCallback(
    (fn: (draft: RouteDraft) => RouteDraft) => {
      setState((prev) => {
        const current = prev?.draft ?? base;
        if (!current || !base || version === null) return prev;
        const next = fn(current);
        if (next === current) return prev;
        // Deshacer a mano todos los cambios = ya no hay borrador (ni versión congelada).
        if (!isDraftDirty(base, next)) return null;
        return { draft: next, baseVersion: prev?.baseVersion ?? version };
      });
    },
    [base, version],
  );

  const reset = useCallback(() => setState(null), []);

  const draft = state?.draft ?? base;
  const isDirty = !!state && !!base && isDraftDirty(base, state.draft);

  return {
    base,
    draft,
    isDirty,
    expectedVersion: state?.baseVersion ?? version,
    update,
    reset,
  };
}
