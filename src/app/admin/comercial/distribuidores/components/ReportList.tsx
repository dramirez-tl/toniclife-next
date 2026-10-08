'use client';

// ReportList — lista de distribuidores del reporte: filtros de la lista
// (actividad, rango, periodo de alta, orden y búsqueda), conteo, exportación a
// CSV con los mismos filtros, tabla con orden en el servidor (DataTable) y
// paginación. El nombre lleva a la ficha del distribuidor en el admin.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownTrayIcon, ArrowPathIcon, MagnifyingGlassIcon, UsersIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn, type DataTableSortState } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { RANK_LABELS, RANK_ORDER } from '@/constants/ranks';
import { useDistributorsReport, useExportDistributors } from '@/hooks/useDistributorsReport';
import {
  ACTIVITY_PARAM,
  PAGE_SIZES,
  SORT_LABEL,
  SORT_PARAM,
  STATUS_LABEL,
  URL_PARAM,
  clearFiltersPatch,
  fmtMoney,
  hasListFilters,
  isSearchable,
  sortToParam,
} from '@/lib/distributors-report/filters';
import { fmtDate, fmtInt, fmtPoints } from '@/lib/network/format';
import { ActivityBadge, Avatar, RankChip } from '@/app/distribuidor/red/components/NetworkBadges';
import type { DistributorRow, DistributorsReportQuery, ReportActivityFilter, ReportSort, ReportStatus } from '@/types/distributors-report';
import type { PeriodOption } from './ReportHeader';

const LOCALE = 'es';
const SEARCH_DEBOUNCE_MS = 400;

const ACTIVITY_OPTIONS: { value: ReportActivityFilter; label: string }[] = [
  { value: 'active', label: 'Con puntos' },
  { value: 'none', label: 'Sin puntos' },
  { value: 'qualified', label: 'Calificados' },
  { value: 'toQualify', label: 'Por calificar' },
  { value: 'atRisk', label: 'En riesgo' },
];

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-amber-50 text-amber-700',
  pending: 'bg-sky-50 text-sky-700',
};

function AccountStatusChip({ status }: { status: string }) {
  const label = STATUS_LABEL[status as ReportStatus] ?? status;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

/** Columna de la tabla ⇒ `orden=` de la URL (orden en el servidor). */
function sortStateToParam(state: DataTableSortState | null): string | null {
  if (!state) return null;
  return sortToParam(state.key as ReportSort, state.direction);
}

/** Mensaje legible de un error de axios (400 del export con `message`). */
function errorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { message?: unknown } } } | null)?.response?.data;
  const message = data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(' ');
  return 'No se pudo generar el archivo. Intenta de nuevo.';
}

interface ReportListProps {
  query: DistributorsReportQuery;
  periods: PeriodOption[];
  setParams: (patch: Record<string, string | null>) => void;
}

