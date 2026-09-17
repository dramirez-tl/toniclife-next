'use client';

// Empleados: listado del expediente de RRHH.
//
// Incluye a los colaboradores SIN cuenta de acceso (alta solo para control de
// RRHH). Los filtros viven en la URL; la búsqueda pega al servidor con 300 ms
// de retraso y la consulta conserva los datos anteriores (keepPreviousData)
// para que el input NO pierda el foco mientras carga.

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useEmployees, useDepartments } from '@/hooks/useHR';
import { useBranches } from '@/hooks/useBranches';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';
import { hrService } from '@/services/hr.service';
import { csvDateStamp, exportToCsv } from '@/lib/csv-export';
import { EmployeeAvatar } from '@/components/admin/hr/EmployeeAvatar';
import { EmployeeFormDialog } from '@/components/admin/hr/EmployeeFormDialog';
import { EmployeeImportDialog } from '@/components/admin/hr/EmployeeImportDialog';
import {
  apiErrorMessage,
  csvSafe,
  formatDateOnly,
  hasManagePermission,
} from '../hr-utils';
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_VARIANTS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_VARIANTS,
  employeeDisplayName,
  type Employee,
  type EmployeeQuery,
  type EmployeeStatus,
  type EmploymentType,
} from '@/types/hr';
import type { Branch } from '@/types/branch';

/** Tope de renglones del CSV (el listado es paginado). */
const MAX_CSV_ROWS = 2000;
/** El API tope `limit` en 200 (EmployeeQueryDto). */
const CSV_PAGE_SIZE = 200;

function isEmploymentType(v: string): v is EmploymentType {
  return (EMPLOYMENT_TYPES as readonly string[]).includes(v);
}

function isEmployeeStatus(v: string): v is EmployeeStatus {
  return (EMPLOYEE_STATUSES as readonly string[]).includes(v);
}

