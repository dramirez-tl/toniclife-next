'use client';

// CountryRouteCard — tarjeta de un país con su lista ORDENADA de almacenes (contrato §7.3-4).
// Principal arriba, respaldos debajo. El aviso de "se queda sin envío" se pinta
// en cuanto se apaga o se quita la única ruta que surtía: no espera al guardado.

import { useEffect, useRef } from 'react';
import { CircleAlert, CircleCheck, Clock, Copy, Info, RefreshCw, Store, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import {
  MAX_ROUTES_PER_COUNTRY,
  countryStatus,
  isCrossCountryRoute,
  noOwnStoreText,
  resolveCountry,
  type DraftRoute,
  type RoutingContext,
} from '@/lib/fulfillment/route-draft';
import { noOnlineShippingText } from '@/lib/fulfillment/route-texts';
import type {
  FulfillmentCountry,
  FulfillmentDiagnosticsCountry,
  FulfillmentWarning,
} from '@/types/fulfillment';
import { RouteRow, type RouteStockInfo } from './RouteRow';
import { SkipToSave } from './SkipToSave';
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
  /** No se pudo cargar la lista de sucursales: el selector "Agregar almacén" lo dice y ofrece reintentar. */
  optionsError?: boolean;
  onRetryOptions?: () => void;
  /** Hay cambios sin guardar: al final de la tarjeta va el salto a "Revisar y guardar". */
  showSkipToSave?: boolean;
  countryNames: Record<string, string>;
  /** País del que se pueden copiar los almacenes (FN → México), si aplica. */
  copyFrom: { countryCode: string; countryName: string } | null;
  /**
   * País SIN tienda propia (Frontera): nombre de su país fiscal. Sus clientes compran en
   * esa tienda y les surte ese almacén, así que "sin almacén" aquí es informativo, no un error.
   */
  fiscalParentName?: string | null;
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
  optionsError = false,
  onRetryOptions,
  showSkipToSave = false,
  countryNames,
  copyFrom,
  fiscalParentName = null,
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
  // Sin tienda propia y sin almacén: compra en la tienda de su país fiscal (no es un error).
  const buysInParentStore = status === 'no_warehouse' && !!fiscalParentName;

  // El foco nunca se pierde (§7.4):
  //  · al MOVER una fila se queda en ella: el botón pulsado, o el contrario si
  //    quedó deshabilitado por llegar al tope de la lista;
  //  · al QUITAR una fila (se desmonta) pasa a "Quitar" de la fila que ocupa su
  //    lugar (o de la anterior si era la última); si la lista queda vacía, al
  //    selector "Agregar almacén" y, si no lo hay, a la propia tarjeta.
  const cardRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<
    { kind: 'move'; branchId: string; direction: -1 | 1 } | { kind: 'remove'; index: number } | null
  >(null);
  useEffect(() => {
    const pending = pendingFocus.current;
    const card = cardRef.current;
    if (!pending || !card) return;
    pendingFocus.current = null;
    const rows = [...card.querySelectorAll<HTMLElement>('[data-route]')];
    if (pending.kind === 'remove') {
      const row = rows[Math.min(pending.index, rows.length - 1)];
      const target =
        row?.querySelector<HTMLElement>('[data-remove]') ??
        card.querySelector<HTMLElement>(`#${CSS.escape(`agregar-almacen-${code}`)}:not(:disabled)`) ??
        card.querySelector<HTMLElement>('[data-retry-options]') ??
        card;
      target.focus();
      return;
    }
    const row = rows.find((el) => el.dataset.route === pending.branchId);
    if (!row) return;
    const preferred = pending.direction === -1 ? 'up' : 'down';
    const fallback = pending.direction === -1 ? 'down' : 'up';
    const button =
      row.querySelector<HTMLButtonElement>(`[data-move="${preferred}"]:not(:disabled)`) ??
      row.querySelector<HTMLButtonElement>(`[data-move="${fallback}"]:not(:disabled)`);
    button?.focus();
  }, [routes, code]);

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
    <Card
      ref={cardRef}
      id={`pais-${code}`}
      tabIndex={-1}
      className="scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
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
            {/* "Tienda abierta" lleva información: verde con contraste AA (la variante `success` da 1.8:1). */}
            <Badge
              variant="outline"
              className={`whitespace-normal ${store === 'open' ? 'border-emerald-200 bg-emerald-100 text-emerald-900' : ''}`}
            >
              {store === 'open' ? <Store aria-hidden /> : <Clock aria-hidden />}
              {STORE_STATUS_LABELS[store]}
            </Badge>
            <Badge
              variant={status === 'ready' ? 'info' : buysInParentStore || (status === 'no_warehouse' && country.sellableProducts === 0) ? 'outline' : status === 'cross_pending' ? 'warning' : 'destructive'}
              className="whitespace-normal text-left"
            >
              {status === 'ready' ? <CircleCheck aria-hidden /> : buysInParentStore ? <Info aria-hidden /> : <CircleAlert aria-hidden />}
              {buysInParentStore ? `Compra en la tienda de ${fiscalParentName}` : shippingStatusLabel(status, resolved)}
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
              {noOnlineShippingText(`a ${name}`, 'haya un almacén activo en esta lista')}
            </AlertDescription>
          </Alert>
        )}

        {routes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm">
            <p className="text-foreground">
              {fiscalParentName
                ? noOwnStoreText(name, fiscalParentName)
                : `${name} no tiene almacén: hoy no se puede enviar a clientes de ${name}.`}
            </p>
            {canEdit && copyFrom && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-auto min-h-10 whitespace-normal text-left"
                  onClick={onCopyFrom}
                >
                  <Copy aria-hidden /> Usar los mismos almacenes que {copyFrom.countryName}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Al guardarlo, los carritos de los {numberFormat.format(country.customers)} clientes de {name} pasarán a
                  mostrar las existencias reales de ese almacén (hoy ven todo como disponible). Lo revisas antes de
                  guardar.
                </p>
              </>
            )}
          </div>
        ) : (
          <ol className="space-y-2" aria-label={`Almacenes que envían a ${name}, en orden de preferencia`}>
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
                    pendingFocus.current = { kind: 'move', branchId: route.branchId, direction };
                    onMove(index, direction);
                  }}
                  onToggleActive={(isActive) => onToggleActive(route.branchId, isActive)}
                  onNotesChange={(notes) => onNotesChange(route.branchId, notes)}
                  onRemove={() => {
                    pendingFocus.current = { kind: 'remove', index };
                    onRemove(route.branchId);
                  }}
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
            {isFull || optionsError ? (
              <p className="text-sm font-medium text-foreground">Agregar almacén</p>
            ) : (
              <label htmlFor={selectId} className="block text-sm font-medium text-foreground">
                Agregar almacén
              </label>
            )}
            {isFull ? (
              <p className="text-xs text-muted-foreground">
                Este país ya tiene {MAX_ROUTES_PER_COUNTRY} almacenes, que es el máximo. Quita uno para agregar otro.
              </p>
            ) : optionsError ? (
              <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-900">
                <TriangleAlert aria-hidden className="size-4 shrink-0" />
                <span>No se pudo cargar la lista de sucursales.</span>
                {onRetryOptions && (
                  <Button type="button" variant="outline" size="sm" className="h-9" data-retry-options onClick={onRetryOptions}>
                    <RefreshCw aria-hidden /> Reintentar
                  </Button>
                )}
              </div>
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
        {showSkipToSave && <SkipToSave />}
      </CardContent>
    </Card>
  );
}
