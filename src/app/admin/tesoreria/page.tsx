'use client';

// /admin/tesoreria — índice de Tesorería (contrato §5.1).
//
// "¿Se puede pagar este periodo?" (semáforo con bloqueadores enlazados),
// tarjetas POR MONEDA (Bruto · Retenciones fiscales · Convenios · A dispersar),
// embudo por etapa y últimos lotes. Periodo 26→25 en la URL (`?period=`), sin
// "todos". Guard de lectura de Tesorería aquí (la carpeta no tiene layout
// para no cambiar el gating de Retenciones/Validación).

import { Suspense } from 'react';
import Link from 'next/link';
import { BanknotesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuard } from '@/components/auth';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useTreasuryPayoutBatches, useTreasurySummary } from '@/hooks/useTreasury';
import {
  CommissionKpis,
  PeriodSelector,
  TreasuryHeader,
  TreasuryReadinessHeader,
  TreasuryTabs,
  TREASURY_READ_PERMISSIONS,
  TREASURY_TAB_META,
  formatDateOnly,
  formatInt,
  formatMoney,
  useTreasuryPeriod,
} from '@/components/admin/treasury';
import type { PayoutBatchStatus } from '@/types/treasury';

export default function TesoreriaPage() {
  return (
    <PermissionGuard permissions={TREASURY_READ_PERMISSIONS}>
      <Suspense fallback={<PageSkeleton />}>
        <TesoreriaContent />
      </Suspense>
    </PermissionGuard>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

const BATCH_STATUS_LABELS: Record<PayoutBatchStatus, string> = {
  generated: 'Generado',
  sent: 'Enviado al banco',
  reconciled: 'Conciliado',
  cancelled: 'Cancelado',
};

function TesoreriaContent() {
  const { get, setParams } = useQueryFilters({});
  const periodSel = useTreasuryPeriod(get('period'));
  const { effectivePeriodId } = periodSel;

  const summaryQuery = useTreasurySummary(effectivePeriodId);
  const batches = useTreasuryPayoutBatches({ periodId: effectivePeriodId, limit: 5 }, !!effectivePeriodId);

  const linkWithPeriod = (href: string) =>
    effectivePeriodId ? `${href}?period=${encodeURIComponent(effectivePeriodId)}` : href;

  return (
    <div className="p-6">
      <TreasuryHeader
        icon={BanknotesIcon}
        title="Tesorería"
        subtitle="Resumen del periodo 26→25: qué bloquea el pago, cuánto hay por moneda y en qué etapa va cada comisión."
        actions={
          <Button asChild>
            <Link href={linkWithPeriod('/admin/comisiones')}>
              Ir a Comisiones
              <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        }
      />

      <div className="mb-6">
        <TreasuryTabs active="resumen" periodId={effectivePeriodId} />
      </div>

      <PeriodSelector
        selection={periodSel}
        caption="Periodo · afecta todo el resumen"
        onChange={(id) => setParams({ period: id })}
      />

      <div className="mb-6">
        <TreasuryReadinessHeader
          summary={summaryQuery.data}
          periodId={effectivePeriodId}
          isLoading={summaryQuery.isLoading}
          isFetching={summaryQuery.isFetching}
          error={summaryQuery.error}
          onRefresh={() => void summaryQuery.refetch()}
          generatedAt={summaryQuery.dataUpdatedAt || null}
        />
      </div>

      <CommissionKpis
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
        error={summaryQuery.error}
        onRetry={() => void summaryQuery.refetch()}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Últimos lotes */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">Últimos lotes de dispersión</h2>
              {TREASURY_TAB_META.dispersion.disabled ? (
                <span className="text-xs text-muted-foreground">Pantalla de lotes: próximo paso</span>
              ) : (
                <Link
                  href={linkWithPeriod(TREASURY_TAB_META.dispersion.href)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ver todos
                </Link>
              )}
            </div>
            {batches.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : batches.isError ? (
              <p className="text-sm text-muted-foreground">
                Los lotes de dispersión aún no están disponibles en el API (paso Dispersión y pago).
              </p>
            ) : (batches.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin lotes en este periodo.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {(batches.data ?? []).map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-mono font-medium text-foreground">{b.batchNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.currencyCode} · {formatInt(b.itemsCount)} filas · fecha valor {formatDateOnly(b.paymentDate)}
                        {b.createdBy?.name ? ` · ${b.createdBy.name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{formatMoney(b.totalNetPayout, b.currencyCode)}</span>
                      <Badge
                        variant={
                          b.status === 'reconciled'
                            ? 'success'
                            : b.status === 'cancelled'
                              ? 'destructive'
                              : b.status === 'sent'
                                ? 'info'
                                : 'secondary'
                        }
                      >
                        {BATCH_STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Accesos */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-base font-semibold text-foreground">Pantallas de Tesorería</h2>
            <ul className="space-y-2 text-sm">
              <QuickLink
                href={linkWithPeriod('/admin/comisiones')}
                title="Comisiones"
                text="Listado por etapa, aprobar periodo o selección, cancelar con motivo, exportar."
              />
              <QuickLink
                href={
                  effectivePeriodId
                    ? `/admin/tesoreria/validacion-datos?earnersOfPeriodId=${encodeURIComponent(effectivePeriodId)}`
                    : '/admin/tesoreria/validacion-datos'
                }
                title="Validación de datos"
                text="Expedientes, cuentas verificadas y régimen fiscal de los que cobran este periodo."
              />
              <QuickLink
                href="/admin/tesoreria/retenciones"
                title="Retenciones"
                text="Convenios de préstamo / ad-hoc que se descuentan al pagar."
              />
              <QuickLink
                href="/admin/mlm/periodos"
                title="Periodos y tipo de cambio"
                text="FX del periodo (USD/COP/GTQ→MXN) congelado para pagar en moneda local."
              />
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
      >
        <span>
          <span className="block font-medium text-foreground">{title}</span>
          <span className="block text-xs text-muted-foreground">{text}</span>
        </span>
        <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
