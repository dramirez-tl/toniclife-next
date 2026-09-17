'use client';

// Expediente del colaborador: datos, checadas, gafete, nómina y vacaciones.
//
// Mismo patrón de detalle que /admin/activos/[id] (encabezado de marca +
// pestañas). La foto vive en GCS privado y llega como URL firmada de 15
// minutos, así que se pinta con <img> (no con el optimizador de Next).

import { use, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  CameraIcon,
  ClockIcon,
  IdentificationIcon,
  PencilSquareIcon,
  PrinterIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { confirmAction } from '@/lib/utils';
import { formatTimeLocal } from '@/lib/timezone-utils';
import { AssetBarcode } from '@/components/admin/assets/AssetBarcode';
import { EmployeeAvatar } from '@/components/admin/hr/EmployeeAvatar';
import { EmployeeFormDialog } from '@/components/admin/hr/EmployeeFormDialog';
import { downloadEmployeeBadgePdf } from '@/lib/generate-employee-badge-pdf';
import {
  useDeleteEmployeePhoto,
  useEmployee,
  useEmployeeAttendance,
  useGenerateBadge,
  useMarkBadgePrinted,
  useUploadEmployeePhoto,
  useVacations,
} from '@/hooks/useHR';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';
import {
  addDays,
  apiErrorMessage,
  dayOverrideEntries,
  dayOverrideSummary,
  formatDateOnly,
  formatMoney,
  hasManagePermission,
  shortTime,
  todayCdmx,
} from '../../hr-utils';
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_VARIANTS,
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_VARIANTS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_VARIANTS,
  SYNC_SOURCE_LABELS,
  VACATION_STATUS_LABELS,
  VACATION_STATUS_VARIANTS,
  WORK_DAYS,
  employeeDisplayName,
  type AttendanceEvent,
  type Vacation,
  type WorkScheduleSummary,
} from '@/types/hr';

