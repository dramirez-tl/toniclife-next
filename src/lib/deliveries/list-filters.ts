/**
 * Filtros de la bandeja "Entregas a domicilio" que viven en la URL (17-nov-2026).
 *
 * Forma de entrega (`mode`): Almacén separa lo que sale por paquetería (envío a domicilio)
 * de lo que se entrega en mostrador (recoger en sucursal). El filtro lo aplica el API,
 * así los conteos de las pestañas y la paginación salen del mismo conjunto.
 */
import { DELIVERY_MODE_LABELS, type DeliveryMode } from '@/types/deliveries';

export type DeliveryModeFilter = 'all' | DeliveryMode;

export const DELIVERY_MODE_FILTER_OPTIONS: { value: DeliveryModeFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'shipping', label: DELIVERY_MODE_LABELS.shipping },
  { value: 'pickup', label: DELIVERY_MODE_LABELS.pickup },
];

/** Lee el parámetro `mode` de la URL; cualquier valor desconocido es "Todas". */
export function parseDeliveryModeFilter(raw: string | null | undefined): DeliveryModeFilter {
  return raw === 'shipping' || raw === 'pickup' ? raw : 'all';
}

/** Valor para la URL: "Todas" no deja parámetro (la liga queda limpia). */
export function deliveryModeUrlValue(filter: DeliveryModeFilter): string {
  return filter === 'all' ? '' : filter;
}

/** Valor para el API: "Todas" no manda nada (el API de antes no conoce `mode`). */
export function deliveryModeQueryValue(filter: DeliveryModeFilter): DeliveryMode | undefined {
  return filter === 'all' ? undefined : filter;
}
