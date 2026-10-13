'use client';

// EventBranchesTab - Qué sucursales venden el evento y cuántos boletos tiene
// cada una (asignación). PUT /events/:id/branches es un reemplazo COMPLETO:
// se mandan SOLO las sucursales palomeadas; las demás quedan desactivadas.

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { InformationCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useActiveBranches } from '@/hooks/useBranches';
import { useEventBranches, useSetEventBranches } from '@/hooks/useEvents';
import { eventErrorMessage } from '@/lib/events/format';
import { UNLIMITED_ALLOTMENT, type EventBranchDto, type EventDto } from '@/types/events';

interface RowState {
  checked: boolean;
  /** Texto del input (unidades). */
  allotment: string;
  unlimited: boolean;
}

interface BranchRow {
  branchId: string;
  code: string;
  name: string;
  /** Asignación vigente en el API (si la hay). */
  current: EventBranchDto | null;
}

const EMPTY_ROW: RowState = { checked: false, allotment: '', unlimited: false };

function initialRows(assigned: EventBranchDto[]): Record<string, RowState> {
  const out: Record<string, RowState> = {};
  for (const b of assigned) {
    const unlimited = b.allotment >= UNLIMITED_ALLOTMENT;
    out[b.branchId] = {
      checked: b.isActive,
      allotment: unlimited ? '' : String(b.allotment),
      unlimited,
    };
  }
  return out;
}

