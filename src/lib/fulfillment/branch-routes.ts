// branch-routes.ts — Qué países surte una sucursal (lógica PURA, para /admin/sucursales).
//
// Desactivar una sucursal deja sin envío a los países que surte SIN pasar por
// la pantalla de rutas (contrato de rutas §0.1-O / §7.2): el formulario de
// sucursales lo avisa antes. Solo front, con datos de `GET /fulfillment/routes`.

import type { FulfillmentRoutesResponse } from '@/types/fulfillment';

export interface BranchShippingCountry {
  countryCode: string;
  countryName: string;
  /** Hoy los pedidos de este país salen de ESTA sucursal. */
  resolvesHere: boolean;
  /** El país tiene otro almacén utilizable que tomaría su lugar. */
  hasBackup: boolean;
}

/** branchId → países a los que envía con ruta ACTIVA (las rutas en pausa no cuentan). */
export function shippingCountriesByBranch(
  data: FulfillmentRoutesResponse | null | undefined,
): Record<string, BranchShippingCountry[]> {
  const out: Record<string, BranchShippingCountry[]> = {};
  for (const country of data?.countries ?? []) {
    for (const route of country.routes) {
      if (!route.isActive) continue;
      (out[route.branchId] ??= []).push({
        countryCode: country.countryCode,
        countryName: country.countryName,
        resolvesHere: country.resolvesTo?.branchId === route.branchId,
        hasBackup: country.routes.some((r) => r.branchId !== route.branchId && r.usable),
      });
    }
  }
  return out;
}

export function shippingBadgeText(countries: BranchShippingCountry[]): string {
  return `Envía a: ${countries.map((c) => c.countryCode).join(', ')}`;
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

/** Texto del aviso al desactivar una sucursal que surte envíos; null = no hace falta avisar. */
export function deactivateBranchWarning(countries: BranchShippingCountry[]): string | null {
  const affected = countries.filter((c) => c.resolvesHere);
  if (affected.length === 0) {
    return countries.length > 0
      ? `Esta sucursal es almacén de respaldo para los envíos de ${joinNames(countries.map((c) => c.countryName))}; si la desactivas deja de ser una opción.`
      : null;
  }
  const losing = affected.filter((c) => !c.hasBackup).map((c) => c.countryName);
  const moving = affected.filter((c) => c.hasBackup).map((c) => c.countryName);
  const parts: string[] = [`Esta sucursal surte los envíos de ${joinNames(affected.map((c) => c.countryName))}.`];
  if (losing.length > 0) {
    parts.push(
      `Si la desactivas, ${joinNames(losing)} ${losing.length === 1 ? 'se queda' : 'se quedan'} sin envío a domicilio.`,
    );
  }
  if (moving.length > 0) {
    parts.push(
      `${losing.length > 0 ? 'Los pedidos de' : 'Si la desactivas, los pedidos de'} ${joinNames(moving)} pasan a su almacén de respaldo.`,
    );
  }
  return parts.join(' ');
}
