'use client';

// MyInvoicesView - "Mis facturas" del portal del distribuidor (/distribuidor/facturas,
// 17-nov-2026): el distribuidor factura sus compras de la tienda en línea del mes en curso
// y guarda sus datos fiscales para después (GET/PUT/POST /distributor/invoicing).
//
// El servidor decide qué compra se puede facturar y por qué no las demás; aquí se muestra.
// Antes de timbrar se confirma con los datos a la vista: una factura timbrada no se corrige
// desde la cuenta. Con la función apagada (Sistema › Piloto) la pantalla solo consulta.

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  InformationCircleIcon,
  ShoppingBagIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoiceMyOrder, useInvoicingCatalogs, useMyInvoicing } from '@/hooks/useCustomerInvoicing';
import { localeLanguage } from '@/i18n/config';
import { billingErrorBody, billingErrorMessage, isReceiverBillingError } from '@/lib/billing-error';
import { catalogLabel, invoicingCounts, monthName } from '@/lib/invoicing/my-invoicing';
import type { MyInvoiceOrder, MyInvoicingOverview } from '@/types/customer-invoicing';
import { MyFiscalDataCard } from './MyFiscalDataCard';
import { formatInvoiceMoney, MyInvoiceOrderCard } from './MyInvoiceOrderCard';

type InvoicesT = ReturnType<typeof useTranslations<'distributor.invoices'>>;

