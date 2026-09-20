'use client';

// Tesorería → Dispersión y pagos (contrato §4.2 / §5.3, paso 10 Next).
//
// Pestañas Lotes | Pagos (en la URL `?tab=`). Lotes: listado con estado y
// acciones por estado (descargar layout con hash, marcar enviado, cargar
// resultado del banco con vista previa y aplicar, confirmar con referencia,
// conciliar, cancelar), "Generar lote" en Sheet. Pagos: ledger paginado con
// filtros, export y recibo; pago manual cash|check con ConfirmDialog.
// Periodo 26→25 en la URL (`?period=`, "Todos" permitido para el ledger).
// Guard de lectura en layout.tsx.

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { BanknotesIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTablePagination } from '@/components/ui/DataTable';
import { PermissionGuard } from '@/components/auth';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { usePayoutBatchList, useTreasurySummary } from '@/hooks/useTreasury';
import {
  PeriodSelector,
  TreasuryHeader,
  TreasuryTabs,
  TREASURY_PAY_PERMISSIONS,
  formatInt,
  treasuryCodeLabel,
  treasuryErrorMessage,
  useTreasuryPeriod,
  useTreasuryPermissions,
} from '@/components/admin/treasury';
import {
  BATCH_STATUS_LABELS,
  BatchActionDialogs,
  BatchesTable,
  GenerateBatchSheet,
  ManualPaymentSheet,
  PaymentsLedger,
  type BatchActionTarget,
} from '@/components/admin/treasury/payouts';
import { PAYOUT_CURRENCIES, isPayoutBatchStatus, type PayoutBatchListFilters } from '@/types/treasury';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_OPTIONS = (Object.keys(BATCH_STATUS_LABELS) as Array<keyof typeof BATCH_STATUS_LABELS>).map((value) => ({
  value,
  label: BATCH_STATUS_LABELS[value],
}));
const CURRENCY_OPTIONS = PAYOUT_CURRENCIES.map((c) => ({ value: c, label: c }));

