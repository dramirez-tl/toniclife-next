'use client';

// lib/network/scope.tsx - Proveedor del alcance de "Mi red". El panel del
// distribuidor no lo monta (los hooks leen su propia red); la ficha del admin
// envuelve la misma UI en <NetworkScopeProvider customerId> para que los hooks
// lean /customers/:id/network/* con claves de caché propias por cliente.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { NetworkScope } from './scope-path';

export type { NetworkScope } from './scope-path';

const NetworkScopeContext = createContext<NetworkScope | null>(null);

export function NetworkScopeProvider({ customerId, children }: { customerId: string; children: ReactNode }) {
  const value = useMemo<NetworkScope>(() => ({ customerId }), [customerId]);
  return <NetworkScopeContext.Provider value={value}>{children}</NetworkScopeContext.Provider>;
}

/** null = sin alcance (el distribuidor consulta su propia red). */
export function useNetworkScope(): NetworkScope | null {
  return useContext(NetworkScopeContext);
}
