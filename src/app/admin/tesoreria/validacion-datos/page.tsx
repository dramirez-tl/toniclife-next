'use client';

// /admin/tesoreria/validacion-datos — BANDEJA DE REVISIÓN (contrato §5.5).
//
// KPIs-filtro coherentes con la cola (misma CTE treasury_readiness del API),
// filtros en la URL (estado, documento/estado, país, solo con comisión del
// periodo 26→25, antigüedad, búsqueda con debounce), DataTable con orden en
// servidor y cola por antigüedad, selección múltiple → Recordar / Exportar,
// revisión en Sheet ancho (PaymentReadinessReview) con Anterior/Siguiente y
// atajos J/K, V/R. El guard vive en layout.tsx; los botones de escritura van
// dentro de PermissionGuard fallback vacío.

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BellAlertIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  DataTable,
  DataTablePagination,
  type DataTableColumn,
  type DataTableSortState,
} from '@/components/ui/DataTable';
import { PermissionGuard } from '@/components/auth';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useActiveCountries } from '@/hooks/useConfig';
import { useReadinessCatalogs, useReadinessList, useRemindDistributors } from '@/hooks/useTreasuryReadiness';
import { treasuryReadinessService } from '@/services/treasury-readiness.service';
import { saveBlob } from '@/lib/download';
import { csvDateStamp, downloadCsv } from '@/lib/csv-export';
import {
  PeriodSelector,
  TreasuryHeader,
  TreasuryTabs,
  useTreasuryPeriod,
  TREASURY_VALIDATE_PERMISSIONS,
  filenameFromDisposition,
  formatDateTime,
  formatInt,
  formatMoney,
  treasuryErrorMessage,
} from '@/components/admin/treasury';
import {
  BankCell,
  DocLegend,
  DocStatusBadge,
  PaymentReadinessReviewSheet,
  ProgressBar,
  ReadinessKpis,
  ReadinessStatusBadge,
  RemindDialog,
  DOCUMENT_LABELS,
  DOCUMENT_STATUS_LABELS,
  READINESS_STATUS_LABELS,
  buildReadinessCsv,
  daysLabel,
  documentsForCountry,
  isOverSla,
  type ReadinessKpiTarget,
} from '@/components/admin/treasury/readiness';
import {
  DOCUMENT_STATUS_FILTERS,
  PAYMENT_DOCUMENT_KEYS,
  READINESS_STATUSES,
  isDocumentStatusFilter,
  isPaymentDocumentKey,
  isReadinessSortBy,
  isReadinessStatus,
  type ReadinessListFilters,
  type ReadinessRow,
  type RemindChannel,
} from '@/types/treasury-readiness';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SORT_KEYS: Record<string, ReadinessListFilters['sortBy']> = {
  name: 'name',
  daysInQueue: 'daysInQueue',
  submittedAt: 'submittedAt',
  periodCommission: 'commissionAmount',
  updatedAt: 'updatedAt',
};

