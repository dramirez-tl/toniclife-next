'use client';

// Alta y edición del EXPEDIENTE de un colaborador.
//
// Decisión del cliente (17-sep-2026): desde RRHH se dan de alta empleados SOLO
// para control interno, SIN cuenta de acceso (employees.user_id NULL, sin
// correo de login ni rol). El correo que se captura aquí es de CONTACTO
// (personal_email): employees.email NUNCA se escribe desde esta pantalla
// porque un trigger de base (mig 077) lo propaga al correo de acceso.
//
// Si el colaborador SÍ necesita entrar al sistema, el alta se hace en
// /admin/usuarios (que crea usuario + expediente) — hay un enlace al pie.

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { parsePhone, isValidLocalNumber } from '@/lib/phone';
import {
  useCreateEmployee,
  useDepartments,
  useUpdateEmployee,
  useWorkSchedules,
} from '@/hooks/useHR';
import { useActiveBranches } from '@/hooks/useBranches';
import { apiErrorMessage, todayCdmx } from '@/app/admin/rrhh/hr-utils';
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  type CreateEmployeeDto,
  type Employee,
  type EmployeeDetail,
  type EmployeeStatus,
  type EmploymentType,
  type UpdateEmployeeDto,
} from '@/types/hr';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null/undefined = alta. */
  employee?: Employee | EmployeeDetail | null;
  /** Se llama con el id del expediente creado (para abrir su ficha). */
  onCreated?: (id: string) => void;
}

interface FormState {
  employeeNumber: string;
  noiNumber: string;
  noiCompany: string;
  employmentType: EmploymentType;
  firstName: string;
  lastName: string;
  secondLastName: string;
  phone: string;
  personalEmail: string;
  branchId: string;
  departmentId: string;
  workScheduleId: string;
  hireDate: string;
  status: EmployeeStatus;
  terminationDate: string;
  rfc: string;
  curp: string;
  imssNumber: string;
  birthDate: string;
  notes: string;
}

function initialState(employee?: Employee | EmployeeDetail | null): FormState {
  const detail = employee as EmployeeDetail | undefined;
  return {
    employeeNumber: employee?.employeeNumber ?? '',
    noiNumber: employee?.noiNumber ?? '',
    noiCompany: detail?.noiCompany ?? '',
    employmentType: employee?.employmentType ?? 'nomina',
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    secondLastName: employee?.secondLastName ?? '',
    phone: employee?.phone ?? '',
    personalEmail: detail?.personalEmail ?? '',
    branchId: employee?.branchId ?? '',
    departmentId: employee?.departmentId ?? '',
    workScheduleId: employee?.workScheduleId ?? '',
    hireDate: employee?.hireDate ? employee.hireDate.split('T')[0] : todayCdmx(),
    status: employee?.status ?? 'active',
    terminationDate: employee?.terminationDate
      ? employee.terminationDate.split('T')[0]
      : '',
    rfc: detail?.rfc ?? '',
    curp: detail?.curp ?? '',
    imssNumber: detail?.imssNumber ?? '',
    birthDate: detail?.birthDate ? detail.birthDate.split('T')[0] : '',
    notes: detail?.notes ?? '',
  };
}

/** '' => undefined, para no mandar cadenas vacías al API. */
function opt(value: string): string | undefined {
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}

