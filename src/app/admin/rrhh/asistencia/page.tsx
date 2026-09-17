'use client';

// Asistencia (checador) - consulta de RRHH.
//
// Los eventos los genera el checador del POS Electron: el empleado teclea su
// número, la webcam toma la foto y el API guarda el toque con la sucursal de
// la TERMINAL. Aquí solo se consulta (pestañas "Eventos" y "Resumen del día")
// y, con permiso hr:manage, se captura a mano lo que el checador no alcanzó a
// registrar.
//
// Los cuatro tipos replican el checador viejo (v1): Entrada, Salida a comer,
// Regreso de comer y Salida.
//
// OJO: la asistencia es por DÍA CALENDARIO LOCAL de la sucursal; NO usa los
// periodos de negocio 26→25.

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import {
  useAttendance,
  useAttendanceDay,
  useEmployee,
  useEmployees,
  useManualAttendance,
} from '@/hooks/useHR';
import { useBranches } from '@/hooks/useBranches';
import { hrService } from '@/services/hr.service';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';
import { csvDateStamp, exportToCsv } from '@/lib/csv-export';
import { DEFAULT_TIMEZONE, formatTimeLocal, resolveTimeZone } from '@/lib/timezone-utils';
import {
  addDays,
  apiErrorMessage,
  csvSafe,
  dayTimesSummary,
  hasManagePermission,
  todayCdmx,
} from '../hr-utils';
import {
  ATTENDANCE_DAY_STATUS_LABELS,
  ATTENDANCE_DAY_STATUS_VARIANTS,
  ATTENDANCE_EVENT_TYPES,
  ATTENDANCE_METHOD_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_VARIANTS,
  employeeDisplayName,
  type AttendanceDaySummaryRow,
  type AttendanceEvent,
  type AttendanceEventType,
  type AttendanceQuery,
} from '@/types/hr';
import type { Branch } from '@/types/branch';

/** Tope de renglones que se bajan para el CSV (el listado es paginado). */
const MAX_CSV_ROWS = 2000;

/**
 * Tamaño de página al bajar el CSV. El API tope `limit` en 200
 * (AttendanceQueryDto), así que el export pide páginas de 200 y las concatena
 * en vez de pedir MAX_CSV_ROWS de un jalón (eso devolvía 400).
 */
const CSV_PAGE_SIZE = 200;

// ---------------------------------------------------------------------------
// Utilidades locales
// ---------------------------------------------------------------------------
//
// todayCdmx, addDays, apiErrorMessage, csvSafe y hasManagePermission viven en
// ../hr-utils (las comparten todas las pantallas de RRHH).

/** Desfase (ms) de una zona respecto a UTC en ese instante. */
function timezoneOffsetMs(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTimeZone(timezone),
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  const hour = p.hour === '24' ? '00' : p.hour;
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - instant.getTime();
}

/**
 * Convierte la fecha y hora tecleadas (hora LOCAL de la sucursal) al instante
 * ISO que espera el API. RRHH puede estar en CDMX capturando un evento de
 * Tijuana o Cancún, así que se usa el desfase real de esa zona y no el del
 * navegador.
 */
function localInputToIso(date: string, time: string, timezone: string): string | null {
  if (!date || !time) return null;
  const naive = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  return new Date(naive.getTime() - timezoneOffsetMs(naive, timezone)).toISOString();
}

function isEventType(value: string): value is AttendanceEventType {
  return (ATTENDANCE_EVENT_TYPES as readonly string[]).includes(value);
}

/** Hora local de la sucursal ("11:45 a.m."), tolerante a timezones basura. */
function eventTime(event: AttendanceEvent): string {
  return formatTimeLocal(event.occurredAt, event.timezone);
}

