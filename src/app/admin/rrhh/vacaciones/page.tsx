'use client';

// Vacaciones: solicitudes y aprobaciones.
//
// La pantalla estaba rota de contrato: el API responde { data, pagination } con
// la fila CRUDA de vacation_requests (snake_case) y estados en MINÚSCULAS; el
// front leía .data sobre un arreglo, mandaba 'PENDING' y leía camelCase. El
// mapeo vive ahora en services/hr.service.ts y aquí solo se pinta.
//
// Ojo: POST /hr/vacations crea la solicitud SIEMPRE para el usuario de la
// sesión (así está el API), por eso el botón dice "Solicitar mis vacaciones".

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { DataTablePagination } from '@/components/ui/DataTable';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import {
  useApproveVacation,
  useCreateVacation,
  useRejectVacation,
  useVacations,
} from '@/hooks/useHR';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';
import { csvDateStamp, exportToCsv } from '@/lib/csv-export';
import { EmployeeAvatar } from '@/components/admin/hr/EmployeeAvatar';
import { apiErrorMessage, csvSafe, formatDateOnly, hasManagePermission } from '../hr-utils';
import {
  VACATION_STATUS_LABELS,
  VACATION_STATUS_VARIANTS,
  type Vacation,
  type VacationStatus,
} from '@/types/hr';

