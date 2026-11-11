'use client';

// OnlineRevenueCard — Ingresos de la tienda en línea de un país en un rango de fechas.
//
// Son INGRESOS (lo cobrado en pedidos ya pagados), no ganancias: el sistema no guarda el
// costo de los productos. El dato principal es el TOTAL; productos, envío e impuestos van
// como detalle sin sugerir que suman el total, porque en los pedidos importados de la
// tienda del sistema anterior no lo suman.
//
// El rango (periodo actual, anterior u otras fechas) lo lleva `useOnlineRevenue` y sale
// de los periodos de negocio del API.

import { CircleAlert, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { StoreCountryInfo } from '@/lib/store-country/countries';
import { storeCountryScope } from '@/lib/store-country/countries';
import { formatCount, formatMoney, toAmount } from '@/lib/store-country/money';
import {
  formatRange,
  gatewayShare,
  hasPreviousStoreOrders,
  isEmptyOnlineSales,
  onlineSalesOfCountry,
  onlineSalesProblem,
  periodLabel,
} from '@/lib/store-country/online-sales';
import type { OnlineSalesCountry } from '@/types/reports';
import { SectionCard } from './store-country-ui';
import type { OnlineRevenue, RevenueMode } from './useOnlineRevenue';

interface OnlineRevenueCardProps {
  country: StoreCountryInfo;
  revenue: OnlineRevenue;
}

const MODES: { value: RevenueMode; label: string }[] = [
  { value: 'current', label: 'Periodo actual' },
  { value: 'previous', label: 'Periodo anterior' },
  { value: 'custom', label: 'Otras fechas' },
];

const plural = (n: number, one: string, many: string) => `${formatCount(n)} ${n === 1 ? one : many}`;

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-base font-semibold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Figures({ row }: { row: OnlineSalesCountry }) {
  const currency = row.currency;
  const discount = toAmount(row.discount);

  if (isEmptyOnlineSales(row)) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-foreground">
        No hubo pedidos en línea en estas fechas.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* El total es el dato principal: uno solo, grande. */}
      <div>
        <p className="text-sm text-muted-foreground">Total cobrado</p>
        <p className="break-words text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {formatMoney(row.total, currency)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          en {plural(row.paidOrders, 'pedido pagado', 'pedidos pagados')}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Detalle</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Productos" value={formatMoney(row.subtotal, currency)} />
          <StatTile label="Envío" value={formatMoney(row.shipping, currency)} />
          <StatTile label="Impuestos" value={formatMoney(row.tax, currency)} />
          <StatTile label="Descuentos" value={discount > 0 ? `-${formatMoney(discount, currency)}` : formatMoney(0, currency)} />
          <StatTile label="Piezas vendidas" value={formatCount(row.units)} />
          <StatTile label="Puntos" value={formatCount(row.points)} />
        </div>
        {hasPreviousStoreOrders(row) && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>En los pedidos de la tienda anterior el desglose puede no sumar el total.</span>
          </p>
        )}
      </div>

      {row.gateways.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Por dónde se cobró</h3>
          <ul className="max-w-2xl space-y-3">
            {row.gateways.map((gateway) => {
              const share = gatewayShare(gateway, row);
              return (
                <li key={`${gateway.gateway}:${gateway.account ?? ''}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <span className="text-sm font-medium text-foreground">{gateway.label}</span>
                    <span className="text-sm text-foreground">
                      {formatMoney(gateway.total, currency)}
                      <span className="text-muted-foreground">
                        {' '}
                        · {plural(gateway.orders, 'pedido', 'pedidos')} · {Math.round(share)}%
                      </span>
                    </span>
                  </div>
                  {/* Barra de proporción: un solo tono, sobre su misma gama; el dato exacto está en el texto. */}
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#C8DDF2]/60" aria-hidden>
                    <div className="h-full rounded-full bg-[#3E667D]" style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {row.pendingOrders > 0 ? (
          <>
            Además hay {plural(row.pendingOrders, 'pedido pendiente', 'pedidos pendientes')} de pago por{' '}
            <span className="font-medium text-foreground">{formatMoney(row.pendingTotal, currency)}</span>. Todavía no
            cuentan como ingreso.
          </>
        ) : (
          'No hay pedidos pendientes de pago en estas fechas.'
        )}
      </p>
    </div>
  );
}

export function OnlineRevenueCard({ country, revenue }: OnlineRevenueCardProps) {
  const { mode, setMode, current, previous, range, draft, changeDraft, customError, applyCustom, query } = revenue;
  const scope = storeCountryScope(country);
  const problem = query.isError ? onlineSalesProblem(query.error) : null;
  const row = onlineSalesOfCountry(query.data, country.code);

  const rangeCaption =
    mode === 'current' && current
      ? periodLabel(current)
      : mode === 'previous' && previous
        ? periodLabel(previous)
        : range
          ? formatRange(range)
          : null;

  return (
    <SectionCard
      id="ingresos"
      icon={TrendingUp}
      title="Ingresos en línea"
      description={`Lo cobrado en pedidos en línea ya pagados de ${scope}. Son ingresos, no ganancias: el sistema no guarda el costo de los productos.`}
    >
      {/* Un solo filtro, arriba de todo lo que afecta. */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Fechas de los ingresos">
          {MODES.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={mode === option.value ? 'default' : 'outline'}
              aria-pressed={mode === option.value}
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {mode === 'custom' && (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              applyCustom();
            }}
          >
            <div>
              <Label htmlFor="revenue-from">Desde</Label>
              <Input
                id="revenue-from"
                type="date"
                className="mt-1 w-40"
                value={draft.from}
                onChange={(e) => changeDraft({ from: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="revenue-to">Hasta</Label>
              <Input
                id="revenue-to"
                type="date"
                className="mt-1 w-40"
                value={draft.to}
                onChange={(e) => changeDraft({ to: e.target.value })}
              />
            </div>
            <Button type="submit" variant="outline">
              Consultar
            </Button>
            {customError && (
              <p role="alert" className="basis-full text-sm text-red-700">
                {customError}
              </p>
            )}
          </form>
        )}

        {rangeCaption && <p className="text-sm text-muted-foreground">{rangeCaption}</p>}
      </div>

      {revenue.periodFailed ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-foreground">
          {mode === 'previous'
            ? 'No se encontró el periodo anterior. Elige «Otras fechas» y escribe el rango que quieras ver.'
            : 'No se pudo consultar el periodo en curso. Elige «Otras fechas» y escribe el rango que quieras ver.'}
        </p>
      ) : mode === 'custom' && !range ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-foreground">
          Elige las dos fechas y pulsa Consultar. El rango puede abarcar hasta un año.
        </p>
      ) : problem === 'not_available' ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-foreground">
          Los ingresos en línea todavía no están disponibles en el servidor. Aparecerán aquí en cuanto se actualice.
        </p>
      ) : problem ? (
        <div className="rounded-lg border border-dashed p-4 text-sm">
          <p className="text-foreground">
            {problem === 'bad_range'
              ? 'El servidor no aceptó esas fechas. Revisa el rango e inténtalo de nuevo.'
              : 'No se pudieron consultar los ingresos en línea.'}
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
            <RefreshCw aria-hidden /> Reintentar
          </Button>
        </div>
      ) : !query.data ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-16 w-64 max-w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !row ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-foreground">
          El servidor no devolvió los ingresos de {country.name} para estas fechas.
        </p>
      ) : (
        // Al cambiar de fechas se deja lo anterior atenuado hasta que llega lo nuevo (sin saltos).
        <div className={query.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={query.isPlaceholderData}>
          <Figures row={row} />
        </div>
      )}

      {country.zones.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Los pedidos de {country.zones.map((z) => z.name).join(' y ')} cuentan dentro de {country.name}.
        </p>
      )}
    </SectionCard>
  );
}