/** Formatos y tamaño que acepta el API para la foto del gafete. */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_MB = 5;

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: employee, isLoading } = useEmployee(id);

  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  const canManage = useMemo(() => hasManagePermission(permissions, roles), [permissions, roles]);

  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-center">
        <p className="text-lg font-medium">Expediente no encontrado</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/rrhh/empleados">Volver a Empleados</Link>
        </Button>
      </div>
    );
  }

  const name = employeeDisplayName(employee);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          <button
            type="button"
            onClick={() => router.push('/admin/rrhh/empleados')}
            className="mb-4 flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver a Empleados
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <PhotoBlock
                employeeId={employee.id}
                photoUrl={employee.photoUrl}
                name={name}
                canManage={canManage}
              />
              <div>
                <p className="font-mono text-sm tracking-wider text-white/70">
                  {employee.employeeNumber}
                  {employee.noiNumber ? ` · NOI ${employee.noiNumber}` : ''}
                </p>
                <h1 className="text-xl font-bold sm:text-3xl">{name}</h1>
                <p className="text-white/80">
                  {[
                    employee.jobPositionName,
                    employee.departmentName,
                    employee.branchName ?? 'Corporativo',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={EMPLOYEE_STATUS_VARIANTS[employee.status] ?? 'secondary'}>
                    {EMPLOYEE_STATUS_LABELS[employee.status] ?? employee.status}
                  </Badge>
                  <Badge variant={EMPLOYMENT_TYPE_VARIANTS[employee.employmentType] ?? 'secondary'}>
                    {EMPLOYMENT_TYPE_LABELS[employee.employmentType] ?? employee.employmentType}
                  </Badge>
                  {!employee.hasSystemAccess && (
                    <Badge variant="outline" className="border-white/40 text-white">
                      Sin acceso al sistema
                    </Badge>
                  )}
                  {employee.workScheduleName ? (
                    <Badge variant="outline" className="border-white/40 text-white">
                      {employee.workScheduleName}
                    </Badge>
                  ) : (
                    <Badge variant="warning">Sin horario</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm" className="h-11 sm:h-9">
                <Link href={`/admin/rrhh/asistencia?employeeId=${employee.id}`}>
                  <ClockIcon className="mr-2 h-4 w-4" />
                  Ver checadas
                </Link>
              </Button>
              {canManage && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-11 sm:h-9"
                  onClick={() => setEditOpen(true)}
                >
                  <PencilSquareIcon className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {employee.status === 'terminated' && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-destructive">
                Colaborador dado de baja
                {employee.terminationDate
                  ? ` el ${formatDateOnly(employee.terminationDate)}`
                  : ''}
                .
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="datos">
          <TabsList className="flex w-full justify-start overflow-x-auto sm:flex-wrap">
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
            <TabsTrigger value="gafete">Gafete</TabsTrigger>
            {canManage && <TabsTrigger value="nomina">Nómina</TabsTrigger>}
            {canManage && <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>}
          </TabsList>

          {/* Datos */}
          <TabsContent value="datos">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="grid gap-x-8 gap-y-3 p-6">
                  <SectionTitle>Identificación</SectionTitle>
                  <Field label="Número de empleado" value={employee.employeeNumber} mono />
                  <Field label="Número Aspel NOI" value={employee.noiNumber} mono />
                  <Field label="Empresa en NOI" value={employee.noiCompany} />
                  <Field
                    label="Tipo de colaborador"
                    value={EMPLOYMENT_TYPE_LABELS[employee.employmentType] ?? employee.employmentType}
                  />
                  <Field label="Código de gafete" value={employee.badgeCode} mono />
                  <Field label="Fecha de ingreso" value={formatDateOnly(employee.hireDate)} />
                  <Field
                    label="Fecha de baja"
                    value={employee.terminationDate ? formatDateOnly(employee.terminationDate) : null}
                  />
                  <Field
                    label="Origen del expediente"
                    value={
                      employee.syncSource
                        ? SYNC_SOURCE_LABELS[employee.syncSource] ?? employee.syncSource
                        : null
                    }
                  />
                  <Field
                    label="Última sincronización"
                    value={employee.lastSyncedAt ? formatDateOnly(employee.lastSyncedAt) : null}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="grid gap-x-8 gap-y-3 p-6">
                  <SectionTitle>Contacto y adscripción</SectionTitle>
                  <Field label="Teléfono" value={employee.phone} />
                  <Field label="Correo de contacto" value={employee.personalEmail} />
                  <Field label="Correo de acceso" value={employee.user?.email ?? null} />
                  <Field label="Rol del sistema" value={employee.user?.roleCode ?? null} />
                  <Field label="Sucursal" value={employee.branchName} />
                  <Field label="Departamento" value={employee.departmentName} />
                  <Field label="Puesto" value={employee.jobPositionName} />
                  <Field label="Jefe directo" value={employee.supervisor?.fullName ?? null} />
                  <Field label="Domicilio" value={employee.address} />
                  <Field label="Código postal" value={employee.zipCode} />
                  <Field label="Contacto de emergencia" value={employee.emergencyContactName} />
                  <Field label="Teléfono de emergencia" value={employee.emergencyContactPhone} />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardContent className="grid gap-x-8 gap-y-3 p-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <SectionTitle>Horario asignado</SectionTitle>
                  </div>
                  {employee.workSchedule ? (
                    <>
                      <Field
                        label="Horario"
                        value={`${employee.workSchedule.name} (${employee.workSchedule.code})`}
                      />
                      <Field
                        label="Días laborables"
                        value={
                          employee.workSchedule.workDays
                            ?.map((d) => WORK_DAYS.find((w) => w.value === d)?.short ?? d)
                            .join(' ') || null
                        }
                      />
                      <Field
                        label="Entrada / Salida"
                        value={`${shortTime(employee.workSchedule.checkInTime)} - ${shortTime(
                          employee.workSchedule.checkOutTime,
                        )}`}
                      />
                      <Field
                        label="Comida"
                        value={
                          employee.workSchedule.breakMode !== 'flexible' &&
                          employee.workSchedule.breakOutTime &&
                          employee.workSchedule.breakInTime
                            ? `${shortTime(employee.workSchedule.breakOutTime)} - ${shortTime(
                                employee.workSchedule.breakInTime,
                              )} (tolerancia ${employee.workSchedule.breakToleranceMinutes})`
                            : `Libre, máximo ${employee.workSchedule.breakMinutes} min (tolerancia ${employee.workSchedule.breakToleranceMinutes})`
                        }
                      />
                      <Field
                        label="Tolerancia de entrada"
                        value={`${employee.workSchedule.lateToleranceMinutes} min`}
                      />
                      <ScheduleDayOverrides schedule={employee.workSchedule} />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Sin horario asignado: no se le calculan retardos ni faltas.{' '}
                      <Link href="/admin/rrhh/horarios" className="text-primary hover:underline">
                        Ver horarios
                      </Link>
                    </p>
                  )}
                  {employee.notes ? (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Notas</p>
                      <p className="whitespace-pre-wrap text-sm">{employee.notes}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Asistencia */}
          <TabsContent value="asistencia">
            <AttendanceTab employeeId={employee.id} />
          </TabsContent>

          {/* Gafete */}
          <TabsContent value="gafete">
            <BadgeTab
              employeeId={employee.id}
              badgeCode={employee.badgeCode}
              badgeIssuedAt={employee.badgeIssuedAt}
              badgePrintedCount={employee.badgePrintedCount}
              canManage={canManage}
              badgeData={{
                fullName: name,
                employeeNumber: employee.employeeNumber,
                badgeCode: employee.badgeCode ?? '',
                jobPositionName: employee.jobPositionName,
                branchName: employee.branchName,
                departmentName: employee.departmentName,
                photoUrl: employee.photoUrl,
              }}
            />
          </TabsContent>

          {/* Nómina (solo hr:manage) */}
          {canManage && (
            <TabsContent value="nomina">
              <Card>
                <CardContent className="grid gap-x-8 gap-y-3 p-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <SectionTitle>Datos de nómina</SectionTitle>
                  </div>
                  <Field label="RFC" value={employee.rfc} mono />
                  <Field label="CURP" value={employee.curp} mono />
                  <Field label="Número de seguro social" value={employee.imssNumber} mono />
                  <Field label="Registro patronal" value={employee.employerRegistration} mono />
                  <Field label="Fecha de nacimiento" value={formatDateOnly(employee.birthDate)} />
                  <Field label="Sexo" value={employee.gender} />
                  <Field label="Estado civil" value={employee.maritalStatus} />
                  <Field label="Tipo de contrato" value={employee.contractType} />
                  <Field label="Tipo de salario" value={employee.salaryType} />
                  <Field label="Salario diario" value={formatMoney(employee.dailySalary)} />
                  <Field
                    label="Salario diario integrado"
                    value={formatMoney(employee.integratedDailySalary)}
                  />
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Estos datos se sincronizarán con Aspel NOI; por ahora se capturan aquí.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Vacaciones: sin hr:manage el API responde 403 para expedientes ajenos */}
          {canManage && (
            <TabsContent value="vacaciones">
              <VacationsTab employeeId={employee.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {editOpen && (
        <EmployeeFormDialog open onOpenChange={setEditOpen} employeeId={employee.id} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Foto del expediente
// ---------------------------------------------------------------------------

function PhotoBlock({
  employeeId,
  photoUrl,
  name,
  canManage,
}: {
  employeeId: string;
  photoUrl: string | null;
  name: string;
  canManage: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadEmployeePhoto();
  const deletePhoto = useDeleteEmployeePhoto();

  const pick = async (file: File | null) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      toast.error('La foto debe ser JPG, PNG o WEBP');
      return;
    }
    if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
      toast.error(`La foto excede ${PHOTO_MAX_MB} MB`);
      return;
    }
    try {
      await uploadPhoto.mutateAsync({ id: employeeId, file });
      toast.success('Foto actualizada');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo subir la foto'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    const ok = await confirmAction('¿Quitar la foto del expediente?');
    if (!ok) return;
    try {
      await deletePhoto.mutateAsync(employeeId);
      toast.success('Foto eliminada');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo quitar la foto'));
    }
  };

  const busy = uploadPhoto.isPending || deletePhoto.isPending;

  return (
    <div className="flex flex-col items-center gap-2">
      <EmployeeAvatar photoUrl={photoUrl} name={name} size={84} className="border-2 border-white/60" />
      {canManage && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_TYPES.join(',')}
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
          />
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="xs"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <CameraIcon className="mr-1 h-3 w-3" />
              )}
              {photoUrl ? 'Cambiar' : 'Subir'}
            </Button>
            {photoUrl && (
              <Button variant="secondary" size="xs" disabled={busy} onClick={() => void remove()}>
                <TrashIcon className="h-3 w-3" />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña: asistencia
// ---------------------------------------------------------------------------

/** Ventana de la pestaña: el API sin from/to devuelve SOLO el día de hoy. */
const ATTENDANCE_TAB_DAYS = 30;

function AttendanceTab({ employeeId }: { employeeId: string }) {
  // Rango EXPLÍCITO: AttendanceService.list toma `from = query.from ?? hoy`,
  // así que sin fechas la tabla sale vacía salvo que la persona ya haya
  // checado hoy. Se fija una vez por montaje para no cambiar la llave de la
  // consulta en cada render.
  const range = useMemo(() => {
    const to = todayCdmx();
    return { from: addDays(to, -(ATTENDANCE_TAB_DAYS - 1)), to };
  }, []);

  const { data, isLoading } = useEmployeeAttendance(employeeId, {
    from: range.from,
    to: range.to,
    page: 1,
    limit: 25,
  });
  const events = data?.data ?? [];

  const columns: DataTableColumn<AttendanceEvent>[] = [
    {
      key: 'occurredAt',
      header: 'Fecha y hora',
      render: (ev) => (
        <div>
          <p className="text-sm font-semibold tabular-nums">
            {formatTimeLocal(ev.occurredAt, ev.timezone)}
          </p>
          <p className="text-xs text-muted-foreground">{ev.localDate}</p>
        </div>
      ),
    },
    {
      key: 'eventType',
      header: 'Tipo',
      render: (ev) => (
        <Badge variant={EVENT_TYPE_VARIANTS[ev.eventType] ?? 'secondary'}>
          {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
        </Badge>
      ),
    },
    {
      key: 'branch',
      header: 'Sucursal',
      cellClassName: 'text-sm',
      render: (ev) => ev.branchName ?? '—',
    },
    {
      key: 'notes',
      header: 'Notas',
      cellClassName: 'text-xs text-muted-foreground',
      render: (ev) => ev.notes ?? '—',
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Checadas de los últimos {ATTENDANCE_TAB_DAYS} días.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/rrhh/asistencia?employeeId=${employeeId}`}>
              Ver listado completo
            </Link>
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={events}
          isLoading={isLoading && !data}
          getRowKey={(ev) => ev.id}
          minWidthClassName="min-w-[640px]"
          emptyState={
            <div className="py-8 text-center">
              <ClockIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">
                Sin checadas en los últimos {ATTENDANCE_TAB_DAYS} días
              </p>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pestaña: gafete
// ---------------------------------------------------------------------------

function BadgeTab({
  employeeId,
  badgeCode,
  badgeIssuedAt,
  badgePrintedCount,
  canManage,
  badgeData,
}: {
  employeeId: string;
  badgeCode: string | null;
  badgeIssuedAt: string | null;
  badgePrintedCount: number;
  canManage: boolean;
  badgeData: Parameters<typeof downloadEmployeeBadgePdf>[0];
}) {
  const generateBadge = useGenerateBadge();
  const markPrinted = useMarkBadgePrinted();
  const [downloading, setDownloading] = useState(false);

  const generate = async (regenerate: boolean) => {
    if (regenerate) {
      const ok = await confirmAction(
        '¿Reponer el gafete? El código anterior deja de servir y se genera uno nuevo.',
      );
      if (!ok) return;
    }
    try {
      await generateBadge.mutateAsync({ id: employeeId, regenerate });
      toast.success(regenerate ? 'Gafete repuesto' : 'Código de gafete generado');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo generar el gafete'));
    }
  };

  const download = async () => {
    if (!badgeCode) return;
    setDownloading(true);
    try {
      await downloadEmployeeBadgePdf(badgeData);
      toast.success('Gafete descargado');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo generar el PDF del gafete'));
    } finally {
      setDownloading(false);
    }
  };

  const printed = async () => {
    try {
      await markPrinted.mutateAsync(employeeId);
      toast.success('Impresión registrada');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo registrar la impresión'));
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {badgeCode ? (
          <>
            <p className="text-sm text-muted-foreground">
              El gafete se escanea como CODE128. El código es propio del gafete: si se extravía se
              repone sin cambiar el número con el que la persona checa.
            </p>
            <div className="flex flex-col items-start gap-4">
              <AssetBarcode value={badgeCode} />
              <div className="grid gap-1 text-xs text-muted-foreground">
                <span>
                  Código: <span className="font-mono text-foreground">{badgeCode}</span>
                </span>
                <span>Emitido: {formatDateOnly(badgeIssuedAt)}</span>
                <span>Impresiones registradas: {badgePrintedCount ?? 0}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void download()} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                  )}
                  Descargar PDF
                </Button>
                {canManage && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void printed()}
                      disabled={markPrinted.isPending}
                    >
                      <PrinterIcon className="mr-2 h-4 w-4" />
                      Marcar como impreso
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void generate(true)}
                      disabled={generateBadge.isPending}
                    >
                      {generateBadge.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <IdentificationIcon className="mr-2 h-4 w-4" />
                      )}
                      Reponer gafete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Este colaborador aún no tiene gafete. Genera el código para poder imprimirlo.
            </p>
            {canManage ? (
              <Button size="sm" onClick={() => void generate(false)} disabled={generateBadge.isPending}>
                {generateBadge.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IdentificationIcon className="mr-2 h-4 w-4" />
                )}
                Generar código
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Se necesita permiso de gestión de RRHH para generar el gafete.
              </p>
            )}
            <Button size="sm" variant="outline" disabled>
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
            <p className="text-xs text-muted-foreground">
              El PDF se habilita cuando el gafete tiene código.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pestaña: vacaciones
// ---------------------------------------------------------------------------

function VacationsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useVacations({ employeeId, limit: 20 });
  const rows = data?.data ?? [];

  const columns: DataTableColumn<Vacation>[] = [
    {
      key: 'range',
      header: 'Periodo',
      render: (v) => (
        <div>
          <p className="text-sm font-medium">
            {formatDateOnly(v.startDate)} — {formatDateOnly(v.endDate)}
          </p>
          <p className="text-xs text-muted-foreground">
            {v.totalBusinessDays ?? v.totalCalendarDays ?? 0} día(s)
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (v) => (
        <Badge variant={VACATION_STATUS_VARIANTS[v.status] ?? 'secondary'}>
          {VACATION_STATUS_LABELS[v.status] ?? v.status}
        </Badge>
      ),
    },
    {
      key: 'comments',
      header: 'Motivo',
      cellClassName: 'text-xs text-muted-foreground',
      render: (v) => v.requestComments ?? '—',
    },
    {
      key: 'createdAt',
      header: 'Solicitada',
      cellClassName: 'text-xs text-muted-foreground',
      render: (v) => formatDateOnly(v.createdAt),
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Saldo de vacaciones: <span className="font-medium">sin saldo cargado</span> (los saldos
          se llevan en Aspel NOI). Aquí se ven las solicitudes registradas en el sistema.
        </p>
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading && !data}
          getRowKey={(v) => v.id}
          minWidthClassName="min-w-[640px]"
          emptyState={
            <div className="py-8 text-center">
              <p className="text-sm font-medium">Sin solicitudes de vacaciones</p>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Días con horario distinto del horario asignado (decisión del cliente del
 * 17-sep-2026: en corporativo los sábados son de 9:00 a 14:00, sin comida).
 */
function ScheduleDayOverrides({ schedule }: { schedule: WorkScheduleSummary }) {
  const overrides = dayOverrideEntries(schedule.dayOverrides);
  if (overrides.length === 0) return null;
  return (
    <div className="border-b border-border pb-2 sm:col-span-2">
      <p className="text-sm text-muted-foreground">Días con horario distinto</p>
      <ul className="mt-1 space-y-0.5">
        {overrides.map(({ day, override }) => (
          <li key={day} className="text-sm font-medium">
            {dayOverrideSummary(day, override, schedule, 'long')}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-right text-sm font-medium ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