/** En edición: '' se manda como null para BORRAR el dato. */
function nullable(value: string): string | null {
  const v = value.trim();
  return v.length > 0 ? v : null;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onCreated,
}: EmployeeFormDialogProps) {
  const isEdit = !!employee;
  const [form, setForm] = useState<FormState>(() => initialState(employee));

  const { data: branchesData } = useActiveBranches();
  const branches = branchesData ?? [];
  const { data: departments } = useDepartments();
  const { data: schedules } = useWorkSchedules();

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const isSaving = createEmployee.isPending || updateEmployee.isPending;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('El nombre y el apellido paterno son obligatorios');
      return;
    }
    if (form.employmentType === 'nomina' && !form.employeeNumber.trim()) {
      toast.error('El personal de nómina necesita número de empleado (es con el que checa)');
      return;
    }
    if (form.status === 'terminated' && !form.terminationDate) {
      toast.error('Para dar de baja hay que capturar la fecha de baja');
      return;
    }
    if (form.phone) {
      const p = parsePhone(form.phone);
      if (!isValidLocalNumber(p.country, p.number)) {
        toast.error(`Teléfono incompleto: ${p.country.name} requiere ${p.country.digits} dígitos`);
        return;
      }
    }

    try {
      if (isEdit && employee) {
        const dto: UpdateEmployeeDto = {
          employeeNumber: opt(form.employeeNumber),
          noiNumber: nullable(form.noiNumber),
          noiCompany: nullable(form.noiCompany),
          employmentType: form.employmentType,
          firstName: opt(form.firstName),
          lastName: opt(form.lastName),
          secondLastName: form.secondLastName.trim(),
          phone: opt(form.phone),
          personalEmail: nullable(form.personalEmail),
          branchId: nullable(form.branchId),
          departmentId: nullable(form.departmentId),
          workScheduleId: nullable(form.workScheduleId),
          hireDate: opt(form.hireDate),
          status: form.status,
          terminationDate: opt(form.terminationDate),
          rfc: opt(form.rfc),
          curp: opt(form.curp),
          imssNumber: opt(form.imssNumber),
          birthDate: opt(form.birthDate),
          notes: form.notes.trim(),
        };
        await updateEmployee.mutateAsync({ id: employee.id, data: dto });
        toast.success('Expediente actualizado');
      } else {
        const dto: CreateEmployeeDto = {
          employeeNumber: opt(form.employeeNumber),
          noiNumber: opt(form.noiNumber),
          noiCompany: opt(form.noiCompany),
          employmentType: form.employmentType,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          secondLastName: opt(form.secondLastName),
          phone: opt(form.phone),
          personalEmail: opt(form.personalEmail),
          branchId: opt(form.branchId),
          departmentId: opt(form.departmentId),
          workScheduleId: opt(form.workScheduleId),
          hireDate: opt(form.hireDate),
          status: form.status,
          rfc: opt(form.rfc),
          curp: opt(form.curp),
          imssNumber: opt(form.imssNumber),
          birthDate: opt(form.birthDate),
          notes: opt(form.notes),
        };
        const created = await createEmployee.mutateAsync(dto);
        toast.success('Expediente creado');
        if (created?.id) onCreated?.(created.id);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        apiErrorMessage(err, isEdit ? 'No se pudo guardar' : 'No se pudo crear el expediente'),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar expediente' : 'Nuevo empleado'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Datos del expediente de RRHH. Los apellidos de un colaborador con cuenta se guardan en su ficha de usuario.'
              : 'Solo control de RRHH, sin acceso al sistema: no se crea usuario, correo ni rol.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Identidad */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>
                Nombre(s) <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="Nombre(s)"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>
                Apellido paterno <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Apellido paterno"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Apellido materno</Label>
              <Input
                value={form.secondLastName}
                onChange={(e) => set('secondLastName', e.target.value)}
                placeholder="Apellido materno"
              />
            </div>
          </section>

          {/* Números */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>
                Número de empleado
                {form.employmentType === 'nomina' && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                value={form.employeeNumber}
                onChange={(e) => set('employeeNumber', e.target.value)}
                placeholder={
                  form.employmentType === 'nomina' ? 'Con este número checa' : 'Se genera EXT-0001'
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Es el número que se teclea en el checador. Si se deja vacío y el colaborador no
                es de nómina, el sistema genera uno (EXT-NNNN).
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo de colaborador</Label>
              <SearchableSelect
                options={EMPLOYMENT_TYPES.map((t) => ({
                  value: t,
                  label: EMPLOYMENT_TYPE_LABELS[t],
                }))}
                value={form.employmentType}
                onChange={(v) => set('employmentType', v as EmploymentType)}
                showAllOption={false}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Número Aspel NOI</Label>
              <Input
                value={form.noiNumber}
                onChange={(e) => set('noiNumber', e.target.value)}
                placeholder="Vacío si no está en la nómina de NOI"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Empresa en NOI</Label>
              <Input
                value={form.noiCompany}
                onChange={(e) => set('noiCompany', e.target.value)}
                placeholder="Razón social con la que aparece en NOI"
              />
            </div>
          </section>

          {/* Contacto */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Teléfono</Label>
              <PhoneInput value={form.phone} onChange={(v) => set('phone', v)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Correo de contacto</Label>
              <Input
                type="email"
                value={form.personalEmail}
                onChange={(e) => set('personalEmail', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
              <p className="text-[11px] text-muted-foreground">
                Correo personal del expediente. NO es un correo de acceso al sistema.
              </p>
            </div>
          </section>

          {/* Adscripción */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Sucursal</Label>
              <SearchableSelect
                options={branches.map((b) => ({ value: b.id, label: b.name, hint: b.code }))}
                value={form.branchId}
                onChange={(v) => set('branchId', v)}
                allLabel="Sin sucursal (corporativo)"
                allValue=""
                placeholder="Buscar sucursal"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Departamento</Label>
              <SearchableSelect
                options={(departments ?? []).map((d) => ({
                  value: d.id,
                  label: d.name,
                  hint: d.code,
                }))}
                value={form.departmentId}
                onChange={(v) => set('departmentId', v)}
                allLabel="Sin departamento"
                allValue=""
                placeholder="Buscar departamento"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Horario</Label>
              <SearchableSelect
                options={(schedules ?? []).map((s) => ({
                  value: s.id,
                  label: s.name,
                  hint: `${s.checkInTime} a ${s.checkOutTime}`,
                }))}
                value={form.workScheduleId}
                onChange={(v) => set('workScheduleId', v)}
                allLabel="Sin horario asignado"
                allValue=""
                placeholder="Buscar horario"
              />
              <p className="text-[11px] text-muted-foreground">
                Sin horario no se pueden calcular retardos ni faltas.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Fecha de ingreso</Label>
              <Input
                type="date"
                value={form.hireDate}
                onChange={(e) => set('hireDate', e.target.value)}
              />
            </div>
          </section>

          {/* Estado */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Estado</Label>
              <SearchableSelect
                options={EMPLOYEE_STATUSES.map((s) => ({
                  value: s,
                  label: EMPLOYEE_STATUS_LABELS[s],
                }))}
                value={form.status}
                onChange={(v) => set('status', v as EmployeeStatus)}
                showAllOption={false}
              />
            </div>
            {isEdit && (
              <div className="grid gap-1.5">
                <Label>
                  Fecha de baja
                  {form.status === 'terminated' && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  type="date"
                  value={form.terminationDate}
                  onChange={(e) => set('terminationDate', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Al dar de baja también se desactiva su cuenta de acceso, si tiene.
                </p>
              </div>
            )}
          </section>

          {/* Datos fiscales / IMSS */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>RFC</Label>
              <Input
                value={form.rfc}
                onChange={(e) => set('rfc', e.target.value.toUpperCase())}
                placeholder="XAXX010101000"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>CURP</Label>
              <Input
                value={form.curp}
                onChange={(e) => set('curp', e.target.value.toUpperCase())}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Número de seguro social (IMSS)</Label>
              <Input
                value={form.imssNumber}
                onChange={(e) => set('imssNumber', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Fecha de nacimiento</Label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => set('birthDate', e.target.value)}
              />
            </div>
          </section>

          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Observaciones del expediente"
            />
          </div>

          {!isEdit && (
            <p className="text-xs text-muted-foreground">
              ¿El colaborador necesita entrar al sistema?{' '}
              <Link href="/admin/usuarios" className="text-primary hover:underline">
                Crear con acceso al sistema
              </Link>
              .
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear expediente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
