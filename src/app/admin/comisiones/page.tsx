'use client';

// /admin/comisiones — Tesorería > Comisiones (contrato §5.2).
//
// Filtros en la URL (useQueryFilters), DataTable con paginación y orden en
// SERVIDOR, KPIs por moneda y etapa (nunca se suman monedas mezcladas),
// badge "Estimado" en periodo abierto y SIN acciones de aprobar/pagar ahí.
// Lote = periodo/filtro, nunca la página: "Aprobar periodo" manda
// `expectedCount`; la selección por checkbox (o "todo el filtro") confirma
// su alcance real (n filas, Σ por moneda). Cancelación con motivo. Sheet de
// detalle con línea de tiempo. Export CSV real desde el endpoint.
// Botones gateados con PermissionGuard fallback vacío; el guard de página
// vive SOLO en layout.tsx.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  CalculatorIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  EyeIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
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
import { useActiveCountries } from '@/hooks/useConfig';
import {
  commissionKeys,
  useCalculateCommissions,
  useCalculateProgress,
} from '@/hooks/useCommissions';
import {
  useApproveCommissionIds,
  useApprovePeriod,
  useCancelCommission,
  useMarkCommissionsPaid,
  useRestoreCommission,
  useTaxRegimes,
  useTreasuryCommissions,
  useTreasurySummary,
} from '@/hooks/useTreasury';
import { treasuryService, listMeta } from '@/services/treasury.service';
import { saveBlob } from '@/lib/download';
import {
  ApprovePeriodDialog,
  ApproveSelectionDialog,
  CancelCommissionDialog,
  CommissionDetailSheet,
  CommissionKpis,
  MarkPaidDialog,
  PeriodSelector,
  ReadinessChip,
  RegimeBreakdown,
  StageBadge,
  TreasuryHeader,
  TreasuryTabs,
  useTreasuryPeriod,
  useTreasuryPermissions,
  TREASURY_APPROVE_PERMISSIONS,
  TREASURY_PAY_PERMISSIONS,
  COMMISSION_TYPE_LABELS,
  STAGE_LABELS,
  filenameFromDisposition,
  formatDateTime,
  formatInt,
  formatMoney,
  toNumber,
  treasuryBlockedDetails,
  treasuryCodeLabel,
  treasuryErrorMessage,
  treasurySkippedByCode,
} from '@/components/admin/treasury';
import {
  COMMISSION_STAGES,
  PAYOUT_CURRENCIES,
  isCommissionSortBy,
  isCommissionStage,
  type ApproveResult,
  type CommissionListFilters,
  type CommissionRow,
  type CommissionStage,
} from '@/types/treasury';
import type { CommissionType } from '@/types/commissions';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const COMMISSION_TYPES: CommissionType[] = ['mlm', 'cedea_bonus', 'auto_bonus', 'adjustment'];
const APPROVABLE_STAGES: CommissionStage[] = ['calculated', 'ready'];
const CANCELLABLE_STAGES: CommissionStage[] = ['calculated', 'ready', 'approved'];

