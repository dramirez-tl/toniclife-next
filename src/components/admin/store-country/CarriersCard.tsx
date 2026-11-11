'use client';

// CarriersCard — Paqueterías con las que se envía en un país de la tienda (mig 200).
//
// Lista las del país y, con `fulfillment:manage`, deja agregar, editar, elegir la
// predeterminada y desactivar o reactivar (no se borran: así se conserva el historial).
// Son las que se ofrecen al marcar un envío en Inventario › Entregas a domicilio.
//
// Estados que la pantalla tiene que explicar bien, porque son los primeros que se ven:
//   · falta aplicar la migración 200 → la lista llega vacía con `schemaReady: false`;
//   · el servidor todavía no tiene el catálogo (API anterior) → 404.
// En ambos la paquetería se sigue escribiendo a mano en cada envío.

import { useState } from 'react';
import { CircleAlert, Link2, Lock, Pencil, Plus, RefreshCw, Star, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCarriers, useUpdateCarrier } from '@/hooks/useFulfillment';
import { fulfillmentErrorMessage, parseFulfillmentError } from '@/lib/fulfillment/fulfillment-error';
import { carriersOfCountry, sortCarriers } from '@/lib/store-country/carriers';
import type { StoreCountryInfo } from '@/lib/store-country/countries';
import { storeCountryScope } from '@/lib/store-country/countries';
import type { Carrier } from '@/types/fulfillment';
import { CarrierDialog } from './CarrierDialog';
import { SectionCard } from './store-country-ui';

interface CarriersCardProps {
  country: StoreCountryInfo;
  /** `fulfillment:manage`: puede agregar y cambiar paqueterías. */
  canManage: boolean;
}

const BY_HAND = 'Mientras tanto, la paquetería se escribe a mano en cada envío, como hasta ahora.';

