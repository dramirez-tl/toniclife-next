// price-history.ts — textos PUROS del historial de precios de la ficha
// (GET /products/:id/prices/history): qué cambió, en español claro, y el resumen
// que se confirma antes de "Restablecer" (volver al valor de ANTES del cambio).

import { formatCurrency } from '@/lib/currency';
import type { PriceSnapshot, ProductPriceHistoryEntry } from '@/types/product';

export const PRICE_HISTORY_ACTION_LABEL: Record<ProductPriceHistoryEntry['action'], string> = {
  INSERT: 'Alta',
  UPDATE: 'Cambio',
  DELETE: 'Baja',
};

const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const num = (n: number): string => nf.format(Number.isFinite(n) ? n : 0);
const money = (n: number, currency: string): string => formatCurrency(n, currency);

/** Fecha corta "5 ago 2026" (la vigencia viene como YYYY-MM-DD, sin hora). */
export function shortDate(value: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Frases de lo que cambió entre `before` y `after`: solo lo distinto. Alta =
 * valores capturados; baja = valores que tenía.
 */
export function priceHistoryChanges(e: ProductPriceHistoryEntry, fallbackCurrency: string): string[] {
  const currency = e.after?.currencyCode ?? e.before?.currencyCode ?? fallbackCurrency;
  const out: string[] = [];
  const b = e.before;
  const a = e.after;
  if (e.action === 'INSERT' && a) {
    out.push(`Precio ${money(a.price, currency)}`);
    if (a.points) out.push(`Puntos ${num(a.points)}`);
    if (a.businessValue) out.push(`Valor negocio ${num(a.businessValue)}`);
    if (a.effectiveFrom) out.push(`Vigente desde ${shortDate(a.effectiveFrom)}`);
    return out;
  }
  if (e.action === 'DELETE' && b) {
    out.push(`Tenía ${money(b.price, currency)}`);
    if (b.points) out.push(`Puntos ${num(b.points)}`);
    if (b.businessValue) out.push(`Valor negocio ${num(b.businessValue)}`);
    return out;
  }
  if (!b || !a) return out;
  if (b.price !== a.price) out.push(`Precio ${money(b.price, currency)} → ${money(a.price, currency)}`);
  if (b.points !== a.points) out.push(`Puntos ${num(b.points)} → ${num(a.points)}`);
  if (b.businessValue !== a.businessValue) out.push(`Valor negocio ${num(b.businessValue)} → ${num(a.businessValue)}`);
  if (b.effectiveFrom !== a.effectiveFrom) out.push(`Vigente desde ${shortDate(b.effectiveFrom)} → ${shortDate(a.effectiveFrom)}`);
  if (b.effectiveTo !== a.effectiveTo) out.push(`Vigente hasta ${shortDate(b.effectiveTo)} → ${shortDate(a.effectiveTo)}`);
  if (b.isActive !== a.isActive) out.push(a.isActive ? 'Activado' : 'Desactivado');
  if (out.length === 0) out.push('Sin cambio de importe');
  return out;
}

/** "Precio Distribuidor: $438.00 (puntos 378, valor negocio 378)". */
export function restoreSummary(e: ProductPriceHistoryEntry, fallbackCurrency: string): string {
  const b = e.before;
  if (!b) return '';
  const currency = b.currencyCode ?? fallbackCurrency;
  const extras = [`puntos ${num(b.points)}`, `valor negocio ${num(b.businessValue)}`].join(', ');
  return `${e.priceTypeName ?? e.priceTypeCode ?? 'Precio'}: ${money(b.price, currency)} (${extras})`;
}

/** Lo que manda "Restablecer": los valores de ANTES del cambio (sin tocar vigencias). */
export function restorePayload(e: ProductPriceHistoryEntry, fallbackCurrency: string): {
  priceTypeId: string;
  countryId: string;
  currencyCode: string;
  price: number;
  points: number;
  businessValue: number;
} | null {
  const b: PriceSnapshot | null = e.before;
  if (!e.restorable || !b || !e.countryId || !e.priceTypeId || b.price <= 0) return null;
  return {
    priceTypeId: e.priceTypeId,
    countryId: e.countryId,
    currencyCode: b.currencyCode ?? fallbackCurrency,
    price: b.price,
    points: b.points,
    businessValue: b.businessValue,
  };
}
