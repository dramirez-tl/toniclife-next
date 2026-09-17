'use client';

// Horarios del checador: entrada y salida con tolerancia, más la comida, que
// puede ser LIBRE (cada quien la toma cuando quiera, con una duración máxima)
// o FIJA (hora de salida y de regreso). Decisión del cliente del 17-sep-2026:
// las comidas no son fijas, por eso 'flexible' es el modo por omisión.
//
// Un horario puede traer EXCEPCIONES POR DÍA (misma decisión del 17-sep-2026:
// "en corporativo los sábados son de 9 a 2:00 pm"): ese día corre con otra
// entrada/salida y con comida libre de la duración capturada (0 = sin comida);
// lo que no se capture hereda del horario base y las tolerancias nunca cambian.
//
// Es la referencia contra la que el checador calcula retardos, comida excedida,
// salida anticipada y FALTAS: un empleado sin horario no puede evaluarse.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { confirmAction } from '@/lib/utils';
import { useBranches } from '@/hooks/useBranches';
import {
  useCreateWorkSchedule,
  useDeleteWorkSchedule,
  useUpdateWorkSchedule,
  useWorkSchedules,
} from '@/hooks/useHR';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';
import {
  apiErrorMessage,
  apiErrorStatus,
  breakSummary,
  dayLabel,
  dayOverrideEntries,
  dayOverrideSummary,
  hasManagePermission,
  shortTime,
} from '../hr-utils';
import {
  WORK_DAYS,
  type CreateWorkScheduleDto,
  type UpdateWorkScheduleDto,
  type WorkSchedule,
  type WorkScheduleBreakMode,
  type WorkScheduleDayOverrides,
} from '@/types/hr';
import type { Branch } from '@/types/branch';

