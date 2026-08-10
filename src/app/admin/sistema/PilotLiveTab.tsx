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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { posService } from '@/services/pos.service';
import type { PilotBranchLive, PilotRecentSale } from '@/types/pilotLive';

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

  // Paralelo total (10-ago): el API devuelve TODAS las sucursales POS.
  // Por defecto la tabla muestra solo las que tienen actividad del día;
  // el botón "Ver todas" despliega el resto (sin ventas) cuando haga falta.
  const [showAll, setShowAll] = useState(false);

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

  // Sucursales con actividad del día primero (por monto convertido a MXN,
  // descendente); las quietas después, por clave.
  const aMxn = (b: PilotBranchLive) =>
    b.salesTotal * (fx[(b.currencyCode ?? 'MXN').toUpperCase()] ?? 0);
  const conActividad = data.branches
    .filter((b) => b.salesCount > 0 || b.pendingCount > 0 || b.cancelledCount > 0)
    .sort((a, b) => aMxn(b) - aMxn(a) || b.salesCount - a.salesCount);
  const sinActividad = data.branches
    .filter(
      (b) => !(b.salesCount > 0 || b.pendingCount > 0 || b.cancelledCount > 0),
    )
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const visibles = showAll ? [...conActividad, ...sinActividad] : conActividad;

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

      {/* Franja de totales: conteo, sucursales activas, desglose por moneda
          y consolidado en MXN con la tasa del periodo */}
      <Card className="bg-slate-50">
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
          <div>
            <p className="text-3xl font-bold leading-none text-gray-900">
              {ventasHoy}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {isToday ? 'ventas hoy' : 'ventas del día'}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {conActividad.length} de {data.branches.length} sucursales con
              actividad
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {monedas
              .filter(([cur, monto]) => monto > 0 || cur === 'MXN')
              .map(([cur, monto]) => (
                <div key={cur} className="text-sm">
                  <span className="text-muted-foreground">
                    {cur}
                    {cur !== 'MXN' && fx[cur] != null && (
                      <span className="ml-1 text-[10px]">
                        (TC {fx[cur].toFixed(4)})
                      </span>
                    )}
                  </span>{' '}
                  <span className="font-medium tabular-nums text-gray-900">
                    {money(monto, cur)}
                  </span>
                </div>
              ))}
          </div>
          <div className="ml-auto text-right">
            <p className="text-[11px] font-medium text-muted-foreground">
              Total en MXN (TC del periodo)
            </p>
            <p className="text-xl font-bold tabular-nums text-gray-900">
              {money(totalMxn)}
            </p>
            {sinTasa.length > 0 && (
              <p className="text-[11px] font-medium text-amber-600">
                ⚠ Sin TC: {sinTasa.map(([c]) => c).join(', ')} (no suma)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla compacta de sucursales: activas primero (por monto MXN desc);
          las quietas se despliegan bajo demanda */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">
              Sucursales{' '}
              <span className="font-normal text-muted-foreground">
                ({conActividad.length} con actividad
                {showAll ? ` · ${sinActividad.length} sin actividad` : ''})
              </span>
            </p>
            {sinActividad.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll
                  ? 'Solo con actividad'
                  : `Ver todas (${data.branches.length})`}
              </Button>
            )}
          </div>
          {visibles.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {isToday
                ? 'Aún no hay ventas hoy en ninguna sucursal.'
                : 'No hubo ventas nativas ese día.'}
              {sinActividad.length > 0 &&
                ` Usa "Ver todas" para revisar las ${sinActividad.length} sucursales.`}
            </p>
          ) : (
            <div className="rounded-md border [&_[data-slot=table-container]]:max-h-[420px] [&_[data-slot=table-container]]:overflow-y-auto">
              {/* El scroll vertical vive en el wrapper interno de la Table
                  (data-slot="table-container", ya scroll container por su
                  overflow-x): si viviera en el div exterior, el sticky del
                  thead se anclaría al wrapper y no se pegaría. */}
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_theme(colors.border)]">
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Última</TableHead>
                    <TableHead>Terminales</TableHead>
                    <TableHead className="text-right">Pend.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((b) => {
                    const quieta =
                      b.salesCount === 0 &&
                      b.pendingCount === 0 &&
                      b.cancelledCount === 0;
                    return (
                      <TableRow
                        key={b.id}
                        className={quieta ? 'text-muted-foreground' : ''}
                      >
                        <TableCell className="max-w-[260px]">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="shrink-0 font-mono text-[10px]"
                            >
                              {b.code}
                            </Badge>
                            <span
                              className={`truncate text-sm ${quieta ? '' : 'font-medium text-gray-900'}`}
                              title={b.address}
                            >
                              {b.name}
                            </span>
                            {b.isCedea && (
                              <span className="shrink-0 rounded bg-violet-100 px-1 py-0.5 text-[9px] font-semibold text-violet-700">
                                CEDEA
                              </span>
                            )}
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {b.currencyCode ?? 'MXN'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {b.salesCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {b.salesCount > 0
                            ? money(b.salesTotal, b.currencyCode)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {horaCdmx(b.lastSaleAt)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {(b.terminalsActive ?? 0) > 0 ? (
                            <>
                              {b.terminalsActive}
                              {b.terminalVersions
                                ? ` · v${b.terminalVersions}`
                                : ''}
                            </>
                          ) : (
                            <span className="text-red-600">sin terminal</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {b.pendingCount > 0 ? (
                            <span
                              className="font-medium text-amber-600"
                              title="Ventas pendientes de cobro (traban stock)"
                            >
                              ⚠ {b.pendingCount}
                            </span>
                          ) : (
                            '—'
                          )}
                          {b.cancelledCount > 0 && (
                            <span
                              className="ml-1 text-red-500"
                              title="Ventas canceladas del día"
                            >
                              ({b.cancelledCount} canc.)
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
