'use client';

// NetworkList — Pestaña "Lista" (contrato /distribuidor/red §5.5, V2, V14):
// lista plana de TODA la red con búsqueda, filtros (actividad ×5, nivel 1..15
// + "más de 15", estado, rango del periodo, periodo de alta, bajo una línea),
// orden y paginación EN EL SERVIDOR (GET network/members, 20 ms en 80 k; ya no
// se recorre el árbol por página). Todo vive en la URL (lib/network/filters.ts)
// y la query llega armada desde la página. `keepPreviousData` evita volver al
// esqueleto al paginar (aviso "Actualizando…"). Escritorio: tabla sin columna
// "Profundidad" (V14); móvil (< md): tarjetas sin scroll horizontal.

import { useLocale, useTranslations } from 'next-intl';
import { ArrowPathIcon, UsersIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn, type DataTableSortState } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Skeleton } from '@/components/ui/skeleton';
import { RANK_LABELS, RANK_ORDER } from '@/constants/ranks';
import { useNetworkMembers } from '@/hooks/useNetwork';
import {
  ACTIVITY_PARAM,
  PAGE_SIZES,
  STATUS_PARAM,
  URL_PARAM,
  clearFiltersPatch,
  hasListFilters,
  levelOptions,
  levelParamOf,
  sortToParam,
} from '@/lib/network/filters';
import { fmtDate, fmtInt, fmtPoints } from '@/lib/network/format';
import { networkErrorKey } from '@/lib/network/network-error';
import type { NetworkActivityFilter, NetworkMemberRow, NetworkMemberStatus, NetworkMembersQuery } from '@/types/network';
import type { MemberSheetContext } from './MemberSheet';
import { ActivityBadge, Avatar, RankChip, StatusChip } from './NetworkBadges';

export interface ListPeriodOption {
  id: string;
  name: string;
}

interface NetworkListProps {
  /** Query del API armada desde la URL (con periodId del encabezado). */
  query: NetworkMembersQuery;
  /** overview.totals.maxLevel (opciones del filtro Nivel). */
  maxLevel: number | null | undefined;
  periods: ListPeriodOption[];
  setParams: (patch: Record<string, string | null>) => void;
  onOpenMember: (customerId: string, context: MemberSheetContext) => void;
}

const ACTIVITY_OPTIONS: { value: NetworkActivityFilter; labelKey: string }[] = [
  { value: 'active', labelKey: 'activityActive' },
  { value: 'none', labelKey: 'activityNone' },
  { value: 'qualified', labelKey: 'activityQualified' },
  { value: 'toQualify', labelKey: 'activityToQualify' },
  { value: 'atRisk', labelKey: 'activityAtRisk' },
];

const STATUS_OPTIONS: NetworkMemberStatus[] = ['active', 'inactive', 'suspended'];

const SORT_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'nivel', labelKey: 'sortLevel' },
  { value: 'puntos', labelKey: 'sortPoints' },
  { value: 'recientes', labelKey: 'sortJoined' },
  { value: 'nombre', labelKey: 'sortName' },
];

/** Columna de la tabla ⇒ `orden=` de la URL (V14: orden en el servidor). */
function sortStateToParam(state: DataTableSortState | null): string | null {
  if (!state) return null;
  if (state.key === 'level') return state.direction === 'desc' ? 'nivel-desc' : null;
  if (state.key === 'points') return 'puntos';
  if (state.key === 'joinDate') return 'recientes';
  if (state.key === 'name') return 'nombre';
  return null;
}