export function EventBranchesTab({ event }: { event: EventDto }) {
  const { data: assigned, isLoading: loadingAssigned } = useEventBranches(event.id);
  const { data: activeBranches, isLoading: loadingBranches } = useActiveBranches();
  const saveMutation = useSetEventBranches();

  /**
   * Solo los CAMBIOS del usuario viven en estado; lo demás se lee de la
   * asignación que regresa el API (`base`). Así no hay que copiar el server
   * a estado con un efecto, y guardar/descartar es vaciar los cambios.
   */
  const [edits, setEdits] = useState<Record<string, RowState>>({});
  const [search, setSearch] = useState('');

  const base = useMemo(() => initialRows(assigned ?? []), [assigned]);

  /**
   * Sucursales que se ofrecen: las ACTIVAS del país del evento (si el catálogo
   * trae countryId; si ninguna lo trae, todas) más las que ya tienen asignación
   * aunque hoy estén inactivas o sean de otro país (para poder verlas y quitarlas).
   */
  const branchRows = useMemo<BranchRow[]>(() => {
    const byId = new Map<string, BranchRow>();
    const all = activeBranches ?? [];
    const anyHasCountry = all.some((b) => !!b.countryId);
    for (const b of all) {
      if (anyHasCountry && b.countryId !== event.countryId) continue;
      byId.set(b.id, { branchId: b.id, code: b.code, name: b.name, current: null });
    }
    for (const a of assigned ?? []) {
      const existing = byId.get(a.branchId);
      if (existing) existing.current = a;
      else if (a.isActive || a.soldUnits > 0 || a.ticketsIssued > 0) {
        byId.set(a.branchId, {
          branchId: a.branchId,
          code: a.branchCode,
          name: a.branchName,
          current: a,
        });
      }
    }
    return Array.from(byId.values()).sort((x, y) =>
      x.name.localeCompare(y.name, 'es', { sensitivity: 'base' }),
    );
  }, [activeBranches, assigned, event.countryId]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branchRows;
    return branchRows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    );
  }, [branchRows, search]);

  const rowState = useCallback(
    (id: string): RowState => edits[id] ?? base[id] ?? EMPTY_ROW,
    [edits, base],
  );

  const patchRow = (id: string, patch: Partial<RowState>) =>
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? base[id] ?? EMPTY_ROW), ...patch },
    }));

  const dirty = useMemo(() => {
    for (const id of Object.keys(edits)) {
      const a = base[id] ?? EMPTY_ROW;
      const b = edits[id];
      if (a.checked !== b.checked) return true;
      if (!b.checked) continue;
      if (a.unlimited !== b.unlimited) return true;
      if (!b.unlimited && a.allotment.trim() !== b.allotment.trim()) return true;
    }
    return false;
  }, [base, edits]);

  const summary = useMemo(() => {
    let selling = 0;
    let units = 0;
    let unlimited = false;
    for (const r of branchRows) {
      const s = rowState(r.branchId);
      if (!s.checked) continue;
      selling += 1;
      if (s.unlimited) unlimited = true;
      else units += Number(s.allotment) || 0;
    }
    return { selling, units, unlimited };
  }, [branchRows, rowState]);

  const handleSave = async () => {
    const payload: { branchId: string; allotment: number }[] = [];
    for (const r of branchRows) {
      const s = rowState(r.branchId);
      if (!s.checked) continue;
      if (s.unlimited) {
        payload.push({ branchId: r.branchId, allotment: UNLIMITED_ALLOTMENT });
        continue;
      }
      const n = Number(s.allotment);
      if (s.allotment.trim() === '' || !Number.isInteger(n) || n < 0) {
        toast.error(`Captura los boletos asignados a ${r.name} (entero ≥ 0) o marca “Sin límite”.`);
        return;
      }
      if (n >= UNLIMITED_ALLOTMENT) {
        toast.error(`${r.name}: para no poner tope usa “Sin límite”.`);
        return;
      }
      const sold = r.current?.soldUnits ?? 0;
      if (n < sold) {
        toast.error(`${r.name}: ya vendió ${sold}; no puedes asignar menos.`);
        return;
      }
      payload.push({ branchId: r.branchId, allotment: n });
    }
    if (event.capacity && !summary.unlimited && summary.units > event.capacity) {
      toast.error(`La asignación (${summary.units}) supera el aforo del evento (${event.capacity}).`);
      return;
    }
    try {
      await saveMutation.mutateAsync({ id: event.id, branches: payload });
      setEdits({});
      toast.success(
        payload.length === 0
          ? 'Asignación guardada: ninguna sucursal vende este evento.'
          : `Asignación guardada: ${payload.length} ${payload.length === 1 ? 'sucursal vende' : 'sucursales venden'} el evento.`,
      );
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo guardar la asignación.'));
    }
  };

  // Producto vinculado: no hay asignación que editar (el API responde 400
  // EVENT_LINKED_PRODUCT); se muestra dónde hay existencia, solo lectura.
  if (event.linkedProduct) {
    return <LinkedProductBranches event={event} rows={assigned ?? []} isLoading={loadingAssigned} />;
  }

  const isLoading = loadingAssigned || loadingBranches;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-[#a7c1e2] bg-[#C8DDF2]/20 p-3 text-sm text-[#2f5165]">
        <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p>
            Los boletos asignados funcionan como existencia del producto en la sucursal; no se puede
            bajar por debajo de lo ya vendido.
          </p>
          {event.status === 'draft' && (
            <p className="mt-1 text-[#2f5165]/80">
              El evento está en borrador: las sucursales podrán vender cuando lo actives.
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-80">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar sucursal por nombre o clave…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{summary.selling}</span>{' '}
              {summary.selling === 1 ? 'sucursal vende' : 'sucursales venden'} ·{' '}
              <span className="font-semibold text-gray-900">
                {summary.unlimited ? 'sin límite' : summary.units.toLocaleString('es-MX')}
              </span>{' '}
              boletos asignados
              {event.capacity ? ` · aforo ${event.capacity.toLocaleString('es-MX')}` : ''}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : branchRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No hay sucursales activas del país del evento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16 px-3">Vende</TableHead>
                    <TableHead className="px-3">Sucursal</TableHead>
                    <TableHead className="w-56 px-3">Boletos asignados</TableHead>
                    <TableHead className="w-24 px-3 text-right">Restantes</TableHead>
                    <TableHead className="w-24 px-3 text-right">Vendidos</TableHead>
                    <TableHead className="w-32 px-3 text-right">Boletos emitidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-gray-500">
                        Ninguna sucursal coincide con la búsqueda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((r) => {
                      const s = rowState(r.branchId);
                      const cur = r.current;
                      const belowSold =
                        s.checked &&
                        !s.unlimited &&
                        s.allotment.trim() !== '' &&
                        Number(s.allotment) < (cur?.soldUnits ?? 0);
                      return (
                        <TableRow key={r.branchId} className={s.checked ? 'bg-emerald-50/30' : ''}>
                          <TableCell className="px-3">
                            <Checkbox
                              checked={s.checked}
                              onCheckedChange={(v) => patchRow(r.branchId, { checked: v === true })}
                              aria-label={`Vende en ${r.name}`}
                            />
                          </TableCell>
                          <TableCell className="px-3">
                            <p className="font-medium text-gray-900">{r.name}</p>
                            <p className="font-mono text-xs text-gray-400">{r.code}</p>
                          </TableCell>
                          <TableCell className="px-3">
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                min={cur?.soldUnits ?? 0}
                                step={1}
                                value={s.unlimited ? '' : s.allotment}
                                placeholder={s.unlimited ? 'Sin límite' : '0'}
                                disabled={!s.checked || s.unlimited}
                                onChange={(e) => patchRow(r.branchId, { allotment: e.target.value })}
                                className={`w-28 ${belowSold ? 'border-red-400' : ''}`}
                                aria-invalid={belowSold || undefined}
                                aria-label={`Boletos asignados a ${r.name}`}
                              />
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                                <Switch
                                  size="sm"
                                  checked={s.unlimited}
                                  disabled={!s.checked}
                                  onCheckedChange={(v) => patchRow(r.branchId, { unlimited: v })}
                                  aria-label={`Sin límite en ${r.name}`}
                                />
                                Sin límite
                              </label>
                            </div>
                            {belowSold && (
                              <p className="mt-1 text-xs text-red-600">
                                Ya vendió {cur?.soldUnits}; no puedes asignar menos.
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="px-3 text-right tabular-nums text-gray-700">
                            {cur ? (cur.allotment >= UNLIMITED_ALLOTMENT ? '∞' : cur.remaining.toLocaleString('es-MX')) : '—'}
                          </TableCell>
                          <TableCell className="px-3 text-right tabular-nums text-gray-700">
                            {cur ? cur.soldUnits.toLocaleString('es-MX') : '—'}
                          </TableCell>
                          <TableCell className="px-3 text-right tabular-nums text-gray-700">
                            {cur ? cur.ticketsIssued.toLocaleString('es-MX') : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
            {dirty && <p className="text-xs text-amber-700">Hay cambios sin guardar.</p>}
            <Button
              type="button"
              variant="ghost"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => setEdits({})}
            >
              Descartar
            </Button>
            <Button type="button" onClick={handleSave} disabled={!dirty || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {saveMutation.isPending ? 'Guardando…' : 'Guardar asignación'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Evento sobre un producto EXISTENTE: se vende en las sucursales que tengan
 * existencia del producto. Solo lectura: `allotment` = existencia + vendido,
 * `remaining` = disponible.
 */
function LinkedProductBranches({
  event,
  rows,
  isLoading,
}: {
  event: EventDto;
  rows: EventBranchDto[];
  isLoading: boolean;
}) {
  const [search, setSearch] = useState('');
  const productCode = event.productCode || event.code;

  const sorted = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => a.branchName.localeCompare(b.branchName, 'es', { sensitivity: 'base' })),
    [rows],
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (r) => r.branchName.toLowerCase().includes(q) || r.branchCode.toLowerCase().includes(q),
    );
  }, [sorted, search]);
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          remaining: acc.remaining + r.remaining,
          sold: acc.sold + r.soldUnits,
          tickets: acc.tickets + r.ticketsIssued,
        }),
        { remaining: 0, sold: 0, tickets: 0 },
      ),
    [rows],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-[#a7c1e2] bg-[#C8DDF2]/20 p-3 text-sm text-[#2f5165]">
        <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Este evento usa el producto <span className="font-mono font-semibold">{productCode}</span>: se
          vende en las sucursales que tengan existencia; muévela con traspasos de inventario.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-80">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar sucursal por nombre o clave…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{rows.length}</span>{' '}
              {rows.length === 1 ? 'sucursal con existencia' : 'sucursales con existencia'} ·{' '}
              <span className="font-semibold text-gray-900">{totals.remaining.toLocaleString('es-MX')}</span>{' '}
              disponibles · <span className="font-semibold text-gray-900">{totals.sold.toLocaleString('es-MX')}</span>{' '}
              vendidos · <span className="font-semibold text-gray-900">{totals.tickets.toLocaleString('es-MX')}</span>{' '}
              boletos
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Ninguna sucursal tiene existencia del producto {productCode}. Dale entrada o tráspasala desde
              Inventario.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3">Sucursal</TableHead>
                    <TableHead className="w-32 px-3 text-right">Existencia disponible</TableHead>
                    <TableHead className="w-24 px-3 text-right">Vendidos</TableHead>
                    <TableHead className="w-32 px-3 text-right">Boletos emitidos</TableHead>
                    <TableHead className="w-36 px-3 text-right">Existencia + vendidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500">
                        Ninguna sucursal coincide con la búsqueda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map((r) => (
                      <TableRow key={r.branchId} className={r.isActive ? '' : 'opacity-60'}>
                        <TableCell className="px-3">
                          <p className="font-medium text-gray-900">{r.branchName}</p>
                          <p className="font-mono text-xs text-gray-400">{r.branchCode}</p>
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums text-gray-900">
                          {r.remaining.toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums text-gray-700">
                          {r.soldUnits.toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums text-gray-700">
                          {r.ticketsIssued.toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums text-gray-500">
                          {r.allotment.toLocaleString('es-MX')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
