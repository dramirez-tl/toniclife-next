'use client';

// ViaticoFormModal - Solicitar viáticos (alta) o editar una solicitud pendiente.
//
// Como en el sistema anterior: se elige una SEMANA (lunes a domingo) y se
// captura el monto de cada concepto por día en un grid (hospedaje, transporte
// público, alimentos, combustible y vehículo, otros gastos). Los montos se
// guardan por día de la semana: al cambiar de semana se conservan. "Usar mi
// semana anterior" copia los montos de tu última solicitud. El total lo
// calcula la pantalla y lo recalcula el API.
//
// El formulario vive en un componente interno con `key`: se monta al abrir el
// diálogo (y, al editar, cuando ya llegó el detalle con sus renglones por día)
// y arranca con los datos correctos sin efectos.

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CopyPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateViatico,
  useUpdateViatico,
  useViatico,
  useViaticoConcepts,
} from '@/hooks/useViaticos';
import { viaticosService } from '@/services/viaticos.service';
import {
  addDaysIso,
  diffDaysIso,
  mondayOf,
  todayIso,
  weekDays,
  weekLabel,
} from '@/lib/viaticos-week';
import {
  amountOf,
  money,
  sanitizeAmount,
  ViaticoDayGridEditor,
  type ViaticoGridValues,
  type ViaticoRowAction,
} from './ViaticoDayGrid';
import type {
  CreateViaticoDto,
  Viatico,
  ViaticoConceptCatalog,
  ViaticoItem,
  ViaticoItemInput,
  ViaticoVehicleType,
} from '@/types/viaticos';

interface ViaticoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Solicitud a editar (del listado; el detalle se carga aquí); vacío = nueva. */
  viatico?: Viatico | null;
  onSaved?: (viatico: Viatico) => void;
}

interface FormState {
  monday: string;
  purpose: string;
  destination: string;
  notes: string;
  /** Concepto → 7 montos (lunes..domingo) como texto. */
  values: ViaticoGridValues;
  vehicleType: '' | ViaticoVehicleType;
  odometerKm: string;
  fuelEfficiencyKmL: string;
  tankCapacityL: string;
}

const WEEK = 7;
const emptyRow = () => Array<string>(WEEK).fill('');

/** Renglones por fecha → montos por día de la semana que inicia en `monday`. */
function valuesFromItems(items: ViaticoItem[], monday: string): ViaticoGridValues {
  const out: ViaticoGridValues = {};
  for (const it of items) {
    const idx = diffDaysIso(monday, it.date);
    if (idx < 0 || idx >= WEEK) continue;
    const row = out[it.conceptCode] ?? emptyRow();
    const merged = Math.round((amountOf(row[idx]) + it.amount) * 100) / 100;
    row[idx] = String(merged);
    out[it.conceptCode] = row;
  }
  return out;
}

const numText = (n: number | null | undefined) => (n == null ? '' : String(n));
const numOrNull = (raw: string) => {
  const n = Number(raw);
  return raw.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
};

function initialForm(v?: Viatico | null): FormState {
  if (!v) {
    return {
      monday: mondayOf(todayIso()),
      purpose: '',
      destination: '',
      notes: '',
      values: {},
      vehicleType: '',
      odometerKm: '',
      fuelEfficiencyKmL: '',
      tankCapacityL: '',
    };
  }
  const monday = mondayOf(v.tripStart);
  return {
    monday,
    purpose: v.purpose,
    destination: v.destination ?? '',
    notes: v.notes ?? '',
    values: valuesFromItems(v.items ?? [], monday),
    vehicleType: v.vehicleType ?? '',
    odometerKm: numText(v.odometerKm),
    fuelEfficiencyKmL: numText(v.fuelEfficiencyKmL),
    tankCapacityL: numText(v.tankCapacityL),
  };
}

function errorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string | string[] } } };
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join(' · ');
  return m || fallback;
}

export function ViaticoFormModal({ open, onOpenChange, viatico, onSaved }: ViaticoFormModalProps) {
  const catalog = useViaticoConcepts();
  // Al editar hace falta el detalle (renglones por día); el listado no los trae.
  const detail = useViatico(open && viatico ? viatico.id : undefined);
  const ready = !!catalog.data && (!viatico || !!detail.data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        {open &&
          (ready ? (
            <ViaticoFormBody
              key={viatico ? `${viatico.id}:${detail.data?.updatedAt}` : 'new'}
              catalog={catalog.data!}
              viatico={viatico ? detail.data! : null}
              onSaved={onSaved}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <div className="space-y-4 p-6">
              <DialogHeader>
                <DialogTitle>{viatico ? `Editar solicitud ${viatico.folio}` : 'Solicitar viáticos'}</DialogTitle>
                <DialogDescription>Cargando conceptos…</DialogDescription>
              </DialogHeader>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          ))}
      </DialogContent>
    </Dialog>
  );
}

