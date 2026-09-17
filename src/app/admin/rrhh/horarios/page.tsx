'use client';

// Horarios de CUATRO tiempos (entrada, salida a comer, regreso y salida) con
// tolerancias y días laborables.
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
import { apiErrorMessage, apiErrorStatus, hasManagePermission, shortTime } from '../hr-utils';
import {
  WORK_DAYS,
  type CreateWorkScheduleDto,
  type UpdateWorkScheduleDto,
  type WorkSchedule,
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
      render: (s) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{s.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
        </div>
      ),
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
      render: (s) => (
        <span className="text-sm tabular-nums">
          {shortTime(s.breakOutTime)} - {shortTime(s.breakInTime)}
        </span>
      ),
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
      render: (s) => (
        <div className="flex gap-1">
          {WORK_DAYS.map((d) => (
            <span
              key={d.value}
              title={d.label}
              className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ${
                (s.workDays ?? []).includes(d.value)
                  ? 'bg-[#C8DDF2] text-[#2f5165]'
                  : 'bg-muted text-muted-foreground/60'
              }`}
            >
              {d.short}
            </span>
          ))}
        </div>
      ),
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
            Entrada, comida y salida con tolerancia. Es la base de retardos y faltas del checador.
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

interface ScheduleForm {
  code: string;
  name: string;
  checkInTime: string;
  breakOutTime: string;
  breakInTime: string;
  checkOutTime: string;
  lateToleranceMinutes: string;
  breakToleranceMinutes: string;
  workDays: number[];
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
    breakOutTime: shortTimeValue(schedule?.breakOutTime, '14:00'),
    breakInTime: shortTimeValue(schedule?.breakInTime, '15:00'),
    checkOutTime: shortTimeValue(schedule?.checkOutTime, '18:00'),
    lateToleranceMinutes: String(schedule?.lateToleranceMinutes ?? 10),
    breakToleranceMinutes: String(schedule?.breakToleranceMinutes ?? 10),
    workDays: schedule?.workDays ?? [1, 2, 3, 4, 5, 6],
    branchId: schedule?.branchId ?? '',
    isActive: schedule?.isActive ?? true,
  }));

  const createSchedule = useCreateWorkSchedule();
  const updateSchedule = useUpdateWorkSchedule();
  const isSaving = createSchedule.isPending || updateSchedule.isPending;

  const set = <K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (day: number) =>
    setForm((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day].sort((a, b) => a - b),
    }));

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('La clave y el nombre son obligatorios');
      return;
    }
    // Los cuatro tiempos deben ir en orden dentro del mismo día.
    const order = [form.checkInTime, form.breakOutTime, form.breakInTime, form.checkOutTime];
    if (order.some((t) => !t)) {
      toast.error('Captura los cuatro horarios');
      return;
    }
    for (let i = 1; i < order.length; i++) {
      if (order[i] <= order[i - 1]) {
        toast.error(
          'El orden debe ser entrada < salida a comer < regreso de comer < salida.',
        );
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

    const payload: CreateWorkScheduleDto = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      checkInTime: form.checkInTime,
      breakOutTime: form.breakOutTime,
      breakInTime: form.breakInTime,
      checkOutTime: form.checkOutTime,
      lateToleranceMinutes: late,
      breakToleranceMinutes: breakTol,
      workDays: form.workDays,
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
            Los cuatro tiempos del día. La tolerancia es el margen antes de contar retardo.
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

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Entrada</Label>
              <Input
                type="time"
                value={form.checkInTime}
                onChange={(e) => set('checkInTime', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Sale a comer</Label>
              <Input
                type="time"
                value={form.breakOutTime}
                onChange={(e) => set('breakOutTime', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Regresa</Label>
              <Input
                type="time"
                value={form.breakInTime}
                onChange={(e) => set('breakInTime', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Salida</Label>
              <Input
                type="time"
                value={form.checkOutTime}
                onChange={(e) => set('checkOutTime', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Tolerancia de entrada (min)</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={form.lateToleranceMinutes}
                onChange={(e) => set('lateToleranceMinutes', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Tolerancia de comida (min)</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={form.breakToleranceMinutes}
                onChange={(e) => set('breakToleranceMinutes', e.target.value)}
              />
            </div>
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

/** El input type=time necesita 'HH:MM' (el API puede mandar 'HH:MM:SS'). */
function shortTimeValue(value: string | undefined, fallback: string): string {
  return value ? value.slice(0, 5) : fallback;
}
