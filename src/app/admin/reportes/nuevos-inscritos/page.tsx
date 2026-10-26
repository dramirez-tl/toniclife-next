'use client';

// Reportes › Nuevos Inscritos — distribuidores dados de alta cada semana, con
// teléfono, kit, estatus, patrocinador y el estado de su invitación al Taller
// de Inducción por WhatsApp. La usa Call Center (reports:new_distributors,
// mig 173) para contactarlos y darles la información de los talleres; es la
// misma cohorte semanal (altas de miércoles a martes) de la pestaña de
// WhatsApp, sin los envíos. Reportes (reports:read) también la ve.

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PermissionGuard } from '@/components/auth';
import { useNewDistributors } from '@/hooks/useReports';
import { reportsService } from '@/services/reports.service';
import type { NewDistributorRow } from '@/types/reports';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' (fecha de negocio, sin zona horaria). */
function dmy(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '');
}

/** 'YYYY-MM-DD' → 'martes 27 de octubre de 2026'. */
function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${WEEKDAYS[dt.getUTCDay()]} ${dt.getUTCDate()} de ${MONTHS[dt.getUTCMonth()]} de ${dt.getUTCFullYear()}`;
}

/** '21 oct' (corto, para el rango). */
function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1].slice(0, 3)}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const KIT_LABEL: Record<string, string> = { basic: 'Básico', premium: 'Premium' };
const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
};
const INVITATION: Record<string, { label: string; className: string }> = {
  queued: { label: 'En cola', className: 'bg-gray-100 text-gray-700' },
  accepted: { label: 'Aceptada', className: 'bg-sky-100 text-sky-800' },
  sent: { label: 'Enviada', className: 'bg-sky-100 text-sky-800' },
  delivered: { label: 'Entregada', className: 'bg-emerald-100 text-emerald-800' },
  read: { label: 'Leída', className: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Fallida', className: 'bg-red-100 text-red-800' },
};

const TH = 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap';
/** Los inputs type=date emiten años parciales mientras se teclea ('0002-…'). */
const MIN_PICKABLE_DATE = '2000-01-01';

export default function NuevosInscritosPage() {
  return (
    <PermissionGuard permissions={['reports:read', 'reports:new_distributors']}>
      <NuevosInscritosContent />
    </PermissionGuard>
  );
}

function NuevosInscritosContent() {
  // Semana elegida (cualquier día de ella); vacío = la del próximo taller.
  const [weekOf, setWeekOf] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching, error, refetch } = useNewDistributors({ weekOf });
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.customerNumber.toLowerCase().includes(q) ||
        (r.phone ?? '').includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.sponsorNumber ?? '').includes(q) ||
        (r.branchName ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const goTo = (d?: string) => {
    setWeekOf(d);
    setSearch('');
  };

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await reportsService.downloadNewDistributorsXlsx({ weekOf: data.workshopDate });
    } catch {
      toast.error('No se pudo descargar el Excel');
    } finally {
      setDownloading(false);
    }
  };

  const summary = data?.summary;
  const kpis = summary
    ? [
        { label: 'Nuevos en la semana', value: summary.total, tone: 'text-[#3E667D]' },
        { label: 'Con teléfono', value: summary.withPhone, tone: 'text-gray-900' },
        { label: 'Premium', value: summary.premium, tone: 'text-emerald-700' },
        { label: 'Básico', value: summary.basic, tone: 'text-gray-900' },
        { label: 'Sin kit', value: summary.noKit, tone: summary.noKit > 0 ? 'text-amber-700' : 'text-gray-900' },
        { label: 'Kit sin cobrar', value: summary.pending, tone: summary.pending > 0 ? 'text-amber-700' : 'text-gray-900' },
        { label: 'Invitación WhatsApp', value: summary.invited, tone: 'text-sky-800' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <UserPlusIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Nuevos Inscritos</h1>
          </div>
          <p className="text-base text-white/80">
            Distribuidores dados de alta cada semana (altas de miércoles a martes, la misma cohorte del
            Taller de Inducción) con su teléfono, kit y patrocinador, para contactarlos e invitarlos a
            los talleres.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Semana */}
        <div className="rounded-lg bg-white shadow p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {data
                  ? `Semana del taller del ${longDate(data.workshopDate)}`
                  : 'Semana del próximo taller'}
              </h2>
              <p className="text-sm text-gray-500">
                {data
                  ? `Altas del ${dmy(data.start)} al ${dmy(data.end)}`
                  : 'Cargando la semana…'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => data && goTo(data.prevWeekOf)}
                disabled={!data || isFetching}
                title="Semana anterior"
                aria-label="Semana anterior"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={data?.workshopDate ?? weekOf ?? ''}
                min={MIN_PICKABLE_DATE}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v || v < MIN_PICKABLE_DATE) return;
                  goTo(v);
                }}
                className="w-44"
                aria-label="Cualquier día de la semana a consultar"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => data && goTo(data.nextWeekOf)}
                disabled={!data || isFetching}
                title="Semana siguiente"
                aria-label="Semana siguiente"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => goTo(undefined)}
                disabled={!weekOf}
              >
                Esta semana
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Actualizar"
                aria-label="Actualizar"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                type="button"
                onClick={handleDownload}
                disabled={!data || rows.length === 0 || downloading}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {downloading ? 'Descargando…' : 'Excel'}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            No se pudo cargar el reporte. Intenta de nuevo.
          </div>
        )}

        {/* KPIs */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-lg bg-white shadow p-4">
                <p className={`text-2xl font-bold tabular-nums ${k.tone}`}>{k.value}</p>
                <p className="text-xs text-gray-500">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabla */}
        <div className="rounded-lg bg-white shadow">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-96">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por nombre, número, teléfono, correo, patrocinador o sucursal"
                className="pl-9"
              />
            </div>
            <p className="text-sm text-gray-500">
              {filtered.length === rows.length
                ? `${rows.length} distribuidor${rows.length === 1 ? '' : 'es'}`
                : `${filtered.length} de ${rows.length}`}
            </p>
          </div>

          {isLoading ? (
            <p className="p-8 text-center text-sm text-gray-500">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              Sin altas de distribuidores en esta semana.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={TH}>Nombre</TableHead>
                    <TableHead className={TH}>Número</TableHead>
                    <TableHead className={TH}>Teléfono</TableHead>
                    <TableHead className={TH}>Correo</TableHead>
                    <TableHead className={TH}>Kit</TableHead>
                    <TableHead className={TH}>Estatus</TableHead>
                    <TableHead className={TH}>Alta</TableHead>
                    <TableHead className={TH}>Patrocinador</TableHead>
                    <TableHead className={TH}>Sucursal</TableHead>
                    <TableHead className={TH}>Invitación WhatsApp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <NewDistributorTableRow key={r.customerId} row={r} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Semana del {data ? `${shortDate(data.start)} al ${shortDate(data.end)}` : '…'} · el kit se
          considera cobrado cuando el distribuidor está activo o tiene una venta completada en el POS.
          La invitación por WhatsApp la manda Comercial desde Formularios › Taller de Inducción.
        </p>
      </div>
    </div>
  );
}

function NewDistributorTableRow({ row }: { row: NewDistributorRow }) {
  const inv = row.invitationStatus ? INVITATION[row.invitationStatus] : null;
  const waDigits = row.phoneE164 ? row.phoneE164.replace(/\D/g, '') : '';
  return (
    <TableRow>
      <TableCell className="px-4 py-3 font-medium text-gray-900">{row.name}</TableCell>
      <TableCell className="px-4 py-3 font-mono text-sm">{row.customerNumber}</TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap">
        {row.phoneE164 ? (
          <span className="flex items-center gap-2">
            <a href={`tel:${row.phoneE164}`} className="font-mono text-sm text-gray-900 hover:underline">
              {row.phoneE164}
            </a>
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
              title="Abrir WhatsApp"
            >
              WhatsApp
            </a>
          </span>
        ) : (
          <span className="text-sm text-red-700">Sin teléfono</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-700">{row.email ?? '—'}</TableCell>
      <TableCell className="px-4 py-3 text-sm">
        {row.kitType ? (
          <span>
            {KIT_LABEL[row.kitType] ?? row.kitType}
            {!row.kitPaid && (
              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">sin cobrar</span>
            )}
          </span>
        ) : (
          <span className="text-amber-700">Sin kit</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm">
        {row.status ? (STATUS_LABEL[row.status] ?? row.status) : '—'}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm whitespace-nowrap">{dmy(row.registrationDate)}</TableCell>
      <TableCell className="px-4 py-3 text-sm">
        {row.sponsorNumber ? (
          <span>
            <span className="font-mono text-xs text-gray-500">{row.sponsorNumber}</span>{' '}
            {row.sponsorName}
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm">
        {row.branchName ? (
          <span>
            <span className="font-mono text-xs text-gray-500">{row.branchCode}</span> {row.branchName}
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
        {inv ? (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${inv.className}`} title={formatDateTime(row.invitationAt)}>
            {inv.label}
          </span>
        ) : (
          <span className="text-gray-400">Sin enviar</span>
        )}
      </TableCell>
    </TableRow>
  );
}
