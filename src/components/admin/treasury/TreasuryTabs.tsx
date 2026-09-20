'use client';

// TreasuryTabs — navegación común de Tesorería (contrato §5, patrón común):
// Resumen | Comisiones | Dispersión y pagos | Retenciones | Validación de datos.
// Son enlaces (Tabs de ui como contenedor visual) para que cada pantalla
// conserve sus filtros en la URL. Conserva `?period=` al cambiar de pestaña.

import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const TREASURY_TABS = [
  'resumen',
  'comisiones',
  'dispersion',
  'retenciones',
  'validacion-datos',
] as const;

export type TreasuryTab = (typeof TREASURY_TABS)[number];

export const TREASURY_TAB_META: Record<
  TreasuryTab,
  { label: string; href: string; /** true mientras la pantalla no exista (paso 10). */ disabled?: boolean }
> = {
  resumen: { label: 'Resumen', href: '/admin/tesoreria' },
  comisiones: { label: 'Comisiones', href: '/admin/comisiones' },
  // La pantalla de lotes/ledger llega con el paso 10 (Dispersión y pago); hasta
  // entonces la pestaña se muestra deshabilitada para no enlazar a un 404.
  dispersion: { label: 'Dispersión y pagos', href: '/admin/tesoreria/dispersion', disabled: true },
  retenciones: { label: 'Retenciones', href: '/admin/tesoreria/retenciones' },
  'validacion-datos': { label: 'Validación de datos', href: '/admin/tesoreria/validacion-datos' },
};

interface TreasuryTabsProps {
  active: TreasuryTab;
  /** Periodo seleccionado para conservarlo entre pantallas (`?period=`). */
  periodId?: string | null;
  className?: string;
}

export function TreasuryTabs({ active, periodId, className }: TreasuryTabsProps) {
  const withPeriod = (href: string) =>
    periodId && periodId !== 'all' ? `${href}?period=${encodeURIComponent(periodId)}` : href;

  return (
    <Tabs value={active} className={className}>
      <TabsList
        aria-label="Secciones de Tesorería"
        className="flex h-auto w-full flex-wrap justify-start sm:w-fit"
      >
        {TREASURY_TABS.map((tab) => {
          const meta = TREASURY_TAB_META[tab];
          if (meta.disabled) {
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                disabled
                title="Disponible cuando se libere Dispersión y pagos"
              >
                {meta.label}
              </TabsTrigger>
            );
          }
          return (
            <TabsTrigger key={tab} value={tab} asChild>
              <Link href={withPeriod(meta.href)} aria-current={active === tab ? 'page' : undefined}>
                {meta.label}
              </Link>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