export function NetworkList({ query, maxLevel, periods, setParams, onOpenMember }: NetworkListProps) {
  const t = useTranslations('distributor.network');
  const locale = useLocale();
  const { data, isLoading, isFetching, isPlaceholderData, isError, error, refetch } = useNetworkMembers(query);

  const filtersActive = hasListFilters(query);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const page = query.page ?? 1;
  const limit = query.limit ?? PAGE_SIZES[0];
  const updating = isFetching && isPlaceholderData;

  const patch = (key: string, value: string | null) => setParams({ [key]: value || null, [URL_PARAM.page]: null });

  const sortParam = sortToParam(query.sortBy, query.sortOrder);
  const sortState: DataTableSortState | null = query.sortBy
    ? {
        key: query.sortBy,
        direction: query.sortBy === 'level' ? (query.sortOrder ?? 'asc') : query.sortBy === 'name' ? 'asc' : 'desc',
      }
    : null;

  const contextOf = (m: NetworkMemberRow): MemberSheetContext => ({
    memberId: m.memberId,
    fullName: m.fullName,
    customerNumber: m.customerNumber,
    level: m.level,
    personalPoints: m.personalPoints,
    rankName: m.rankName,
    rankNumber: m.rankNumber,
    sponsorName: m.sponsorName,
  });

  const columns: DataTableColumn<NetworkMemberRow>[] = [
    {
      key: 'name',
      header: t('list.columns.distributor'),
      sortable: true,
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.fullName} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onOpenMember(m.id, contextOf(m))}
              className="truncate text-left font-semibold text-gray-900 hover:text-[#3E667D] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
            >
              {m.fullName}
            </button>
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
      key: 'level',
      header: t('list.columns.level'),
      sortable: true,
      render: (m) => <span className="text-sm tabular-nums text-gray-600">{t('list.levelValue', { level: m.level })}</span>,
    },
    {
      key: 'sponsor',
      header: t('list.columns.sponsor'),
      render: (m) =>
        m.sponsorName ? (
          <div className="min-w-0">
            <p className="truncate text-sm text-gray-700">{m.sponsorName}</p>
            {m.sponsorCode && <p className="font-mono text-xs text-gray-400">{t('list.sponsorId', { code: m.sponsorCode })}</p>}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: 'rank',
      header: t('list.columns.rank'),
      render: (m) => <RankChip rankName={m.rankName} rankNumber={m.rankNumber} />,
    },
    {
      key: 'points',
      header: t('list.columns.period'),
      sortable: true,
      render: (m) => (
        <div className="min-w-0">
          <p className="font-bold tabular-nums text-gray-900">{t('list.points', { points: fmtPoints(m.personalPoints, locale) })}</p>
          <ActivityBadge activity={m.activity} atRisk={m.atRisk} />
        </div>
      ),
    },
    {
      key: 'status',
      header: t('list.columns.status'),
      render: (m) => <StatusChip status={m.status} />,
    },
    {
      key: 'joinDate',
      header: t('list.columns.joinDate'),
      sortable: true,
      render: (m) => <span className="text-sm tabular-nums text-gray-500">{m.createdAt ? fmtDate(m.createdAt, locale) : '—'}</span>,
    },
  ];

  const emptyMessage = query.search
    ? t('list.empty.search', { query: query.search })
    : filtersActive
      ? t('list.empty.withFilters')
      : t('list.empty.noFilters');

  return (
    <Card data-tour="d-red-list">
      <CardContent className="p-4 lg:p-6">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900">{t('list.title')}</h3>
          <p className="text-sm text-gray-500">{t('list.subtitle')}</p>
        </div>

        {/* Filtros compactos (2 → 3 → 6 columnas) */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <SearchableSelect
            aria-label={t('list.filters.activityAll')}
            options={ACTIVITY_OPTIONS.map((o) => ({ value: ACTIVITY_PARAM[o.value], label: t(`list.filters.${o.labelKey}`) }))}
            value={query.activity ? ACTIVITY_PARAM[query.activity] : ''}
            onChange={(v) => patch(URL_PARAM.activity, v)}
            allLabel={t('list.filters.activityAll')}
            allValue=""
          />
          <SearchableSelect
            aria-label={t('list.filters.levelAll')}
            options={levelOptions(maxLevel).map((o) => ({
              value: o.value,
              label: o.deeper ? t('list.filters.levelDeeper') : t('list.filters.levelOption', { n: o.level ?? 0 }),
            }))}
            value={levelParamOf(query)}
            onChange={(v) => patch(URL_PARAM.level, v)}
            allLabel={t('list.filters.levelAll')}
            allValue=""
          />
          <SearchableSelect
            aria-label={t('list.filters.statusAll')}
            options={STATUS_OPTIONS.map((s) => ({ value: STATUS_PARAM[s], label: t(`status.${s}`) }))}
            value={query.status ? STATUS_PARAM[query.status] : ''}
            onChange={(v) => patch(URL_PARAM.status, v)}
            allLabel={t('list.filters.statusAll')}
            allValue=""
          />
          <SearchableSelect
            aria-label={t('list.filters.rankAll')}
            options={RANK_ORDER.map((code, i) => ({ value: String(i + 1), label: RANK_LABELS[code] }))}
            value={query.rankNumber ? String(query.rankNumber) : ''}
            onChange={(v) => patch(URL_PARAM.rank, v)}
            allLabel={t('list.filters.rankAll')}
            allValue=""
          />
          <SearchableSelect
            aria-label={t('list.filters.joinedAll')}
            options={periods.map((p) => ({ value: p.id, label: t('list.filters.joinedIn', { period: p.name }) }))}
            value={query.joinedPeriodId ?? ''}
            onChange={(v) => patch(URL_PARAM.joined, v)}
            allLabel={t('list.filters.joinedAll')}
            allValue=""
          />
          <SearchableSelect
            aria-label={t('list.filters.sortLevel')}
            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: t(`list.filters.${o.labelKey}`) }))}
            value={sortParam === 'nivel-desc' ? 'nivel' : (sortParam ?? 'nivel')}
            onChange={(v) => setParams({ [URL_PARAM.sort]: v === 'nivel' ? null : v, [URL_PARAM.page]: null })}
            showAllOption={false}
          />
        </div>

        {/* Línea acotada + conteo + limpiar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {data?.under && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#C8DDF2]/40 px-2.5 py-1 text-xs font-medium text-[#2f5165]">
              {t('list.underLine', { name: data.under.fullName })}
              <button
                type="button"
                onClick={() => patch(URL_PARAM.under, null)}
                aria-label={t('list.clearUnder')}
                className="rounded-full p-0.5 hover:bg-[#3E667D]/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
              >
                <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          )}
          <span className="text-gray-600" aria-live="polite">
            {data ? (filtersActive ? t('list.resultsFiltered', { count: total }) : t('list.results', { count: total })) : ''}
            {updating && <span className="ml-2 text-xs font-medium text-[#3E667D]">{t('list.updating')}</span>}
          </span>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={() => setParams(clearFiltersPatch())} className="ml-auto text-gray-500">
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              {t('list.filters.clear')}
            </Button>
          )}
        </div>

        {isError ? (
          <div role="alert" className="mt-4 rounded-xl border border-dashed border-red-200 bg-red-50/40 p-6 text-center">
            <p className="font-medium text-red-700">{t('list.error.title')}</p>
            <p className="mt-1 text-sm text-gray-500">
              {t('list.error.body')} {t(networkErrorKey(error))}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              {t('list.error.retry')}
            </Button>
          </div>
        ) : (
          <div className={`mt-3 transition-opacity ${updating ? 'opacity-70' : ''}`} aria-busy={updating}>
            {/* Escritorio: tabla con orden en el servidor */}
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={rows}
                isLoading={isLoading}
                getRowKey={(m) => m.memberId}
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
            </div>

            {/* Teléfono/tablet chica: tarjetas */}
            <div className="md:hidden">
              {isLoading ? (
                <div className="space-y-2" aria-busy="true">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
                  <UsersIcon className="mx-auto mb-2 h-10 w-10 text-gray-300" aria-hidden="true" />
                  <p className="text-sm text-gray-500">{emptyMessage}</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {rows.map((m) => (
                    <li key={m.memberId}>
                      <button
                        type="button"
                        onClick={() => onOpenMember(m.id, contextOf(m))}
                        className="w-full rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={m.fullName} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-semibold text-gray-900">{m.fullName}</p>
                              <span className="shrink-0 text-xs tabular-nums text-gray-500">{t('list.levelValue', { level: m.level })}</span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {m.customerNumber ? `#${m.customerNumber}` : ''}
                              {m.sponsorName ? ` · ${t('list.columns.sponsor')}: ${m.sponsorName}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <ActivityBadge activity={m.activity} atRisk={m.atRisk} />
                          <span className="font-bold tabular-nums text-gray-900">{t('list.points', { points: fmtPoints(m.personalPoints, locale) })}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <RankChip rankName={m.rankName} rankNumber={m.rankNumber} />
                          <StatusChip status={m.status} />
                          <span className="ml-auto text-xs tabular-nums text-gray-500">{m.createdAt ? fmtDate(m.createdAt, locale) : ''}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

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
            <p className="sr-only" aria-live="polite">
              {data ? t('list.pageInfo', { from: total === 0 ? 0 : fmtInt((page - 1) * limit + 1, locale), to: fmtInt(Math.min(page * limit, total), locale), total: fmtInt(total, locale) }) : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