export function CarriersCard({ country, canManage }: CarriersCardProps) {
  const query = useCarriers(country.code);
  const update = useUpdateCarrier();
  const scope = storeCountryScope(country);

  // null = cerrado; 'new' = alta; una paquetería = edición.
  const [editing, setEditing] = useState<Carrier | 'new' | null>(null);
  const [deactivating, setDeactivating] = useState<Carrier | null>(null);
  // Id de la paquetería con un cambio rápido en curso (predeterminada / reactivar).
  const [busyId, setBusyId] = useState<string | null>(null);

  const status = parseFulfillmentError(query.error).status;
  const notOnServer = query.isError && status === 404;
  const schemaReady = query.data?.schemaReady !== false;
  const carriers = sortCarriers(carriersOfCountry(query.data?.carriers ?? [], country.code));
  const canEdit = canManage && !!query.data && schemaReady;

  const quickChange = (carrier: Carrier, payload: { isDefault?: boolean; isActive?: boolean }, done: string) => {
    setBusyId(carrier.id);
    update.mutate(
      { id: carrier.id, payload },
      {
        onSuccess: () => toast.success(done),
        onError: (error) => toast.error(fulfillmentErrorMessage(error, 'No se pudo guardar el cambio.')),
        onSettled: () => setBusyId(null),
      },
    );
  };

  const confirmDeactivate = () => {
    if (!deactivating) return;
    const carrier = deactivating;
    update.mutate(
      { id: carrier.id, payload: { isActive: false } },
      {
        onSuccess: () => {
          toast.success(`${carrier.name} desactivada: ya no se ofrece al marcar envíos`);
          setDeactivating(null);
        },
        onError: (error) => toast.error(fulfillmentErrorMessage(error, 'No se pudo desactivar la paquetería.')),
      },
    );
  };

  return (
    <SectionCard
      id="paqueterias"
      icon={Truck}
      title="Paqueterías"
      description={`Con cuáles se envía en ${scope}. Son las que Almacén elige al marcar un envío; la predeterminada sale ya elegida.`}
      action={
        canManage ? (
          <Button type="button" size="sm" onClick={() => setEditing('new')} disabled={!canEdit}>
            <Plus aria-hidden /> Agregar paquetería
          </Button>
        ) : undefined
      }
    >
      {query.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : notOnServer ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <CircleAlert aria-hidden />
          <AlertTitle className="line-clamp-none">El catálogo de paqueterías todavía no está disponible en el servidor</AlertTitle>
          <AlertDescription className="text-amber-900">
            En cuanto se actualice, aquí se podrán registrar las paqueterías de {scope}. {BY_HAND}
          </AlertDescription>
        </Alert>
      ) : query.isError ? (
        <div className="rounded-lg border border-dashed p-4 text-sm">
          <p className="text-foreground">
            {status === 403 ? 'Tu usuario no puede ver las paqueterías.' : 'No se pudieron consultar las paqueterías.'}
          </p>
          {status !== 403 && (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
              <RefreshCw aria-hidden /> Reintentar
            </Button>
          )}
        </div>
      ) : !schemaReady ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <CircleAlert aria-hidden />
          <AlertTitle className="line-clamp-none">Falta aplicar la migración 200 para guardar paqueterías</AlertTitle>
          <AlertDescription className="text-amber-900">
            La aplica Sistemas en la base de datos. En cuanto esté, aquí aparecerán las paqueterías de {scope} y se podrán
            agregar más. {BY_HAND}
          </AlertDescription>
        </Alert>
      ) : carriers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm">
          <p className="text-foreground">Todavía no hay paqueterías registradas para {scope}.</p>
          <p className="mt-1 text-muted-foreground">
            {canManage
              ? 'Agrega la primera: se ofrecerá al marcar un envío. Mientras no haya ninguna, la paquetería se escribe a mano.'
              : 'Mientras no haya ninguna, la paquetería se escribe a mano en cada envío.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label={`Paqueterías de ${scope}`}>
          {carriers.map((carrier) => {
            const rowBusy = busyId === carrier.id;
            return (
              <li
                key={carrier.id}
                className={`rounded-lg border bg-background p-3 ${carrier.isActive ? '' : 'bg-muted/40'}`}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className={`font-medium ${carrier.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {carrier.name}
                  </span>
                  {carrier.isDefault && (
                    <Badge variant="info">
                      <Star aria-hidden /> Predeterminada
                    </Badge>
                  )}
                  {!carrier.isActive && <Badge variant="outline">Desactivada</Badge>}
                </div>

                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Link2 aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  {carrier.trackingUrlTemplate ? (
                    <span className="break-all">{carrier.trackingUrlTemplate}</span>
                  ) : (
                    <span>Sin enlace de rastreo: quien compra ve la guía, pero no un enlace para rastrearla.</span>
                  )}
                </p>
                {carrier.notes && <p className="mt-1 text-xs text-muted-foreground">Nota: {carrier.notes}</p>}

                {canEdit && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {carrier.isActive && !carrier.isDefault && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={rowBusy}
                        onClick={() =>
                          quickChange(carrier, { isDefault: true }, `${carrier.name} es ahora la predeterminada de ${scope}`)
                        }
                      >
                        <Star aria-hidden /> Hacer predeterminada
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" disabled={rowBusy} onClick={() => setEditing(carrier)}>
                      <Pencil aria-hidden /> Editar
                    </Button>
                    {carrier.isActive ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:bg-red-50 hover:text-red-800"
                        disabled={rowBusy}
                        onClick={() => setDeactivating(carrier)}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={rowBusy}
                        onClick={() => quickChange(carrier, { isActive: true }, `${carrier.name} reactivada`)}
                      >
                        Reactivar
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {country.zones.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Las paqueterías de {country.name} son también las de {country.zones.map((z) => z.name).join(' y ')}.
        </p>
      )}

      {!canManage && !query.isLoading && !query.isError && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>Solo consulta: para agregar o cambiar paqueterías hace falta el permiso para administrar Almacenes y envíos.</span>
        </p>
      )}

      <CarrierDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        countryCode={country.code}
        countryScope={scope}
        carrier={editing === 'new' ? null : editing}
        others={carriers}
      />

      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        title={`¿Desactivar ${deactivating?.name ?? 'la paquetería'}?`}
        description={`Dejará de ofrecerse al marcar envíos de ${scope}. Los envíos que ya la tienen no cambian y la puedes reactivar cuando quieras.`}
        confirmLabel="Desactivar"
        cancelLabel="Volver"
        destructive
        isPending={update.isPending && deactivating !== null}
        onConfirm={confirmDeactivate}
      >
        {deactivating?.isDefault && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Es la predeterminada: {scope} se queda sin paquetería predeterminada hasta que elijas otra.
          </p>
        )}
      </ConfirmDialog>
    </SectionCard>
  );
}
