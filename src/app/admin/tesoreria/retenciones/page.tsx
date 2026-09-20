'use client';

// Tesorería → Retenciones (contrato §4.4 / §5.4, paso 9 Next).
//
// Convenios de retención sobre comisiones (préstamos con saldo y conceptos
// ad-hoc). KPIs, filtros en la URL (buscar, estado, moneda, concepto,
// distribuidor, periodo 26→25), DataTable paginada/ordenada en servidor,
// alta/edición en Sheet, cambios de estado con motivo (ConfirmDialog), notas
// append-only, pagaré privado, estado de cuenta por convenio, export y preview
// de aplicación del periodo con el tope global multi-fila explicado.
// Guard de lectura en layout.tsx; escritura botón a botón (mlm:withhold).

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useTreasurySettings, useUpdateWithholdingV2, useWithholdingList } from '@/hooks/useTreasury';
import { withholdingsTreasuryService } from '@/services/treasury.service';
import { exportToCsv } from '@/lib/csv-export';
import { saveBlob } from '@/lib/download';
import {
  PeriodSelector,
  TreasuryHeader,
  TreasuryTabs,
  TREASURY_WITHHOLD_PERMISSIONS,
  csvSafe,
  filenameFromDisposition,
  formatDateOnly,
  formatInt,
  formatMoney,
  formatRate,
  toNumber,
  treasuryErrorMessage,
  useTreasuryPeriod,
  useTreasuryPermissions,
} from '@/components/admin/treasury';
import {
  DistributorSearchSelect,
  WITHHOLDING_STATUS_LABELS,
  WITHHOLDING_STATUS_TONES,
  WithholdingFormSheet,
  WithholdingKpis,
  WithholdingPreviewCard,
  WithholdingStatementSheet,
  WithholdingStatusDialog,
  withholdingConceptLabel,
  withholdingExportFilename,
  withholdingStatusLabel,
  type DistributorOption,
} from '@/components/admin/treasury/withholdings';
import {
  PAYOUT_CURRENCIES,
  isWithholdingConcept,
  isWithholdingSortBy,
  isWithholdingStatus,
  type WithholdingAgreementRow,
  type WithholdingListFilters,
  type WithholdingStatusChange,
} from '@/types/treasury';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const STATUS_OPTIONS = (Object.keys(WITHHOLDING_STATUS_LABELS) as Array<keyof typeof WITHHOLDING_STATUS_LABELS>).map(
  (value) => ({ value, label: WITHHOLDING_STATUS_LABELS[value] }),
);
const CURRENCY_OPTIONS = PAYOUT_CURRENCIES.map((c) => ({ value: c, label: c }));
const CONCEPT_OPTIONS = [
  { value: 'loan', label: 'Préstamo' },
  { value: 'other', label: 'Otro concepto' },
];

/** Columna DataTable ↔ `sortBy` del API. */
const SORT_MAP: Record<string, string> = {
  customer: 'customerName',
  installment: 'installmentAmount',
  balance: 'balanceRemaining',
  status: 'status',
  updated: 'createdAt',
};

