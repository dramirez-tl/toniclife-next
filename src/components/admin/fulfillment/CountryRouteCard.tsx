'use client';

// CountryRouteCard — tarjeta de un país con su lista ORDENADA de almacenes (contrato §7.3-4).
// Principal arriba, respaldos debajo. El aviso de "se queda sin envío" se pinta
// en cuanto se apaga o se quita la única ruta que surtía: no espera al guardado.

import { useEffect, useRef } from 'react';
import { CircleAlert, CircleCheck, Clock, Copy, Info, Store, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import {
  MAX_ROUTES_PER_COUNTRY,
  countryStatus,
  isCrossCountryRoute,
  resolveCountry,
  type DraftRoute,
  type RoutingContext,
} from '@/lib/fulfillment/route-draft';
import type {
  FulfillmentCountry,
  FulfillmentDiagnosticsCountry,
  FulfillmentWarning,
} from '@/types/fulfillment';
import { RouteRow, type RouteStockInfo } from './RouteRow';
import {
  STORE_STATUS_LABELS,
  countryFlag,
  numberFormat,
  shippingStatusLabel,
  storeStatus,
} from './fulfillment-ui';

interface CountryRouteCardProps {
  country: FulfillmentCountry;
  routes: DraftRoute[];
  /** El país resolvía almacén con lo GUARDADO (para avisar si el borrador lo deja sin envío). */
  resolvedBefore: boolean;
  ctx: RoutingContext;
  canEdit: boolean;
  diagnostics: FulfillmentDiagnosticsCountry | null;
  /** Avisos de datos de este país (existencias, costos de envío, impuestos…). */
  warnings: FulfillmentWarning[];
  warehouseOptions: SearchableSelectOption[];
  countryNames: Record<string, string>;
  /** País del que se pueden copiar los almacenes (FN → México), si aplica. */
  copyFrom: { countryCode: string; countryName: string } | null;
  onMove: (index: number, direction: -1 | 1) => void;
  onToggleActive: (branchId: string, isActive: boolean) => void;
  onNotesChange: (branchId: string, notes: string | null) => void;
  onRemove: (branchId: string) => void;
  onAddWarehouse: (branchId: string) => void;
  onCopyFrom: () => void;
}

export function CountryRouteCard({
  country,
  routes,
  resolvedBefore,
  ctx,
  canEdit,
  diagnostics,
  warnings,
  warehouseOptions,
  countryNames,
  copyFrom,
  onMove,
  onToggleActive,
  onNotesChange,
  onRemove,
  onAddWarehouse,
  onCopyFrom,
}: CountryRouteCardProps) {
  const code = country.countryCode;
  const name = country.countryName;
  const resolved = resolveCountry(routes, code, ctx);
  const status = countryStatus(routes, code, ctx);
  const store = storeStatus(code);
  const flag = countryFlag(code);
  const losesShipping = resolvedBefore && !resolved;

  // Conserva el foco en la fila que se movió (§7.4): el botón pulsado, o el
  // contrario si quedó deshabilitado por llegar al tope de la lista.
  const listRef = useRef<HTMLOListElement>(null);
  const pendingFocus = useRef<{ branchId: string; direction: -1 | 1 } | null>(null);
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending || !listRef.current) return;
    pendingFocus.current = null;
    const row = [...listRef.current.querySelectorAll<HTMLElement>('[data-route]')].find(
      (el) => el.dataset.route === pending.branchId,
    );
    if (!row) return;
    const preferred = pending.direction === -1 ? 'up' : 'down';
    const fallback = pending.direction === -1 ? 'down' : 'up';
    const button =
      row.querySelector<HTMLButtonElement>(`[data-move="${preferred}"]:not(:disabled)`) ??
      row.querySelector<HTMLButtonElement>(`[data-move="${fallback}"]:not(:disabled)`);
    button?.focus();
  }, [routes]);

  const stockOf = (branchId: string): RouteStockInfo | null => {
    const w = diagnostics?.warehouses.find((x) => x.branchId === branchId);
    if (!w || !diagnostics) return null;
    const flagged = warnings.some((x) => x.code === 'PLACEHOLDER_STOCK' && x.branchId === branchId);
    return {
      withStock: w.sellableWithStock,
      sellable: diagnostics.sellableProducts,
      placeholder: flagged || (w.placeholderRows > 0 && w.placeholderRows * 2 >= w.sellableWithStock),
    };
  };

  const available = warehouseOptions.filter((o) => !routes.some((r) => r.branchId === o.value));
  const isFull = routes.length >= MAX_ROUTES_PER_COUNTRY;
  const selectId = `agregar-almacen-${code}`;

  return (
    <Card id={`pais-${code}`} tabIndex={-1} className="scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {flag && (
              <span aria-hidden className="text-xl leading-none">
                {flag}
              </span>
            )}
            <h3 className="text-lg font-semibold text-foreground">{name}</h3>
            {country.currencyCode && <span className="text-sm text-muted-foreground">{country.currencyCode}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={store === 'open' ? 'success' : 'outline'} className="whitespace-normal">
              {store === 'open' ? <Store aria-hidden /> : <Clock aria-hidden />}
              {STORE_STATUS_LABELS[store]}
            </Badge>
            <Badge
              variant={status === 'ready' ? 'info' : status === 'no_warehouse' && country.sellableProducts === 0 ? 'outline' : status === 'cross_pending' ? 'warning' : 'destructive'}
              className="whitespace-normal text-left"
            >
              {status === 'ready' ? <CircleCheck aria-hidden /> : <CircleAlert aria-hidden />}
              {shippingStatusLabel(status, resolved)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {numberFormat.format(country.sellableProducts)} productos a la venta · {numberFormat.format(country.customers)}{' '}
            clientes
          </p>
        </header>

        {losesShipping && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>Con este cambio {name} se queda sin envío a domicilio</AlertTitle>
            <AlertDescription>
              Nadie podrá pedir con envío a {name} hasta que haya un almacén activo en esta lista.
            </AlertDescription>
          </Alert>
        )}

        {routes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm">
            <p className="text-foreground">
              {name} no tiene almacén: hoy no se puede enviar a clientes de {name}.
            </p>
            {canEdit && copyFrom && (
              <Button type="button" variant="outline" className="mt-3 h-10 whitespace-normal text-left" onClick={onCopyFrom}>
                <Copy aria-hidden /> Usar los mismos almacenes que {copyFrom.countryName}
              </Button>
            )}
          </div>
        ) : (
          <ol ref={listRef} className="space-y-2" aria-label={`Almacenes que envían a ${name}, en orden de preferencia`}>
            {routes.map((route, index) => {
              const cross = isCrossCountryRoute(route, code, ctx);
              return (
                <RouteRow
                  key={route.branchId}
                  countryName={name}
                  route={route}
                  index={index}
                  total={routes.length}
                  canEdit={canEdit}
                  isCrossCountry={cross}
                  crossBlocked={cross && ctx.crossCountry !== 'allow'}
                  branchCountryName={
                    route.branchCountryCode ? (countryNames[route.branchCountryCode] ?? route.branchCountryCode) : null
                  }
                  stock={stockOf(route.branchId)}
                  onMove={(direction) => {
                    pendingFocus.current = { branchId: route.branchId, direction };
                    onMove(index, direction);
                  }}
                  onToggleActive={(isActive) => onToggleActive(route.branchId, isActive)}
                  onNotesChange={(notes) => onNotesChange(route.branchId, notes)}
                  onRemove={() => onRemove(route.branchId)}
                />
              );
            })}
          </ol>
        )}

        {warnings.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground" aria-label={`Avisos de ${name}`}>
            {warnings.map((w, i) => (
              <li key={`${w.code}-${w.branchId ?? ''}-${i}`} className="flex gap-1.5">
                {w.severity === 'info' ? (
                  <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                ) : (
                  <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                )}
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <footer className="space-y-1.5 border-t pt-3">
            <label htmlFor={selectId} className="block text-sm font-medium text-foreground">
              Agregar almacén
            </label>
            {isFull ? (
              <p className="text-xs text-muted-foreground">
                Este país ya tiene {MAX_ROUTES_PER_COUNTRY} almacenes, que es el máximo. Quita uno para agregar otro.
              </p>
            ) : (
              <>
                <SearchableSelect
                  id={selectId}
                  options={available}
                  value=""
                  onChange={(branchId) => {
                    if (branchId) onAddWarehouse(branchId);
                  }}
                  showAllOption={false}
                  placeholder="Busca por clave o nombre…"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Entra al final de la lista, como respaldo.</p>
              </>
            )}
          </footer>
        )}
      </CardContent>
    </Card>
  );
}
