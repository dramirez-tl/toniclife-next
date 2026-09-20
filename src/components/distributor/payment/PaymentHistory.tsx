'use client';

// PaymentHistory.tsx — historial de pagos de comisiones, paginado en servidor
// (page/limit), con moneda real (Intl por currencyCode e idioma de la cuenta),
// lote/referencia/clave de rastreo y "Recibo" cuando `receiptAvailable`
// (PDF generado en el cliente con generate-commission-statement-pdf).

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowDownTrayIcon, BanknotesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/currency';
import { localeLanguage } from '@/i18n/config';
import { generateCommissionStatementPdf } from '@/lib/generate-commission-statement-pdf';
import {
  useDistributorCommissionPayments,
  useDistributorCommissionReceipt,
} from '@/hooks/useDistributorPayment';
import type { CommissionPayment, PaymentOverallStatus } from '@/types/distributor-payment';
import { usePaymentErrors } from './usePaymentErrors';
import { formatDate } from './paymentUtils';

const PAGE_SIZE = 10;

const STATUS_VARIANT: Record<CommissionPayment['status'], 'success' | 'warning' | 'destructive' | 'secondary'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'destructive',
  reversed: 'secondary',
};

interface PaymentHistoryProps {
  overallStatus: PaymentOverallStatus | undefined;
}

export function PaymentHistory({ overallStatus }: PaymentHistoryProps) {
  const t = useTranslations('distributor.payments');
  const lang = localeLanguage(useLocale());
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useDistributorCommissionPayments({
    status: status || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const receipt = useDistributorCommissionReceipt();
  const { resolve } = usePaymentErrors();
  const [receiptFor, setReceiptFor] = useState<string | null>(null);

  const payments = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? Math.ceil(total / PAGE_SIZE) ?? 1);

  const downloadReceipt = async (p: CommissionPayment) => {
    const id = p.commissionId || p.id;
    setReceiptFor(p.id);
    try {
      const model = await receipt.mutateAsync(id);
      generateCommissionStatementPdf({
        ...model,
        generatedAt: model.generatedAt ? new Date(model.generatedAt) : new Date(),
      });
    } catch (err) {
      toast.error(resolve(err, 'history.receiptError').message);
    } finally {
      setReceiptFor(null);
    }
  };

  const columns: DataTableColumn<CommissionPayment>[] = useMemo(
    () => [
      {
        key: 'period',
        header: t('history.columns.period'),
        cellClassName: 'font-medium text-foreground',
        render: (p) => p.periodName || p.periodCode,
      },
      {
        key: 'amount',
        header: t('history.columns.amount'),
        headerClassName: 'text-right',
        cellClassName: 'text-right font-semibold text-foreground whitespace-nowrap',
        render: (p) => formatCurrency(p.amount, p.currencyCode, lang),
      },
      {
        key: 'withheld',
        header: t('history.columns.withheld'),
        headerClassName: 'text-right',
        cellClassName: 'text-right text-muted-foreground whitespace-nowrap',
        render: (p) =>
          p.withheldAmount && p.withheldAmount > 0
            ? formatCurrency(p.withheldAmount, p.currencyCode, lang)
            : '—',
      },
      {
        key: 'date',
        header: t('history.columns.date'),
        cellClassName: 'text-muted-foreground whitespace-nowrap',
        render: (p) => formatDate(p.paymentDate, lang),
      },
      {
        key: 'method',
        header: t('history.columns.method'),
        cellClassName: 'text-muted-foreground',
        render: (p) => {
          const key = `history.methods.${p.paymentMethod ?? ''}`;
          return p.paymentMethod ? (t.has(key) ? t(key) : p.paymentMethod) : '—';
        },
      },
      {
        key: 'reference',
        header: t('history.columns.reference'),
        cellClassName: 'text-muted-foreground',
        render: (p) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs">{p.reference || '—'}</span>
            {p.batchNumber && (
              <span className="text-[11px] text-muted-foreground">
                {t('history.columns.batch')}: {p.batchNumber}
              </span>
            )}
            {p.trackingKey && (
              <span className="text-[11px] text-muted-foreground">
                {t('history.columns.tracking')}: {p.trackingKey}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: t('history.columns.status'),
        render: (p) => (
          <Badge variant={STATUS_VARIANT[p.status] ?? 'secondary'}>{t(`status.${p.status}`)}</Badge>
        ),
      },
      {
        key: 'receipt',
        header: t('history.columns.receipt'),
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (p) =>
          p.receiptAvailable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadReceipt(p)}
              disabled={receipt.isPending && receiptFor === p.id}
              aria-label={t('history.receiptAria', { period: p.periodName || p.periodCode })}
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              {receipt.isPending && receiptFor === p.id ? t('history.receiptGenerating') : t('history.receipt')}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, lang, receipt.isPending, receiptFor],
  );

  return (
    <Card data-tour="d-payments-history" id="section-history" className="scroll-mt-24">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BanknotesIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('history.title')}
          </h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="pay-history-filter" className="text-xs text-muted-foreground">
              {t('history.filterLabel')}
            </Label>
            <select
              id="pay-history-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="">{t('history.filterAll')}</option>
              <option value="completed">{t('history.filterPaid')}</option>
              <option value="pending">{t('history.filterPending')}</option>
              <option value="failed">{t('history.filterFailed')}</option>
            </select>
          </div>
        </div>

        {overallStatus && overallStatus !== 'validated' && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('history.incompleteWarning')}
          </div>
        )}

        <DataTable<CommissionPayment>
          columns={columns}
          data={payments}
          getRowKey={(p) => String(p.id)}
          isLoading={isLoading}
          emptyMessage={t('history.empty')}
          minWidthClassName="min-w-[720px]"
        />

        {total > PAGE_SIZE && (
          <nav
            className="mt-4 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between"
            aria-label={t('history.paginationAria')}
          >
            <p className="text-xs text-muted-foreground">
              {t('history.pageOf', { page, total: totalPages, count: total })}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('history.prev')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t('history.next')}
              </Button>
            </div>
          </nav>
        )}
      </CardContent>
    </Card>
  );
}