export default function EmpleadosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EmpleadosContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function EmpleadosContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    department: 'all',
    branch: 'all',
    status: 'all',
    type: 'all',
    access: 'all',
    page: '1',
    limit: '20',
  });

  const filterDepartment = get('department');
  const filterBranch = get('branch');
  const filterStatus = get('status');
  const filterType = get('type');
  const filterAccess = get('access');
  const search = get('search');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 20;

  const [searchDraft, setSearchDraft] = useState(search);
  const [formOpen, setFormOpen] = useState(false);
  // Solo el id: el diálogo carga el expediente COMPLETO (el renglón del
  // listado no trae notas y mandarlas vacías las borraría).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  const canManage = useMemo(() => hasManagePermission(permissions, roles), [permissions, roles]);

  // Búsqueda con retraso: una petición cuando el usuario deja de teclear.
  useEffect(() => {
    if (searchDraft === search) return;
    const t = setTimeout(() => setParams({ search: searchDraft.trim() || null, page: null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const { data: branchesData } = useBranches({ limit: 200, isActive: true });
  const branches: Branch[] = branchesData?.data ?? [];
  const { data: departments } = useDepartments();

  const query: EmployeeQuery = {
    search: search || undefined,
    branchId: filterBranch !== 'all' ? filterBranch : undefined,
    departmentId: filterDepartment !== 'all' ? filterDepartment : undefined,
    employmentType: isEmploymentType(filterType) ? filterType : undefined,
    status: isEmployeeStatus(filterStatus) ? filterStatus : undefined,
    hasSystemAccess:
      filterAccess === 'with' ? true : filterAccess === 'without' ? false : undefined,
    page,
    limit,
  };

  const { data, isLoading, isFetching, error } = useEmployees(query);
  const employees = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;

  const hasFilters =
    !!search ||
    filterBranch !== 'all' ||
    filterDepartment !== 'all' ||
    filterStatus !== 'all' ||
    filterType !== 'all' ||
    filterAccess !== 'all';

  const clearFilters = () => {
    setSearchDraft('');
    setParams({
      search: null,
      branch: 'all',
      department: 'all',
      status: 'all',
      type: 'all',
      access: 'all',
      page: null,
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows: Employee[] = [];
      let apiTotal = 0;
      for (let p = 1; rows.length < MAX_CSV_ROWS; p++) {
        const chunk = await hrService.listEmployees({ ...query, page: p, limit: CSV_PAGE_SIZE });
        apiTotal = chunk.pagination.total;
        rows.push(...chunk.data);
        if (chunk.data.length < CSV_PAGE_SIZE || rows.length >= apiTotal) break;
      }
      const exported = rows.slice(0, MAX_CSV_ROWS);
      if (apiTotal > exported.length) {
        toast.info(
          `Se exportaron los primeros ${exported.length} de ${apiTotal} empleados. Acota los filtros.`,
        );
      }
      exportToCsv(
        `empleados-${csvDateStamp()}`,
        [
          'Numero',
          'NOI',
          'Gafete',
          'Nombre',
          'Tipo',
          'Acceso al sistema',
          'Puesto',
          'Departamento',
          'Sucursal',
          'Horario',
          'Ingreso',
          'Estado',
          'Telefono',
          'Correo',
        ],
        exported.map((e) => [
          csvSafe(e.employeeNumber),
          csvSafe(e.noiNumber),
          csvSafe(e.badgeCode),
          csvSafe(employeeDisplayName(e)),
          EMPLOYMENT_TYPE_LABELS[e.employmentType] ?? e.employmentType,
          e.hasSystemAccess ? 'Si' : 'No',
          csvSafe(e.jobPositionName),
          csvSafe(e.departmentName),
          csvSafe(e.branchName),
          csvSafe(e.workScheduleName),
          e.hireDate ? e.hireDate.split('T')[0] : '',
          EMPLOYEE_STATUS_LABELS[e.status] ?? e.status,
          csvSafe(e.phone),
          csvSafe(e.email),
        ]),
      );
      toast.success('Listado exportado');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo exportar el listado'));
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<Employee>[] = [
    {
      key: 'employee',
      header: 'Empleado',
      render: (e) => {
        const name = employeeDisplayName(e);
        return (
          <div className="flex min-w-0 items-center gap-3">
            <EmployeeAvatar photoUrl={e.photoUrl} name={name} size={40} />
            <div className="min-w-0">
              <Link
                href={`/admin/rrhh/empleados/${e.id}`}
                className="truncate font-semibold text-gray-900 hover:text-primary hover:underline"
              >
                {name}
              </Link>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {e.employeeNumber}
                {e.noiNumber ? ` · NOI ${e.noiNumber}` : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'employmentType',
      header: 'Tipo',
      render: (e) => (
        <div className="space-y-1">
          <Badge variant={EMPLOYMENT_TYPE_VARIANTS[e.employmentType] ?? 'secondary'}>
            {EMPLOYMENT_TYPE_LABELS[e.employmentType] ?? e.employmentType}
          </Badge>
          {!e.hasSystemAccess && (
            <p className="text-[11px] text-muted-foreground">Sin acceso</p>
          )}
        </div>
      ),
    },
    {
      key: 'jobPosition',
      header: 'Puesto',
      cellClassName: 'text-sm text-gray-700',
      render: (e) => e.jobPositionName || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'department',
      header: 'Departamento',
      cellClassName: 'text-sm text-gray-700',
      render: (e) => e.departmentName || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'branch',
      header: 'Sucursal',
      cellClassName: 'text-sm text-gray-700',
      render: (e) =>
        e.branchName || <span className="text-muted-foreground">Corporativo</span>,
    },
    {
      key: 'schedule',
      header: 'Horario',
      render: (e) =>
        e.workScheduleName ? (
          <span className="text-sm text-gray-700">{e.workScheduleName}</span>
        ) : (
          <span className="text-xs text-amber-600">Sin horario</span>
        ),
    },
    {
      key: 'hireDate',
      header: 'Ingreso',
      cellClassName: 'text-sm text-gray-600',
      render: (e) => formatDateOnly(e.hireDate),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (e) => (
        <Badge variant={EMPLOYEE_STATUS_VARIANTS[e.status] ?? 'secondary'}>
          {EMPLOYEE_STATUS_LABELS[e.status] ?? e.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm" title="Ver expediente">
            <Link href={`/admin/rrhh/empleados/${e.id}`}>
              <EyeIcon className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" title="Ver checadas">
            <Link href={`/admin/rrhh/asistencia?employeeId=${e.id}`}>
              <ClockIcon className="h-4 w-4" />
            </Link>
          </Button>
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              title="Editar expediente"
              onClick={() => {
                setEditingId(e.id);
                setFormOpen(true);
              }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600">
            Expedientes de RRHH, con y sin cuenta de acceso al sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/rrhh">
            <Button variant="secondary">Volver a RRHH</Button>
          </Link>
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormOpen(true);
                }}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Nuevo empleado
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <Label className="mb-1 block text-xs text-muted-foreground">Buscar</Label>
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Número, NOI, gafete o nombre"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Sucursal</Label>
              <SearchableSelect
                options={branches.map((b) => ({ value: b.id, label: b.name, hint: b.code }))}
                value={filterBranch}
                onChange={(v) => setParams({ branch: v, page: null })}
                allLabel="Todas las sucursales"
                allValue="all"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Departamento</Label>
              <SearchableSelect
                options={(departments ?? []).map((d) => ({
                  value: d.id,
                  label: d.name,
                  hint: d.code,
                }))}
                value={filterDepartment}
                onChange={(v) => setParams({ department: v, page: null })}
                allLabel="Todos los departamentos"
                allValue="all"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Tipo</Label>
              <SearchableSelect
                options={EMPLOYMENT_TYPES.map((t) => ({
                  value: t,
                  label: EMPLOYMENT_TYPE_LABELS[t],
                }))}
                value={filterType}
                onChange={(v) => setParams({ type: v, page: null })}
                allLabel="Todos los tipos"
                allValue="all"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Estado</Label>
              <SearchableSelect
                options={EMPLOYEE_STATUSES.map((s) => ({
                  value: s,
                  label: EMPLOYEE_STATUS_LABELS[s],
                }))}
                value={filterStatus}
                onChange={(v) => setParams({ status: v, page: null })}
                allLabel="Activos (sin bajas)"
                allValue="all"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-64">
              <Label className="mb-1 block text-xs text-muted-foreground">
                Acceso al sistema
              </Label>
              <SearchableSelect
                options={[
                  { value: 'with', label: 'Con cuenta de usuario' },
                  { value: 'without', label: 'Sin acceso (solo RRHH)' },
                ]}
                value={filterAccess}
                onChange={(v) => setParams({ access: v, page: null })}
                allLabel="Con y sin acceso"
                allValue="all"
              />
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              {hasFilters && (
                <button type="button" className="text-xs text-primary underline" onClick={clearFilters}>
                  Limpiar filtros
                </button>
              )}
              <Button variant="outline" onClick={() => void handleExport()} disabled={exporting || total === 0}>
                {exporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                )}
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-6 text-red-700">
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
            <p className="text-sm">No se pudo cargar el listado de empleados.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {isLoading && !data ? 'Cargando…' : `${total.toLocaleString('es-MX')} empleados`}
          </p>

          {/* Celular: tarjetas. Escritorio: tabla. */}
          <div className="space-y-3 sm:hidden">
            {isLoading && !data ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : employees.length === 0 ? (
              <EmptyState />
            ) : (
              employees.map((e) => {
                const name = employeeDisplayName(e);
                return (
                  <Card key={e.id}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <EmployeeAvatar photoUrl={e.photoUrl} name={name} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/admin/rrhh/empleados/${e.id}`}
                            className="truncate text-sm font-semibold hover:underline"
                          >
                            {name}
                          </Link>
                          <Badge variant={EMPLOYEE_STATUS_VARIANTS[e.status] ?? 'secondary'}>
                            {EMPLOYEE_STATUS_LABELS[e.status] ?? e.status}
                          </Badge>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {e.employeeNumber}
                          {e.noiNumber ? ` · NOI ${e.noiNumber}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[
                            EMPLOYMENT_TYPE_LABELS[e.employmentType] ?? e.employmentType,
                            e.jobPositionName,
                            e.branchName ?? 'Corporativo',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
            {employees.length > 0 && (
              <DataTablePagination
                currentPage={page}
                pageSize={limit}
                totalItems={total}
                isLoading={isLoading || isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                pageSizeOptions={[20, 50, 100]}
              />
            )}
          </div>

          <Card className="hidden sm:block">
            <CardContent className="p-6">
              <DataTable
                columns={columns}
                data={employees}
                isLoading={isLoading && !data}
                getRowKey={(e) => e.id}
                minWidthClassName="min-w-[1100px]"
                emptyState={<EmptyState />}
              />
              {employees.length > 0 && (
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
            </CardContent>
          </Card>
        </>
      )}

      {/* Se montan solo al abrir: el formulario arranca limpio sin efectos. */}
      {formOpen && (
        <EmployeeFormDialog
          open
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingId(null);
          }}
          employeeId={editingId}
        />
      )}
      {importOpen && <EmployeeImportDialog open onOpenChange={setImportOpen} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-10 text-center">
      <UserGroupIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
      <p className="text-sm font-medium">No se encontraron empleados</p>
      <p className="text-sm text-muted-foreground">Ajusta la búsqueda o los filtros.</p>
    </div>
  );
}
