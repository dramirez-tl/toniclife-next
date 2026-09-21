'use client';

// WarehouseCountriesDialog — "¿A qué países envía {almacén}?" (contrato §7.3-3).
// El atajo escribe sobre el MISMO borrador que las tarjetas: nada se guarda aquí.
// Cada casilla dice qué pasaría: quién surte hoy ese país, si el almacén queda
// de respaldo, si es un envío entre países (se guarda, pero todavía no surte) o
// si al desmarcarlo el país se queda sin envío.

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MAX_ROUTES_PER_COUNTRY,
  isCrossCountryRoute,
  resolveCountry,
  type DraftWarehouse,
  type RouteDraft,
  type RoutingContext,
} from '@/lib/fulfillment/route-draft';
import type { FulfillmentCountry } from '@/types/fulfillment';
import { countryFlag, warehouseLabel } from './fulfillment-ui';

interface WarehouseCountriesDialogProps {
  warehouse: DraftWarehouse;
  draft: RouteDraft;
  countries: FulfillmentCountry[];
  ctx: RoutingContext;
  onClose: () => void;
  onApply: (countryCodes: string[]) => void;
}

/** Se monta al abrir (el padre lo renderiza solo con un almacén elegido): el estado arranca limpio. */
export function WarehouseCountriesDialog({
  warehouse,
  draft,
  countries,
  ctx,
  onClose,
  onApply,
}: WarehouseCountriesDialogProps) {
  const baseId = useId();
  const current = countries
    .filter((c) => (draft.countries[c.countryCode] ?? []).some((r) => r.branchId === warehouse.branchId))
    .map((c) => c.countryCode);
  const [selected, setSelected] = useState<string[]>(current);
  const [showAll, setShowAll] = useState(false);

  const visible = countries.filter(
    (c) => showAll || c.sellableProducts > 0 || current.includes(c.countryCode) || selected.includes(c.countryCode),
  );
  const hiddenCount = countries.length - visible.length;
  const label = warehouseLabel(warehouse);

  const toggle = (code: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...new Set([...prev, code])] : prev.filter((c) => c !== code)));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>¿A qué países envía {label}?</DialogTitle>
          <DialogDescription>
            Marca los países. Todavía no se guarda nada: los cambios quedan en tu borrador para que los revises.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-1">
          {visible.map((country) => {
            const code = country.countryCode;
            const routes = draft.countries[code] ?? [];
            const already = current.includes(code);
            const checked = selected.includes(code);
            const position = routes.findIndex((r) => r.branchId === warehouse.branchId);
            const resolved = resolveCountry(routes, code, ctx);
            const cross = isCrossCountryRoute(warehouse, code, ctx) && ctx.crossCountry !== 'allow';
            const full = !already && routes.length >= MAX_ROUTES_PER_COUNTRY;
            const leavesEmpty =
              already && !checked && resolved?.branchId === warehouse.branchId &&
              !resolveCountry(routes.filter((r) => r.branchId !== warehouse.branchId), code, ctx);

            let context: string;
            if (full) context = `ya tiene ${MAX_ROUTES_PER_COUNTRY} almacenes (el máximo)`;
            else if (cross) context = 'se guardará, pero todavía no surtirá pedidos (envíos entre países pendientes)';
            else if (already) context = `ya le envía (lugar ${position + 1} de su lista)`;
            else if (resolved) context = `hoy lo surte ${resolved.branchCode} (este almacén quedaría como respaldo)`;
            else context = 'hoy no tiene almacén (este almacén quedaría como principal)';

            const id = `${baseId}-${code}`;
            const flag = countryFlag(code);
            return (
              <li key={code} className="rounded-md px-2 py-2 hover:bg-muted/50">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={full}
                    onCheckedChange={(value) => toggle(code, value === true)}
                    className="mt-0.5 size-5"
                    aria-describedby={`${id}-ctx`}
                  />
                  <div className="min-w-0 text-sm">
                    <label htmlFor={id} className="font-medium text-foreground">
                      {flag && (
                        <span aria-hidden className="mr-1">
                          {flag}
                        </span>
                      )}
                      {country.countryName}
                    </label>
                    <p id={`${id}-ctx`} className={cross && checked ? 'text-amber-800' : 'text-muted-foreground'}>
                      {context}
                    </p>
                    {leavesEmpty && (
                      <p role="status" className="font-medium text-destructive">
                        {country.countryName} se quedaría sin envío a domicilio.
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {(hiddenCount > 0 || showAll) && (
          <Button type="button" variant="link" className="h-10 justify-start px-2" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Mostrar solo países con productos a la venta' : `Mostrar todos los países (${hiddenCount} más)`}
          </Button>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onApply(selected)}>
            Aplicar al borrador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
