'use client';

// WarehouseSummary — "Almacenes que envían": la vista inversa almacén → países (contrato §7.3-3).
// Es como piensa el usuario ("este almacén manda a estos países"); el botón
// "Elegir países" abre el atajo que escribe sobre el mismo borrador.

import { MapPin, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import type { DraftWarehouseSummary } from '@/lib/fulfillment/route-draft';
import { countryFlag, warehouseLabel } from './fulfillment-ui';

interface WarehouseSummaryProps {
  warehouses: DraftWarehouseSummary[];
  countryNames: Record<string, string>;
  /** Almacenes con configuración heredada (tienda en "Muy pronto" + existencias sin conciliar). */
  legacyBranchIds: Set<string>;
  canEdit: boolean;
  warehouseOptions: SearchableSelectOption[];
  onChooseCountries: (branchId: string) => void;
}

export function WarehouseSummary({
  warehouses,
  countryNames,
  legacyBranchIds,
  canEdit,
  warehouseOptions,
  onChooseCountries,
}: WarehouseSummaryProps) {
  const available = warehouseOptions.filter((o) => !warehouses.some((w) => w.branchId === o.value));

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Warehouse aria-hidden className="size-5" /> Almacenes que envían
          </h2>
          <p className="text-sm text-muted-foreground">Cada almacén y los países a los que manda pedidos.</p>
        </div>

        {warehouses.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-foreground">
            Todavía no hay almacenes que envíen pedidos. Agrega el primero aquí abajo.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {warehouses.map((w) => {
              const home = w.branchCountryCode ? (countryNames[w.branchCountryCode] ?? w.branchCountryCode) : null;
              return (
                <li key={w.branchId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-foreground">
                      {warehouseLabel(w)}
                      {home ? <span className="font-normal text-muted-foreground"> — {home}</span> : null}
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={`Países a los que envía ${warehouseLabel(w)}`}>
                      {w.countryCodes.map((code) => (
                        <li key={code}>
                          <Badge variant="info">
                            <span aria-hidden>{countryFlag(code) ?? <MapPin />}</span>
                            {countryNames[code] ?? code}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                    {!w.branchIsActive && (
                      <p className="mt-1 text-xs font-medium text-destructive">Esta sucursal está desactivada: no surte pedidos.</p>
                    )}
                    {legacyBranchIds.has(w.branchId) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Configuración heredada · tienda en Muy pronto · existencias sin conciliar
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0"
                      onClick={() => onChooseCountries(w.branchId)}
                      aria-label={`Elegir países de ${warehouseLabel(w)}`}
                    >
                      Elegir países
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canEdit && (
          <div className="space-y-1.5">
            <label htmlFor="agregar-almacen-general" className="block text-sm font-medium text-foreground">
              {warehouses.length === 0 ? 'Agregar el primer almacén' : 'Agregar almacén'}
            </label>
            <SearchableSelect
              id="agregar-almacen-general"
              options={available}
              value=""
              onChange={(branchId) => {
                if (branchId) onChooseCountries(branchId);
              }}
              showAllOption={false}
              placeholder="Busca una sucursal por clave o nombre…"
              className="w-full sm:max-w-md"
            />
            <p className="text-xs text-muted-foreground">Al elegirla te preguntamos a qué países envía.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
