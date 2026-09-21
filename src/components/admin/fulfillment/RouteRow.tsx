'use client';

// RouteRow — un almacén dentro de la lista ordenada de un país (contrato §7.3-4 / §7.4).
// El lugar en la lista ES la prioridad: no hay números que capturar. Subir y
// Bajar son botones de 40 px operables con teclado; el foco se conserva en la
// fila que se movió (lo repone CountryRouteCard con `data-route` / `data-move`).

import { useState } from 'react';
import { ArrowDown, ArrowUp, Globe, MessageSquareText, PackageCheck, PauseCircle, Trash2, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MAX_NOTES_LENGTH, isActivationLocked, type DraftRoute } from '@/lib/fulfillment/route-draft';
import { numberFormat, positionLabel, warehouseLabel } from './fulfillment-ui';

export interface RouteStockInfo {
  withStock: number;
  sellable: number;
  placeholder: boolean;
}

interface RouteRowProps {
  countryName: string;
  route: DraftRoute;
  index: number;
  total: number;
  canEdit: boolean;
  /** El almacén es de otro país fiscal que el destino. */
  isCrossCountry: boolean;
  /** true = candado puesto: la ruta se guarda, pero todavía no surte. */
  crossBlocked: boolean;
  /** Nombre del país del almacén (o su código si no se conoce). */
  branchCountryName: string | null;
  stock: RouteStockInfo | null;
  onMove: (direction: -1 | 1) => void;
  onToggleActive: (isActive: boolean) => void;
  onNotesChange: (notes: string | null) => void;
  onRemove: () => void;
}

export function RouteRow({
  countryName,
  route,
  index,
  total,
  canEdit,
  isCrossCountry,
  crossBlocked,
  branchCountryName,
  stock,
  onMove,
  onToggleActive,
  onNotesChange,
  onRemove,
}: RouteRowProps) {
  const name = warehouseLabel(route);
  const dimmed = !route.isActive || !route.branchIsActive || (isCrossCountry && crossBlocked);
  // Ruta en pausa + sucursal desactivada: activarla daría 422 FUL_BRANCH_INACTIVE al guardar.
  const activationLocked = isActivationLocked(route);
  const lockHintId = `activa-bloqueada-${countryName}-${route.branchId}`.replace(/[^\w-]+/g, '-');

  return (
    <li
      data-route={route.branchId}
      className={`rounded-lg border p-3 ${dimmed ? 'border-dashed bg-muted/40' : 'bg-card'}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{positionLabel(index)}</p>
          <p className="break-words font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">
            {[route.branchCity, branchCountryName].filter(Boolean).join(' · ') || 'País del almacén sin definir'}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {!route.branchIsActive && (
              <Badge variant="destructive" className="whitespace-normal">
                <TriangleAlert aria-hidden /> Sucursal desactivada
              </Badge>
            )}
            {!route.isActive && (
              <Badge variant="warning" className="whitespace-normal">
                <PauseCircle aria-hidden /> En pausa
              </Badge>
            )}
            {isCrossCountry && (
              <Badge variant={crossBlocked ? 'warning' : 'info'} className="whitespace-normal text-left">
                <Globe aria-hidden />
                {crossBlocked ? 'Envío internacional · todavía no surte' : 'Envío internacional'}
              </Badge>
            )}
            {stock && (
              <Badge variant="outline" className="whitespace-normal text-left">
                <PackageCheck aria-hidden />
                {numberFormat.format(stock.withStock)} de {numberFormat.format(stock.sellable)} productos con existencias
              </Badge>
            )}
            {stock?.placeholder && (
              <Badge variant="outline" className="whitespace-normal text-muted-foreground">
                Existencias sin conciliar
              </Badge>
            )}
          </div>

          {isCrossCountry && crossBlocked && (
            <p className="mt-2 text-xs text-amber-800">
              Se puede guardar, pero todavía no surte pedidos: los envíos de un país a otro aún no están habilitados.
            </p>
          )}
          {activationLocked && (
            <p id={lockHintId} className="mt-2 text-xs text-red-800">
              No se puede activar: la sucursal está desactivada. Actívala primero en Sucursales, o quítala de esta lista.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <Switch
              checked={route.isActive}
              onCheckedChange={onToggleActive}
              disabled={!canEdit || activationLocked}
              aria-label={`Ruta ${name} a ${countryName} activa`}
              aria-describedby={activationLocked ? lockHintId : undefined}
            />
            <span aria-hidden>Activa</span>
          </label>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              data-move="up"
              onClick={() => onMove(-1)}
              disabled={!canEdit || index === 0}
              aria-label={`Subir ${name} en la lista de ${countryName}`}
              title="Subir"
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              data-move="down"
              onClick={() => onMove(1)}
              disabled={!canEdit || index === total - 1}
              aria-label={`Bajar ${name} en la lista de ${countryName}`}
              title="Bajar"
            >
              <ArrowDown aria-hidden />
            </Button>
          </div>

          <NotesPopover
            key={route.notes ?? ''}
            notes={route.notes}
            canEdit={canEdit}
            label={`${name} a ${countryName}`}
            onSave={onNotesChange}
          />

          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              className="h-10 text-destructive hover:text-destructive"
              data-remove
              onClick={onRemove}
              aria-label={`Quitar ${name} de ${countryName}`}
            >
              <Trash2 aria-hidden /> Quitar
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function NotesPopover({
  notes,
  canEdit,
  label,
  onSave,
}: {
  notes: string | null;
  canEdit: boolean;
  label: string;
  onSave: (notes: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(notes ?? '');
  const fieldId = `nota-${label.replace(/\W+/g, '-')}`;

  if (!canEdit && !notes) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setText(notes ?? '');
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" className="h-10" aria-label={`Nota de ${label}${notes ? ' (tiene nota)' : ''}`}>
          <MessageSquareText aria-hidden /> {notes ? 'Ver nota' : 'Nota'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))]" align="end">
        {canEdit ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(text);
              setOpen(false);
            }}
          >
            <Label htmlFor={fieldId}>Nota (opcional)</Label>
            <Textarea
              id={fieldId}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_NOTES_LENGTH))}
              maxLength={MAX_NOTES_LENGTH}
              rows={4}
              placeholder="Ej. Respaldo solo para temporada alta"
              aria-describedby={`${fieldId}-count`}
            />
            <div className="flex items-center justify-between gap-2">
              <span id={`${fieldId}-count`} className="text-xs text-muted-foreground">
                {text.length} de {MAX_NOTES_LENGTH}
              </span>
              <Button type="submit" size="sm">
                Listo
              </Button>
            </div>
          </form>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm">{notes}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
