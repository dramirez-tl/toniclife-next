'use client';

// ScopedReportsLanding - Portada para sesiones acotadas por sucursal (CEDEAS
// Supervisor, 21-oct-2026). Sustituye al Panel Principal (KPIs globales) y a
// "Análisis y Reportes" (analítica global), que el API les niega: muestra sus
// sucursales y accesos directos a los reportes que sí ven, ya filtrados.

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { useActiveBranches } from '@/hooks/useBranches';
import {
  BanknotesIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const REPORTS = [
  {
    name: 'Ventas',
    href: '/admin/reportes/ventas',
    description: 'Cada venta con su detalle, por sucursal, fecha y forma de pago.',
    icon: ShoppingBagIcon,
  },
  {
    name: 'Ventas por Sucursal',
    href: '/admin/reportes/ventas-sucursal',
    description: 'Totales por sucursal en el rango de fechas, con corte de caja.',
    icon: BuildingStorefrontIcon,
  },
  {
    name: 'Ventas por Producto',
    href: '/admin/reportes/ventas-producto',
    description: 'Qué se vendió y en qué folio, para resurtir lo mismo que se vendió.',
    icon: CubeIcon,
  },
  {
    name: 'Ventas por Usuario',
    href: '/admin/reportes/ventas-usuario',
    description: 'Ventas de cada vendedor y compras de un distribuidor.',
    icon: UserGroupIcon,
  },
  {
    name: 'Piezas por Producto',
    href: '/admin/reportes/piezas-producto',
    description: 'Piezas vendidas por producto y periodo (26 → 25).',
    icon: ChartBarIcon,
  },
  {
    name: 'Corte de Caja',
    href: '/admin/reportes/corte-caja',
    description: 'Corte de una sucursal por rango, con totales por forma de pago.',
    icon: BanknotesIcon,
  },
];

export function ScopedReportsLanding({ title = 'Reportes de mis sucursales' }: { title?: string }) {
  const { data: branches = [], isLoading } = useActiveBranches();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Solo ves la información de las sucursales que tienes asignadas.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sucursales asignadas
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : branches.length === 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Todavía no tienes sucursales asignadas: los reportes saldrán vacíos. Pide a Sistemas que
                las asigne a tu usuario.
              </span>
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <li
                  key={b.id}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground"
                >
                  <span className="font-mono text-xs text-muted-foreground">{b.code}</span> {b.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <r.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{r.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
