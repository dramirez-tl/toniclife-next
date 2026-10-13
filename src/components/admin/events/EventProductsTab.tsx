'use client';

// EventProductsTab - Claves (productos) que generan boletos del evento
// (mig 155). La principal es el producto del evento (Titular); las demás son
// p. ej. la clave de Invitado (FOC5). Cada una dice cuántos boletos genera
// por unidad cobrada y con qué etiqueta se imprimen.

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  InformationCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  useEventProducts,
  useRemoveEventProduct,
  useUpsertEventProduct,
} from '@/hooks/useEvents';
import { eventErrorMessage, formatEventMoney } from '@/lib/events/format';
import type { EventDto, EventProductDto } from '@/types/events';
import { ProductPicker } from './ProductPicker';

interface DialogState {
  mode: 'add' | 'edit';
  productId: string;
  productLabel: string;
  ticketsPerUnit: string;
  label: string;
}

const DEFAULT_GUEST_LABEL = 'Invitado';

export function EventProductsTab({ event }: { event: EventDto }) {
  const { data, isLoading } = useEventProducts(event.id);
  // Mientras carga la lista propia, la ficha ya trae las claves.
  const products = useMemo(() => data ?? event.products ?? [], [data, event.products]);
  const upsertMutation = useUpsertEventProduct();
  const removeMutation = useRemoveEventProduct();

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [removing, setRemoving] = useState<EventProductDto | null>(null);

  const listedIds = useMemo(() => new Set(products.map((p) => p.productId)), [products]);

  const openAdd = () =>
    setDialog({
      mode: 'add',
      productId: '',
      productLabel: '',
      ticketsPerUnit: '1',
      label: DEFAULT_GUEST_LABEL,
    });

  const openEdit = (p: EventProductDto) =>
    setDialog({
      mode: 'edit',
      productId: p.productId,
      productLabel: `${p.productCode} — ${p.productName}`,
      ticketsPerUnit: String(p.ticketsPerUnit ?? 1),
      label: p.label ?? '',
    });

  const patchDialog = (patch: Partial<DialogState>) =>
    setDialog((d) => (d ? { ...d, ...patch } : d));

  const handleSave = async () => {
    if (!dialog) return;
    if (!dialog.productId) {
      toast.error('Elige la clave (producto) que generará boletos.');
      return;
    }
    const n = Number(dialog.ticketsPerUnit);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      toast.error('Los boletos por unidad deben ser un entero entre 1 y 20.');
      return;
    }
    const label = dialog.label.trim();
    if (label.length > 60) {
      toast.error('La etiqueta es demasiado larga (máximo 60).');
      return;
    }
    try {
      await upsertMutation.mutateAsync({
        id: event.id,
        input: { productId: dialog.productId, ticketsPerUnit: n, label: label || undefined },
      });
      toast.success(dialog.mode === 'add' ? 'Clave agregada al evento' : 'Clave actualizada');
      setDialog(null);
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo guardar la clave.'));
    }
  };

  const handleRemove = async () => {
    if (!removing) return;
    try {
      await removeMutation.mutateAsync({ id: event.id, productId: removing.productId });
      toast.success(`Clave ${removing.productCode} quitada del evento`);
      setRemoving(null);
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo quitar la clave.'));
    }
  };

  const busy = upsertMutation.isPending || removeMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-[#a7c1e2] bg-[#C8DDF2]/20 p-3 text-sm text-[#2f5165]">
        <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Cada clave que se cobre en el POS genera los boletos indicados. Ej.: frasco = Titular,
          FOC5 = Invitado.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{products.length}</span>{' '}
              {products.length === 1 ? 'clave genera boletos' : 'claves generan boletos'}
            </p>
            <Button type="button" onClick={openAdd} disabled={busy}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Agregar clave
            </Button>
          </div>

          {isLoading && products.length === 0 ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Este evento aún no tiene claves que generen boletos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3">Clave</TableHead>
                    <TableHead className="px-3">Nombre</TableHead>
                    <TableHead className="px-3 text-right">Precio público</TableHead>
                    <TableHead className="px-3 text-right">Boletos por unidad</TableHead>
                    <TableHead className="px-3">Etiqueta</TableHead>
                    <TableHead className="px-3">Principal</TableHead>
                    <TableHead className="px-3 text-right">Vendidos</TableHead>
                    <TableHead className="px-3">Activa</TableHead>
                    <TableHead className="px-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.productId} className={p.isActive ? '' : 'opacity-60'}>
                      <TableCell className="px-3">
                        <span className="font-mono text-sm font-semibold text-[#3E667D]">{p.productCode}</span>
                      </TableCell>
                      <TableCell className="px-3">
                        <p className="text-sm text-gray-900">{p.productName}</p>
                        <p className="text-xs text-gray-400">{p.productType}</p>
                      </TableCell>
                      <TableCell className="px-3 text-right tabular-nums text-gray-700">
                        {p.publicPrice === null || p.publicPrice === undefined
                          ? '—'
                          : formatEventMoney(p.publicPrice, event.currencyCode)}
                      </TableCell>
                      <TableCell className="px-3 text-right tabular-nums text-gray-700">
                        {p.ticketsPerUnit}
                      </TableCell>
                      <TableCell className="px-3">
                        {p.label ? (
                          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
                            {p.label}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3">
                        {p.isMain && (
                          <Badge variant="outline" className="border-[#a7c1e2] bg-[#C8DDF2]/30 text-[#2f5165]">
                            Principal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-3 text-right tabular-nums text-gray-700">
                        {p.soldUnits.toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell className="px-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant="outline"
                            className={
                              p.isActive
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-gray-200 bg-gray-100 text-gray-500'
                            }
                          >
                            {p.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                          {!p.availableInPos && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              No en POS
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#C8DDF2]/20 hover:text-[#3E667D]"
                            title="Editar boletos por unidad y etiqueta"
                            aria-label={`Editar la clave ${p.productCode}`}
                            disabled={busy}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemoving(p)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                            title={p.isMain ? 'La clave principal no se puede quitar' : 'Quitar del evento'}
                            aria-label={`Quitar la clave ${p.productCode}`}
                            disabled={busy || p.isMain}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agregar / editar clave */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && !upsertMutation.isPending && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === 'add' ? 'Agregar clave' : 'Editar clave'}</DialogTitle>
            <DialogDescription>
              {dialog?.mode === 'add'
                ? 'Producto del catálogo que, al cobrarse en el POS, genera boletos de este evento.'
                : 'Boletos que genera cada unidad cobrada y etiqueta con la que se imprimen.'}
            </DialogDescription>
          </DialogHeader>
          {dialog && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="evp-product">Clave (producto) *</Label>
                {dialog.mode === 'add' ? (
                  <ProductPicker
                    id="evp-product"
                    productId={dialog.productId}
                    productLabel={dialog.productLabel}
                    exclude={(p) => listedIds.has(p.id) || p.productType === 'event'}
                    onChange={({ productId, productLabel }) => patchDialog({ productId, productLabel })}
                    placeholder="Buscar por clave o nombre (p. ej. FOC5)…"
                  />
                ) : (
                  <p className="text-sm text-gray-800">
                    <span className="font-mono font-semibold text-[#3E667D]">
                      {dialog.productLabel.split(' — ')[0]}
                    </span>{' '}
                    {dialog.productLabel.split(' — ').slice(1).join(' — ')}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="evp-per-unit">Boletos por unidad *</Label>
                  <Input
                    id="evp-per-unit"
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={dialog.ticketsPerUnit}
                    onChange={(e) => patchDialog({ ticketsPerUnit: e.target.value })}
                  />
                  <p className="text-xs text-gray-400">p. ej. 2 = acceso + 1 invitado</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="evp-label">Etiqueta</Label>
                  <Input
                    id="evp-label"
                    value={dialog.label}
                    onChange={(e) => patchDialog({ label: e.target.value })}
                    placeholder="Invitado"
                    maxLength={60}
                  />
                  <p className="text-xs text-gray-400">Se imprime en el boleto (Titular, Invitado…).</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={upsertMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {upsertMutation.isPending
                ? 'Guardando…'
                : dialog?.mode === 'add'
                  ? 'Agregar'
                  : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quitar clave */}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Quitar clave del evento"
        description="Esa clave dejará de generar boletos de este evento. Los boletos ya emitidos no se tocan."
        confirmLabel="Quitar"
        destructive
        isPending={removeMutation.isPending}
        onConfirm={handleRemove}
      >
        {removing && (
          <p>
            <span className="font-mono font-semibold">{removing.productCode}</span> — {removing.productName}
            {removing.soldUnits > 0 ? ` · ${removing.soldUnits} vendidos` : ''}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
