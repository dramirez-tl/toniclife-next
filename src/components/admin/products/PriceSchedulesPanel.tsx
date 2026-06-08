'use client';

import { useState } from 'react';
import {
  CalendarDaysIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  usePriceSchedules,
  useCreatePriceSchedule,
  useCancelPriceSchedule,
  useProductPrices,
} from '@/hooks/useProducts';
import { useActiveCountries, useActivePriceTypes } from '@/hooks/useConfig';
import type { ProductPriceSchedule } from '@/types/product';

interface PriceSchedulesPanelProps {
  productId: string;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: 'Programado', className: 'bg-amber-50 text-amber-700' },
  applied: { label: 'Aplicado', className: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500' },
  failed: { label: 'Falló', className: 'bg-red-50 text-red-700' },
};

function todayStr(): string {
  // YYYY-MM-DD en local; el backend valida con CURRENT_DATE igualmente.
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatApplyOn(s: string): string {
  return new Date(`${s}T12:00:00`).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const emptyForm = {
  countryId: '',
  priceTypeId: '',
  applyOn: '',
  price: '',
  cost: '',
  points: '',
  businessValue: '',
  note: '',
};

export function PriceSchedulesPanel({ productId }: PriceSchedulesPanelProps) {
  const { data: schedules = [], isLoading } = usePriceSchedules(productId);
  const { data: countries = [] } = useActiveCountries();
  const { data: priceTypes = [] } = useActivePriceTypes();
  const { data: prices = [] } = useProductPrices(productId);
  const createSchedule = useCreatePriceSchedule();
  const cancelSchedule = useCancelPriceSchedule();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const setField = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // Precio actual de la combinación elegida (referencia dentro del modal)
  const currentPrice = prices.find(
    (p) =>
      p.countryId === form.countryId &&
      p.priceTypeId === form.priceTypeId &&
      p.isActive !== false,
  );

  const useCurrentValues = () => {
    if (!currentPrice) return;
    setForm((prev) => ({
      ...prev,
      price: currentPrice.price ?? '',
      cost: currentPrice.cost ?? '',
      points: currentPrice.points ?? '',
      businessValue: currentPrice.businessValue ?? '',
    }));
  };

  const openModal = () => {
    setForm({ ...emptyForm, applyOn: '' });
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.countryId || !form.priceTypeId) {
      toast.error('Selecciona país y tipo de precio');
      return;
    }
    if (!form.applyOn) {
      toast.error('Selecciona la fecha de aplicación');
      return;
    }
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0) {
      toast.error('Ingresa un precio válido');
      return;
    }
    const country = countries.find((c) => c.id === form.countryId);
    if (!country?.currencyCode) {
      toast.error('El país seleccionado no tiene moneda configurada');
      return;
    }

    try {
      await createSchedule.mutateAsync({
        productId,
        dto: {
          countryId: form.countryId,
          priceTypeId: form.priceTypeId,
          currencyCode: country.currencyCode.trim(),
          applyOn: form.applyOn,
          price: Number(form.price),
          cost: form.cost !== '' ? Number(form.cost) : undefined,
          points: form.points !== '' ? Number(form.points) : undefined,
          businessValue: form.businessValue !== '' ? Number(form.businessValue) : undefined,
          note: form.note.trim() || undefined,
        },
      });
      toast.success('Cambio de precio programado');
      setShowModal(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al programar el cambio';
      toast.error(typeof msg === 'string' ? msg : 'Error al programar el cambio');
    }
  };

  const handleCancel = async (scheduleId: string) => {
    setCancelingId(scheduleId);
    try {
      await cancelSchedule.mutateAsync({ productId, scheduleId });
      toast.success('Programación cancelada');
    } catch {
      toast.error('No se pudo cancelar la programación');
    } finally {
      setCancelingId(null);
    }
  };

  const money = (v?: string, currency?: string) => {
    if (v == null) return null;
    const n = Number(v);
    if (isNaN(n)) return null;
    return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`;
  };

  return (
    <Card className="p-0">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-[#3E667D]" />
            <h2 className="text-lg font-bold text-gray-900">Cambios de precio programados</h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openModal}>
            <PlusIcon className="mr-1 h-4 w-4" />
            Programar cambio
          </Button>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          El nuevo precio entra <strong>automáticamente</strong> el día indicado (proceso diario 00:05, hora de México).
          No afecta el precio actual hasta entonces. Puedes cancelar mientras esté pendiente.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" /> Cargando programaciones...
          </div>
        ) : schedules.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
            <ClockIcon className="mx-auto mb-2 h-9 w-9 text-gray-300" />
            <p className="text-sm text-gray-500">No hay cambios de precio programados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((s: ProductPriceSchedule) => {
              const meta = STATUS_META[s.status] ?? STATUS_META.pending;
              const isCanceling = cancelingId === s.id;
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                        {s.status === 'applied' ? (
                          <CheckCircleIcon className="h-3 w-3" />
                        ) : s.status === 'failed' ? (
                          <ExclamationTriangleIcon className="h-3 w-3" />
                        ) : (
                          <ClockIcon className="h-3 w-3" />
                        )}
                        {meta.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatApplyOn(s.applyOn)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(s.countryName ?? s.countryId)} · {(s.priceTypeName ?? 'Precio')}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                      <span className="font-semibold text-gray-900">
                        {money(s.newPrice, s.currencyCode)}
                      </span>
                      {s.newCost && (
                        <span className="text-xs text-gray-500">Costo: {money(s.newCost)}</span>
                      )}
                      {s.newPoints && (
                        <span className="text-xs text-gray-500">Puntos: {Number(s.newPoints).toLocaleString('es-MX')}</span>
                      )}
                      {s.newBusinessValue && (
                        <span className="text-xs text-gray-500">VN: {Number(s.newBusinessValue).toLocaleString('es-MX')}</span>
                      )}
                    </div>
                    {s.note && <p className="mt-1 text-xs text-gray-500 italic">“{s.note}”</p>}
                    {s.status === 'failed' && s.errorMessage && (
                      <p className="mt-1 text-xs text-red-600">{s.errorMessage}</p>
                    )}
                    {s.createdByName && (
                      <p className="mt-0.5 text-[11px] text-gray-400">Programado por {s.createdByName.split('@')[0]}</p>
                    )}
                  </div>

                  {s.status === 'pending' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(s.id)}
                      disabled={isCanceling}
                      className="text-red-600 hover:bg-red-50 hover:text-red-600 shrink-0"
                    >
                      {isCanceling ? (
                        <Loader2 className="mr-1 size-4 animate-spin" />
                      ) : (
                        <TrashIcon className="mr-1 h-4 w-4" />
                      )}
                      Cancelar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal crear */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-[#3E667D]" />
                <h3 className="text-base font-bold text-gray-900">Programar cambio de precio</h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">País</label>
                  <select
                    value={form.countryId}
                    onChange={(e) => setField('countryId', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  >
                    <option value="">Seleccionar...</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.currencyCode?.trim()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de precio</label>
                  <select
                    value={form.priceTypeId}
                    onChange={(e) => setField('priceTypeId', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  >
                    <option value="">Seleccionar...</option>
                    {priceTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Referencia: precio actual de la combinación elegida */}
              {form.countryId && form.priceTypeId && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  {currentPrice ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-gray-600">
                        <span className="font-medium text-gray-700">Precio actual:</span>{' '}
                        <span className="font-semibold text-gray-900">
                          {money(currentPrice.price, currentPrice.currencyCode)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {currentPrice.cost && Number(currentPrice.cost) > 0
                            ? ` · Costo ${money(currentPrice.cost)}`
                            : ''}
                          {currentPrice.points && Number(currentPrice.points) > 0
                            ? ` · Puntos ${Number(currentPrice.points).toLocaleString('es-MX')}`
                            : ''}
                          {currentPrice.businessValue && Number(currentPrice.businessValue) > 0
                            ? ` · VN ${Number(currentPrice.businessValue).toLocaleString('es-MX')}`
                            : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={useCurrentValues}
                        className="shrink-0 text-xs font-medium text-[#3E667D] hover:underline"
                      >
                        Usar actuales
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500">
                      Sin precio configurado para esta combinación todavía.
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fecha de aplicación</label>
                <input
                  type="date"
                  value={form.applyOn}
                  min={todayStr()}
                  onChange={(e) => setField('applyOn', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nuevo precio *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.price}
                    onChange={(e) => setField('price', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Costo</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.cost}
                    onChange={(e) => setField('cost', e.target.value)}
                    placeholder="(conserva actual)"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Puntos</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.points}
                    onChange={(e) => setField('points', e.target.value)}
                    placeholder="(conserva actual)"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Valor de negocio</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.businessValue}
                    onChange={(e) => setField('businessValue', e.target.value)}
                    placeholder="(conserva actual)"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nota (opcional)</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setField('note', e.target.value)}
                  rows={2}
                  placeholder="Motivo del cambio (ej. ajuste de temporada)"
                  className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                />
              </div>

              <p className="text-xs text-gray-400">
                Los campos en blanco (costo, puntos, valor de negocio) conservan el valor actual al aplicarse.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={createSchedule.isPending}>
                Cancelar
              </Button>
              <Button type="button" variant="default" onClick={handleCreate} disabled={createSchedule.isPending}>
                {createSchedule.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Programar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
