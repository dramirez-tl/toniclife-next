'use client';

// WarehousesCard — Almacenes que surten los pedidos a domicilio de un país de la tienda,
// en orden de preferencia. SOLO LECTURA: se cambian en "Almacenes y envíos"
// (/admin/configuracion/rutas-envio), que es la pantalla que los edita.

import Link from 'next/link';
import { ArrowRight, CircleAlert, CircleCheck, RefreshCw, Warehouse } from 'lucide-react';
import { positionLabel } from '@/components/admin/fulfillment/fulfillment-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { READINESS_LINKS } from '@/lib/store-country/readiness';
import { WAREHOUSE_BLOCK_LABELS, type StoreWarehousePlace } from '@/lib/store-country/warehouses';
import { SectionCard } from './store-country-ui';

interface WarehousesCardProps {
  countryName: string;
  /** undefined = cargando; null = no se pudieron consultar. */
  places: StoreWarehousePlace[] | null | undefined;
  onRetry: () => void;
}

function emptyText(place: StoreWarehousePlace, countryName: string): string {
  return place.isZone
    ? `${place.name} no tiene almacén asignado. En Almacenes y envíos se le pueden dar los mismos que a ${countryName}.`
    : `${place.name} no tiene almacén asignado: no se pueden enviar pedidos a domicilio.`;
}

export function WarehousesCard({ countryName, places, onRetry }: WarehousesCardProps) {
  const withZones = (places?.length ?? 0) > 1;

  return (
    <SectionCard
      id="almacenes"
      icon={Warehouse}
      title="Almacenes que surten"
      description="De qué almacén salen los pedidos a domicilio, en orden de preferencia. Aquí solo se consulta."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href={READINESS_LINKS.routes}>
            Cambiar en Almacenes y envíos <ArrowRight aria-hidden />
          </Link>
        </Button>
      }
    >
      {places === undefined ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : places === null ? (
        <div className="rounded-lg border border-dashed p-4 text-sm">
          <p className="text-foreground">No se pudieron consultar los almacenes.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            <RefreshCw aria-hidden /> Reintentar
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {places.map((place) => (
            <section key={place.code} aria-label={`Almacenes de ${place.name}`} className="space-y-2">
              {withZones && (
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{place.name}</h3>
                  {place.status === 'ready' ? (
                    <Badge variant="info">
                      <CircleCheck aria-hidden /> Con almacén
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-200 bg-red-100 text-red-900">
                      <CircleAlert aria-hidden /> Sin almacén que surta
                    </Badge>
                  )}
                </div>
              )}

              {place.routes.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-foreground">{emptyText(place, countryName)}</p>
              ) : (
                <ol className="space-y-2" aria-label={`Almacenes que envían a ${place.name}, en orden de preferencia`}>
                  {place.routes.map((route, index) => (
                    <li
                      key={route.branchId}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-background px-3 py-2.5"
                    >
                      <span className="text-xs font-medium text-muted-foreground">{positionLabel(index)}</span>
                      <span className="min-w-0 flex-1 basis-40">
                        <span className="block break-words font-medium text-foreground">{route.label}</span>
                        {route.city && <span className="block text-xs text-muted-foreground">{route.city}</span>}
                      </span>
                      {route.current ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-900">
                          <CircleCheck aria-hidden /> Surte hoy
                        </Badge>
                      ) : route.blocked ? (
                        <Badge variant="warning" className="whitespace-normal text-left">
                          <CircleAlert aria-hidden /> {WAREHOUSE_BLOCK_LABELS[route.blocked]}
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}

              {place.routes.length > 0 && place.status !== 'ready' && (
                <p className="text-sm text-red-800">
                  Ninguno de estos almacenes puede surtir hoy: {place.name} está sin envío a domicilio.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
