// Pestañas de /admin/facturacion/preparacion (valor de `?tab=`).

export const READINESS_TABS = ['emisor', 'productos', 'clientes', 'formas-pago', 'sucursales'] as const;

export type ReadinessTab = (typeof READINESS_TABS)[number];

export const READINESS_TAB_LABELS: Record<ReadinessTab, string> = {
  emisor: 'Emisor',
  productos: 'Productos',
  clientes: 'Clientes',
  'formas-pago': 'Formas de pago',
  sucursales: 'Sucursales',
};

export function isReadinessTab(value: string): value is ReadinessTab {
  return (READINESS_TABS as readonly string[]).includes(value);
}