export default function DispersionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DispersionContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function DispersionContent() {
  const { get, getNumber, setParams } = useQueryFilters({ tab: 'lotes', page: '1', limit: '20' });
  const tab = get('tab') === 'pagos' ? 'pagos' : 'lotes';
  const statusParam = get('status');
  const currencyParam = get('currency');
  const page = getNumber('page') || 1;
  const limit = PAGE_SIZE_OPTIONS.includes(getNumber('limit')) ? getNumber('limit') : 20;
  const status = isPayoutBatchStatus(statusParam) ? statusParam : undefined;

  const periodSel = useTreasuryPeriod(get('period'), { allowAll: true });
  const { effectivePeriodId, selectedPeriod, isAllPeriods } = periodSel;
  const perms = useTreasuryPermissions();

  const summaryQuery = useTreasurySummary(effectivePeriodId);
  const payable = summaryQuery.data?.period?.payable === true;
  const periodClosed = !!selectedPeriod?.isClosed;

  const batchFilters = useMemo<PayoutBatchListFilters>(
    () => ({ periodId: effectivePeriodId, status, currencyCode: currencyParam || undefined, page, limit }),
    [effectivePeriodId, status, currencyParam, page, limit],
  );
  const batchesQuery = usePayoutBatchList(batchFilters);
  const batches = useMemo(() => batchesQuery.data?.data ?? [], [batchesQuery.data]);
  const meta = batchesQuery.data?.meta;
  const total = meta?.total ?? batches.length;

  // Lotes del periodo (todos los estados) para el filtro del ledger.
  const batchesForLedger = usePayoutBatchList({ periodId: effectivePeriodId, limit: 100 }, tab === 'pagos');
  const batchOptions = useMemo(
    () => (batchesForLedger.data?.data ?? []).map((b) => ({ value: b.id, label: b.batchNumber })),
    [batchesForLedger.data],
  );

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateKey, setGenerateKey] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualKey, setManualKey] = useState(0);
  const [actionTarget, setActionTarget] = useState<BatchActionTarget | null>(null);

  const canGenerate = !isAllPeriods && periodClosed && payable;
  const generateHint = isAllPeriods
    ? 'Elige un periodo para generar un lote.'
    : !periodClosed
      ? 'Periodo abierto: las cifras son estimadas; se lotea tras el cierre.'
      : !payable && summaryQuery.data
        ? treasuryCodeLabel(summaryQuery.data.period.payableReason) || 'El periodo no es pagable.'
        : summaryQuery.isError
          ? treasuryErrorMessage(summaryQuery.error, 'No se pudo cargar el resumen del periodo')
          : undefined;

  return (
    <div className="p-6">
      <TreasuryHeader
        icon={BanknotesIcon}
        title="Dispersión y pagos"
        subtitle="Lotes bancarios (layout con hash, resultado del banco, conciliación) y ledger inmutable de pagos del periodo 26→25."
        note={!perms.canPay ? 'Solo lectura: generar lotes, pagar o conciliar requiere mlm:pay.' : generateHint}
        actions={
          <PermissionGuard permissions={TREASURY_PAY_PERMISSIONS} fallback={<></>}>
            <Button
              type="button"
              variant="outline"
              disabled={isAllPeriods || !selectedPeriod}
              onClick={() => {
                setManualKey((k) => k + 1);
                setManualOpen(true);
              }}
            >
              Pago manual (cheque/efectivo)
            </Button>
            <Button
              type="button"
              disabled={!canGenerate}
              title={generateHint}
              onClick={() => {
                setGenerateKey((k) => k + 1);
                setGenerateOpen(true);
              }}
            >
              <PlusIcon className="mr-2 h-4 w-4" aria-hidden /> Generar lote
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-6">
        <TreasuryTabs active="dispersion" periodId={effectivePeriodId} />
      </div>

      <PeriodSelector
        selection={periodSel}
        allowAll
        caption="Periodo · lotes y ledger"
        onChange={(id) => setParams({ period: id, page: null, ppage: null })}
      />

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v === 'pagos' ? 'pagos' : null })} className="mb-6">
        <TabsList aria-label="Lotes o pagos">
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'lotes' ? (
        <>
          <Card className="mb-6 border-border shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="batches-status">Estado</Label>
                  <SearchableSelect id="batches-status" options={STATUS_OPTIONS} value={status ?? ''} onChange={(v) => setParams({ status: v || null, page: null })} allLabel="Todos los estados" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="batches-currency">Moneda</Label>
                  <SearchableSelect id="batches-currency" options={CURRENCY_OPTIONS} value={currencyParam} onChange={(v) => setParams({ currency: v || null, page: null })} allLabel="Todas" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              {batchesQuery.isError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  <p className="font-medium text-destructive">{treasuryErrorMessage(batchesQuery.error, 'No se pudieron cargar los lotes')}</p>
                  <p className="mt-1 text-muted-foreground">Si el API aún no expone /mlm/payout-batches, esta pantalla queda vacía hasta el despliegue del paso 10.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void batchesQuery.refetch()}>
                    Reintentar
                  </Button>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {formatInt(total)} lote(s){batchesQuery.isFetching && !batchesQuery.isLoading ? ' · actualizando…' : ''}
                  </p>
                  <BatchesTable
                    batches={batches}
                    isLoading={batchesQuery.isLoading}
                    onAction={setActionTarget}
                    emptyMessage={
                      isAllPeriods ? 'Sin lotes de dispersión.' : `Sin lotes en ${selectedPeriod?.name ?? 'este periodo'}. Genera el primero cuando el periodo esté cerrado y pagable.`
                    }
                  />
                  {total > limit && (
                    <DataTablePagination
                      currentPage={meta?.page ?? page}
                      pageSize={limit}
                      totalItems={total}
                      onPageChange={(p) => setParams({ page: String(p) })}
                      onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      isLoading={batchesQuery.isFetching}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <p className="mt-4 text-xs text-muted-foreground">
            ¿Buscas el detalle de una comisión? Está en{' '}
            <Link href={effectivePeriodId ? `/admin/comisiones?period=${encodeURIComponent(effectivePeriodId)}` : '/admin/comisiones'} className="text-primary hover:underline">
              Comisiones
            </Link>
            .
          </p>
        </>
      ) : (
        <PaymentsLedger periodId={effectivePeriodId} get={get} getNumber={getNumber} setParams={setParams} batchOptions={batchOptions} />
      )}

      {generateOpen && (
        <GenerateBatchSheet
          key={generateKey}
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          period={selectedPeriod}
          onCreated={() => setParams({ tab: null, status: null, page: null })}
        />
      )}

      {manualOpen && (
        <ManualPaymentSheet key={manualKey} open={manualOpen} onOpenChange={setManualOpen} period={selectedPeriod} payable={payable} />
      )}

      <BatchActionDialogs target={actionTarget} onClose={() => setActionTarget(null)} />
    </div>
  );
}
