// lib/network/scope-path.ts - Alcance de las lecturas de "Mi red" (sin React).
// Sin alcance, las rutas son las del distribuidor con su JWT
// (/distributor/network/*). Con alcance { customerId }, son las del admin sobre
// ese cliente (/customers/:id/network/*, permiso customers:read): mismas
// respuestas, misma UI. Lo usan networkApi (ruta) y useNetwork (claves de caché).

export interface NetworkScope {
  /** customers.id del distribuidor cuya red se consulta desde el admin. */
  customerId: string;
}

/** Prefijo de las rutas de red según el alcance. */
export function networkBasePath(scope?: NetworkScope | null): string {
  return scope ? `/customers/${encodeURIComponent(scope.customerId)}/network` : '/distributor/network';
}

/** Segmento de las claves de React Query: 'me' (distribuidor) o el customerId (admin). */
export function networkScopeKey(scope?: NetworkScope | null): string {
  return scope ? scope.customerId : 'me';
}
