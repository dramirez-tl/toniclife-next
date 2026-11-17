'use client';

// SelfInvoicingGateCard - Interruptor de "FACTURAR DESDE MI CUENTA" en el portal del
// distribuidor (17-nov-2026), por PATCH /admin/pilot/self-invoicing. Vive en Sistema ›
// Piloto, junto a los demás, y lee el mismo estado (GET /admin/pilot/checkout). Si el
// servidor aún no manda el bloque `selfInvoicing`, la tarjeta queda deshabilitada.

import { useId } from 'react';
import { DocumentCheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePilotCheckout, useSetPilotSelfInvoicing } from '@/hooks/usePilot';

const apiError = (err: unknown, fallback: string) => {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg[0] : msg || fallback;
};

export function SelfInvoicingGateCard() {
  const { data, isLoading, isError, refetch } = usePilotCheckout();
  const setSelfInvoicing = useSetPilotSelfInvoicing();
  const switchId = useId();

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  // undefined = el API no manda `selfInvoicing`: todavía no conoce la función.
  const supported = data?.selfInvoicing !== undefined;
  const enabled = data?.selfInvoicing?.enabled === true;
  // Sin estado (la consulta falló) no se sabe qué hay encendido: no se cambia nada a ciegas.
  const locked = !supported || !data || setSelfInvoicing.isPending;
  const badge = !data ? 'Sin datos' : !supported ? 'Requiere actualizar el servidor' : enabled ? 'Encendido' : 'Apagado';
  const badgeClass =
    !data || !supported
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : enabled
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-gray-200 bg-gray-50 text-gray-600';

  const save = (next: boolean) =>
    setSelfInvoicing.mutate(next, {
      onSuccess: () =>
        toast.success(
          next ? 'Facturar desde la cuenta ENCENDIDO en el portal del distribuidor' : 'Facturar desde la cuenta apagado',
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
              <DocumentCheckIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-gray-900">Facturar desde la cuenta (portal del distribuidor)</h3>
                <Badge variant="outline" className={badgeClass}>
                  {badge}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                En su portal, en &quot;Mis facturas&quot;, el distribuidor captura y guarda sus datos fiscales y factura
                él mismo sus compras de la tienda en línea ya pagadas del mes en curso. La factura se timbra a su
                nombre, le llega por correo y la puede descargar en PDF y XML.
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
            <li>Solo el titular del pedido: una compra pagada para otro distribuidor la factura ese distribuidor.</li>
            <li>
              Un pedido que ya entró en la factura global del día de la sucursal no se factura desde la cuenta: se le
              indica pedirlo a Contabilidad.
            </li>
            <li>Vale todo el mes natural del pago (la caja usa su ventana de días); un mes anterior va con Contabilidad.</li>
            <li>
              Un pedido facturado desde la cuenta antes de la global del día ya no entra en esa global. Un intento que
              el SAT rechaza se desecha solo, para no detener la global de la sucursal.
            </li>
            <li>Apagado, el portal no muestra &quot;Mis facturas&quot; y las facturas se siguen pidiendo a Contabilidad.</li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
