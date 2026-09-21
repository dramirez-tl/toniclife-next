'use client';

// useAsyncConfirm — abre un diálogo y devuelve una promesa con la respuesta.
// Permite que `beforeSave` de una sección (y el "Guardar todo" del cascarón)
// ESPEREN la confirmación del usuario: `false` = canceló.

import { useCallback, useState } from 'react';

interface PendingConfirm<P, R> {
  payload: P;
  resolve: (result: R | false) => void;
}

export interface AsyncConfirm<P, R> {
  pending: PendingConfirm<P, R> | null;
  request: (payload: P) => Promise<R | false>;
  settle: (result: R | false) => void;
}

export function useAsyncConfirm<P, R>(): AsyncConfirm<P, R> {
  const [pending, setPending] = useState<PendingConfirm<P, R> | null>(null);

  const request = useCallback(
    (payload: P) =>
      new Promise<R | false>((resolve) => {
        setPending({ payload, resolve });
      }),
    [],
  );

  const settle = useCallback(
    (result: R | false) => {
      pending?.resolve(result);
      setPending(null);
    },
    [pending],
  );

  return { pending, request, settle };
}