export default function HorariosPage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkSchedule | null>(null);

  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  const canManage = useMemo(() => hasManagePermission(permissions, roles), [permissions, roles]);

  const { data, isLoading, error } = useWorkSchedules(includeInactive);
  const schedules = data ?? [];

  const { data: branchesData } = useBranches({ limit: 200, isActive: true });
  const branches: Branch[] = branchesData?.data ?? [];
  const branchName = (id: string | null) =>
    id ? (branches.find((b) => b.id === id)?.name ?? 'Sucursal') : null;

  const deleteSchedule = useDeleteWorkSchedule();

  const remove = async (schedule: WorkSchedule) => {
    const ok = await confirmAction(
      `¿Desactivar el horario "${schedule.name}"? Dejará de poder asignarse.`,
    );
    if (!ok) return;
    try {
      await deleteSchedule.mutateAsync(schedule.id);
      toast.success('Horario desactivado');
    } catch (err) {
      if (apiErrorStatus(err) === 409) {
        toast.error(
          'No se puede desactivar: hay empleados activos con este horario. Reasígnalos primero.',
        );
        return;
      }
      toast.error(apiErrorMessage(err, 'No se pudo desactivar el horario'));
    }
  };

  const columns: DataTableColumn<WorkSchedule>[] = [
    {
      key: 'name',
      header: 'Horario',
      render: (s) => {
        const overrides = dayOverrideEntries(s.dayOverrides);
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{s.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
            {overrides.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Excepciones:{' '}
                {overrides.map((o) => dayOverrideSummary(o.day, o.override, s)).join('; ')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'times',
      header: 'Entrada / Salida',
      render: (s) => (
        <span className="text-sm tabular-nums">
          {shortTime(s.checkInTime)} - {shortTime(s.checkOutTime)}
        </span>
      ),
    },
    {
      key: 'break',
      header: 'Comida',
      render: (s) => <span className="text-sm tabular-nums">{breakSummary(s)}</span>,
    },
    {
      key: 'tolerance',
      header: 'Tolerancias',
      render: (s) => (
        <span className="text-xs text-muted-foreground">
          Entrada {s.lateToleranceMinutes} min · Comida {s.breakToleranceMinutes} min
        </span>
      ),
    },
    {
      key: 'days',
      header: 'Días',
      render: (s) => {
        const overrides = dayOverrideEntries(s.dayOverrides);
        return (
          <div className="flex gap-1">
            {WORK_DAYS.map((d) => {
              const override = overrides.find((o) => o.day === d.value);
              return (
                <span
                  key={d.value}
                  // El día con excepción se distingue con un anillo y dice su horario.
                  title={override ? dayOverrideSummary(d.value, override.override, s) : d.label}
                  className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ${
                    (s.workDays ?? []).includes(d.value)
                      ? 'bg-[#C8DDF2] text-[#2f5165]'
                      : 'bg-muted text-muted-foreground/60'
                  } ${override ? 'ring-1 ring-primary ring-offset-1' : ''}`}
                >
                  {d.short}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'branch',
      header: 'Sucursal',
      cellClassName: 'text-sm',
      render: (s) =>
        s.branchName ?? branchName(s.branchId) ?? (
          <span className="text-muted-foreground">Global</span>
        ),
    },
    {
      key: 'employees',
      header: 'Empleados',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (s) => <span className="text-sm tabular-nums">{s.employeesCount ?? 0}</span>,
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (s) =>
        s.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (s) =>
        canManage ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Editar horario"
              onClick={() => {
                setEditing(s);
                setFormOpen(true);
              }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            {s.isActive && (
              <Button
                variant="ghost"
                size="sm"
                title="Desactivar horario"
                onClick={() => void remove(s)}
                disabled={deleteSchedule.isPending}
              >
                <TrashIcon className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
          <p className="text-gray-600">
            Entrada y salida con tolerancia; la comida puede ser libre (duración máxima) o
            fija. Es la base de retardos y faltas del checador.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/rrhh">
            <Button variant="secondary">Volver a RRHH</Button>
          </Link>
          {canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Nuevo horario
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            {schedules.length} horario(s) {includeInactive ? '(incluye inactivos)' : 'activos'}
          </p>
          <div className="flex items-center gap-2">
            <Switch
              id="incluir-inactivos"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
            <Label htmlFor="incluir-inactivos" className="text-sm">
              Mostrar inactivos
            </Label>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-6 text-red-700">
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
            <p className="text-sm">No se pudieron cargar los horarios.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={schedules}
              isLoading={isLoading && !data}
              getRowKey={(s) => s.id}
              minWidthClassName="min-w-[1000px]"
              emptyState={
                <div className="py-10 text-center">
                  <ClockIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm font-medium">Todavía no hay horarios</p>
                  <p className="text-sm text-muted-foreground">
                    Crea uno y asígnalo en el expediente de cada colaborador.
                  </p>
                </div>
              }
            />
          </CardContent>
        </Card>
      )}

      {formOpen && (
        <WorkScheduleDialog
          open
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditing(null);
          }}
          schedule={editing}
          branches={branches}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alta / edición
// ---------------------------------------------------------------------------

/** Una excepción mientras se captura (los inputs manejan texto). */
interface DayOverrideForm {
  checkInTime: string;
  checkOutTime: string;
  /** Duración máxima de la comida ese día ('0' = sin comida). */
  breakMinutes: string;
}

interface ScheduleForm {
  code: string;
  name: string;
  checkInTime: string;
  checkOutTime: string;
  /** 'flexible' = comida libre con duración máxima; 'fixed' = horas fijas. */
  breakMode: WorkScheduleBreakMode;
  /** Duración máxima de la comida (solo se captura en modo libre). */
  breakMinutes: string;
  breakOutTime: string;
  breakInTime: string;
  lateToleranceMinutes: string;
  breakToleranceMinutes: string;
  workDays: number[];
  /** Excepciones por día ISO; solo puede haber de días laborables. */
  dayOverrides: Record<number, DayOverrideForm>;
  branchId: string;
  isActive: boolean;
}

function WorkScheduleDialog({
  open,
  onOpenChange,
  schedule,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: WorkSchedule | null;
  branches: Branch[];
}) {
  const isEdit = !!schedule;
  const [form, setForm] = useState<ScheduleForm>(() => ({
    code: schedule?.code ?? '',
    name: schedule?.name ?? '',
    checkInTime: shortTimeValue(schedule?.checkInTime, '09:00'),
    checkOutTime: shortTimeValue(schedule?.checkOutTime, '18:00'),
    breakMode: schedule?.breakMode ?? 'flexible',
    breakMinutes: String(schedule?.breakMinutes ?? 60),
    breakOutTime: shortTimeValue(schedule?.breakOutTime, '14:00'),
    breakInTime: shortTimeValue(schedule?.breakInTime, '15:00'),
    lateToleranceMinutes: String(schedule?.lateToleranceMinutes ?? 10),
    breakToleranceMinutes: String(schedule?.breakToleranceMinutes ?? 10),
    workDays: schedule?.workDays ?? [1, 2, 3, 4, 5, 6],
    dayOverrides: initialDayOverrides(schedule),
    branchId: schedule?.branchId ?? '',
    isActive: schedule?.isActive ?? true,
  }));

  const createSchedule = useCreateWorkSchedule();
  const updateSchedule = useUpdateWorkSchedule();
  const isSaving = createSchedule.isPending || updateSchedule.isPending;

  const set = <K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (day: number) =>
    setForm((prev) => {
      const wasWorkDay = prev.workDays.includes(day);
      const dayOverrides = { ...prev.dayOverrides };
      // Un día que deja de ser laborable no puede conservar su excepción.
      if (wasWorkDay) delete dayOverrides[day];
      return {
        ...prev,
        workDays: wasWorkDay
          ? prev.workDays.filter((d) => d !== day)
          : [...prev.workDays, day].sort((a, b) => a - b),
        dayOverrides,
      };
    });

  /** Prende/apaga la excepción de un día; al prenderla copia el horario base. */
  const toggleDayOverride = (day: number, enabled: boolean) =>
    setForm((prev) => {
      const dayOverrides = { ...prev.dayOverrides };
      if (enabled) {
        // En un día con excepción la comida SIEMPRE es libre: con horario base
        // fijo se parte de la duración de esa ventana (si aún no está capturada,
        // se arranca en cero y el usuario la ajusta).
        const fixedWindow = minutesBetween(prev.breakOutTime, prev.breakInTime);
        dayOverrides[day] = {
          checkInTime: prev.checkInTime,
          checkOutTime: prev.checkOutTime,
          breakMinutes:
            prev.breakMode === 'fixed'
              ? String(Number.isFinite(fixedWindow) ? Math.max(0, fixedWindow) : 0)
              : prev.breakMinutes,
        };
      } else {
        delete dayOverrides[day];
      }
      return { ...prev, dayOverrides };
    });

  const setDayOverride = (day: number, key: keyof DayOverrideForm, value: string) =>
    setForm((prev) => {
      const current = prev.dayOverrides[day];
      if (!current) return prev;
      return {
        ...prev,
        dayOverrides: { ...prev.dayOverrides, [day]: { ...current, [key]: value } },
      };
    });

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('La clave y el nombre son obligatorios');
      return;
    }
    if (!form.checkInTime || !form.checkOutTime) {
      toast.error('Captura la hora de entrada y la de salida');
      return;
    }
    if (form.checkOutTime <= form.checkInTime) {
      toast.error('La salida debe ser después de la entrada');
      return;
    }
    // Minutos de jornada: ninguna comida puede durar más que el día completo.
    const shiftMinutes = minutesBetween(form.checkInTime, form.checkOutTime);

    // En comida libre solo importa la duración máxima; en fija, el orden de las horas.
    let breakMins: number;
    if (form.breakMode === 'fixed') {
      if (!form.breakOutTime || !form.breakInTime) {
        toast.error('Con comida fija captura la hora de salida a comer y la de regreso');
        return;
      }
      const order = [form.checkInTime, form.breakOutTime, form.breakInTime, form.checkOutTime];
      for (let i = 1; i < order.length; i++) {
        if (order[i] <= order[i - 1]) {
          toast.error(
            'El orden debe ser entrada < salida a comer < regreso de comer < salida.',
          );
          return;
        }
      }
      // La duración se deriva de la ventana (el tope de la BD son 240 min).
      breakMins = Math.min(240, minutesBetween(form.breakOutTime, form.breakInTime));
    } else {
      breakMins = Number(form.breakMinutes);
      if (!Number.isFinite(breakMins) || breakMins < 0 || breakMins > 240) {
        toast.error('La duración máxima de la comida va de 0 a 240 minutos');
        return;
      }
      if (breakMins >= shiftMinutes) {
        toast.error('La comida no puede durar tanto o más que la jornada');
        return;
      }
    }
    if (form.workDays.length === 0) {
      toast.error('Elige al menos un día laborable');
      return;
    }
    const late = Number(form.lateToleranceMinutes);
    const breakTol = Number(form.breakToleranceMinutes);
    if (!Number.isFinite(late) || late < 0 || late > 120) {
      toast.error('La tolerancia de entrada va de 0 a 120 minutos');
      return;
    }
    if (!Number.isFinite(breakTol) || breakTol < 0 || breakTol > 120) {
      toast.error('La tolerancia de comida va de 0 a 120 minutos');
      return;
    }

    // Excepciones por día: solo de días laborables y con su propia jornada válida.
    const dayOverrides: WorkScheduleDayOverrides = {};
    for (const day of form.workDays) {
      const override = form.dayOverrides[day];
      if (!override) continue;
      const label = dayLabel(day).toLowerCase();
      if (!override.checkInTime || !override.checkOutTime) {
        toast.error(`Captura la entrada y la salida del ${label}`);
        return;
      }
      if (override.checkOutTime <= override.checkInTime) {
        toast.error(`En ${label} la salida debe ser después de la entrada`);
        return;
      }
      const dayBreak = Number(override.breakMinutes);
      if (!Number.isFinite(dayBreak) || dayBreak < 0 || dayBreak > 240) {
        toast.error(`La comida del ${label} va de 0 a 240 minutos`);
        return;
      }
      if (dayBreak >= minutesBetween(override.checkInTime, override.checkOutTime)) {
        toast.error(`La comida del ${label} no puede durar tanto o más que ese día`);
        return;
      }
      dayOverrides[String(day)] = {
        checkInTime: override.checkInTime,
        checkOutTime: override.checkOutTime,
        breakMinutes: dayBreak,
      };
    }

    const payload: CreateWorkScheduleDto = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      breakMode: form.breakMode,
      breakMinutes: breakMins,
      // En comida libre no hay horas que guardar: se mandan en null.
      breakOutTime: form.breakMode === 'fixed' ? form.breakOutTime : null,
      breakInTime: form.breakMode === 'fixed' ? form.breakInTime : null,
      lateToleranceMinutes: late,
      breakToleranceMinutes: breakTol,
      workDays: form.workDays,
      // Se manda completo SIEMPRE: el API reemplaza el objeto, así que {} borra
      // las excepciones que hubiera.
      dayOverrides,
      branchId: form.branchId || null,
    };

    try {
      if (isEdit && schedule) {
        const dto: UpdateWorkScheduleDto = { ...payload, isActive: form.isActive };
        await updateSchedule.mutateAsync({ id: schedule.id, data: dto });
        toast.success('Horario actualizado');
      } else {
        await createSchedule.mutateAsync(payload);
        toast.success('Horario creado');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo guardar el horario'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar horario' : 'Nuevo horario'}</DialogTitle>
          <DialogDescription>
            Entrada y salida con tolerancia; la comida puede ser libre (duración máxima) o
            fija. La tolerancia es el margen antes de contar retardo o excedente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>
                Clave <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="SUC-9-18"
                disabled={isEdit}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Sucursal 9:00 a 18:00"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label className="text-xs" htmlFor="horario-entrada">
                Entrada
              </Label>
              <Input
                id="horario-entrada"
                type="time"
                value={form.checkInTime}
                onChange={(e) => set('checkInTime', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs" htmlFor="horario-salida">
                Salida
              </Label>
              <Input
                id="horario-salida"
                type="time"
                value={form.checkOutTime}
                onChange={(e) => set('checkOutTime', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs" htmlFor="horario-tol-entrada">
                Tolerancia de entrada (min)
              </Label>
              <Input
                id="horario-tol-entrada"
                type="number"
                min={0}
                max={120}
                value={form.lateToleranceMinutes}
                onChange={(e) => set('lateToleranceMinutes', e.target.value)}
              />
            </div>
          </div>

          {/* Comida: libre (duración máxima) o fija (horas de salida y regreso). */}
          <div className="grid gap-3 rounded-lg border border-border p-3">
            <Label className="text-sm font-semibold">Comida</Label>
            <RadioGroup
              value={form.breakMode}
              onValueChange={(v) => set('breakMode', v as WorkScheduleBreakMode)}
              className="gap-2"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="flexible" id="comida-libre" className="mt-0.5" />
                <Label htmlFor="comida-libre" className="text-sm font-normal leading-snug">
                  Libre: cada quien la toma cuando quiera
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="fixed" id="comida-fija" className="mt-0.5" />
                <Label htmlFor="comida-fija" className="text-sm font-normal leading-snug">
                  Fija: misma hora de salida y de regreso
                </Label>
              </div>
            </RadioGroup>

            {form.breakMode === 'flexible' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs" htmlFor="comida-duracion">
                    Duración máxima (min)
                  </Label>
                  <Input
                    id="comida-duracion"
                    type="number"
                    min={0}
                    max={240}
                    value={form.breakMinutes}
                    onChange={(e) => set('breakMinutes', e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs" htmlFor="comida-tolerancia">
                    Tolerancia de comida (min)
                  </Label>
                  <Input
                    id="comida-tolerancia"
                    type="number"
                    min={0}
                    max={120}
                    value={form.breakToleranceMinutes}
                    onChange={(e) => set('breakToleranceMinutes', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs" htmlFor="comida-sale">
                    Sale a comer
                  </Label>
                  <Input
                    id="comida-sale"
                    type="time"
                    value={form.breakOutTime}
                    onChange={(e) => set('breakOutTime', e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs" htmlFor="comida-regresa">
                    Regresa
                  </Label>
                  <Input
                    id="comida-regresa"
                    type="time"
                    value={form.breakInTime}
                    onChange={(e) => set('breakInTime', e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs" htmlFor="comida-tolerancia-fija">
                    Tolerancia de comida (min)
                  </Label>
                  <Input
                    id="comida-tolerancia-fija"
                    type="number"
                    min={0}
                    max={120}
                    value={form.breakToleranceMinutes}
                    onChange={(e) => set('breakToleranceMinutes', e.target.value)}
                  />
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              {form.breakMode === 'flexible'
                ? 'Lo que pase de la duración máxima más la tolerancia cuenta como comida excedida.'
                : 'Se compara contra la ventana fija; lo que pase de ella más la tolerancia cuenta como comida excedida.'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Días laborables</Label>
            <div className="flex flex-wrap gap-2">
              {WORK_DAYS.map((d) => {
                const active = form.workDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    title={d.label}
                    onClick={() => toggleDay(d.value)}
                    className={`h-9 w-9 rounded-full border text-sm font-semibold transition-colors ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Excepciones por día: el corporativo trabaja el sábado de 9:00 a
              14:00 y ese día no hay comida. */}
          {form.workDays.length > 0 && (
            <div className="grid gap-2 rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm font-semibold">Días con horario distinto</Label>
                <p className="text-[11px] text-muted-foreground">
                  Todos los días usan el horario de arriba salvo los que marques aquí. Ese
                  día la comida es libre con la duración que captures (0 = sin comida); las
                  tolerancias no cambian.
                </p>
              </div>
              {form.workDays.map((day) => {
                const override = form.dayOverrides[day];
                return (
                  <div key={day} className="rounded-md border border-border/70 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">{dayLabel(day)}</span>
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`excepcion-${day}`}
                          className="text-xs font-normal text-muted-foreground"
                        >
                          Horario distinto este día
                        </Label>
                        <Switch
                          id={`excepcion-${day}`}
                          checked={!!override}
                          onCheckedChange={(v) => toggleDayOverride(day, v)}
                        />
                      </div>
                    </div>
                    {override && (
                      <div className="mt-2 grid gap-3 sm:grid-cols-3">
                        <div className="grid gap-1.5">
                          <Label className="text-xs" htmlFor={`excepcion-${day}-entrada`}>
                            Entrada
                          </Label>
                          <Input
                            id={`excepcion-${day}-entrada`}
                            type="time"
                            value={override.checkInTime}
                            onChange={(e) => setDayOverride(day, 'checkInTime', e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs" htmlFor={`excepcion-${day}-salida`}>
                            Salida
                          </Label>
                          <Input
                            id={`excepcion-${day}-salida`}
                            type="time"
                            value={override.checkOutTime}
                            onChange={(e) => setDayOverride(day, 'checkOutTime', e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs" htmlFor={`excepcion-${day}-comida`}>
                            Comida máx. (min)
                          </Label>
                          <Input
                            id={`excepcion-${day}-comida`}
                            type="number"
                            min={0}
                            max={240}
                            value={override.breakMinutes}
                            onChange={(e) => setDayOverride(day, 'breakMinutes', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs">Sucursal</Label>
            <SearchableSelect
              options={branches.map((b) => ({ value: b.id, label: b.name, hint: b.code }))}
              value={form.branchId}
              onChange={(v) => set('branchId', v)}
              allLabel="Global (cualquier sucursal)"
              allValue=""
              placeholder="Buscar sucursal"
            />
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <Switch
                id="horario-activo"
                checked={form.isActive}
                onCheckedChange={(v) => set('isActive', v)}
              />
              <Label htmlFor="horario-activo" className="text-sm">
                Horario activo
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear horario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Excepciones guardadas → formulario. El API puede traerlas PARCIALES (solo la
 * salida, por ejemplo); en la captura se muestran completas heredando del
 * horario base lo que falte.
 */
function initialDayOverrides(schedule: WorkSchedule | null): Record<number, DayOverrideForm> {
  const out: Record<number, DayOverrideForm> = {};
  if (!schedule) return out;
  for (const { day, override } of dayOverrideEntries(schedule.dayOverrides)) {
    out[day] = {
      checkInTime: shortTimeValue(override.checkInTime ?? schedule.checkInTime, '09:00'),
      checkOutTime: shortTimeValue(override.checkOutTime ?? schedule.checkOutTime, '18:00'),
      breakMinutes: String(override.breakMinutes ?? schedule.breakMinutes ?? 60),
    };
  }
  return out;
}

/** El input type=time necesita 'HH:MM' (el API puede mandar 'HH:MM:SS' o null). */
function shortTimeValue(value: string | null | undefined, fallback: string): string {
  return value ? value.slice(0, 5) : fallback;
}

/** Minutos entre dos horas 'HH:MM' del mismo día (from < to). */
function minutesBetween(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  return th * 60 + tm - (fh * 60 + fm);
}