interface PhotoTarget {
  url: string;
  title: string;
  subtitle: string;
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function AsistenciaPage() {
  return (
    <Suspense fallback={<AsistenciaSkeleton />}>
      <AsistenciaContent />
    </Suspense>
  );
}

function AsistenciaSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function AsistenciaContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    tab: 'eventos',
    branch: 'all',
    type: 'all',
    page: '1',
    limit: '50',
  });

  const today = todayCdmx();
  const tab = get('tab') === 'resumen' ? 'resumen' : 'eventos';
  const branch = get('branch');
  const type = get('type');
  const search = get('search');
  // Se llega aquí desde el expediente: /asistencia?employeeId=<id>&from=&to=
  const employeeId = get('employeeId');
  // Viendo a UNA persona el rango útil de EVENTOS no es "hoy" sino su último
  // mes. El resumen, en cambio, es de UN solo día: ahí el valor por omisión
  // vuelve a ser hoy (si no, mostraría el día de hace un mes).
  const defaultFrom = employeeId && tab === 'eventos' ? addDays(today, -29) : today;
  const from = get('from') || defaultFrom;
  const to = get('to') || today;
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 50;

  const [searchDraft, setSearchDraft] = useState(search);
  const [photo, setPhoto] = useState<PhotoTarget | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  const canManage = useMemo(() => hasManagePermission(permissions, roles), [permissions, roles]);

  const { data: branchesData } = useBranches({ limit: 200, isActive: true });
  const branches: Branch[] = branchesData?.data ?? [];

  const branchId = branch !== 'all' ? branch : undefined;
  const eventType = isEventType(type) ? type : undefined;

  // Nombre del empleado del filtro (para el chip); solo si viene en la URL.
  const { data: filteredEmployee } = useEmployee(employeeId);

  const applySearch = () => setParams({ search: searchDraft.trim() || null, page: null });

  const hasFilters =
    !!search ||
    !!employeeId ||
    branch !== 'all' ||
    type !== 'all' ||
    from !== today ||
    to !== today;

  const clearFilters = () => {
    setSearchDraft('');
    setParams({
      search: null,
      employeeId: null,
      branch: 'all',
      type: 'all',
      from: null,
      to: null,
      page: null,
    });
  };

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Asistencia</h1>
            <p className="text-gray-600">
              Checadas del personal de sucursal (entrada, comida y salida) con foto.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/rrhh">
              <Button variant="secondary">Volver a RRHH</Button>
            </Link>
            {canManage && (
              <Button onClick={() => setManualOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Captura manual
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setParams({ from: e.target.value || null, page: null })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setParams({ to: e.target.value || null, page: null })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Sucursal</Label>
              <SearchableSelect
                options={branches.map((b) => ({ value: b.id, label: b.name, hint: b.code }))}
                value={branch}
                onChange={(v) => setParams({ branch: v, page: null })}
                allLabel="Todas las sucursales"
                allValue="all"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Tipo</Label>
              <SearchableSelect
                options={ATTENDANCE_EVENT_TYPES.map((t) => ({
                  value: t,
                  label: EVENT_TYPE_LABELS[t],
                }))}
                value={type}
                onChange={(v) => setParams({ type: v, page: null })}
                allLabel="Todos los tipos"
                allValue="all"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Buscar</Label>
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                onBlur={applySearch}
                placeholder="Número de empleado o nombre"
              />
            </div>
          </div>

          {employeeId && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs text-primary">
                Empleado:{' '}
                <strong className="font-semibold">
                  {filteredEmployee ? employeeDisplayName(filteredEmployee) : employeeId}
                </strong>
                <button
                  type="button"
                  title="Quitar el filtro de empleado"
                  onClick={() => setParams({ employeeId: null, page: null })}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className="text-xs text-muted-foreground">
                {tab === 'resumen'
                  ? 'El resumen del día no filtra por persona: busca por su número de empleado y puede incluir coincidencias parecidas.'
                  : 'Solo se muestran las checadas de esta persona.'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <FilterChip
              active={from === today && to === today}
              onClick={() => setParams({ from: today, to: today, page: null })}
            >
              Hoy
            </FilterChip>
            <FilterChip
              active={from === addDays(today, -6) && to === today}
              onClick={() => setParams({ from: addDays(today, -6), to: today, page: null })}
            >
              Últimos 7 días
            </FilterChip>
            {hasFilters && (
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={clearFilters}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v, page: null })}>
        <TabsList>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="resumen">Resumen del día</TabsTrigger>
        </TabsList>

        {/* Radix solo monta la pestaña activa: cada consulta se dispara al
            entrar y no compiten por el mismo rango de fechas. */}
        <TabsContent value="eventos" className="mt-6">
          <EventosTab
            query={{
              from,
              to,
              branchId,
              employeeId: employeeId || undefined,
              search: search || undefined,
              eventType,
              page,
              limit,
            }}
            onPageChange={(p) => setParams({ page: String(p) })}
            onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
            onPhoto={setPhoto}
          />
        </TabsContent>

        <TabsContent value="resumen" className="mt-6">
          {/* `from` aquí es el día del resumen (ver defaultFrom). No filtra por
              employeeId (el API no lo soporta todavía): busca por número de
              empleado, que es coincidencia PARCIAL. */}
          <ResumenTab
            date={from}
            branchId={branchId}
            search={filteredEmployee?.employeeNumber || search || undefined}
            onPhoto={setPhoto}
          />
        </TabsContent>
      </Tabs>

      <PhotoDialog target={photo} onClose={() => setPhoto(null)} />

      {/* Se monta solo al abrir: así el formulario arranca limpio y con los
          filtros de la pantalla, sin resetear estado en un efecto. */}
      {canManage && manualOpen && (
        <CapturaManualDialog
          onOpenChange={setManualOpen}
          branches={branches}
          defaultBranchId={branchId ?? ''}
          defaultDate={from}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña: eventos
// ---------------------------------------------------------------------------

function EventosTab({
  query,
  onPageChange,
  onPageSizeChange,
  onPhoto,
}: {
  query: AttendanceQuery;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onPhoto: (target: PhotoTarget) => void;
}) {
  const { data, isLoading, isFetching, error } = useAttendance(query);
  const [exporting, setExporting] = useState(false);

  const events = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      // El listado es paginado y el API no acepta `limit` mayor a 200: para el
      // CSV se recorre el rango en páginas de CSV_PAGE_SIZE hasta juntar el
      // total o llegar al tope de renglones.
      const rows: AttendanceEvent[] = [];
      let total = 0;
      for (let p = 1; rows.length < MAX_CSV_ROWS; p++) {
        const chunk = await hrService.getAttendance({
          ...query,
          page: p,
          limit: CSV_PAGE_SIZE,
        });
        total = chunk.total;
        rows.push(...chunk.data);
        // Última página (o respuesta vacía): corta el bucle.
        if (chunk.data.length < CSV_PAGE_SIZE || rows.length >= chunk.total) break;
      }
      const exported = rows.slice(0, MAX_CSV_ROWS);
      if (total > exported.length) {
        toast.info(
          `Se exportaron los primeros ${exported.length} de ${total} registros. Acota el rango de fechas.`,
        );
      }
      exportToCsv(
        `asistencia-eventos-${csvDateStamp()}`,
        [
          'Fecha',
          'Hora',
          'Numero',
          'Empleado',
          'Tipo',
          'Sucursal',
          'Sucursal del empleado',
          'Metodo',
          'Registrado por',
          'Notas',
          'Foto',
        ],
        exported.map((ev) => [
          ev.localDate,
          ev.localTime,
          csvSafe(ev.employeeNumber),
          csvSafe(ev.employeeName),
          EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType,
          csvSafe(ev.branchName),
          csvSafe(ev.employeeBranchName),
          ATTENDANCE_METHOD_LABELS[ev.method] ?? ev.method,
          csvSafe(ev.registeredBy?.name),
          csvSafe(ev.notes),
          ev.photoUrl ? 'Si' : 'No',
        ]),
      );
      toast.success('Reporte exportado');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo exportar el reporte'));
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<AttendanceEvent>[] = [
    {
      key: 'occurredAt',
      header: 'Hora local',
      render: (ev) => (
        <div>
          <p className="text-sm font-semibold tabular-nums">{eventTime(ev)}</p>
          <p className="text-xs text-muted-foreground">{ev.localDate}</p>
        </div>
      ),
    },
    {
      key: 'employee',
      header: 'Empleado',
      render: (ev) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{ev.employeeName ?? 'Sin nombre'}</p>
          <p className="font-mono text-xs text-muted-foreground">{ev.employeeNumber}</p>
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
      render: (ev) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{ev.branchName ?? '—'}</p>
          {ev.employeeBranchId && ev.employeeBranchId !== ev.branchId && (
            <p className="truncate text-xs text-amber-600">
              Adscrito a {ev.employeeBranchName ?? 'otra sucursal'}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Método',
      render: (ev) => (
        <div className="min-w-0">
          <p className="text-sm">{ATTENDANCE_METHOD_LABELS[ev.method] ?? ev.method}</p>
          {ev.registeredBy && (
            <p className="truncate text-xs text-muted-foreground">por {ev.registeredBy.name}</p>
          )}
          {ev.notes && <p className="truncate text-xs text-muted-foreground">{ev.notes}</p>}
        </div>
      ),
    },
    {
      key: 'photo',
      header: 'Foto',
      render: (ev) => (
        <PhotoThumb
          url={ev.photoUrl}
          error={ev.photoError}
          alt={`Foto de ${ev.employeeName ?? ev.employeeNumber}`}
          onOpen={() => {
            if (!ev.photoUrl) return;
            onPhoto({
              url: ev.photoUrl,
              title: `${ev.employeeNumber} · ${ev.employeeName ?? 'Sin nombre'}`,
              subtitle: `${EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType} · ${ev.localDate} ${eventTime(ev)} · ${ev.branchName ?? ''}`,
            });
          }}
        />
      ),
    },
  ];

  if (error) {
    return <ErrorCard message="No se pudieron cargar los eventos del checador." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isLoading && !data ? 'Cargando…' : `${total.toLocaleString('es-MX')} eventos`}
        </p>
        <Button variant="outline" onClick={handleExport} disabled={exporting || total === 0}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          )}
          Exportar CSV
        </Button>
      </div>

      {/* Celular: tarjetas. Escritorio: tabla. */}
      <div className="space-y-3 sm:hidden">
        {isLoading && !data ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : events.length === 0 ? (
          <EmptyCard />
        ) : (
          events.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <PhotoThumb
                  url={ev.photoUrl}
                  error={ev.photoError}
                  alt={`Foto de ${ev.employeeName ?? ev.employeeNumber}`}
                  onOpen={() => {
                    if (!ev.photoUrl) return;
                    onPhoto({
                      url: ev.photoUrl,
                      title: `${ev.employeeNumber} · ${ev.employeeName ?? 'Sin nombre'}`,
                      subtitle: `${EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType} · ${ev.localDate} ${eventTime(ev)}`,
                    });
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {ev.employeeName ?? 'Sin nombre'}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {ev.employeeNumber}
                      </p>
                    </div>
                    <Badge variant={EVENT_TYPE_VARIANTS[ev.eventType] ?? 'secondary'}>
                      {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ev.localDate} · {eventTime(ev)} · {ev.branchName ?? '—'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {events.length > 0 && (
          <DataTablePagination
            currentPage={query.page ?? 1}
            pageSize={query.limit ?? 50}
            totalItems={total}
            isLoading={isLoading || isFetching}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={[25, 50, 100]}
          />
        )}
      </div>

      <Card className="hidden sm:block">
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={events}
            isLoading={isLoading && !data}
            getRowKey={(ev) => ev.id}
            minWidthClassName="min-w-[900px]"
            emptyState={
              <div className="py-8 text-center">
                <ClockIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">Sin checadas en el rango</p>
                <p className="text-sm text-muted-foreground">
                  Ajusta las fechas, la sucursal o el tipo de evento.
                </p>
              </div>
            }
          />
          {events.length > 0 && (
            <div className="mt-4">
              <DataTablePagination
                currentPage={query.page ?? 1}
                pageSize={query.limit ?? 50}
                totalItems={total}
                isLoading={isLoading || isFetching}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                pageSizeOptions={[25, 50, 100]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña: resumen del día
// ---------------------------------------------------------------------------

function ResumenTab({
  date,
  branchId,
  search,
  onPhoto,
}: {
  date: string;
  branchId?: string;
  search?: string;
  onPhoto: (target: PhotoTarget) => void;
}) {
  const { data, isLoading, error } = useAttendanceDay({ date, branchId, search });
  const rows = data?.rows ?? [];
  const summary = data?.summary;

  const handleExport = () => {
    exportToCsv(
      `asistencia-resumen-${date}`,
      [
        'Numero',
        'Empleado',
        'Sucursal',
        'Horario',
        'Entrada',
        'Entrada esperada',
        'Retardo (min)',
        'Salida a comer',
        'Regreso de comer',
        'Comida esperada',
        'Comida (min)',
        'Comida excedida (min)',
        'Salida',
        'Salida esperada',
        'Salida anticipada (min)',
        'Horas',
        'Eventos',
        'Turno abierto',
        'Estado',
      ],
      rows.map((r) => [
        csvSafe(r.employeeNumber),
        csvSafe(r.employeeName),
        csvSafe(r.branchName),
        csvSafe(r.scheduleCode),
        r.checkInTime ?? '',
        r.expectedCheckIn ?? '',
        r.lateMinutes ?? '',
        r.breakOutTime ?? '',
        r.breakInTime ?? '',
        csvSafe(expectedBreakText(r)),
        r.breakMinutes ?? '',
        r.breakExcessMinutes ?? '',
        r.checkOutTime ?? '',
        r.expectedCheckOut ?? '',
        r.earlyLeaveMinutes ?? '',
        r.hoursWorked ?? '',
        r.eventsCount,
        r.openShift ? 'Si' : 'No',
        ATTENDANCE_DAY_STATUS_LABELS[r.status] ?? r.status ?? '',
      ]),
    );
    toast.success('Resumen exportado');
  };

  const columns: DataTableColumn<AttendanceDaySummaryRow>[] = [
    {
      key: 'employee',
      header: 'Empleado',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{r.employeeName ?? 'Sin nombre'}</p>
          <p className="font-mono text-xs text-muted-foreground">{r.employeeNumber}</p>
          <p className="truncate text-xs text-muted-foreground">{r.branchName ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Horario',
      render: (r) =>
        r.scheduleCode ? (
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="truncate font-mono text-xs">{r.scheduleCode}</p>
              {/* Ese día corrió con una excepción del horario (los expected* ya la traen). */}
              {r.scheduleDayOverride && (
                <Badge
                  variant="info"
                  className="px-1.5 py-0 text-[10px]"
                  title={`Horario de ese día: ${scheduleDayText(r)}`}
                >
                  día especial
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {r.expectedCheckIn ?? '—'} - {r.expectedCheckOut ?? '—'}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin horario</span>
        ),
    },
    {
      key: 'checkIn',
      header: 'Entrada',
      render: (r) => (
        <div>
          <TimeCell value={r.checkInTime} />
          {r.expectedCheckIn ? (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              esperada {r.expectedCheckIn}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'lateMinutes',
      header: 'Retardo (min)',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => <DeviationCell value={r.lateMinutes} />,
    },
    {
      key: 'breakOut',
      header: 'Salida a comer',
      render: (r) => (
        <div>
          <TimeCell value={r.breakOutTime} />
          <ExpectedBreakHint row={r} expected={r.expectedBreakOut} />
        </div>
      ),
    },
    {
      key: 'breakIn',
      header: 'Regreso',
      render: (r) => (
        <div>
          <TimeCell value={r.breakInTime} />
          <ExpectedBreakHint row={r} expected={r.expectedBreakIn} />
        </div>
      ),
    },
    {
      key: 'breakMinutes',
      header: 'Comida (min)',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => <span className="text-sm tabular-nums">{r.breakMinutes ?? '—'}</span>,
    },
    {
      key: 'breakExcessMinutes',
      header: 'Comida excedida',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => <DeviationCell value={r.breakExcessMinutes} />,
    },
    { key: 'checkOut', header: 'Salida', render: (r) => <TimeCell value={r.checkOutTime} /> },
    {
      key: 'earlyLeaveMinutes',
      header: 'Salida anticipada',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => <DeviationCell value={r.earlyLeaveMinutes} />,
    },
    {
      key: 'hoursWorked',
      header: 'Horas',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => (
        <span className="text-sm font-semibold tabular-nums">
          {r.hoursWorked === null ? '—' : r.hoursWorked.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'eventsCount',
      header: 'Eventos',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => <span className="text-sm tabular-nums">{r.eventsCount}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) =>
        r.status ? (
          <Badge variant={ATTENDANCE_DAY_STATUS_VARIANTS[r.status] ?? 'secondary'}>
            {ATTENDANCE_DAY_STATUS_LABELS[r.status] ?? r.status}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'openShift',
      header: 'Turno',
      render: (r) =>
        r.eventsCount === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : r.openShift ? (
          <Badge variant="warning">Abierto</Badge>
        ) : (
          <Badge variant="success">Cerrado</Badge>
        ),
    },
    {
      key: 'photos',
      header: 'Fotos',
      render: (r) => (
        <div className="flex items-center gap-2">
          <PhotoThumb
            url={r.firstPhotoUrl}
            error={null}
            alt={`Primera foto de ${r.employeeName ?? r.employeeNumber}`}
            onOpen={() => {
              if (!r.firstPhotoUrl) return;
              onPhoto({
                url: r.firstPhotoUrl,
                title: `${r.employeeNumber} · ${r.employeeName ?? 'Sin nombre'}`,
                subtitle: `Primera checada · ${date}`,
              });
            }}
          />
          <PhotoThumb
            url={r.lastPhotoUrl}
            error={null}
            alt={`Última foto de ${r.employeeName ?? r.employeeNumber}`}
            onOpen={() => {
              if (!r.lastPhotoUrl) return;
              onPhoto({
                url: r.lastPhotoUrl,
                title: `${r.employeeNumber} · ${r.employeeName ?? 'Sin nombre'}`,
                subtitle: `Última checada · ${date}`,
              });
            }}
          />
        </div>
      ),
    },
  ];

  if (error) {
    return <ErrorCard message="No se pudo cargar el resumen del día." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Día {data?.date ?? date} · {rows.length.toLocaleString('es-MX')} empleados (se usa la
          fecha del filtro &laquo;Desde&raquo;). Incluye a quienes tenían que checar y no lo
          hicieron.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Tarjetas del día: el API ya manda los totales calculados. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryTile label="Presentes" value={summary?.present} loading={isLoading && !data} />
        <SummaryTile
          label="Faltas"
          value={summary?.absent}
          tone="text-red-600"
          loading={isLoading && !data}
        />
        <SummaryTile
          label="Retardos"
          value={summary?.late}
          tone="text-amber-600"
          loading={isLoading && !data}
        />
        <SummaryTile
          label="A tiempo"
          value={summary?.onTime}
          tone="text-emerald-600"
          loading={isLoading && !data}
        />
        <SummaryTile
          label="Sin horario"
          value={summary?.noSchedule}
          tone="text-slate-500"
          loading={isLoading && !data}
        />
      </div>

      <div className="space-y-3 sm:hidden">
        {isLoading && !data ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : rows.length === 0 ? (
          <EmptyCard />
        ) : (
          rows.map((r) => (
            <Card key={r.employeeId}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.employeeName ?? 'Sin nombre'}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{r.employeeNumber}</p>
                  </div>
                  {r.status ? (
                    <Badge variant={ATTENDANCE_DAY_STATUS_VARIANTS[r.status] ?? 'secondary'}>
                      {ATTENDANCE_DAY_STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  ) : r.openShift ? (
                    <Badge variant="warning">Turno abierto</Badge>
                  ) : (
                    <Badge variant="success">Cerrado</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Entrada: {r.checkInTime ?? '—'}</span>
                  <span>Salida: {r.checkOutTime ?? '—'}</span>
                  <span>Comida: {r.breakOutTime ?? '—'}</span>
                  <span>Regreso: {r.breakInTime ?? '—'}</span>
                  <span>Horas: {r.hoursWorked === null ? '—' : r.hoursWorked.toFixed(2)}</span>
                  <span>Comida (min): {r.breakMinutes ?? '—'}</span>
                  <span>Comida esperada: {expectedBreakText(r) || '—'}</span>
                  <span>Retardo: {r.lateMinutes ?? '—'} min</span>
                  <span>Horario: {r.scheduleCode ?? 'sin horario'}</span>
                  {r.scheduleDayOverride && <span>Día especial: {scheduleDayText(r)}</span>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden sm:block">
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading && !data}
            getRowKey={(r) => r.employeeId}
            minWidthClassName="min-w-[1600px]"
            emptyState={
              <div className="py-8 text-center">
                <ClockIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">Nadie checó ese día</p>
                <p className="text-sm text-muted-foreground">
                  Cambia la fecha o la sucursal del filtro.
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas compartidas
// ---------------------------------------------------------------------------

/** "09:00-14:00 · sin comida": el horario que corrió ese día en particular. */
function scheduleDayText(r: AttendanceDaySummaryRow): string {
  return dayTimesSummary({
    checkInTime: r.expectedCheckIn,
    checkOutTime: r.expectedCheckOut,
    breakMinutes: r.scheduleBreakMinutes,
  });
}

/**
 * Qué se esperaba de la comida ese día. Con comida LIBRE (decisión del cliente
 * del 17-sep-2026) no hay horas fijas que comparar: solo la duración máxima.
 */
function expectedBreakText(r: AttendanceDaySummaryRow): string {
  if (r.scheduleBreakMode === 'flexible') {
    return `Libre (máx. ${r.scheduleBreakMinutes ?? 0})`;
  }
  if (r.expectedBreakOut && r.expectedBreakIn) {
    return `${r.expectedBreakOut} - ${r.expectedBreakIn}`;
  }
  return '';
}

/** Renglón chico debajo del toque real de comida con lo esperado. */
function ExpectedBreakHint({
  row,
  expected,
}: {
  row: AttendanceDaySummaryRow;
  expected: string | null;
}) {
  if (row.scheduleBreakMode === 'flexible') {
    return (
      <p className="text-[11px] text-muted-foreground tabular-nums">
        Libre (máx. {row.scheduleBreakMinutes ?? 0})
      </p>
    );
  }
  if (!expected) return null;
  return <p className="text-[11px] text-muted-foreground tabular-nums">esperada {expected}</p>;
}

function TimeCell({ value }: { value: string | null }) {
  return (
    <span className={value ? 'text-sm tabular-nums' : 'text-sm text-muted-foreground'}>
      {value ?? '—'}
    </span>
  );
}

/** Minutos de desviación: 0 o null se ven neutros, >0 en ámbar. */
function DeviationCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <span
      className={`text-sm tabular-nums ${value > 0 ? 'font-semibold text-amber-600' : 'text-muted-foreground'}`}
    >
      {value}
    </span>
  );
}

/** Tarjeta de total del día (presentes, faltas, retardos…). */
function SummaryTile({
  label,
  value,
  tone = 'text-gray-900',
  loading,
}: {
  label: string;
  value: number | undefined;
  tone?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        {loading ? (
          <Skeleton className="mx-auto mb-1 h-7 w-10" />
        ) : (
          <p className={`text-xl font-bold ${tone}`}>{(value ?? 0).toLocaleString('es-MX')}</p>
        )}
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyCard() {
  return (
    <Card>
      <CardContent className="p-6 text-center text-sm text-muted-foreground">
        No hay registros con esos filtros.
      </CardContent>
    </Card>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex items-center gap-3 p-6 text-red-700">
        <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

/** Miniatura de la foto del checador; la URL firmada dura 15 minutos. */
function PhotoThumb({
  url,
  error,
  alt,
  onOpen,
}: {
  url: string | null;
  error: string | null;
  alt: string;
  onOpen: () => void;
}) {
  if (!url) {
    return (
      <span className="text-xs text-muted-foreground" title={error ?? undefined}>
        {error ? 'Foto fallida' : 'Sin foto'}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80"
      title="Ver foto"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="h-full w-full object-cover" />
    </button>
  );
}

/** Visor de la foto en grande (el repo no tiene componente de galería). */
function PhotoDialog({ target, onClose }: { target: PhotoTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{target?.title ?? 'Foto del registro'}</DialogTitle>
          <DialogDescription>{target?.subtitle}</DialogDescription>
        </DialogHeader>
        {target && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={target.url}
              alt={target.title}
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
            <DialogFooter>
              <Button asChild variant="outline">
                <a href={target.url} target="_blank" rel="noopener noreferrer">
                  Abrir en pestaña nueva
                </a>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Captura manual (hr:manage)
// ---------------------------------------------------------------------------

function CapturaManualDialog({
  onOpenChange,
  branches,
  defaultBranchId,
  defaultDate,
}: {
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  defaultBranchId: string;
  defaultDate: string;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [eventType, setEventType] = useState<AttendanceEventType>('check_in');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');

  const { data: employeesData, isLoading: loadingEmployees } = useEmployees({
    limit: 200,
    status: 'active',
  });
  const employees = employeesData?.data ?? [];
  const manual = useManualAttendance();

  // La hora se teclea como hora LOCAL de la sucursal elegida.
  const timezone = branches.find((b) => b.id === branchId)?.timezone ?? DEFAULT_TIMEZONE;

  const submit = async () => {
    if (!employeeId) {
      toast.error('Elige al empleado');
      return;
    }
    if (!branchId) {
      toast.error('Elige la sucursal');
      return;
    }
    const occurredAt = localInputToIso(date, time, timezone);
    if (!occurredAt) {
      toast.error('Revisa la fecha y la hora');
      return;
    }
    try {
      await manual.mutateAsync({
        employeeId,
        branchId,
        eventType,
        occurredAt,
        notes: notes.trim() || undefined,
      });
      toast.success('Registro capturado');
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo capturar el registro'));
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Captura manual</DialogTitle>
          <DialogDescription>
            Para lo que el checador no alcanzó a registrar. Queda marcado como captura manual
            y con tu usuario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Empleado</Label>
            <SearchableSelect
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.employeeNumber} - ${employeeDisplayName(e)}`,
                hint: e.branchName ?? undefined,
              }))}
              value={employeeId}
              onChange={setEmployeeId}
              showAllOption={false}
              disabled={loadingEmployees}
              placeholder="Buscar por número o nombre"
            />
          </div>

          <div className="grid gap-2">
            <Label>Sucursal</Label>
            <SearchableSelect
              options={branches.map((b) => ({ value: b.id, label: b.name, hint: b.code }))}
              value={branchId}
              onChange={setBranchId}
              showAllOption={false}
              placeholder="Buscar sucursal"
            />
          </div>

          <div className="grid gap-2">
            <Label>Tipo de evento</Label>
            <SearchableSelect
              options={ATTENDANCE_EVENT_TYPES.map((t) => ({
                value: t,
                label: EVENT_TYPE_LABELS[t],
              }))}
              value={eventType}
              onChange={(v) => isEventType(v) && setEventType(v)}
              showAllOption={false}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Hora</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            La hora se guarda como hora local de la sucursal ({resolveTimeZone(timezone)}).
          </p>

          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de la captura (olvidó checar, falla de cámara...)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={manual.isPending}>
            {manual.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}