export default function RetencionesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RetencionesContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function RetencionesContent() {
  const { get, getNumber, setParams } = useQueryFilters({ page: '1', limit: '20', dir: 'desc' });

  const search = get('search');
  const statusParam = get('status');
  const currencyParam = get('currency');
  const conceptParam = get('concept');
  const customerParam = get('customer');
  const sortParam = get('sort');
  const dirParam = get('dir') === 'asc' ? 'asc' : 'desc';
  const page = getNumber('page') || 1;
  const limit = PAGE_SIZE_OPTIONS.includes(getNumber('limit')) ? getNumber('limit') : 20;

  const status = isWithholdingStatus(statusParam) ? statusParam : undefined;
  const concept = isWithholdingConcept(conceptParam) ? conceptParam : undefined;
  const sortBy = isWithholdingSortBy(sortParam) ? sortParam : undefined;

  const periodSel = useTreasuryPeriod(get('period'));
  const { effectivePeriodId, selectedPeriod, visiblePeriods } = periodSel;
  const perms = useTreasuryPermissions();
  // Tope global real (`treasury.withholding_max_pct_per_period`): solo super_admin puede leer
  // /settings/treasury; el resto usa el `globalPct` del preview o el default 30.
  const settingsQuery = useTreasurySettings(perms.isSuperAdmin);
  const globalMaxPct = settingsQuery.data?.withholdingMaxPctPerPeriod ?? null;

  // Búsqueda con retraso (300 ms).
  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => {
    if (searchDraft === search) return;
    const t = setTimeout(() => setParams({ search: searchDraft.trim() || null, page: null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const filters = useMemo<WithholdingListFilters>(
    () => ({
      search: search || undefined,
      status,
      currencyCode: currencyParam || undefined,
      concept,
      customerId: customerParam || undefined,
      periodId: effectivePeriodId,
      sortBy,
      sortDir: sortBy ? dirParam : undefined,
      page,
      limit,
    }),
    [search, status, currencyParam, concept, customerParam, effectivePeriodId, sortBy, dirParam, page, limit],
  );

  const listQuery = useWithholdingList(filters);
  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const meta = listQuery.data?.meta;
  const total = meta?.total ?? rows.length;

  // Distribuidor del filtro: el nombre se toma de la primera fila (todas son suyas).
  const [customerOption, setCustomerOption] = useState<DistributorOption | null>(null);
  const customerFilterOption: DistributorOption | null = customerParam
    ? (customerOption?.id === customerParam
        ? customerOption
        : {
            id: customerParam,
            name: rows[0]?.customerId === customerParam ? (rows[0].customerName ?? 'Distribuidor') : 'Distribuidor',
            number: rows[0]?.customerId === customerParam ? (rows[0].customerNumber ?? null) : null,
          })
    : null;

  // ── Diálogos ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<WithholdingAgreementRow | null>(null);
  const [statementFor, setStatementFor] = useState<WithholdingAgreementRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ row: WithholdingAgreementRow; target: WithholdingStatusChange } | null>(null);
  const [statusKey, setStatusKey] = useState(0);
  const updateMutation = useUpdateWithholdingV2();

  const openCreate = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (row: WithholdingAgreementRow) => {
    setEditing(row);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openStatus = (row: WithholdingAgreementRow, target: WithholdingStatusChange) => {
    setStatusTarget({ row, target });
    setStatusKey((k) => k + 1);
  };

  const handleStatusChange = async (reason: string) => {
    if (!statusTarget) return;
    const { row, target } = statusTarget;
    try {
      await updateMutation.mutateAsync({ id: row.id, payload: { status: target, reason } });
      toast.success(
        target === 'cancelled'
          ? 'Convenio cancelado'
          : target === 'paused'
            ? 'Convenio pausado'
            : 'Convenio reactivado',
      );
      setStatusTarget(null);
      if (statementFor?.id === row.id) setStatementFor({ ...row, status: target });
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo cambiar el estado del convenio'));
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, disposition } = await withholdingsTreasuryService.export(filters);
      saveBlob(blob, filenameFromDisposition(disposition, withholdingExportFilename('convenios')), blob.type || undefined);
    } catch (err) {
      const httpStatus = (err as { response?: { status?: number } })?.response?.status;
      if (httpStatus === 404 && rows.length > 0) {
        exportToCsv(
          withholdingExportFilename('convenios-pagina'),
          ['Nº', 'Distribuidor', 'Concepto', 'Descripción', 'Moneda', 'Total', 'Abono', 'Tope %', 'Saldo', 'Retenido', 'Estado', 'Folio', 'Creado'],
          rows.map((r) => [
            csvSafe(r.customerNumber ?? ''),
            csvSafe(r.customerName ?? ''),
            withholdingConceptLabel(r.concept),
            csvSafe(r.description),
            r.currencyCode,
            r.totalAmount === null ? '' : toNumber(r.totalAmount),
            toNumber(r.installmentAmount),
            toNumber(r.maxPctOfNet),
            r.balanceRemaining === null ? '' : toNumber(r.balanceRemaining),
            r.withheldToDate === null || r.withheldToDate === undefined ? '' : toNumber(r.withheldToDate),
            withholdingStatusLabel(r.status),
            csvSafe(r.authorizationFolio ?? ''),
            r.createdAt,
          ]),
        );
        toast.info('Export local de la página: el API aún no expone el CSV auditado');
      } else {
        toast.error(treasuryErrorMessage(err, 'No se pudo exportar'));
      }
    } finally {
      setExporting(false);
    }
  };

  // ── Orden en servidor ───────────────────────────────────────────────────
  const sortState: DataTableSortState | null = sortBy
    ? { key: Object.keys(SORT_MAP).find((k) => SORT_MAP[k] === sortBy) ?? sortBy, direction: dirParam }
    : null;
  const handleSortChange = (next: DataTableSortState | null) => {
    if (!next) {
      setParams({ sort: null, dir: null, page: null });
      return;
    }
    setParams({ sort: SORT_MAP[next.key] ?? next.key, dir: next.direction, page: null });
  };

  const canWithhold = perms.canWithhold;

  // Nombre del periodo "aplica desde" (el API solo manda `startsPeriodId`).
  const periodNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of visiblePeriods) map.set(p.id, p.name);
    return map;
  }, [visiblePeriods]);

  const columns = useMemo<DataTableColumn<WithholdingAgreementRow>[]>(
    () => [
      {
        key: 'customer',
        header: 'Distribuidor',
        sortable: true,
        render: (r) => (
          <div className="min-w-[10rem]">
            <Link href={`/admin/distribuidores/${r.customerId}`} className="font-medium text-primary hover:underline">
              {r.customerName ?? 'Distribuidor'}
            </Link>
            <p className="text-xs text-muted-foreground">
              {r.customerNumber ? `#${r.customerNumber}` : 'Sin número'} · {r.currencyCode}
              {r.countryCode ? ` · ${r.countryCode}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'concept',
        header: 'Concepto',
        render: (r) => (
          <div className="min-w-[10rem]">
            <Badge variant="outline">{withholdingConceptLabel(r.concept)}</Badge>
            <p className="mt-0.5 max-w-64 truncate text-xs text-muted-foreground" title={r.description}>
              {r.description}
            </p>
            {r.authorizationFolio && (
              <p className="font-mono text-[11px] text-muted-foreground">Folio {r.authorizationFolio}</p>
            )}
          </div>
        ),
      },
      {
        key: 'installment',
        header: 'Abono/periodo',
        sortable: true,
        headerClassName: 'text-right',
        cellClassName: 'text-right tabular-nums',
        render: (r) => (
          <>
            <p className="font-medium">{formatMoney(r.installmentAmount, r.currencyCode)}</p>
            <p className="text-xs text-muted-foreground">tope {formatRate(toNumber(r.maxPctOfNet) / 100)}</p>
          </>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        headerClassName: 'text-right',
        cellClassName: 'text-right tabular-nums',
        render: (r) => (r.totalAmount === null ? <span className="text-muted-foreground">Sin tope</span> : formatMoney(r.totalAmount, r.currencyCode)),
      },
      {
        key: 'balance',
        header: 'Saldo',
        sortable: true,
        headerClassName: 'text-right',
        cellClassName: 'text-right font-semibold tabular-nums',
        render: (r) => (r.balanceRemaining === null ? '—' : formatMoney(r.balanceRemaining, r.currencyCode)),
      },
      {
        key: 'withheld',
        header: 'Retenido',
        headerClassName: 'text-right',
        cellClassName: 'text-right tabular-nums text-muted-foreground',
        render: (r) =>
          r.withheldToDate === null || r.withheldToDate === undefined ? '—' : formatMoney(r.withheldToDate, r.currencyCode),
      },
      {
        key: 'next',
        header: 'Próximo abono estimado',
        headerClassName: 'text-right',
        cellClassName: 'text-right tabular-nums',
        render: (r) =>
          r.nextInstallmentEstimate === null || r.nextInstallmentEstimate === undefined ? (
            <span className="text-muted-foreground" title="Se calcula con el preview del periodo al cerrar">
              —
            </span>
          ) : (
            formatMoney(r.nextInstallmentEstimate, r.currencyCode)
          ),
      },
      {
        key: 'status',
        header: 'Estado',
        sortable: true,
        render: (r) => {
          const startsName = r.startsPeriodName ?? (r.startsPeriodId ? periodNameById.get(r.startsPeriodId) : undefined);
          return (
            <div className="min-w-[8rem]">
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant={WITHHOLDING_STATUS_TONES[r.status] ?? 'secondary'}>{withholdingStatusLabel(r.status)}</Badge>
                {r.inBatch && (
                  <Badge variant="warning" title="Comisiones del distribuidor en un lote vivo: sin cambios hasta conciliar">
                    En lote
                  </Badge>
                )}
              </div>
              {r.startsPeriodId && (
                <p
                  className="mt-0.5 text-xs text-muted-foreground"
                  title="Periodo 26→25 a partir del cual se retiene (puede ser posterior al pedido si el distribuidor estaba en un lote vivo)"
                >
                  Desde {startsName ?? 'periodo definido'}
                </p>
              )}
            </div>
          );
        },
      },
      {
        key: 'updated',
        header: 'Actualizado',
        sortable: true,
        cellClassName: 'text-xs text-muted-foreground',
        render: (r) => (
          <>
            <p>{formatDateOnly(r.updatedAt || r.createdAt)}</p>
            {r.statusChangedBy && <p>{r.statusChangedBy.name}</p>}
          </>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        render: (r) => {
          const live = r.status === 'active' || r.status === 'paused';
          return (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setStatementFor(r)}
                title="Estado de cuenta"
                aria-label={`Estado de cuenta de ${r.customerName ?? 'distribuidor'}`}
              >
                <DocumentTextIcon className="h-4 w-4" aria-hidden />
              </Button>
              <PermissionGuard permissions={TREASURY_WITHHOLD_PERMISSIONS} fallback={<></>}>
                {live && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => openEdit(r)} title="Editar" aria-label="Editar convenio">
                    <PencilSquareIcon className="h-4 w-4" aria-hidden />
                  </Button>
                )}
                {r.status === 'active' && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-amber-700" onClick={() => openStatus(r, 'paused')} title="Pausar" aria-label="Pausar convenio">
                    <PauseIcon className="h-4 w-4" aria-hidden />
                  </Button>
                )}
                {r.status === 'paused' && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-emerald-700" onClick={() => openStatus(r, 'active')} title="Reactivar" aria-label="Reactivar convenio">
                    <PlayIcon className="h-4 w-4" aria-hidden />
                  </Button>
                )}
                {live && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => openStatus(r, 'cancelled')} title="Cancelar convenio" aria-label="Cancelar convenio">
                    <XCircleIcon className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </PermissionGuard>
            </div>
          );
        },
      },
    ],
    [periodNameById],
  );

  return (
    <div className="p-6">
      <TreasuryHeader
        icon={BanknotesIcon}
        title="Retenciones"
        subtitle="Convenios que se descuentan de las comisiones al pagarlas (tope por convenio + tope global del periodo 26→25)."
        note={!canWithhold ? 'Solo lectura: capturar o cambiar convenios requiere mlm:withhold.' : undefined}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => void handleExport()} disabled={exporting || rows.length === 0}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <ArrowDownTrayIcon className="mr-2 h-4 w-4" aria-hidden />}
              Exportar CSV
            </Button>
            <PermissionGuard permissions={TREASURY_WITHHOLD_PERMISSIONS} fallback={<></>}>
              <Button type="button" onClick={openCreate}>
                <PlusIcon className="mr-2 h-4 w-4" aria-hidden /> Nuevo convenio
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <div className="mb-6">
        <TreasuryTabs active="retenciones" periodId={effectivePeriodId} />
      </div>

      <PeriodSelector
        selection={periodSel}
        caption="Periodo · KPIs retenido/proyectado y preview"
        onChange={(id) => setParams({ period: id, page: null })}
      />

      <WithholdingKpis
        kpis={listQuery.data?.kpis}
        rows={rows}
        isLoading={listQuery.isLoading}
        periodName={selectedPeriod?.name}
        onStatusClick={(s) => setParams({ status: status === s ? null : s, page: null })}
      />

      <WithholdingPreviewCard
        periodId={effectivePeriodId}
        periodName={selectedPeriod?.name}
        isPeriodClosed={selectedPeriod?.isClosed}
        globalMaxPct={globalMaxPct}
      />

      {/* Filtros (URL) */}
      <Card className="mb-6 border-border shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="wh-search">Buscar</Label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="wh-search"
                  type="search"
                  className="pl-9"
                  placeholder="Nombre, nº de distribuidor, descripción o folio"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-status">Estado</Label>
              <SearchableSelect id="wh-status" options={STATUS_OPTIONS} value={status ?? ''} onChange={(v) => setParams({ status: v || null, page: null })} allLabel="Todos los estados" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-currency">Moneda</Label>
              <SearchableSelect id="wh-currency" options={CURRENCY_OPTIONS} value={currencyParam} onChange={(v) => setParams({ currency: v || null, page: null })} allLabel="Todas" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-concept">Concepto</Label>
              <SearchableSelect id="wh-concept" options={CONCEPT_OPTIONS} value={concept ?? ''} onChange={(v) => setParams({ concept: v || null, page: null })} allLabel="Todos" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-customer">Distribuidor</Label>
              <DistributorSearchSelect
                id="wh-customer"
                value={customerFilterOption}
                onChange={(opt) => {
                  setCustomerOption(opt);
                  setParams({ customer: opt?.id ?? null, page: null });
                }}
                placeholder="Todos"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          {listQuery.isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">{treasuryErrorMessage(listQuery.error, 'No se pudieron cargar los convenios')}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void listQuery.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {formatInt(total)} convenio(s)
                  {listQuery.isFetching && !listQuery.isLoading ? ' · actualizando…' : ''}
                </span>
                {!listQuery.data?.meta || listQuery.data.meta.totalPages <= 1 ? null : (
                  <span>Página {meta?.page ?? page} de {meta?.totalPages ?? 1}</span>
                )}
              </div>
              <DataTable
                columns={columns}
                data={rows}
                getRowKey={(r) => r.id}
                isLoading={listQuery.isLoading}
                sortingMode="server"
                sortState={sortState}
                onSortChange={handleSortChange}
                minWidthClassName="min-w-[64rem]"
                emptyState={
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Sin convenios con estos filtros</p>
                    <p className="mt-1">
                      {canWithhold
                        ? 'Crea el primero con “Nuevo convenio”: préstamo con saldo o un concepto personalizado.'
                        : 'No hay convenios registrados que coincidan.'}
                    </p>
                  </div>
                }
              />
              <DataTablePagination
                currentPage={meta?.page ?? page}
                pageSize={limit}
                totalItems={total}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                isLoading={listQuery.isFetching}
              />
            </>
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <WithholdingFormSheet
          key={formKey}
          open={formOpen}
          onOpenChange={setFormOpen}
          agreement={editing}
          periods={visiblePeriods}
          globalMaxPct={globalMaxPct}
          onSaved={(row) => {
            if (statementFor?.id === row.id) setStatementFor(row);
          }}
        />
      )}

      <WithholdingStatementSheet
        agreement={statementFor}
        onClose={() => setStatementFor(null)}
        canWithhold={canWithhold}
        onEdit={openEdit}
        onStatusChange={openStatus}
      />

      {statusTarget && (
        <WithholdingStatusDialog
          key={statusKey}
          open={!!statusTarget}
          onOpenChange={(o) => !o && setStatusTarget(null)}
          agreement={statusTarget.row}
          target={statusTarget.target}
          onConfirm={handleStatusChange}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}