const STATUS_FILTERS: { value: VacationStatus; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

function isVacationStatus(v: string): v is VacationStatus {
  return STATUS_FILTERS.some((s) => s.value === v) || v === 'draft';
}

export default function VacacionesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VacacionesContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function VacacionesContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    page: '1',
    limit: '20',
  });

  const filterStatus = get('status');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 20;

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [rejecting, setRejecting] = useState<Vacation | null>(null);

  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  const canManage = useMemo(() => hasManagePermission(permissions, roles), [permissions, roles]);

  const { data, isLoading, isFetching, error } = useVacations({
    status: isVacationStatus(filterStatus) ? filterStatus : undefined,
    page,
    limit,
  });

  // Memorizado: el arreglo alimenta un useMemo y un `?? []` suelto crea uno
  // nuevo en cada render.
  const vacations = useMemo(() => data?.data ?? [], [data]);
  const total = data?.pagination.total ?? vacations.length;

  const approveVacation = useApproveVacation();
  const isProcessing = approveVacation.isPending;

  // El API no busca por nombre en vacaciones: el filtro es sobre lo cargado.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vacations;
    return vacations.filter(
      (v) =>
        (v.employeeName ?? '').toLowerCase().includes(q) ||
        (v.employeeNumber ?? '').toLowerCase().includes(q),
    );
  }, [vacations, search]);

  const handleApprove = async (v: Vacation) => {
    try {
      await approveVacation.mutateAsync({ id: v.id });
      toast.success('Solicitud aprobada');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo aprobar la solicitud'));
    }
  };

  const handleExport = () => {
    exportToCsv(
      `vacaciones-${csvDateStamp()}`,
      [
        'Folio',
        'Numero',
        'Empleado',
        'Inicio',
        'Fin',
        'Dias habiles',
        'Estado',
        'Motivo',
        'Motivo de rechazo',
        'Solicitada',
      ],
      filtered.map((v) => [
        csvSafe(v.requestNumber),
        csvSafe(v.employeeNumber),
        csvSafe(v.employeeName),
        v.startDate,
        v.endDate,
        v.totalBusinessDays ?? '',
        VACATION_STATUS_LABELS[v.status] ?? v.status,
        csvSafe(v.requestComments),
        csvSafe(v.rejectionReason),
        v.createdAt ? v.createdAt.slice(0, 10) : '',
      ]),
    );
    toast.success('Solicitudes exportadas');
  };

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vacaciones</h1>
          <p className="text-gray-600">Solicitudes y aprobaciones del personal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/rrhh">
            <Button variant="secondary">Volver a RRHH</Button>
          </Link>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Solicitar mis vacaciones
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-4 sm:p-6 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Label className="mb-1 block text-xs text-muted-foreground">Buscar</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre o número de empleado (en la página actual)"
            />
          </div>
          <div className="w-full lg:w-56">
            <Label className="mb-1 block text-xs text-muted-foreground">Estado</Label>
            <SearchableSelect
              options={STATUS_FILTERS}
              value={filterStatus}
              onChange={(v) => setParams({ status: v, page: null })}
              allLabel="Todos los estados"
              allValue="all"
            />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-6 text-red-700">
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
            <p className="text-sm">No se pudieron cargar las solicitudes de vacaciones.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {isLoading && !data ? 'Cargando…' : `${total.toLocaleString('es-MX')} solicitudes`}
          </p>

          <div className="space-y-3">
            {isLoading && !data ? (
              <>
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <CalendarDaysIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No se encontraron solicitudes</p>
                  <p className="text-sm text-muted-foreground">
                    Ajusta el estado o la búsqueda.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((v) => {
                const name = v.employeeName ?? 'Empleado';
                const isPending = v.status === 'pending';
                return (
                  <Card
                    key={v.id}
                    className={isPending ? 'border-l-4 border-l-amber-500' : undefined}
                  >
                    <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
                      <div className="flex min-w-0 items-start gap-3">
                        <EmployeeAvatar name={name} size={44} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{name}</h3>
                            {v.employeeNumber ? (
                              <span className="font-mono text-xs text-muted-foreground">
                                {v.employeeNumber}
                              </span>
                            ) : null}
                            {v.requestNumber ? (
                              <span className="text-xs text-muted-foreground">
                                · {v.requestNumber}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm">
                            <CalendarDaysIcon className="mr-1 inline h-4 w-4 text-muted-foreground" />
                            {formatDateOnly(v.startDate)} — {formatDateOnly(v.endDate)}
                            <span className="ml-2 font-semibold text-[#3E667D]">
                              {v.totalBusinessDays ?? v.totalCalendarDays ?? 0} día(s)
                            </span>
                          </p>
                          {v.requestComments ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              <span className="font-medium">Motivo:</span> {v.requestComments}
                            </p>
                          ) : null}
                          {v.status === 'rejected' && v.rejectionReason ? (
                            <p className="mt-1 text-sm text-red-600">
                              <span className="font-medium">Motivo del rechazo:</span>{' '}
                              {v.rejectionReason}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-muted-foreground">
                            Solicitada el {formatDateOnly(v.createdAt)}
                            {v.approvedAt ? ` · Aprobada el ${formatDateOnly(v.approvedAt)}` : ''}
                            {v.rejectedAt ? ` · Rechazada el ${formatDateOnly(v.rejectedAt)}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <Badge variant={VACATION_STATUS_VARIANTS[v.status] ?? 'secondary'}>
                          {VACATION_STATUS_LABELS[v.status] ?? v.status}
                        </Badge>
                        {isPending && canManage && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => setRejecting(v)}
                              disabled={isProcessing}
                            >
                              <XCircleIcon className="mr-1 h-4 w-4" />
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => void handleApprove(v)}
                              disabled={isProcessing}
                            >
                              <CheckCircleIcon className="mr-1 h-4 w-4" />
                              Aprobar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {vacations.length > 0 && (
            <div className="mt-4">
              <DataTablePagination
                currentPage={page}
                pageSize={limit}
                totalItems={total}
                isLoading={isLoading || isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                pageSizeOptions={[20, 50, 100]}
              />
            </div>
          )}
        </>
      )}

      {createOpen && <NuevaSolicitudDialog onOpenChange={setCreateOpen} />}
      {rejecting && (
        <RechazoDialog vacation={rejecting} onClose={() => setRejecting(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rechazo (con motivo)
// ---------------------------------------------------------------------------

function RechazoDialog({ vacation, onClose }: { vacation: Vacation; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const rejectVacation = useRejectVacation();

  const submit = async () => {
    if (!reason.trim()) {
      toast.error('Escribe el motivo del rechazo');
      return;
    }
    try {
      await rejectVacation.mutateAsync({ id: vacation.id, reason: reason.trim() });
      toast.success('Solicitud rechazada');
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo rechazar la solicitud'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rechazar solicitud</DialogTitle>
          <DialogDescription>
            El motivo queda guardado y se le muestra a {vacation.employeeName ?? 'la persona'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Motivo del rechazo</Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Por ejemplo: traslape con otro compañero en la misma sucursal"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={rejectVacation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void submit()}
            disabled={rejectVacation.isPending}
          >
            {rejectVacation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rechazar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Nueva solicitud (para el usuario de la sesión)
// ---------------------------------------------------------------------------

function NuevaSolicitudDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comments, setComments] = useState('');
  const createVacation = useCreateVacation();

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }, [startDate, endDate]);

  const submit = async () => {
    if (!startDate || !endDate) {
      toast.error('Las fechas de inicio y fin son obligatorias');
      return;
    }
    if (days <= 0) {
      toast.error('La fecha de fin debe ser posterior a la de inicio');
      return;
    }
    try {
      await createVacation.mutateAsync({
        startDate,
        endDate,
        comments: comments.trim() || undefined,
      });
      toast.success('Solicitud enviada');
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo crear la solicitud'));
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar mis vacaciones</DialogTitle>
          <DialogDescription>
            La solicitud se registra a nombre del usuario con el que iniciaste sesión.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Fin</Label>
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {days > 0 && (
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {days} día(s) naturales solicitados. El API calcula los días hábiles.
            </p>
          )}
          <div className="grid gap-1.5">
            <Label>Motivo / notas</Label>
            <Textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createVacation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={createVacation.isPending}>
            {createVacation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
