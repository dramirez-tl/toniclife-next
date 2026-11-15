'use client';

// BuyForOtherGateCard - Interruptor de "COMPRAR PARA OTRO DISTRIBUIDOR" en la tienda en
// línea (15-nov-2026), por PATCH /admin/pilot/buy-for-other. Vive en Sistema › Piloto,
// junto al de compras y al de OXXO, y lee el mismo estado (GET /admin/pilot/checkout).
// Si el servidor aún no manda el bloque `buyForOther`, la tarjeta queda deshabilitada.

import { useId } from 'react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePilotCheckout, useSetPilotBuyForOther } from '@/hooks/usePilot';

const apiError = (err: unknown, fallback: string) => {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg[0] : msg || fallback;
};

export function BuyForOtherGateCard() {
  const { data, isLoading, isError, refetch } = usePilotCheckout();
  const setBuyForOther = useSetPilotBuyForOther();
  const switchId = useId();

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  // undefined = el API no manda `buyForOther`: todavía no conoce la función.
  const supported = data?.buyForOther !== undefined;
  const enabled = data?.buyForOther?.enabled === true;
  // Sin estado (la consulta falló) no se sabe qué hay encendido: no se cambia nada a ciegas.
  const locked = !supported || !data || setBuyForOther.isPending;
  const badge = !data ? 'Sin datos' : !supported ? 'Requiere actualizar el servidor' : enabled ? 'Encendido' : 'Apagado';
  const badgeClass =
    !data || !supported
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : enabled
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-gray-200 bg-gray-50 text-gray-600';

  const save = (next: boolean) =>
    setBuyForOther.mutate(next, {
      onSuccess: () =>
        toast.success(
          next ? 'Comprar para otro distribuidor ENCENDIDO en la tienda' : 'Comprar para otro distribuidor apagado',
        ),
      onError: (e) => toast.error(apiError(e, 'No se pudo guardar el interruptor')),
    });

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <UserPlusIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-gray-900">Comprar para otro distribuidor (tienda en línea)</h3>
                <Badge variant="outline" className={badgeClass}>
                  {badge}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                En el paso &quot;Datos&quot; del checkout, un distribuidor activo y con kit puede escribir el número de
                otro distribuidor: la tienda le muestra a quién corresponde y el pedido, con sus puntos y su valor de
                negocio, se registra a nombre de esa persona. Quien paga queda guardado en el pedido y recibe los
                avisos; al otro distribuidor se le avisa por correo que le registraron una compra.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Switch id={switchId} checked={enabled} disabled={locked} onCheckedChange={save} />
            <Label htmlFor={switchId} className="text-sm">
              Ofrecerlo
            </Label>
          </div>
        </div>

        {isError && !data ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            No se pudo cargar el estado del interruptor.{' '}
            <button className="underline" onClick={() => void refetch()}>
              Reintentar
            </button>
          </div>
        ) : !supported ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            El servidor todavía no conoce esta función: requiere actualizar el servidor (API) para poder encenderla.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Solo entre distribuidores activos, con kit, del mismo país y con la misma lista de precios.</li>
            <li>No aplica a kits de inscripción: un kit cambia la posición de quien queda como titular.</li>
            <li>El cupón, el carrito y las direcciones guardadas siguen siendo de quien paga.</li>
            <li>
              Necesita la migración 203 aplicada en la base de datos. Sin ella la tienda no lo ofrece aunque esté
              encendido.
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
