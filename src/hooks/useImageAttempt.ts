// useImageAttempt — Qué forma de pedir una foto toca ahora y cómo pasar a la siguiente cuando la
// carga falla (lista de `imageAttempts`: achicada por el optimizador → original tal cual). Agotados
// los intentos devuelve `null` y quien la usa pinta su respaldo. Se recuerda por foto: otra foto
// empieza de nuevo desde el primer intento.

import { useState } from 'react';
import type { ImageAttempt } from '@/lib/inventory/product-thumb';

export function useImageAttempt(attempts: ImageAttempt[]): { current: ImageAttempt | null; fail: () => void } {
  const key = attempts.map((attempt) => `${attempt.optimized ? 'o' : 'r'}:${attempt.src}`).join('|');
  const [failed, setFailed] = useState<{ key: string; count: number }>({ key: '', count: 0 });
  const count = failed.key === key ? failed.count : 0;
  return { current: attempts[count] ?? null, fail: () => setFailed({ key, count: count + 1 }) };
}
