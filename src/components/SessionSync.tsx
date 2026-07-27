'use client';

import { useEffect } from 'react';
import { startSessionSyncResponder } from '@/lib/session-sync';

/**
 * Monta el respondedor de sesión entre pestañas (una vez, en el layout raíz).
 * Permite que una pestaña con sesión activa le pase los tokens a una pestaña
 * nueva cuando "Recordarme" está apagado (sessionStorage es por-pestaña).
 * Ver `lib/session-sync.ts` para el detalle del protocolo.
 */
export function SessionSync() {
  useEffect(() => startSessionSyncResponder(), []);
  return null;
}