export default function ComisionesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ComisionesContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function ComisionesContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    page: '1',
    limit: '20',
    dir: 'desc',
  });

  const periodParam = get('period');
  const search = get('search');
  const stageParam = get('stage');
  const readinessParam = get('readiness');
  const countryParam = get('country');
  const currencyParam = get('currency');
  const regimeParam = get('regime');
  const typeParam = get('type');
  const sortParam = get('sort');
  const dirParam = get('dir') === 'asc' ? 'asc' : 'desc';
  const page = getNumber('page') || 1;
  const limit = PAGE_SIZE_OPTIONS.includes(getNumber('limit')) ? getNumber('limit') : 20;

  const stage = isCommissionStage(stageParam) ? stageParam : undefined;
  const readiness = readinessParam === 'ready' || readinessParam === 'blocked' ? readinessParam : undefined;
  const sortBy = isCommissionSortBy(sortParam) ? sortParam : undefined;
  const commissionType = (COMMISSION_TYPES as string[]).includes(typeParam)
    ? (typeParam as CommissionType)
    : undefined;

  // ── Periodo 26→25 (por defecto el actual; "Todos" explícito) ─────────────
  const periodSel = useTreasuryPeriod(periodParam, { allowAll: true });
  const { effectivePeriodId, selectedPeriod, isAllPeriods } = periodSel;

  // ── Permisos ────────────────────────────────────────────────────────────
  const perms = useTreasuryPermissions();

  // ── Búsqueda con retraso (300 ms) ────────────────────────────────────────
  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => {
    if (searchDraft === search) return;
    const t = setTimeout(() => setParams({ search: searchDraft.trim() || null, page: null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  // ── Datos ───────────────────────────────────────────────────────────────
  const filters = useMemo<CommissionListFilters>(
    () => ({
      periodId: effectivePeriodId,
      stage,
      readiness,
      countryCode: countryParam || undefined,
      currencyCode: currencyParam || undefined,
      taxRegime: regimeParam || undefined,
      commissionType,
      search: search || undefined,
      sortBy,
      sortDir: sortBy ? dirParam : undefined,
      page,
      limit,
    }),
    [
      effectivePeriodId,
      stage,
      readiness,
      countryParam,
      currencyParam,
      regimeParam,
      commissionType,
      search,
      sortBy,
      dirParam,
      page,
      limit,
    ],
  );

  const listReady = isAllPeriods || !!effectivePeriodId;
  const list = useTreasuryCommissions(filters, listReady);
  const summaryQuery = useTreasurySummary(isAllPeriods ? undefined : effectivePeriodId);
  const summary = summaryQuery.data;
  const { data: countries } = useActiveCountries();
  const { data: regimes } = useTaxRegimes();

  const rows = useMemo(() => list.data?.data ?? [], [list.data]);
  const meta = list.data ? listMeta(list.data, limit) : { total: 0, page, limit, totalPages: 1 };

  // Estado del periodo para las acciones (fail-closed: sin resumen no hay acciones).
  const periodClosed = summary?.period?.isClosed ?? selectedPeriod?.isClosed ?? false;
  const periodOpen = !isAllPeriods && !periodClosed;
  const payable = !isAllPeriods && periodClosed && summary?.period?.payable === true;
  const payableReason = summary?.period?.payableReason ?? null;
  const actionsAllowed = payable && !summaryQuery.isLoading;

  // ── Selección (por id; conserva filas de otras páginas) ──────────────────
  const [selected, setSelected] = useState<Record<string, CommissionRow>>({});
  const [selectionTruncated, setSelectionTruncated] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const selectedRows = useMemo(() => Object.values(selected), [selected]);
  const selectedKeys = useMemo(() => Object.keys(selected), [selected]);

  const clearSelection = useCallback(() => {
    setSelected({});
    setSelectionTruncated(false);
  }, []);

  // Cambio de periodo o de filtro ⇒ la selección deja de tener sentido.
  const filterSignature = JSON.stringify({ ...filters, page: undefined, limit: undefined, sortBy: undefined, sortDir: undefined });
  const prevSignature = useRef(filterSignature);
  useEffect(() => {
    if (prevSignature.current !== filterSignature) {
      prevSignature.current = filterSignature;
      clearSelection();
    }
  }, [filterSignature, clearSelection]);

  const handleSelectedKeysChange = (keys: string[]) => {
    const keySet = new Set(keys);
    setSelected((prev) => {
      const next: Record<string, CommissionRow> = {};
      // Conserva lo seleccionado en otras páginas.
      for (const [id, row] of Object.entries(prev)) {
        const onPage = rows.some((r) => r.id === id);
        if (!onPage || keySet.has(id)) next[id] = row;
      }
      for (const row of rows) if (keySet.has(row.id)) next[row.id] = row;
      return next;
    });
    setSelectionTruncated(false);
  };

  const handleSelectAllFilter = async () => {
    setSelectingAll(true);
    try {
      const res = await treasuryService.listAllCommissionRows({ ...filters, page: undefined, limit: undefined });
      const next: Record<string, CommissionRow> = {};
      for (const row of res.rows) next[row.id] = row;
      setSelected(next);
      setSelectionTruncated(res.truncated);
      toast.info(
        res.truncated
          ? `Seleccionadas ${formatInt(res.rows.length)} de ${formatInt(res.total)} filas (tope 2,000)`
          : `Seleccionadas las ${formatInt(res.rows.length)} filas del filtro`,
      );
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo seleccionar todo el filtro'));
    } finally {
      setSelectingAll(false);
    }
  };

  const selectedApprovable = selectedRows.filter((r) => APPROVABLE_STAGES.includes(r.stage));
  const selectedPayable = selectedRows.filter((r) => r.stage === 'approved');

  // ── Mutaciones ──────────────────────────────────────────────────────────
  const approveIds = useApproveCommissionIds();
  const approvePeriod = useApprovePeriod();
  const cancelMutation = useCancelCommission();
  const restoreMutation = useRestoreCommission();
  const markPaid = useMarkCommissionsPaid();

  const [approvePeriodOpen, setApprovePeriodOpen] = useState(false);
  const [approveSelOpen, setApproveSelOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ row: CommissionRow; mode: 'cancel' | 'restore' } | null>(null);

  const reportApprove = (res: ApproveResult, verb = 'aprobadas') => {
    const skipped = res.skipped?.length ?? 0;
    if (res.approved > 0) {
      toast.success(
        `${formatInt(res.approved)} comisiones ${verb}${skipped > 0 ? ` · ${formatInt(skipped)} omitidas` : ''}`,
      );
    } else {
      toast.warning(
        skipped > 0
          ? `Ninguna comisión ${verb}: ${formatInt(skipped)} omitidas (${summarizeSkipped(res)})`
          : `Ninguna comisión ${verb}`,
      );
    }
  };

  const handleApprovePeriod = async (expectedCount: number) => {
    if (!effectivePeriodId) return;
    try {
      const res = await approvePeriod.mutateAsync({ periodId: effectivePeriodId, onlyReady: true, expectedCount });
      reportApprove(res);
      setApprovePeriodOpen(false);
      clearSelection();
    } catch (err) {
      // TRS_COUNT_MISMATCH trae esperado/real y `skippedByCode` (p. ej. TRS_REGIME_MISMATCH
      // tras el backfill de régimen): el mensaje lo desglosa para que Tesorería sepa por qué.
      const skipped = treasurySkippedByCode(err);
      toast.error(treasuryErrorMessage(err, 'No se pudo aprobar el periodo'), {
        duration: skipped.length > 0 ? 15000 : undefined,
      });
    }
  };

  const handleApproveSelection = async () => {
    const ids = selectedApprovable.map((r) => r.id);
    if (ids.length === 0) return;
    try {
      const res = await approveIds.mutateAsync(ids);
      reportApprove(res);
      setApproveSelOpen(false);
      clearSelection();
    } catch (err) {
      const blocked = treasuryBlockedDetails(err);
      toast.error(
        treasuryErrorMessage(err, 'No se pudo aprobar la selección') +
          (blocked.length > 0 ? ` · nº ${blocked.slice(0, 5).map((b) => b.customerNumber ?? '?').join(', ')}` : ''),
      );
    }
  };

  const handleMarkPaid = async (payload: { paymentMethod: 'cash' | 'check'; reference: string; paymentDate: string }) => {
    const ids = selectedPayable.map((r) => r.id);
    if (ids.length === 0) return;
    try {
      const res = await markPaid.mutateAsync({ commissionIds: ids, ...payload });
      const skipped = res.skipped?.length ?? 0;
      toast.success(`${formatInt(res.paid)} comisiones pagadas${skipped > 0 ? ` · ${formatInt(skipped)} omitidas` : ''}`);
      setMarkPaidOpen(false);
      clearSelection();
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo registrar el pago'));
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTarget) return;
    const { row, mode } = cancelTarget;
    try {
      if (mode === 'cancel') {
        await cancelMutation.mutateAsync({ id: row.id, reason });
        toast.success(`Comisión de #${row.customerNumber ?? ''} cancelada`);
      } else {
        await restoreMutation.mutateAsync({ id: row.id, reason });
        toast.success(`Comisión de #${row.customerNumber ?? ''} restaurada`);
      }
      setCancelTarget(null);
      setSelected((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch (err) {
      toast.error(treasuryErrorMessage(err, mode === 'cancel' ? 'No se pudo cancelar' : 'No se pudo restaurar'));
    }
  };

  // ── Export CSV real (endpoint) ──────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, disposition } = await treasuryService.exportCommissions(filters);
      const periodTag = isAllPeriods ? 'todos' : (summary?.period?.code ?? selectedPeriod?.code ?? 'periodo');
      const fallback = `comisiones-${periodTag}-${new Date().toISOString().slice(0, 10)}.csv`;
      saveBlob(blob, filenameFromDisposition(disposition, fallback), blob.type || 'text/csv;charset=utf-8;');
      toast.success('CSV descargado');
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo exportar'));
    } finally {
      setExporting(false);
    }
  };

  // ── Recalcular (solo periodo abierto y mlm:admin) ───────────────────────
  const queryClient = useQueryClient();
  const calculateMutation = useCalculateCommissions();
  const { data: calcProgress } = useCalculateProgress(periodOpen && perms.isMlmAdmin ? effectivePeriodId : undefined);
  const calcRunning = calcProgress?.status === 'running';
  const prevCalcStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevCalcStatus.current === 'running' && calcProgress?.status === 'done') {
      toast.success(
        `Comisiones calculadas: ${calcProgress.calculated ?? 0} (sin calificar: ${calcProgress.skipped ?? 0})`,
      );
      void queryClient.invalidateQueries({ queryKey: commissionKeys.all });
      void list.refetch();
      void summaryQuery.refetch();
    } else if (prevCalcStatus.current === 'running' && calcProgress?.status === 'error') {
      toast.error(`El recálculo falló: ${calcProgress.error ?? 'error desconocido'}`);
    }
    prevCalcStatus.current = calcProgress?.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcProgress, queryClient]);

  const handleCalculate = async () => {
    if (!effectivePeriodId) return;
    try {
      const res = await calculateMutation.mutateAsync({ periodId: effectivePeriodId });
      if (res.alreadyRunning) toast.info('Ya hay un recálculo corriendo para este periodo');
      else if (res.started) toast.info('Recálculo iniciado — el botón muestra el avance');
      else toast.success('Comisiones calculadas');
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo iniciar el recálculo'));
    }
  };

  // ── Orden en servidor ───────────────────────────────────────────────────
  const sortState: DataTableSortState | null = sortBy ? { key: sortBy, direction: dirParam } : null;
  const handleSortChange = (next: DataTableSortState | null) => {
    if (!next || !isCommissionSortBy(next.key)) {
      setParams({ sort: null, dir: null, page: null });
      return;
    }
    setParams({ sort: next.key, dir: next.direction, page: null });
  };

  // ── Columnas ────────────────────────────────────────────────────────────
  const canCancelRows = perms.canApprove && actionsAllowed;
  const columns: DataTableColumn<CommissionRow>[] = [
    {
      key: 'customerName',
      header: 'Distribuidor',
      sortable: true,
      render: (c) => (
        <div className="min-w-[180px]">
          <Link
            href={`/admin/distribuidores/${c.customerId}`}
            className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
          >
            {c.customerName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {c.customerNumber ? `#${c.customerNumber}` : ''}
            {c.customerNumber && c.customerCountry ? ' · ' : ''}
            {c.customerCountry ?? ''}
            {isAllPeriods ? ` · ${c.periodCode}` : ''}
            {c.commissionType !== 'mlm' ? ` · ${COMMISSION_TYPE_LABELS[c.commissionType] ?? c.commissionType}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Etapa',
      sortable: true,
      render: (c) => <StageBadge stage={c.stage ?? fallbackStage(c)} isEstimate={c.isEstimate} />,
    },
    {
      key: 'taxRegime',
      header: 'Régimen',
      render: (c) => (
        <span className="font-mono text-xs text-muted-foreground">{c.taxRegime || '—'}</span>
      ),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      sortable: true,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <span className="text-sm tabular-nums text-foreground">{formatMoney(c.subtotalEarnings, c.currencyCode)}</span>
      ),
    },
    {
      key: 'fiscal',
      header: 'Ret. fiscales',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => {
        const v = toNumber(c.ivaWithholding) + toNumber(c.isrAmount) + toNumber(c.resicoAmount);
        return v > 0 ? (
          <span className="text-sm tabular-nums text-destructive">− {formatMoney(v, c.currencyCode)}</span>
        ) : (
          <span className="text-xs text-muted-foreground/60">—</span>
        );
      },
    },
    {
      key: 'withholding',
      header: 'Convenios',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => {
        const v = toNumber(c.companyWithholding?.amount);
        return v > 0 ? (
          <span className="text-sm tabular-nums text-destructive" title={c.companyWithholding?.projected ? 'Por aplicar al pagar' : 'Aplicado'}>
            − {formatMoney(v, c.currencyCode)}
            {c.companyWithholding?.projected ? '*' : ''}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60">—</span>
        );
      },
    },
    {
      key: 'total',
      header: 'A dispersar',
      sortable: true,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => {
        const net = toNumber(c.totalAmount);
        const w = toNumber(c.companyWithholding?.amount);
        const hasPayout = c.payoutAmount !== undefined && c.payoutAmount !== null;
        return (
          <span className="text-sm font-bold tabular-nums text-primary">
            {hasPayout ? formatMoney(c.payoutAmount, c.payoutCurrency ?? c.currencyCode) : formatMoney(Math.max(0, net - w), c.currencyCode)}
          </span>
        );
      },
    },
    {
      key: 'payoutCurrency',
      header: 'Moneda',
      render: (c) => (
        <Badge variant="outline" className="font-mono text-muted-foreground">
          {c.payoutCurrency ?? c.currencyCode ?? 'MXN'}
        </Badge>
      ),
    },
    {
      key: 'readiness',
      header: 'Datos',
      render: (c) => <ReadinessChip readiness={c.readiness} />,
    },
    {
      key: 'batch',
      header: 'Lote',
      render: (c) =>
        c.payoutBatch ? (
          <span className="font-mono text-xs text-foreground" title={`Lote ${c.payoutBatch.status}`}>
            {c.payoutBatch.batchNumber}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60">—</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Aprobó / Pagó',
      sortable: true,
      render: (c) => (
        <div className="text-xs text-muted-foreground">
          {c.approvedAt ? (
            <p>
              <span className="text-foreground">{c.approvedBy?.name ?? 'Aprobada'}</span> · {formatDateTime(c.approvedAt)}
            </p>
          ) : null}
          {c.paidAt ? (
            <p>
              <span className="text-foreground">{c.paidBy?.name ?? 'Pagada'}</span> · {formatDateTime(c.paidAt)}
              {c.paidReference ? ` · ${c.paidReference}` : ''}
            </p>
          ) : null}
          {!c.approvedAt && !c.paidAt && <span className="text-muted-foreground/60">—</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setDetailId(c.id)}
            className="rounded-lg p-1.5 transition-colors hover:bg-muted"
            title="Ver detalle"
            aria-label={`Ver detalle de la comisión de ${c.customerName}`}
          >
            <EyeIcon className="h-4 w-4 text-primary" aria-hidden />
          </button>
          {canCancelRows && !c.payoutBatch && CANCELLABLE_STAGES.includes(c.stage) && (
            <PermissionGuard permissions={TREASURY_APPROVE_PERMISSIONS} fallback={<></>}>
              <button
                type="button"
                onClick={() => setCancelTarget({ row: c, mode: 'cancel' })}
                className="rounded-lg p-1.5 transition-colors hover:bg-muted"
                title="Cancelar comisión"
                aria-label={`Cancelar la comisión de ${c.customerName}`}
              >
                <XCircleIcon className="h-4 w-4 text-destructive" aria-hidden />
              </button>
            </PermissionGuard>
          )}
        </div>
      ),
    },
  ];

  const stageOptions = COMMISSION_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }));
  const regimeOptions = (regimes ?? [])
    .filter((r) => r.isActive !== false)
    .map((r) => ({ value: r.code, label: `${r.code} · ${r.name}` }));
  const countryOptions = (countries ?? []).map((c) => ({ value: c.code, label: c.name }));
  const showSelection = (perms.canApprove || perms.canPay) && actionsAllowed;

  return (
    <div className="p-6">
      <TreasuryHeader
        icon={CurrencyDollarIcon}
        title="Comisiones"
        subtitle="Ciclo de vida de las comisiones del periodo 26→25: calculadas, listas, aprobadas, en dispersión, pagadas y conciliadas."
        note={
          !perms.canApprove && !perms.canPay
            ? 'Modo solo lectura: aprobar requiere mlm:approve y pagar mlm:pay.'
            : undefined
        }
        actions={
          <>
            <Button variant="outline" onClick={handleExport} disabled={exporting || !listReady}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ArrowDownTrayIcon className="mr-2 h-4 w-4" aria-hidden />
              )}
              Exportar CSV
            </Button>
            {periodOpen && (
              <PermissionGuard permissions={['mlm:admin']} fallback={<></>}>
                <Button
                  variant="secondary"
                  onClick={handleCalculate}
                  disabled={calculateMutation.isPending || calcRunning || !effectivePeriodId}
                >
                  <CalculatorIcon className="mr-2 h-4 w-4" aria-hidden />
                  {calcRunning
                    ? `Calculando… ${calcProgress?.percent ?? 0}%`
                    : calculateMutation.isPending
                      ? 'Iniciando…'
                      : 'Recalcular'}
                </Button>
              </PermissionGuard>
            )}
          </>
        }
      />

      <div className="mb-6">
        <TreasuryTabs active="comisiones" periodId={isAllPeriods ? null : effectivePeriodId} />
      </div>

      <PeriodSelector
        selection={periodSel}
        allowAll
        onChange={(id) => setParams({ period: id, page: null })}
      />

      {/* Aviso de periodo abierto / no pagable */}
      {!isAllPeriods && periodOpen && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            <strong>Periodo abierto: cifras estimadas.</strong> El estimador las reescribe cada 4 h; aquí
            no se aprueba ni se paga nada. Las acciones aparecen cuando el periodo cierre (día 25, cierre
            nocturno).
          </p>
        </div>
      )}
      {!isAllPeriods && periodClosed && summary && summary.period?.payable === false && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            <strong>Periodo cerrado pero no pagable desde v2.</strong>{' '}
            {payableReason ? treasuryCodeLabel(payableReason) : 'El API no lo marca como pagable.'}
            {payableReason === 'TRS_CUTOVER_NOT_SET' && perms.isSuperAdmin && (
              <>
                {' '}
                <Link href="/admin/sistema?tab=tesoreria" className="font-medium underline">
                  Ajustes de Tesorería
                </Link>
              </>
            )}
          </p>
        </div>
      )}

      {/* KPIs por moneda + embudo (solo con periodo) */}
      {!isAllPeriods ? (
        <CommissionKpis
          summary={summary}
          isLoading={summaryQuery.isLoading}
          error={summaryQuery.error}
          onRetry={() => void summaryQuery.refetch()}
          activeStage={stage ?? null}
          onStageClick={(s) => setParams({ stage: stage === s ? null : s, page: null })}
        />
      ) : (
        <Card className="mb-6">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Con &ldquo;Todos los periodos&rdquo; no hay resumen: los totales solo tienen sentido por periodo y moneda.
          </CardContent>
        </Card>
      )}

      {!isAllPeriods && summary && <RegimeBreakdown summary={summary} periodId={effectivePeriodId} />}

      {/* Filtros (URL) */}
      <Card className="mb-6 border-border shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="commissions-search">Buscar</Label>
              <div className="relative">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="commissions-search"
                  type="search"
                  className="pl-9"
                  placeholder="Nombre, correo o nº de distribuidor (ej. 88197)"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commissions-stage">Etapa</Label>
              <SearchableSelect
                id="commissions-stage"
                options={stageOptions}
                value={stage ?? ''}
                onChange={(v) => setParams({ stage: v || null, page: null })}
                allLabel="Todas las etapas"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commissions-readiness">Datos de pago</Label>
              <SearchableSelect
                id="commissions-readiness"
                options={[
                  { value: 'ready', label: 'Listo' },
                  { value: 'blocked', label: 'Bloqueado' },
                ]}
                value={readiness ?? ''}
                onChange={(v) => setParams({ readiness: v || null, page: null })}
                allLabel="Todos"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commissions-country">País</Label>
              <SearchableSelect
                id="commissions-country"
                options={countryOptions}
                value={countryParam}
                onChange={(v) => setParams({ country: v || null, page: null })}
                allLabel="Todos los países"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commissions-currency">Moneda</Label>
              <SearchableSelect
                id="commissions-currency"
                options={PAYOUT_CURRENCIES.map((c) => ({ value: c, label: c }))}
                value={currencyParam}
                onChange={(v) => setParams({ currency: v || null, page: null })}
                allLabel="Todas las monedas"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commissions-regime">Régimen</Label>
              <SearchableSelect
                id="commissions-regime"
                options={regimeOptions}
                value={regimeParam}
                onChange={(v) => setParams({ regime: v || null, page: null })}
                allLabel="Todos los regímenes"
                placeholder={regimeOptions.length === 0 ? 'Catálogo no disponible' : 'Buscar…'}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commissions-type">Tipo</Label>
              <SearchableSelect
                id="commissions-type"
                options={COMMISSION_TYPES.map((t) => ({ value: t, label: COMMISSION_TYPE_LABELS[t] ?? t }))}
                value={commissionType ?? ''}
                onChange={(v) => setParams({ type: v || null, page: null })}
                allLabel="Todos los tipos"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botonera gateada (periodo cerrado y pagable) */}
      {showSelection && (
        <Card className="mb-4 border-border shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {selectedRows.length > 0
                  ? `${formatInt(selectedRows.length)} seleccionadas`
                  : 'Selecciona filas con las casillas o todo el filtro'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFilter}
                disabled={selectingAll || meta.total === 0}
              >
                {selectingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Seleccionar todo el filtro ({formatInt(meta.total)})
              </Button>
              {selectedRows.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Limpiar
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PermissionGuard permissions={TREASURY_APPROVE_PERMISSIONS} fallback={<></>}>
                <Button
                  onClick={() => setApprovePeriodOpen(true)}
                  disabled={!summary || (summary.readiness?.readyCount ?? 0) === 0}
                >
                  <CheckCircleIcon className="mr-2 h-4 w-4" aria-hidden />
                  Aprobar periodo ({formatInt(summary?.readiness?.readyCount ?? 0)} listas ·{' '}
                  {formatInt(summary?.readiness?.blockedCount ?? 0)} bloqueadas)
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setApproveSelOpen(true)}
                  disabled={selectedApprovable.length === 0}
                >
                  Aprobar selección ({formatInt(selectedApprovable.length)})
                </Button>
              </PermissionGuard>
              <PermissionGuard permissions={TREASURY_PAY_PERMISSIONS} fallback={<></>}>
                <Button
                  variant="secondary"
                  onClick={() => setMarkPaidOpen(true)}
                  disabled={selectedPayable.length === 0}
                  title="Cheque o efectivo; las transferencias se pagan por lote"
                >
                  <BanknotesIcon className="mr-2 h-4 w-4" aria-hidden />
                  Pagar selección ({formatInt(selectedPayable.length)})
                </Button>
              </PermissionGuard>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Listado de comisiones</h2>
            <p className="text-sm text-muted-foreground">
              {list.isError
                ? treasuryErrorMessage(list.error, 'No se pudo cargar el listado')
                : `${formatInt(meta.total)} resultados${list.isFetching && !list.isLoading ? ' · actualizando…' : ''}`}
            </p>
          </div>
          {list.isError && (
            <div className="mb-4">
              <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
                Reintentar
              </Button>
            </div>
          )}
          <DataTable
            columns={columns}
            data={rows}
            isLoading={list.isLoading}
            getRowKey={(c) => c.id}
            minWidthClassName="min-w-[1280px]"
            sortingMode="server"
            sortState={sortState}
            onSortChange={handleSortChange}
            enableRowSelection={showSelection}
            selectedRowKeys={selectedKeys}
            onSelectedRowKeysChange={handleSelectedKeysChange}
            emptyState={
              <div className="py-4 text-center">
                <CurrencyDollarIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden />
                <p className="text-sm font-medium text-foreground">No se encontraron comisiones</p>
                <p className="mt-1 text-xs text-muted-foreground">Ajusta los filtros o cambia de periodo</p>
              </div>
            }
          />
          {meta.total > 0 && (
            <DataTablePagination
              currentPage={page}
              pageSize={limit}
              totalItems={meta.total}
              isLoading={list.isFetching}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            * convenio por aplicar al pagar. Los importes se muestran en la moneda de cada fila; los
            totales del resumen nunca mezclan monedas.
          </p>
        </CardContent>
      </Card>

      {/* Diálogos */}
      <ApprovePeriodDialog
        open={approvePeriodOpen}
        onOpenChange={setApprovePeriodOpen}
        summary={summary}
        onConfirm={handleApprovePeriod}
        isPending={approvePeriod.isPending}
      />
      <ApproveSelectionDialog
        open={approveSelOpen}
        onOpenChange={setApproveSelOpen}
        rows={selectedRows}
        truncated={selectionTruncated}
        onConfirm={handleApproveSelection}
        isPending={approveIds.isPending}
      />
      <MarkPaidDialog
        key={markPaidOpen ? 'mark-paid-open' : 'mark-paid-closed'}
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        rows={selectedRows}
        onConfirm={handleMarkPaid}
        isPending={markPaid.isPending}
      />
      <CancelCommissionDialog
        key={cancelTarget ? `${cancelTarget.mode}-${cancelTarget.row.id}` : 'cancel-closed'}
        row={cancelTarget?.row ?? null}
        mode={cancelTarget?.mode ?? 'cancel'}
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        isPending={cancelMutation.isPending || restoreMutation.isPending}
      />
      <CommissionDetailSheet
        commissionId={detailId}
        onClose={() => setDetailId(null)}
        canCancel={canCancelRows}
        onCancel={(row) => {
          setDetailId(null);
          setCancelTarget({ row, mode: 'cancel' });
        }}
        onRestore={(row) => {
          setDetailId(null);
          setCancelTarget({ row, mode: 'restore' });
        }}
      />
    </div>
  );
}

/** Etapa de respaldo si el API (anterior al contrato) no manda `stage`. */
function fallbackStage(c: CommissionRow): CommissionStage {
  switch (c.status) {
    case 'approved':
      return c.payoutBatch ? 'in_dispersion' : 'approved';
    case 'paid':
      return 'paid';
    case 'cancelled':
      return 'cancelled';
    default:
      return c.isEstimate ? 'estimated' : 'calculated';
  }
}

function summarizeSkipped(res: ApproveResult): string {
  const counts = new Map<string, number>();
  for (const s of res.skipped ?? []) counts.set(s.code, (counts.get(s.code) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([code, n]) => `${treasuryCodeLabel(code)} ×${n}`)
    .join('; ');
}
