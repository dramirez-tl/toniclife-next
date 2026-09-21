// fulfillment-ui.ts — Textos y formatos compartidos de la pantalla "Almacenes y envíos".

import { COUNTRIES } from '@/i18n/config';
import type { CountryShippingStatus, DraftRoute } from '@/lib/fulfillment/route-draft';

export const numberFormat = new Intl.NumberFormat('es-MX');

/** "164 · Irapuato Almacén General": la clave de sucursal es el único código a la vista. */
export const warehouseLabel = (w: { branchCode: string; branchName: string }) => `${w.branchCode} · ${w.branchName}`;

/** Bandera decorativa (siempre `aria-hidden`). Frontera no es un país ISO: sin bandera. */
export function countryFlag(countryCode: string): string | null {
  const code = countryCode.toUpperCase();
  const known = COUNTRIES.find((c) => c.code === code);
  if (known) return known.flag;
  if (code === 'FN' || !/^[A-Z]{2}$/.test(code)) return null;
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** Estado de la tienda en línea del país: vive fijo en `i18n/config.ts` (no en la BD). */
export type StoreStatus = 'open' | 'soon' | 'none';

export function storeStatus(countryCode: string): StoreStatus {
  const known = COUNTRIES.find((c) => c.code === countryCode.toUpperCase());
  if (!known) return 'none';
  return known.ready ? 'open' : 'soon';
}

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  open: 'Tienda abierta',
  soon: 'Muy pronto',
  none: 'Sin tienda propia',
};

export function shippingStatusLabel(status: CountryShippingStatus, resolved: DraftRoute | null): string {
  switch (status) {
    case 'ready':
      return resolved ? `Listo · lo surte ${resolved.branchCode}` : 'Listo';
    case 'no_warehouse':
      return 'Sin almacén: no se puede enviar';
    case 'paused':
      return 'Almacén pausado';
    case 'branch_inactive':
      return 'Almacén inactivo';
    case 'cross_pending':
      return 'Configurado · envíos entre países pendientes';
    default:
      return '';
  }
}

export const positionLabel = (index: number) => `${index + 1} · ${index === 0 ? 'Principal' : 'Respaldo'}`;
