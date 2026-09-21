'use client';

// SaveSummaryDialog — "Revisar y guardar" (contrato §7.3-7).
// Resume los cambios en lenguaje llano. Si un país que HOY se puede enviar se
// queda sin almacén, el diálogo es destructivo: lista los países con sus
// productos y clientes y, si el país tiene la tienda abierta, pide TECLEAR su
// nombre. El cuerpo del PUT lleva esos países en `confirmEmptyCountries`.
//
// El padre lo monta solo mientras está abierto, así el motivo y el texto
// tecleado arrancan vacíos cada vez.

import { useId, useState } from 'react';
import { ArrowRight, ShoppingCart, TriangleAlert } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_NOTES_LENGTH, type DraftRoute } from '@/lib/fulfillment/route-draft';
import { changeKey, confirmTextForCountries, describeChange, type RouteChange } from '@/lib/fulfillment/route-diff';
import { numberFormat, storeStatus, warehouseLabel } from './fulfillment-ui';

/** País que hoy no tiene almacén y con este guardado empieza a tenerlo (p. ej. Frontera con los de México). */
export interface GainingCountry {
  countryCode: string;
  countryName: string;
  customers: number;
  /** "164 · Irapuato…": el almacén cuyas existencias pasarán a verse en los carritos. */
  warehouseLabel: string;
}

export interface LosingCountry {
  countryCode: string;
  countryName: string;
  sellableProducts: number;
  customers: number;
}

interface SaveSummaryDialogProps {
  changes: RouteChange[];
  /** Texto del cambio de "varios almacenes", si lo hay. */
  stockModeChange: string | null;
  countryNames: Record<string, string>;
  losing: LosingCountry[];
  /** Países que cambian de almacén sin quedarse sin envío. */
  switching: Array<{ countryCode: string; from: DraftRoute | null; to: DraftRoute }>;
  /** Almacenes quitados o pausados que todavía tienen pedidos pendientes de pago. */
  pendingOrders: Array<{ branchId: string; label: string; count: number }>;
  /** Rutas nuevas entre países: se guardan, pero todavía no surten. */
  crossBlocked: string[];
  /** Llaves (`changeKey`) de los cambios cuya ruta va a otro país fiscal con el candado puesto. */
  crossBlockedKeys: Set<string>;
  /** Países que pasan de "sin almacén" a tener uno: cambia lo que ven los carritos de sus clientes. */
  gaining: GainingCountry[];
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function SaveSummaryDialog({
  changes,
  stockModeChange,
  countryNames,
  losing,
  switching,
  pendingOrders,
  crossBlocked,
  crossBlockedKeys,
  gaining,
  isSaving,
  onClose,
  onConfirm,
}: SaveSummaryDialogProps) {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const destructive = losing.length > 0;
  // Se teclea el nombre solo de los países con la tienda ABIERTA.
  const confirmText = confirmTextForCountries(
    losing.filter((c) => storeStatus(c.countryCode) === 'open').map((c) => c.countryName),
  );

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={destructive ? 'Revisa bien: un país se queda sin envío' : 'Revisar y guardar'}
      description="Esto es lo que va a cambiar. Aplica en la tienda en menos de un minuto."
      confirmLabel={destructive ? 'Guardar de todos modos' : 'Guardar cambios'}
      cancelLabel="Seguir editando"
      confirmText={confirmText}
      confirmMatch="loose"
      destructive={destructive}
      isPending={isSaving}
      onConfirm={() => onConfirm(reason)}
      contentClassName="max-h-[90vh] overflow-y-auto sm:max-w-xl"
    >
      <div className="space-y-4">
        {destructive && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
            <p className="flex items-center gap-2 font-semibold">
              <TriangleAlert aria-hidden className="size-4 shrink-0" />
              {losing.length === 1 ? 'Este país se queda sin envío a domicilio:' : 'Estos países se quedan sin envío a domicilio:'}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {losing.map((c) => (
                <li key={c.countryCode}>
                  <strong>{c.countryName}</strong>: {numberFormat.format(c.sellableProducts)} productos a la venta y{' '}
                  {numberFormat.format(c.customers)} clientes.
                  {storeStatus(c.countryCode) === 'open' ? ' Su tienda está abierta.' : ''}
                </li>
              ))}
            </ul>
            <p className="mt-2">Nadie podrá pedir con envío a domicilio ahí hasta que vuelvas a poner un almacén activo.</p>
          </div>
        )}

        <section aria-label="Cambios">
          <h3 className="mb-1 font-semibold text-foreground">Cambios</h3>
          <ul className="list-disc space-y-1 pl-5">
            {changes.map((change, i) => (
              <li key={`${change.countryCode}-${change.type}-${change.branchId ?? 'orden'}-${i}`}>
                {describeChange(change, countryNames[change.countryCode] ?? change.countryCode, {
                  crossBlocked: crossBlockedKeys.has(changeKey(change.countryCode, change.branchId)),
                })}
              </li>
            ))}
            {stockModeChange && <li>{stockModeChange}</li>}
          </ul>
        </section>

        {switching.length > 0 && (
          <section aria-label="Quién surte después de guardar">
            <h3 className="mb-1 font-semibold text-foreground">Quién surte después de guardar</h3>
            <ul className="space-y-1">
              {switching.map((s) => (
                <li key={s.countryCode} className="flex flex-wrap items-center gap-1">
                  <span className="font-medium">{countryNames[s.countryCode] ?? s.countryCode}:</span>
                  <span>{s.from ? warehouseLabel(s.from) : 'sin almacén'}</span>
                  <ArrowRight aria-hidden className="size-3.5" />
                  <span className="sr-only">cambia a</span>
                  <span>{warehouseLabel(s.to)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {gaining.length > 0 && (
          <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <ShoppingCart aria-hidden className="size-4 shrink-0" />
              Ojo: cambia lo que ven los clientes en su carrito
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {gaining.map((g) => (
                <li key={g.countryCode}>
                  <strong>{g.countryName}</strong>: los carritos de sus {numberFormat.format(g.customers)} clientes pasarán
                  a mostrar las existencias reales de {g.warehouseLabel}.
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Hoy, como ese país no tiene almacén, su carrito muestra todo como disponible. Al guardar, lo que no tenga
              existencias en ese almacén les aparecerá como agotado, en menos de un minuto.
            </p>
          </div>
        )}

        {crossBlocked.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <p className="font-semibold">Se guarda, pero todavía no surte pedidos:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {crossBlocked.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
            <p className="mt-1">
              Por ahora un almacén solo surte pedidos de su mismo país (México y Frontera cuentan como uno). Los envíos de
              un país a otro aún no están habilitados; cuando se habiliten, esta configuración ya estará lista.
            </p>
          </div>
        )}

        {pendingOrders.length > 0 && (
          <ul className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-slate-800">
            {pendingOrders.map((p) => (
              <li key={p.branchId}>
                {numberFormat.format(p.count)} {p.count === 1 ? 'pedido pendiente de pago seguirá' : 'pedidos pendientes de pago seguirán'}{' '}
                saliendo de {p.label}.
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={reasonId}>Motivo del cambio (opcional)</Label>
          <Input
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_NOTES_LENGTH))}
            maxLength={MAX_NOTES_LENGTH}
            placeholder="Ej. El almacén de Tulsa cierra por inventario"
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground">
            Se guarda junto con el cambio y se ve en el Historial de esta pantalla.
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
}