export function ReportList({ query, periods, setParams }: ReportListProps) {
  const { data, isLoading, isFetching, isPlaceholderData, isError, refetch } = useDistributorsReport(query);
  const exportMutation = useExportDistributors();

  const filtersActive = hasListFilters(query);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const page = query.page ?? 1;
  const limit = query.limit ?? PAGE_SIZES[0];
  const updating = isFetching && isPlaceholderData;

  const patch = (key: string, value: string | null) => setParams({ [key]: value || null, [URL_PARAM.page]: null });

  // Búsqueda con debounce; la URL manda si `q` cambia por fuera (Limpiar filtros, Atrás).
  const urlSearch = query.search ?? '';
  const [searchText, setSearchText] = useState(urlSearch);
  const [appliedSearch, setAppliedSearch] = useState(urlSearch);
  if (urlSearch !== appliedSearch) {
    setAppliedSearch(urlSearch);
    setSearchText(urlSearch);
  }
  useEffect(() => {
    const id = window.setTimeout(() => {
      const text = searchText.trim();
      if (isSearchable(text)) {
        if (text !== urlSearch) {
          setAppliedSearch(text);
          setParams({ [URL_PARAM.search]: text, [URL_PARAM.page]: null });
        }
      } else if (urlSearch) {
        setAppliedSearch('');
        setParams({ [URL_PARAM.search]: null, [URL_PARAM.page]: null });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchText, urlSearch, setParams]);

  const sortParam = sortToParam(query.sortBy, query.sortOrder) ?? 'puntos';
  const sortState: DataTableSortState | null = query.sortBy
    ? { key: query.sortBy, direction: query.sortOrder ?? 'desc' }
    : null;

  const columns: DataTableColumn<DistributorRow>[] = [
    {
      key: 'name',
      header: 'Distribuidor',
      sortable: true,
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.fullName} />
          <div className="min-w-0">
            <Link
              href={`/admin/distribuidores/${m.id}`}
              className="truncate font-semibold text-gray-900 hover:text-[#3E667D] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
            >
              {m.fullName || 'Sin nombre'}
            </Link>
            {m.customerNumber && <span className="ml-1.5 text-xs text-gray-400">#{m.customerNumber}</span>}
            <p className="truncate text-xs text-gray-500">
              {m.email ?? ''}
              {m.phone ? `${m.email ? ' · ' : ''}${m.phone}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'place',
      header: 'País · Sucursal',
      render: (m) => (
        <div className="min-w-0 text-sm text-gray-700">
          <p>{m.countryCode ?? '—'}</p>
          <p className="truncate text-xs text-gray-500">{m.branchName ? `${m.branchCode ? `${m.branchCode} · ` : ''}${m.branchName}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'sponsor',
      header: 'Patrocinador',
      render: (m) =>
        m.sponsorName ? (
          <div className="min-w-0">
            <p className="truncate text-sm text-gray-700">{m.sponsorName}</p>
            {m.sponsorCode && <p className="font-mono text-xs text-gray-400">#{m.sponsorCode}</p>}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: 'rank',
      header: 'Rango',
      sortable: true,
      render: (m) => <RankChip rankName={m.rankName} rankNumber={m.rankNumber} />,
    },
    {
      key: 'points',
      header: 'Puntos personales',
      sortable: true,
      render: (m) => (
        <div className="min-w-0">
          <p className="font-bold tabular-nums text-gray-900">{fmtPoints(m.personalPoints, LOCALE)} pts</p>
          <ActivityBadge activity={m.activity} atRisk={m.atRisk} isNew={m.isNew} />
        </div>
      ),
    },
    {
      key: 'groupPoints',
      header: 'Puntos de grupo',
      sortable: true,
      render: (m) => <span className="tabular-nums text-gray-700">{fmtPoints(m.groupPoints, LOCALE)}</span>,
    },
    {
      key: 'sales',
      header: 'Ventas',
      sortable: true,
      render: (m) => (
        <div className="min-w-0 tabular-nums text-gray-700">
          <p>{fmtMoney(m.salesMxn, 'MXN')}</p>
          {m.salesUsd > 0 && <p className="text-xs text-gray-500">{fmtMoney(m.salesUsd, 'USD')} USD</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Cuenta',
      render: (m) => <AccountStatusChip status={m.status} />,
    },
    {
      key: 'joinDate',
      header: 'Alta',
      sortable: true,
      render: (m) => <span className="text-sm tabular-nums text-gray-500">{m.registrationDate ? fmtDate(m.registrationDate, LOCALE) : '—'}</span>,
    },
  ];

  const emptyMessage = query.search
    ? `Sin resultados para «${query.search}».`
    : filtersActive
      ? 'Ningún distribuidor cumple los filtros elegidos.'
      : 'Sin distribuidores en el periodo.';

  const exportStatus = exportMutation.isPending
    ? 'Generando el archivo…'
    : exportMutation.isError
      ? errorMessage(exportMutation.error)
      : exportMutation.isSuccess
        ? `Descargado: ${exportMutation.data}`
        : '';

  return (
    <Card>
      <CardContent className="p-4 lg:p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Distribuidores</h3>
            <p className="text-sm text-gray-500">Filtra como en «Mi red» y descarga el CSV con los mismos filtros (hasta 25,000 filas).</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={exportMutation.isPending || total === 0}
              onClick={() => exportMutation.mutate(query)}
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              Exportar CSV
            </Button>
            {exportStatus && (
              <p className={`max-w-xs text-right text-xs ${exportMutation.isError ? 'text-red-600' : 'text-gray-500'}`} aria-live="polite">
                {exportStatus}
              </p>
            )}
          </div>
        </div>

        {/* Búsqueda */}
        <div className="relative mb-2">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nombre, número, correo o teléfono"
            aria-label="Buscar distribuidor"
            className="pl-9"
            maxLength={80}
          />
        </div>

        {/* Filtros de la lista (2 → 4 columnas) */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SearchableSelect
            aria-label="Actividad del periodo"
            options={ACTIVITY_OPTIONS.map((o) => ({ value: ACTIVITY_PARAM[o.value], label: o.label }))}
            value={query.activity ? ACTIVITY_PARAM[query.activity] : ''}
            onChange={(v) => patch(URL_PARAM.activity, v)}
            allLabel="Toda actividad"
            allValue=""
          />
          <SearchableSelect
            aria-label="Rango del periodo"
            options={RANK_ORDER.map((code, i) => ({ value: String(i + 1), label: RANK_LABELS[code] }))}
            value={query.rankNumber ? String(query.rankNumber) : ''}
            onChange={(v) => patch(URL_PARAM.rank, v)}
            allLabel="Todos los rangos"
            allValue=""
          />
          <SearchableSelect
            aria-label="Periodo de alta"
            options={periods.map((p) => ({ value: p.id, label: `Alta en ${p.name}` }))}
            value={query.joinedPeriodId ?? ''}
            onChange={(v) => patch(URL_PARAM.joined, v)}
            allLabel="Cualquier fecha de alta"
            allValue=""
          />
          <SearchableSelect
            aria-label="Orden"
            options={Object.keys(SORT_PARAM).map((key) => ({ value: key, label: SORT_LABEL[key] }))}
            value={sortParam}
            onChange={(v) => setParams({ [URL_PARAM.sort]: v === 'puntos' ? null : v, [URL_PARAM.page]: null })}
            showAllOption={false}
          />
        </div>

        {/* Conteo + limpiar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-600" aria-live="polite">
            {data ? `${fmtInt(total, LOCALE)} ${filtersActive ? 'coinciden' : 'distribuidores'}` : ''}
            {updating && <span className="ml-2 text-xs font-medium text-[#3E667D]">Actualizando…</span>}
          </span>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={() => setParams(clearFiltersPatch())} className="ml-auto text-gray-500">
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {isError ? (
          <div role="alert" className="mt-4 rounded-xl border border-dashed border-red-200 bg-red-50/40 p-6 text-center">
            <p className="font-medium text-red-700">No se pudo cargar la lista.</p>
            <p className="mt-1 text-sm text-gray-500">Revisa tu conexión o tu permiso (Comercial o Reportes).</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : (
          <div className={`mt-3 overflow-x-auto transition-opacity ${updating ? 'opacity-70' : ''}`} aria-busy={updating}>
            <DataTable
              columns={columns}
              data={rows}
              isLoading={isLoading}
              getRowKey={(m) => m.id}
              minWidthClassName="min-w-[1100px]"
              sortingMode="server"
              sortState={sortState}
              onSortChange={(next) => setParams({ [URL_PARAM.sort]: sortStateToParam(next), [URL_PARAM.page]: null })}
              emptyState={
                <div className="py-4 text-center">
                  <UsersIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" aria-hidden="true" />
                  <p className="text-gray-500">{emptyMessage}</p>
                </div>
              }
            />
            {data && total > 0 && (
              <DataTablePagination
                currentPage={page}
                pageSize={limit}
                totalItems={total}
                isLoading={isLoading}
                onPageChange={(p) => setParams({ [URL_PARAM.page]: p > 1 ? String(p) : null })}
                onPageSizeChange={(size) => setParams({ [URL_PARAM.limit]: size === PAGE_SIZES[0] ? null : String(size), [URL_PARAM.page]: null })}
                pageSizeOptions={[...PAGE_SIZES]}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