export default function ValidacionDatosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ValidacionDatosContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function ValidacionDatosContent() {
  const { get, getNumber, setParams } = useQueryFilters({ page: '1', limit: '20', dir: 'desc' });

  const statusParam = get('status');
  const docParam = get('doc');
  const docStatusParam = get('docStatus');
  const countryParam = get('country');
  const earnersLink = get('earnersOfPeriodId'); // enlace desde el índice / semáforo
  const periodParam = get('period') || earnersLink;
  const earnersParam = get('earners');
  const minDaysParam = getNumber('minDays');
  const search = get('search');
  const sortParam = get('sort');
  const dirParam = get('dir') === 'asc' ? 'asc' : 'desc';
  const reviewParam = get('review');
  const page = getNumber('page') || 1;
  const limit = PAGE_SIZE_OPTIONS.includes(getNumber('limit')) ? getNumber('limit') : 20;

  const status = isReadinessStatus(statusParam) ? statusParam : undefined;
  const document = isPaymentDocumentKey(docParam) ? docParam : undefined;
  const documentStatus = isDocumentStatusFilter(docStatusParam) ? docStatusParam : undefined;
  const sortBy = isReadinessSortBy(sortParam) ? sortParam : undefined;
  const earnersOn = earnersParam === '1' || (!!earnersLink && earnersParam !== '0');

  // ── Periodo 26→25 (comisión del periodo y filtro "con comisión") ──────────
  const periodSel = useTreasuryPeriod(periodParam);
  const { effectivePeriodId, selectedPeriod } = periodSel;

  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => {
    if (searchDraft === search) return;
    const t = setTimeout(() => setParams({ search: searchDraft.trim() || null, page: null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const filters = useMemo<ReadinessListFilters>(
    () => ({
      status,
      document,
      documentStatus,
      countryCode: countryParam || undefined,
      earnersOfPeriodId: earnersOn ? effectivePeriodId : undefined,
      minDaysInQueue: minDaysParam > 0 ? minDaysParam : undefined,
      search: search || undefined,
      sortBy,
      sortDir: dirParam,
      page,
      limit,
    }),
    [status, document, documentStatus, countryParam, earnersOn, effectivePeriodId, minDaysParam, search, sortBy, dirParam, page, limit],
  );

  const listQuery = useReadinessList(filters);
  const catalogsQuery = useReadinessCatalogs();
  const { data: countries } = useActiveCountries();
  const remindMutation = useRemindDistributors();

  const rows: ReadinessRow[] = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const meta = listQuery.data?.meta;
  const stats = listQuery.data?.stats;
  const catalogs = catalogsQuery.data;
  const slaDays = catalogs?.slaDays ?? null;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [remindScope, setRemindScope] = useState<'selected' | 'earners' | null>(null);
  const [exporting, setExporting] = useState(false);

  const selectedRows = useMemo(() => rows.filter((r) => selectedIds.includes(r.customerId)), [rows, selectedIds]);
  const queueIds = useMemo(() => rows.map((r) => r.customerId), [rows]);

  const sortState: DataTableSortState | null = sortBy
    ? { key: Object.keys(SORT_KEYS).find((k) => SORT_KEYS[k] === sortBy) ?? sortBy, direction: dirParam }
    : null;

  const onKpi = (target: ReadinessKpiTarget) => {
    if (target.kind === 'status') setParams({ status: target.status, page: null });
    else if (target.kind === 'readyToPay') setParams({ status: 'validated', page: null });
    else if (target.kind === 'earnersBlocked')
      setParams({ earners: earnersOn ? '0' : '1', earnersOfPeriodId: null, period: effectivePeriodId ?? null, status: earnersOn ? null : 'incomplete', page: null });
    else if (target.kind === 'sla')
      setParams({ minDays: minDaysParam > 0 ? null : String((slaDays ?? 0) + 1), status: minDaysParam > 0 ? null : 'pending_validation', page: null });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, disposition } = await treasuryReadinessService.exportCsv(filters);
      saveBlob(blob, filenameFromDisposition(disposition, `validacion-datos-${csvDateStamp()}.csv`), blob.type || 'text/csv;charset=utf-8;');
      toast.success('Exportación descargada');
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo exportar la cola'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportSelection = () => {
    if (selectedRows.length === 0) return;
    downloadCsv(`validacion-datos-seleccion-${csvDateStamp()}.csv`, buildReadinessCsv(selectedRows));
    toast.success(`${selectedRows.length} fila(s) exportadas`);
  };

  const handleRemind = async (channels: RemindChannel[]) => {
    try {
      const res = await remindMutation.mutateAsync(
        remindScope === 'earners' && effectivePeriodId
          ? { earnersOfPeriodId: effectivePeriodId, channels }
          : { customerIds: selectedIds, channels },
      );
      toast.success(`Recordatorios en cola: ${formatInt(res.queued)}${res.skipped.length ? ` · omitidos: ${res.skipped.length}` : ''}`);
      setRemindScope(null);
      setSelectedIds([]);
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo enviar el recordatorio'));
    }
  };

  const hasActiveFilters =
    !!status || !!document || !!documentStatus || !!countryParam || earnersOn || minDaysParam > 0 || !!search;

  const columns: DataTableColumn<ReadinessRow>[] = [
    {
      key: 'name',
      header: 'Distribuidor',
      sortable: true,
      render: (r) => (
        <div className="min-w-[180px]">
          <Link
            href={`/admin/distribuidores/${r.customerId}?tab=datos-pago`}
            className="font-medium text-foreground hover:underline"
          >
            {r.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            #{r.customerNumber ?? '—'}
            {r.countryCode ? ` · ${r.countryCode}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Progreso',
      render: (r) => <ProgressBar progress={r.progress} />,
    },
    {
      key: 'docs',
      header: 'Documentos',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {documentsForCountry(r.countryCode, catalogs, r.docs).map((d) => (
            <DocStatusBadge key={d} document={d} status={r.docs[d]?.status ?? null} className="px-1.5 py-0" />
          ))}
        </div>
      ),
    },
    {
      key: 'regime',
      header: 'Régimen',
      render: (r) =>
        r.taxRegime ? (
          <span className="font-mono text-xs">{r.taxRegime.code}</span>
        ) : (
          <Badge variant="warning" className="px-1.5 py-0">
            Sin asignar
          </Badge>
        ),
    },
    {
      key: 'bank',
      header: 'Cuenta',
      render: (r) => <BankCell account={r.bankAccount} />,
    },
    {
      key: 'daysInQueue',
      header: 'En cola',
      sortable: true,
      render: (r) => {
        const over = isOverSla(r.daysInQueue, slaDays);
        return (
          <span className={`text-xs tabular-nums ${over ? 'font-semibold text-amber-700' : 'text-foreground'}`}>
            {daysLabel(r.daysInQueue)}
            {over && <span className="sr-only"> (fuera de SLA)</span>}
          </span>
        );
      },
    },
    {
      key: 'periodCommission',
      header: 'Comisión del periodo',
      sortable: true,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) =>
        r.periodCommission ? (
          <span className="text-xs tabular-nums">{formatMoney(r.periodCommission.amount, r.periodCommission.currencyCode)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'reviewer',
      header: 'Último revisor',
      render: (r) =>
        r.lastReviewer?.name || r.lastReviewer?.at ? (
          <div className="text-xs">
            <p className="text-foreground">{r.lastReviewer.name ?? '—'}</p>
            <p className="text-muted-foreground">{formatDateTime(r.lastReviewer.at)}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <div className="flex flex-col gap-1">
          <ReadinessStatusBadge status={r.overallStatus} />
          {r.readyToPay && (
            <Badge variant="success" className="px-1.5 py-0">
              Listo para pagar
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r) => (
        <Button variant="outline" size="sm" onClick={() => setParams({ review: r.customerId, page: String(page) })}>
          <EyeIcon className="mr-1 h-4 w-4" aria-hidden />
          Revisar
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <TreasuryHeader
        icon={ShieldCheckIcon}
        title="Validación de datos para pago"
        subtitle="Cola de expedientes por antigüedad: documentos, cuenta bancaria y régimen de comisión antes de dispersar."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching}>
              <ArrowPathIcon className={`mr-2 h-4 w-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} aria-hidden />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <ArrowDownTrayIcon className="mr-2 h-4 w-4" aria-hidden />}
              Exportar CSV
            </Button>
            <PermissionGuard permissions={TREASURY_VALIDATE_PERMISSIONS} fallback={<></>}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRemindScope('earners')}
                disabled={!effectivePeriodId}
                title="Recordar a quienes tienen comisión en el periodo y datos incompletos"
              >
                <BellAlertIcon className="mr-2 h-4 w-4" aria-hidden />
                Recordar a earners del periodo
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <TreasuryTabs active="validacion-datos" periodId={effectivePeriodId} className="mb-6" />

      <PeriodSelector
        selection={periodSel}
        onChange={(id) => setParams({ period: id, earnersOfPeriodId: null, page: null })}
        caption='Periodo · "Comisión del periodo" y filtro "solo con comisión"'
      />

      <div className="mb-6">
        <ReadinessKpis
          stats={stats}
          isLoading={listQuery.isLoading}
          activeStatus={status ?? null}
          earnersActive={earnersOn}
          slaActive={minDaysParam > 0}
          slaDays={slaDays}
          hasPeriod={!!effectivePeriodId}
          onSelect={onKpi}
        />
      </div>

      {listQuery.isError && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span className="text-destructive">
              {treasuryErrorMessage(listQuery.error, 'No se pudo cargar la cola de validación')}
            </span>
            <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <Label htmlFor="vd-search" className="mb-1 block text-xs text-muted-foreground">
                Buscar
              </Label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="vd-search"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Nombre o número de distribuidor"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="vd-status" className="mb-1 block text-xs text-muted-foreground">
                Estado
              </Label>
              <SearchableSelect
                id="vd-status"
                options={READINESS_STATUSES.map((s) => ({ value: s, label: READINESS_STATUS_LABELS[s] }))}
                value={status ?? ''}
                onChange={(v) => setParams({ status: v || null, page: null })}
                allLabel="Todos los estados"
              />
            </div>
            <div>
              <Label htmlFor="vd-doc" className="mb-1 block text-xs text-muted-foreground">
                Documento
              </Label>
              <SearchableSelect
                id="vd-doc"
                options={PAYMENT_DOCUMENT_KEYS.map((d) => ({ value: d, label: DOCUMENT_LABELS[d] }))}
                value={document ?? ''}
                onChange={(v) => setParams({ doc: v || null, docStatus: v ? docStatusParam || 'pending' : null, page: null })}
                allLabel="Cualquier documento"
              />
            </div>
            <div>
              <Label htmlFor="vd-docstatus" className="mb-1 block text-xs text-muted-foreground">
                Estado del documento
              </Label>
              <SearchableSelect
                id="vd-docstatus"
                options={DOCUMENT_STATUS_FILTERS.map((s) => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] }))}
                value={documentStatus ?? ''}
                onChange={(v) => setParams({ docStatus: v || null, page: null })}
                allLabel="Cualquier estado"
                disabled={!document}
              />
            </div>
            <div>
              <Label htmlFor="vd-country" className="mb-1 block text-xs text-muted-foreground">
                País
              </Label>
              <SearchableSelect
                id="vd-country"
                options={(countries ?? []).map((c) => ({ value: c.code, label: c.name, hint: c.code }))}
                value={countryParam}
                onChange={(v) => setParams({ country: v || null, page: null })}
                allLabel="Todos los países"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="vd-earners"
                checked={earnersOn}
                onCheckedChange={(v) =>
                  setParams({ earners: v === true ? '1' : '0', earnersOfPeriodId: null, period: effectivePeriodId ?? null, page: null })
                }
                disabled={!effectivePeriodId}
              />
              <Label htmlFor="vd-earners" className="cursor-pointer text-sm">
                Solo con comisión en {selectedPeriod?.name ?? 'el periodo'}
              </Label>
            </div>
            <div className="w-40">
              <Label htmlFor="vd-mindays" className="mb-1 block text-xs text-muted-foreground">
                En cola al menos (días)
              </Label>
              <Input
                id="vd-mindays"
                type="number"
                min={0}
                step={1}
                value={minDaysParam > 0 ? String(minDaysParam) : ''}
                onChange={(e) => setParams({ minDays: e.target.value && Number(e.target.value) > 0 ? e.target.value : null, page: null })}
                placeholder={slaDays !== null ? `SLA ${slaDays}` : '0'}
              />
            </div>
            <DocLegend />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setSearchDraft('');
                  setParams({ status: null, doc: null, docStatus: null, country: null, earners: null, earnersOfPeriodId: null, minDays: null, search: null, page: null });
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Barra de selección */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm" role="status">
          <span className="font-medium text-foreground">
            {formatInt(selectedIds.length)} seleccionado(s)
            {selectedRows.length !== selectedIds.length ? ` (${selectedRows.length} en esta página)` : ''}
          </span>
          <PermissionGuard permissions={TREASURY_VALIDATE_PERMISSIONS} fallback={<></>}>
            <Button size="sm" variant="outline" onClick={() => setRemindScope('selected')}>
              <BellAlertIcon className="mr-1 h-4 w-4" aria-hidden />
              Recordar
            </Button>
          </PermissionGuard>
          <Button size="sm" variant="outline" onClick={handleExportSelection} disabled={selectedRows.length === 0}>
            <ArrowDownTrayIcon className="mr-1 h-4 w-4" aria-hidden />
            Exportar selección ({selectedRows.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
            Limpiar selección
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            getRowKey={(r) => r.customerId}
            isLoading={listQuery.isLoading && rows.length === 0}
            minWidthClassName="min-w-[1180px]"
            sortingMode="server"
            sortState={sortState}
            onSortChange={(s) =>
              setParams({
                sort: s ? (SORT_KEYS[s.key] ?? null) : null,
                dir: s ? s.direction : null,
                page: null,
              })
            }
            enableRowSelection
            selectedRowKeys={selectedIds}
            onSelectedRowKeysChange={setSelectedIds}
            emptyMessage={hasActiveFilters ? 'Ningún distribuidor coincide con los filtros.' : 'No hay expedientes en la cola.'}
            rowClassName={(r) =>
              `border-b border-border transition-colors hover:bg-muted/50 ${reviewParam === r.customerId ? 'bg-primary/5' : ''}`
            }
          />
          {meta && meta.total > 0 && (
            <DataTablePagination
              currentPage={page}
              pageSize={limit}
              totalItems={meta.total}
              isLoading={listQuery.isFetching}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </CardContent>
      </Card>

      <PaymentReadinessReviewSheet
        customerId={reviewParam || null}
        queueIds={queueIds}
        onOpenChange={(open) => !open && setParams({ review: null, page: String(page) })}
        onNavigate={(id) => setParams({ review: id, page: String(page) })}
      />

      {remindScope && (
        <RemindDialog
          scopeLabel={
            remindScope === 'earners'
              ? `los distribuidores con comisión en ${selectedPeriod?.name ?? 'el periodo'} y datos incompletos`
              : `${selectedIds.length} distribuidor(es) seleccionado(s)`
          }
          whatsappAvailable
          isPending={remindMutation.isPending}
          onOpenChange={(o) => !o && setRemindScope(null)}
          onConfirm={handleRemind}
        />
      )}
    </div>
  );
}