export function MyInvoicesView() {
  const t = useTranslations('distributor.invoices');
  const dateLocale = localeLanguage(useLocale()) === 'en' ? 'en-US' : 'es-MX';
  const { data, isLoading, isError, refetch } = useMyInvoicing();
  const month = data ? monthName(data.month, dateLocale) : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <DocumentCheckIcon aria-hidden="true" className="h-8 w-8 lg:h-10 lg:w-10" />
                <h1 className="text-2xl font-bold lg:text-4xl">{t('title')}</h1>
              </div>
              {data ? (
                <p className="max-w-2xl text-base text-white/80 lg:text-lg">{t('subtitle', { month })}</p>
              ) : (
                <Skeleton className="h-6 w-72 bg-white/20" />
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary" size="sm">
                  {t('backToPanel')}
                </Button>
              </Link>
              <Link href="/distribuidor/pedidos">
                <Button variant="secondary" size="sm">
                  <ClipboardDocumentListIcon aria-hidden="true" className="h-4 w-4" />
                  {t('myOrders')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {isLoading ? (
          <LoadingState />
        ) : isError || !data ? (
          <ErrorState onRetry={() => void refetch()} t={t} />
        ) : (
          <Loaded overview={data} month={month} dateLocale={dateLocale} t={t} />
        )}
      </div>
    </div>
  );
}

// ===== Contenido =====

function Loaded({
  overview,
  month,
  dateLocale,
  t,
}: {
  overview: MyInvoicingOverview;
  month: string;
  dateLocale: string;
  t: InvoicesT;
}) {
  // null = lo que toque: el formulario se abre solo mientras falten datos fiscales.
  const [editingChoice, setEditingChoice] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState<MyInvoiceOrder | null>(null);
  const invoice = useInvoiceMyOrder();
  const editing = editingChoice ?? !overview.fiscalReady;
  const counts = invoicingCounts(overview.orders);
  const stampingId = invoice.isPending ? invoice.variables : null;

  const goToFiscal = () => {
    setEditingChoice(true);
    document.getElementById('mis-datos-fiscales')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const stamp = (order: MyInvoiceOrder) => {
    setConfirming(null);
    invoice.mutate(order.orderId, {
      onSuccess: () => toast.success(t('done')),
      onError: (err) => {
        const fiscalProblem = isReceiverBillingError(err) || billingErrorBody(err)?.field === 'fiscal';
        const message = billingErrorMessage(err, t('invoiceError'));
        toast.error(fiscalProblem ? `${message} ${t('fixFiscal')}` : message, { duration: 12_000 });
        if (fiscalProblem) goToFiscal();
      },
    });
  };

  return (
    <>
      {!overview.enabled && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <InformationCircleIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{t('disabled.title')}</p>
            <p className="text-sm">{t('disabled.body')}</p>
          </div>
        </div>
      )}

      <MyFiscalDataCard overview={overview} editing={editing} onEditingChange={setEditingChoice} />

      <section aria-labelledby="mis-compras-del-mes" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="mis-compras-del-mes" className="text-lg font-semibold text-gray-900">
              {t('orders.title', { month })}
            </h2>
            <p className="text-sm text-gray-600">{t('orders.hint')}</p>
          </div>
          {overview.orders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {overview.enabled && counts.invoiceable > 0 && <Badge variant="info">{t('orders.countInvoiceable', { count: counts.invoiceable })}</Badge>}
              {counts.invoiced > 0 && <Badge variant="success">{t('orders.countInvoiced', { count: counts.invoiced })}</Badge>}
            </div>
          )}
        </div>

        {overview.orders.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          <div className="space-y-3">
            {overview.orders.map((order) => (
              <MyInvoiceOrderCard
                key={order.orderId}
                order={order}
                enabled={overview.enabled}
                fiscalReady={overview.fiscalReady}
                editingFiscal={overview.enabled && editing}
                stamping={stampingId === order.orderId}
                locked={invoice.isPending}
                dateLocale={dateLocale}
                onInvoice={setConfirming}
                onNeedsFiscal={goToFiscal}
              />
            ))}
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 text-sm text-gray-600">
        <InformationCircleIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t('note')}</span>
      </p>

      <ConfirmInvoiceDialog
        order={confirming}
        overview={overview}
        onCancel={() => setConfirming(null)}
        onConfirm={stamp}
        t={t}
      />
    </>
  );
}

// ===== Confirmación antes de timbrar =====

function ConfirmInvoiceDialog({
  order,
  overview,
  onCancel,
  onConfirm,
  t,
}: {
  order: MyInvoiceOrder | null;
  overview: MyInvoicingOverview;
  onCancel: () => void;
  onConfirm: (order: MyInvoiceOrder) => void;
  t: InvoicesT;
}) {
  const { fiscal } = overview;
  const catalogs = useInvoicingCatalogs(fiscal.taxRegime, order !== null);
  const rows = [
    { label: t('fiscal.rfc'), value: fiscal.rfc },
    { label: t('fiscal.legalName'), value: fiscal.legalName },
    { label: t('fiscal.regime'), value: catalogLabel(catalogs.data?.regimes, fiscal.taxRegime) },
    { label: t('fiscal.cfdiUse'), value: catalogLabel(catalogs.data?.cfdiUses, fiscal.cfdiUse) },
    { label: t('fiscal.postalCode'), value: fiscal.postalCode },
  ];
  return (
    <AlertDialog open={order !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{order ? t('confirm.title', { number: order.orderNumber }) : ''}</AlertDialogTitle>
          <AlertDialogDescription>
            {order ? t('confirm.body', { total: formatInvoiceMoney(order.total) }) : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3">
              <dt className="text-gray-500">{row.label}</dt>
              <dd className="break-words font-medium text-gray-900">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-amber-800">{t('confirm.warning')}</p>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">{t('confirm.cancel')}</AlertDialogCancel>
          <AlertDialogAction className="h-11" onClick={() => order && onConfirm(order)}>
            {t('confirm.action')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ===== Estados =====

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-64" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ t }: { t: InvoicesT }) {
  return (
    <Card className="border border-dashed border-gray-300 bg-white">
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#3E667D]/10">
          <DocumentCheckIcon aria-hidden="true" className="h-7 w-7 text-[#3E667D]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{t('orders.empty.title')}</h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500">{t('orders.empty.body')}</p>
        <Link href="/productos" className="mt-6">
          <Button>
            <ShoppingBagIcon aria-hidden="true" className="h-4 w-4" />
            {t('orders.empty.cta')}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry, t }: { onRetry: () => void; t: InvoicesT }) {
  return (
    <Card className="border border-red-200 bg-red-50">
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <XCircleIcon aria-hidden="true" className="mb-3 h-10 w-10 text-red-400" />
        <h3 className="text-lg font-semibold text-gray-900">{t('orders.error.title')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('orders.error.body')}</p>
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          <ArrowPathIcon aria-hidden="true" className="h-4 w-4" />
          {t('orders.error.retry')}
        </Button>
      </CardContent>
    </Card>
  );
}
