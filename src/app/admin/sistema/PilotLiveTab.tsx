'use client';

// Pestaña "Piloto en vivo" de /admin/sistema: mapa de la república con las
// sucursales en prueba piloto + feed de ventas de HOY (nativas POS v2).
// Polling cada 30 min (petición del cliente: no saturar el backend) + botón
// "Actualizar ahora" para refrescar bajo demanda. Toast en venta nueva.

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
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

/** Hoy en CDMX (YYYY-MM-DD) — el corte de día del piloto es hora de México. */
const todayCdmx = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

/** Suma días a una fecha YYYY-MM-DD (aritmética UTC, sin sorpresas de TZ). */
const addDays = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

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
  // Modo pantalla (?tv=1): la página oculta el encabezado de Sistema y las
  // pestañas — queda solo este tablero, para proyectarse en el monitor.
  const router = useRouter();
  const searchParams = useSearchParams();
  const tvMode = searchParams.get('tv') === '1';
  const toggleTv = () =>
    router.replace(`/admin/sistema?tab=piloto${tvMode ? '' : '&tv=1'}`, {
      scroll: false,
    });

  // Navegación por día: null = HOY (modo en vivo con polling). Un día
  // anterior es una foto cerrada — sin polling ni toasts de venta nueva.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const isToday = selectedDate === null || selectedDate === todayCdmx();

  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } =
    useQuery({
      queryKey: ['pos', 'pilot-live', selectedDate ?? 'hoy'],
      queryFn: () => posService.getPilotLive(undefined, selectedDate ?? undefined),
      refetchInterval: isToday ? POLL_MS : false,
      refetchIntervalInBackground: false,
      staleTime: 60_000,
    });

  // Toast cuando aparece una venta COMPLETADA nueva (vs el fetch anterior).
  // Solo en modo HOY: navegar a un día pasado no debe disparar avisos.
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data || !isToday) return;
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
  }, [data, isToday]);

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

  const ventasHoy = data.branches.reduce((s, b) => s + b.salesCount, 0);

  // Totales POR MONEDA (sumar USD con MXN a secas es basura) + consolidado
  // en MXN con la tasa del periodo (viene del API; MXN = 1).
  const fx = data.exchangeRates ?? { MXN: 1 };
  const porMoneda = new Map<string, number>();
  for (const b of data.branches) {
    const cur = (b.currencyCode ?? 'MXN').toUpperCase();
    porMoneda.set(cur, (porMoneda.get(cur) ?? 0) + b.salesTotal);
  }
  const monedas = [...porMoneda.entries()].sort(
    // MXN primero, luego por monto convertido descendente
    (a, b) =>
      (a[0] === 'MXN' ? -1 : 0) - (b[0] === 'MXN' ? -1 : 0) ||
      b[1] * (fx[b[0]] ?? 0) - a[1] * (fx[a[0]] ?? 0),
  );
  const sinTasa = monedas.filter(([cur, monto]) => monto > 0 && fx[cur] == null);
  const totalMxn = monedas.reduce(
    (s, [cur, monto]) => s + monto * (fx[cur] ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Banner ejecutivo — pensado para proyectarse en pantalla de monitoreo */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-[#3E667D] to-[#0A4B94] px-6 py-4 text-white shadow-md">
        <div className="flex items-center gap-4">
          <Image
            src="/images/logo/png/logo-text-white-r.png"
            alt="Tonic Life"
            width={170}
            height={40}
            priority
            className="h-9 w-auto"
          />
          <div className="hidden h-9 w-px bg-white/30 sm:block" />
          <div>
            <p className="text-lg font-bold leading-tight">
              {isToday
                ? 'Prueba piloto — Monitoreo en vivo'
                : 'Prueba piloto — Cierre del día'}
            </p>
            <p className="text-xs text-white/75">
              {new Date(`${data.date}T12:00:00Z`).toLocaleDateString('es-MX', {
                timeZone: 'UTC',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {isToday
                ? ` · ventas de hoy · se actualiza cada ${POLL_MS / 60_000} min`
                : ' · día cerrado (foto completa)'}
            </p>
          </div>
          {/* Navegación por día: ver cómo cerraron días anteriores */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => setSelectedDate(addDays(data.date, -1))}
              className="h-8 border border-white/40 bg-white/10 px-2 text-white hover:bg-white/20"
              title="Día anterior"
            >
              ◀
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const next = addDays(data.date, 1);
                setSelectedDate(next >= todayCdmx() ? null : next);
              }}
              disabled={isToday}
              className="h-8 border border-white/40 bg-white/10 px-2 text-white hover:bg-white/20 disabled:opacity-40"
              title="Día siguiente"
            >
              ▶
            </Button>
            {!isToday && (
              <Button
                size="sm"
                onClick={() => setSelectedDate(null)}
                className="h-8 border border-white/40 bg-white/10 px-2 text-white hover:bg-white/20"
              >
                Hoy
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isToday ? (
            <span className="flex items-center gap-2 text-xs font-medium text-white/90">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
              </span>
              EN VIVO ·{' '}
              {new Date(dataUpdatedAt).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs font-medium text-white/75">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white/50" />
              HISTÓRICO
            </span>
          )}
          <Button
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border border-white/40 bg-white/10 text-white hover:bg-white/20"
          >
            {isFetching ? 'Actualizando…' : 'Actualizar ahora'}
          </Button>
          <Button
            size="sm"
            onClick={toggleTv}
            className="border border-white/40 bg-white/10 text-white hover:bg-white/20"
            title="Oculta el encabezado y las pestañas para proyectar (combínalo con F11)"
          >
            {tvMode ? 'Salir de pantalla' : 'Modo pantalla'}
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
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {b.code}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 font-mono text-[11px] text-emerald-700"
                    title="Moneda de la sucursal"
                  >
                    {b.currencyCode ?? 'MXN'}
                  </Badge>
                </div>
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
                    {isToday ? 'ventas hoy' : 'ventas del día'}
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
              <p className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
                🖥 {b.terminalsActive ?? 0} terminal(es)
                {b.terminalVersions ? ` · POS v${b.terminalVersions}` : ''}
              </p>
              {b.pendingCount > 0 && (
                <p className="mt-1 text-[11px] font-medium text-amber-600">
                  ⚠ {b.pendingCount} venta(s) pendiente(s) de cobro (traban
                  stock)
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {/* Total consolidado: desglose por moneda + total en MXN con la
            tasa del periodo (sumar USD+MXN a secas engañaba) */}
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {isToday ? 'Total del piloto (hoy)' : 'Total del piloto (día)'}
              </p>
              <p className="text-2xl font-bold leading-none text-gray-900">
                {ventasHoy}
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  ventas
                </span>
              </p>
            </div>
            <div className="mt-3 space-y-1">
              {monedas.map(([cur, monto]) => (
                <div
                  key={cur}
                  className="flex items-baseline justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {cur}
                    {cur !== 'MXN' && fx[cur] != null && (
                      <span className="ml-1 text-[10px]">
                        (TC {fx[cur].toFixed(4)})
                      </span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums text-gray-900">
                    {money(monto, cur)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t pt-2">
              <span className="text-xs font-medium text-muted-foreground">
                Total en MXN (TC del periodo)
              </span>
              <span className="text-base font-bold tabular-nums text-gray-900">
                {money(totalMxn)}
              </span>
            </div>
            {sinTasa.length > 0 && (
              <p className="mt-1 text-[11px] font-medium text-amber-600">
                ⚠ Sin tipo de cambio del periodo:{' '}
                {sinTasa.map(([c]) => c).join(', ')} (no suma al total MXN)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mapa + feed */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <PilotLiveMap branches={data.branches} />

        <Card className="lg:max-h-[460px] lg:overflow-hidden">
          <CardContent className="flex h-full flex-col p-4">
            <p className="mb-2 text-sm font-semibold text-gray-900">
              {isToday ? 'Últimas ventas de hoy' : 'Ventas del día'}
            </p>
            {data.recentSales.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {isToday
                  ? 'Aún no hay ventas hoy en las sucursales piloto.'
                  : 'No hubo ventas nativas ese día en las sucursales piloto.'}
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
                          {money(s.total, s.currencyCode)}
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
