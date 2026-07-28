'use client';

// Pestaña "Piloto en vivo" de /admin/sistema: mapa de la república con las
// sucursales en prueba piloto + feed de ventas de HOY (nativas POS v2).
// Polling cada 30 min (petición del cliente: no saturar el backend) + botón
// "Actualizar ahora" para refrescar bajo demanda. Toast en venta nueva.

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { posService } from '@/services/pos.service';
import type { PilotRecentSale } from '@/types/pilotLive';

// Leaflet toca window: solo en cliente.
const PilotLiveMap = dynamic(() => import('./PilotLiveMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full rounded-lg" />,
});

const POLL_MS = 30 * 60_000; // 30 minutos

const money = (n: number, currency?: string | null) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
  }).format(n);

const horaCdmx = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Mexico_City',
      })
    : '—';

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  completed: {
    label: 'Completada',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  pending: {
    label: 'Pendiente',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
};

export function PilotLiveTab() {
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } =
    useQuery({
      queryKey: ['pos', 'pilot-live'],
      queryFn: () => posService.getPilotLive(),
      refetchInterval: POLL_MS,
      refetchIntervalInBackground: false,
      staleTime: 60_000,
    });

  // Toast cuando aparece una venta COMPLETADA nueva (vs el fetch anterior).
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    const completed = data.recentSales.filter((s) => s.status === 'completed');
    if (seenIds.current === null) {
      // Primer fetch: solo sembrar (no spamear con las ventas ya existentes).
      seenIds.current = new Set(completed.map((s) => s.id));
      return;
    }
    for (const s of completed) {
      if (!seenIds.current.has(s.id)) {
        seenIds.current.add(s.id);
        toast.success(
          `Nueva venta en ${s.branchName}: ${s.saleNumber} — ${money(s.total)}`,
        );
      }
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          No se pudo cargar el monitor del piloto. Verifica que el API esté
          disponible.
        </CardContent>
      </Card>
    );
  }

  const totalHoy = data.branches.reduce((s, b) => s + b.salesTotal, 0);
  const ventasHoy = data.branches.reduce((s, b) => s + b.salesCount, 0);

  return (
    <div className="space-y-4">
      {/* Encabezado EN VIVO */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium text-gray-700">
            Ventas de hoy en sucursales piloto — se actualiza cada{' '}
            {POLL_MS / 60_000} min
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Actualizado:{' '}
            {new Date(dataUpdatedAt).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Actualizando…' : 'Actualizar ahora'}
          </Button>
        </div>
      </div>

      {/* Tarjetas por sucursal */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.branches.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {b.name}
                </p>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {b.code}
                </Badge>
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {b.address}
              </p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {b.salesCount}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    ventas hoy
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {money(b.salesTotal, b.currencyCode)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    última: {horaCdmx(b.lastSaleAt)}
                  </p>
                </div>
              </div>
              {b.pendingCount > 0 && (
                <p className="mt-2 text-[11px] font-medium text-amber-600">
                  ⚠ {b.pendingCount} venta(s) pendiente(s) de cobro (traban
                  stock)
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {/* Total consolidado */}
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-gray-900">
              Total del piloto (hoy)
            </p>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{ventasHoy}</p>
                <p className="text-[11px] text-muted-foreground">ventas</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {money(totalHoy)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapa + feed */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <PilotLiveMap branches={data.branches} />

        <Card className="lg:max-h-[420px] lg:overflow-hidden">
          <CardContent className="flex h-full flex-col p-4">
            <p className="mb-2 text-sm font-semibold text-gray-900">
              Últimas ventas de hoy
            </p>
            {data.recentSales.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay ventas hoy en las sucursales piloto.
              </p>
            ) : (
              <ul className="-mx-1 flex-1 divide-y overflow-y-auto px-1">
                {data.recentSales.map((s: PilotRecentSale) => {
                  const badge =
                    STATUS_BADGE[s.status] ?? {
                      label: s.status,
                      className: '',
                    };
                  return (
                    <li key={s.id} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-gray-500">
                          {horaCdmx(s.createdAt)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800">
                          {s.branchName}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {money(s.total)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-muted-foreground">
                          {s.saleNumber}
                          {s.customerName ? ` · ${s.customerName}` : ''} ·{' '}
                          {s.itemsCount} art.
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${badge.className}`}
                        >
                          {badge.label}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Solo cuenta ventas NATIVAS del POS v2 (las migradas del legacy no
        aparecen). Corte de día: hora de Ciudad de México. Para comparar contra
        el legacy usa <span className="font-mono">--compare-piloto</span> en el
        proyecto de migración.
      </p>
    </div>
  );
}
