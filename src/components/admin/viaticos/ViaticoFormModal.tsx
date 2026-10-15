'use client';

// ViaticoFormModal - Solicitar viáticos (alta) o editar una solicitud pendiente.
// El total se calcula solo con los cuatro conceptos; el solicitante no lo captura.
// El formulario vive en un componente interno con `key` (nueva/por id): se monta
// al abrir el diálogo y arranca con los datos correctos sin efectos.

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateViatico, useUpdateViatico } from '@/hooks/useViaticos';
import type { Viatico } from '@/types/viaticos';

interface ViaticoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Solicitud a editar; vacío = nueva. */
  viatico?: Viatico | null;
  onSaved?: (viatico: Viatico) => void;
}

interface FormState {
  destination: string;
  purpose: string;
  tripStart: string;
  tripEnd: string;
  transportAmount: string;
  lodgingAmount: string;
  mealsAmount: string;
  otherAmount: string;
  otherDescription: string;
  notes: string;
}

const EMPTY: FormState = {
  destination: '',
  purpose: '',
  tripStart: '',
  tripEnd: '',
  transportAmount: '',
  lodgingAmount: '',
  mealsAmount: '',
  otherAmount: '',
  otherDescription: '',
  notes: '',
};

const money = (n: number, currency = 'MXN') =>
  n.toLocaleString('es-MX', { style: 'currency', currency });

function toNumber(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function initialForm(viatico?: Viatico | null): FormState {
  if (!viatico) return EMPTY;
  return {
    destination: viatico.destination,
    purpose: viatico.purpose,
    tripStart: viatico.tripStart,
    tripEnd: viatico.tripEnd,
    transportAmount: viatico.transportAmount ? String(viatico.transportAmount) : '',
    lodgingAmount: viatico.lodgingAmount ? String(viatico.lodgingAmount) : '',
    mealsAmount: viatico.mealsAmount ? String(viatico.mealsAmount) : '',
    otherAmount: viatico.otherAmount ? String(viatico.otherAmount) : '',
    otherDescription: viatico.otherDescription ?? '',
    notes: viatico.notes ?? '',
  };
}

function errorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string | string[] } } };
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join(' · ');
  return m || fallback;
}

export function ViaticoFormModal({ open, onOpenChange, viatico, onSaved }: ViaticoFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {open && (
          <ViaticoFormBody
            key={viatico?.id ?? 'new'}
            viatico={viatico}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ViaticoFormBody({
  viatico,
  onSaved,
  onClose,
}: {
  viatico?: Viatico | null;
  onSaved?: (viatico: Viatico) => void;
  onClose: () => void;
}) {
  const isEdit = !!viatico;
  const [form, setForm] = useState<FormState>(() => initialForm(viatico));
  const create = useCreateViatico();
  const update = useUpdateViatico();
  const saving = create.isPending || update.isPending;

  const total = useMemo(
    () =>
      toNumber(form.transportAmount) +
      toNumber(form.lodgingAmount) +
      toNumber(form.mealsAmount) +
      toNumber(form.otherAmount),
    [form.transportAmount, form.lodgingAmount, form.mealsAmount, form.otherAmount],
  );

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (form.destination.trim().length < 2) return 'Escribe el destino.';
    if (form.purpose.trim().length < 5) return 'Describe el motivo del viaje.';
    if (!form.tripStart || !form.tripEnd) return 'Captura las fechas del viaje.';
    if (form.tripEnd < form.tripStart) return 'La fecha de fin no puede ser anterior al inicio.';
    if (total <= 0) return 'Captura al menos un monto (transporte, hospedaje, alimentos u otros).';
    if (toNumber(form.otherAmount) > 0 && !form.otherDescription.trim()) {
      return 'Indica qué incluye "otros".';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    const dto = {
      destination: form.destination.trim(),
      purpose: form.purpose.trim(),
      tripStart: form.tripStart,
      tripEnd: form.tripEnd,
      transportAmount: toNumber(form.transportAmount),
      lodgingAmount: toNumber(form.lodgingAmount),
      mealsAmount: toNumber(form.mealsAmount),
      otherAmount: toNumber(form.otherAmount),
      otherDescription: form.otherDescription.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      const saved = isEdit
        ? await update.mutateAsync({ id: viatico.id, dto })
        : await create.mutateAsync(dto);
      toast.success(isEdit ? 'Solicitud actualizada' : `Solicitud ${saved.folio} enviada`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo guardar la solicitud.'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{isEdit ? `Editar solicitud ${viatico.folio}` : 'Solicitar viáticos'}</DialogTitle>
        <DialogDescription>
          Indica a dónde vas, cuándo, para qué y cuánto necesitas por concepto. Quien aprueba puede
          autorizar un monto distinto.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="via-destination">Destino *</Label>
          <Input
            id="via-destination"
            value={form.destination}
            onChange={set('destination')}
            placeholder="Ciudad, sucursal o lugar"
            maxLength={200}
            required
          />
        </div>
        <div>
          <Label htmlFor="via-start">Inicio del viaje *</Label>
          <Input id="via-start" type="date" value={form.tripStart} onChange={set('tripStart')} required />
        </div>
        <div>
          <Label htmlFor="via-end">Fin del viaje *</Label>
          <Input
            id="via-end"
            type="date"
            value={form.tripEnd}
            min={form.tripStart || undefined}
            onChange={set('tripEnd')}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="via-purpose">Motivo / actividad *</Label>
          <Textarea
            id="via-purpose"
            value={form.purpose}
            onChange={set('purpose')}
            rows={3}
            placeholder="Ej. Apertura de sucursal, capacitación, visita a distribuidores…"
            maxLength={2000}
            required
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Montos solicitados (MXN)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['transportAmount', 'Transporte'],
              ['lodgingAmount', 'Hospedaje'],
              ['mealsAmount', 'Alimentos'],
              ['otherAmount', 'Otros'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Label htmlFor={`via-${key}`}>{label}</Label>
              <Input
                id={`via-${key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form[key]}
                onChange={set(key)}
                placeholder="0.00"
              />
            </div>
          ))}
          {toNumber(form.otherAmount) > 0 && (
            <div className="sm:col-span-2">
              <Label htmlFor="via-other-desc">¿Qué incluye &quot;otros&quot;? *</Label>
              <Input
                id="via-other-desc"
                value={form.otherDescription}
                onChange={set('otherDescription')}
                placeholder="Ej. casetas, estacionamiento, material"
                maxLength={200}
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-md bg-muted px-4 py-2">
          <span className="text-sm text-muted-foreground">Total solicitado</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{money(total)}</span>
        </div>
      </div>

      <div>
        <Label htmlFor="via-notes">Notas (opcional)</Label>
        <Textarea
          id="via-notes"
          value={form.notes}
          onChange={set('notes')}
          rows={2}
          placeholder="Información adicional para quien aprueba"
          maxLength={2000}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Enviar solicitud'}
        </Button>
      </DialogFooter>
    </form>
  );
}