function ViaticoFormBody({
  catalog,
  viatico,
  onSaved,
  onClose,
}: {
  catalog: ViaticoConceptCatalog;
  viatico: Viatico | null;
  onSaved?: (viatico: Viatico) => void;
  onClose: () => void;
}) {
  const isEdit = !!viatico;
  const [form, setForm] = useState<FormState>(() => initialForm(viatico));
  const [copying, setCopying] = useState(false);
  const create = useCreateViatico();
  const update = useUpdateViatico();
  const saving = create.isPending || update.isPending;
  const thisMonday = mondayOf(todayIso());
  const days = useMemo(() => weekDays(form.monday), [form.monday]);
  const legacyAmountsOnly = isEdit && !(viatico.items?.length) && viatico.requestedAmount > 0;

  const total = useMemo(
    () =>
      Math.round(
        Object.values(form.values).reduce((acc, row) => acc + row.reduce((a, v) => a + amountOf(v), 0), 0) * 100,
      ) / 100,
    [form.values],
  );

  const setField =
    (key: 'purpose' | 'destination' | 'notes') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setNumber =
    (key: 'odometerKm' | 'fuelEfficiencyKmL' | 'tankCapacityL') => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: sanitizeAmount(e.target.value) }));

  const setCell = (code: string, i: number, value: string) =>
    setForm((f) => {
      const row = [...(f.values[code] ?? emptyRow())];
      row[i] = value;
      return { ...f, values: { ...f.values, [code]: row } };
    });

  const rowAction = (code: string, action: ViaticoRowAction) =>
    setForm((f) => {
      const row = f.values[code] ?? emptyRow();
      const source = row.find((v) => amountOf(v) > 0) ?? '';
      const next =
        action === 'clear'
          ? emptyRow()
          : action === 'week'
            ? Array<string>(WEEK).fill(source)
            : row.map((v, i) => (i < 5 ? source : v));
      return { ...f, values: { ...f.values, [code]: next } };
    });

  const copyLastWeek = async () => {
    if (total > 0 && !window.confirm('¿Reemplazar los montos que ya capturaste por los de tu última solicitud?')) {
      return;
    }
    setCopying(true);
    try {
      const mine = await viaticosService.list({ mine: true, limit: 10 });
      const last = [...mine.data]
        .filter((v) => v.status !== 'cancelled')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (!last) {
        toast.info('Aún no tienes solicitudes anteriores para copiar.');
        return;
      }
      const full = await viaticosService.getById(last.id);
      if (!full.items?.length) {
        toast.info(`Tu última solicitud (${full.folio}) no tiene montos por día para copiar.`);
        return;
      }
      setForm((f) => ({
        ...f,
        values: valuesFromItems(full.items ?? [], mondayOf(full.tripStart)),
        purpose: f.purpose || full.purpose,
        destination: f.destination || full.destination || '',
        vehicleType: f.vehicleType || full.vehicleType || '',
        odometerKm: f.odometerKm || numText(full.odometerKm),
        fuelEfficiencyKmL: f.fuelEfficiencyKmL || numText(full.fuelEfficiencyKmL),
        tankCapacityL: f.tankCapacityL || numText(full.tankCapacityL),
      }));
      toast.success(`Montos copiados de ${full.folio} (semana ${weekLabel(mondayOf(full.tripStart))}).`);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo copiar tu última solicitud.'));
    } finally {
      setCopying(false);
    }
  };

  const validate = (): string | null => {
    if (form.purpose.trim().length < 3) return 'Escribe el motivo o actividad.';
    if (total <= 0) return 'Captura al menos un monto en algún concepto.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    const items: ViaticoItemInput[] = [];
    for (const [conceptCode, row] of Object.entries(form.values)) {
      row.forEach((raw, i) => {
        const amount = amountOf(raw);
        if (amount > 0) items.push({ conceptCode, date: days[i], amount });
      });
    }
    const dto: CreateViaticoDto = {
      purpose: form.purpose.trim(),
      destination: isEdit ? form.destination.trim() : form.destination.trim() || undefined,
      tripStart: days[0],
      tripEnd: days[WEEK - 1],
      items,
      vehicleType: form.vehicleType || null,
      odometerKm: numOrNull(form.odometerKm),
      fuelEfficiencyKmL: numOrNull(form.fuelEfficiencyKmL),
      tankCapacityL: numOrNull(form.tankCapacityL),
      notes: isEdit ? form.notes.trim() : form.notes.trim() || undefined,
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

  const vehiclePanel = (
    <div className="grid gap-3 px-3 py-3 sm:grid-cols-4" style={{ width: 'min(860px, 100%)' }}>
      <p className="text-xs font-medium text-muted-foreground sm:col-span-4">
        Datos del vehículo (si pides combustible)
      </p>
      <div>
        <Label htmlFor="via-veh-type">Vehículo</Label>
        <Select
          value={form.vehicleType || 'none'}
          onValueChange={(v) => setForm((f) => ({ ...f, vehicleType: v === 'none' ? '' : (v as ViaticoVehicleType) }))}
        >
          <SelectTrigger id="via-veh-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin vehículo</SelectItem>
            <SelectItem value="propio">Propio</SelectItem>
            <SelectItem value="asignado">Asignado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="via-km">Km actuales</Label>
        <Input id="via-km" inputMode="decimal" value={form.odometerKm} onChange={setNumber('odometerKm')} placeholder="Ej. 85400" />
      </div>
      <div>
        <Label htmlFor="via-rend">Rendimiento (km/L)</Label>
        <Input
          id="via-rend"
          inputMode="decimal"
          value={form.fuelEfficiencyKmL}
          onChange={setNumber('fuelEfficiencyKmL')}
          placeholder="Ej. 12.5"
        />
      </div>
      <div>
        <Label htmlFor="via-tank">Capacidad del tanque (L)</Label>
        <Input id="via-tank" inputMode="decimal" value={form.tankCapacityL} onChange={setNumber('tankCapacityL')} placeholder="Ej. 45" />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 pt-6">
        <DialogHeader className="pr-8">
          <DialogTitle>{isEdit ? `Editar solicitud ${viatico.folio}` : 'Solicitar viáticos'}</DialogTitle>
          <DialogDescription>
            Elige la semana y captura cuánto necesitas de cada concepto por día. Quien aprueba puede autorizar un monto
            distinto.
          </DialogDescription>
        </DialogHeader>

        {!catalog.dailyItemsEnabled && (
          <Alert variant="destructive">
            <AlertDescription>
              La captura por día se activa cuando Sistemas aplique la migración 157. Mientras tanto no se puede enviar.
            </AlertDescription>
          </Alert>
        )}
        {legacyAmountsOnly && (
          <Alert>
            <AlertDescription>
              Esta solicitud se capturó con el formato anterior ({money(viatico.requestedAmount)} en 4 montos). Al
              guardar se reemplaza por el detalle por día que captures aquí.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="shrink-0">
            <Label>Semana *</Label>
            <div className="mt-1.5 flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Semana anterior"
                onClick={() => setForm((f) => ({ ...f, monday: addDaysIso(f.monday, -7) }))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[190px] rounded-md border border-input px-3 py-1.5 text-center">
                <p className="text-sm font-semibold tabular-nums text-foreground">{weekLabel(form.monday)}</p>
                <p className="text-[11px] text-muted-foreground">lunes a domingo</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Semana siguiente"
                onClick={() => setForm((f) => ({ ...f, monday: addDaysIso(f.monday, 7) }))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {form.monday !== thisMonday && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, monday: thisMonday }))}
                >
                  Esta semana
                </Button>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="via-purpose">Motivo / actividad *</Label>
            <Input
              id="via-purpose"
              value={form.purpose}
              onChange={setField('purpose')}
              placeholder="Ej. Gastos de la sucursal, visita a sucursales de Puebla, capacitación…"
              maxLength={2000}
              className="mt-1.5"
            />
          </div>
          <div className="lg:w-64">
            <Label htmlFor="via-destination">Destino / sucursal</Label>
            <Input
              id="via-destination"
              value={form.destination}
              onChange={setField('destination')}
              placeholder="Opcional"
              maxLength={200}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Montos por día (MXN)</p>
            {!isEdit && (
              <Button type="button" variant="outline" size="sm" onClick={copyLastWeek} disabled={copying}>
                {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CopyPlus className="mr-2 h-4 w-4" />}
                Usar mi semana anterior
              </Button>
            )}
          </div>
          <ViaticoDayGridEditor
            catalog={catalog}
            days={days}
            values={form.values}
            onChange={setCell}
            onRowAction={rowAction}
            categoryExtra={{ fuel: vehiclePanel }}
          />
          <p className="text-xs text-muted-foreground">
            Enter o las flechas ↑ ↓ te mueven por la columna. Con el menú ⋯ de cada renglón repites el monto en la
            semana o lo limpias. Las categorías se pliegan con su encabezado.
          </p>
        </div>

        <div>
          <Label htmlFor="via-notes">Notas (opcional)</Label>
          <Textarea
            id="via-notes"
            value={form.notes}
            onChange={setField('notes')}
            rows={2}
            placeholder="Información adicional para quien aprueba"
            maxLength={2000}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-background px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Total solicitado · semana {weekLabel(form.monday)}</p>
          <p className="text-xl font-bold tabular-nums text-foreground">{money(total)}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !catalog.dailyItemsEnabled}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Enviar solicitud'}
          </Button>
        </div>
      </div>
    </form>
  );
}
