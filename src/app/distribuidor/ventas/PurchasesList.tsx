'use client';

// PurchasesList.tsx - "Detalle de mis compras" de /distribuidor/ventas: cada
// ticket del POS y pedido en línea del periodo con fecha, sucursal, forma de
// pago, puntos, estado y productos (GET /distributor/purchases). El pie cuadra
// con "Ventas Personales": el backend usa la misma selección de filas que el
// dashboard. Las compras canceladas se listan atenuadas y no suman.

import { Fragment, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { localeLanguage } from '@/i18n/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePurchases } from '@/hooks/useDistributor';
import type { DistributorPurchase, DistributorPurchaseStatus } from '@/types/distributor';
import {
  ArrowPathIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon,
  GlobeAltIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';

/** Códigos con texto en distributor.sales.purchases.paymentMethods; otro código se muestra tal cual. */
const PAYMENT_METHOD_KEYS = new Set([
  'cash', 'card', 'credit', 'transfer', 'deposit', 'mercado_pago', 'usd_cash', 'cash_usd',
  'promotion', 'cashback', 'no_cost', 'online', 'mixed', 'credit_card', 'debit_card',
  'bank_transfer', 'spei', 'oxxo', 'paypal', 'square', 'santander', 'points', 'store_credit',
  'other', 'unknown',
]);

const STATUS_VARIANT: Record<DistributorPurchaseStatus, 'success' | 'warning' | 'outline'> = {
  paid: 'success',
  pending: 'warning',
  cancelled: 'outline',
};

interface PurchasesListProps {
  /** undefined = periodo actual (misma normalización que el dashboard). */
  periodId?: string;
  /** Moneda del distribuidor, para el total del pie. */
  currencyCode: string;
}

export function PurchasesList({ periodId, currencyCode }: PurchasesListProps) {
  const t = useTranslations('distributor.sales.purchases');
  const numLocale = localeLanguage(useLocale()) === 'en' ? 'en-US' : 'es-MX';
  const { data, isLoading, isError, isFetching, refetch } = usePurchases(periodId);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const money = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(numLocale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };
  const pts = (points: number) => points.toLocaleString(numLocale, { maximumFractionDigits: 0 });

  // Hora local de la sucursal; las ventas del sistema anterior solo traen fecha.
  const when = (p: DistributorPurchase) => {
    const base: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const opts: Intl.DateTimeFormatOptions = p.legacy
      ? base
      : { ...base, hour: '2-digit', minute: '2-digit' };
    const d = new Date(p.date);
    try {
      return new Intl.DateTimeFormat(numLocale, { ...opts, timeZone: p.timezone }).format(d);
    } catch {
      return new Intl.DateTimeFormat(numLocale, opts).format(d);
    }
  };

  const paymentLabel = (method: string) =>
    PAYMENT_METHOD_KEYS.has(method) ? t(`paymentMethods.${method}` as never) : method;
  const paymentsText = (p: DistributorPurchase) =>
    p.payments.length > 1
      ? p.payments
          .map((x) => `${paymentLabel(x.method)} ${money(x.amount, p.currencyCode)}`)
          .join(' + ')
      : paymentLabel(p.payments[0]?.method ?? 'unknown');

  const branch = (p: DistributorPurchase) =>
    p.source === 'order' ? (
      <span className="inline-flex items-center gap-1.5">
        <GlobeAltIcon className="h-4 w-4 shrink-0 text-gray-400" />
        <span>
          {t('online')}
          {p.branchName ? ` · ${p.branchName}` : ''}
        </span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5">
        <BuildingStorefrontIcon className="h-4 w-4 shrink-0 text-gray-400" />
        <span>{p.branchName ?? p.branchCode ?? '—'}</span>
      </span>
    );

  const items = (p: DistributorPurchase) =>
    p.items.length === 0 ? (
      <p className="text-xs text-gray-500">{t('noProducts')}</p>
    ) : (
      <ul className="divide-y divide-gray-100">
        {p.items.map((it, idx) => (
          <li key={`${p.id}-${idx}`} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">
                {it.name || it.code || '—'}
                {it.gift && (
                  <Badge variant="info" className="ml-2 align-middle">
                    {t('gift')}
                  </Badge>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {t('unitPrice', { count: it.quantity, price: money(it.unitPrice, p.currencyCode) })}
                {it.code ? ` · ${it.code}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-medium text-gray-900">{money(it.total, p.currencyCode)}</p>
              <p className="text-xs text-[#3E667D]">
                {pts(it.points)} {t('pts')}
              </p>
            </div>
          </li>
        ))}
      </ul>
    );

  const purchases = data?.purchases ?? [];
  const summary = data?.summary;
  const hasCancelled = purchases.some((p) => p.status === 'cancelled');

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <ReceiptPercentIcon className="h-5 w-5 text-[#3E667D]" />
              {t('title')}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{t('subtitle')}</p>
          </div>
          {isFetching && !isLoading && (
            <ArrowPathIcon className="h-4 w-4 shrink-0 animate-spin text-gray-400" aria-hidden />
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-gray-600">{t('error')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <ArrowPathIcon className="h-4 w-4" />
              {t('retry')}
            </Button>
          </div>
        ) : purchases.length === 0 ? (
          <p className="py-8 text-center text-gray-500">{t('empty')}</p>
        ) : (
          <>
            {/* Escritorio: tabla con fila expandible de productos */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-3 font-medium">{t('columns.date')}</th>
                    <th className="py-2 pr-3 font-medium">{t('columns.folio')}</th>
                    <th className="py-2 pr-3 font-medium">{t('columns.branch')}</th>
                    <th className="py-2 pr-3 font-medium">{t('columns.payment')}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t('columns.points')}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t('columns.total')}</th>
                    <th className="py-2 pr-3 font-medium">{t('columns.status')}</th>
                    <th className="w-8 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => {
                    const open = openIds.has(p.id);
                    const muted = p.status === 'cancelled';
                    return (
                      <Fragment key={p.id}>
                        <tr
                          className={`cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${muted ? 'opacity-60' : ''}`}
                          onClick={() => toggle(p.id)}
                          aria-expanded={open}
                        >
                          <td className="whitespace-nowrap py-3 pr-3 text-gray-700">{when(p)}</td>
                          <td className="py-3 pr-3 font-mono text-xs text-gray-900">{p.folio}</td>
                          <td className="py-3 pr-3 text-gray-700">{branch(p)}</td>
                          <td className="py-3 pr-3 text-gray-700">{paymentsText(p)}</td>
                          <td className="whitespace-nowrap py-3 pr-3 text-right font-medium text-[#3E667D]">
                            {pts(p.points)} <span className="text-[10px] text-gray-400">{t('pts')}</span>
                          </td>
                          <td
                            className={`whitespace-nowrap py-3 pr-3 text-right font-semibold ${
                              muted ? 'text-gray-400 line-through' : 'text-gray-900'
                            }`}
                          >
                            {money(p.total, p.currencyCode)}
                          </td>
                          <td className="py-3 pr-3">
                            <Badge variant={STATUS_VARIANT[p.status]}>{t(`status.${p.status}`)}</Badge>
                          </td>
                          <td className="py-3 text-right">
                            <ChevronDownIcon
                              className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                            />
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-gray-50/70">
                            <td colSpan={8} className="px-4 py-3">
                              {items(p)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Móvil: tarjetas */}
            <div className="space-y-3 md:hidden">
              {purchases.map((p) => {
                const open = openIds.has(p.id);
                const muted = p.status === 'cancelled';
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border border-gray-200 p-4 ${muted ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-gray-500">{when(p)}</p>
                        <p className="font-mono text-xs text-gray-900">{p.folio}</p>
                      </div>
                      <Badge variant={STATUS_VARIANT[p.status]}>{t(`status.${p.status}`)}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">{branch(p)}</div>
                    <div className="mt-1 text-sm text-gray-700">{paymentsText(p)}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-[#3E667D]">
                        {pts(p.points)} {t('pts')}
                      </span>
                      <span
                        className={`font-semibold ${muted ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                      >
                        {money(p.total, p.currencyCode)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="mt-2 text-xs font-medium text-[#3E667D]"
                    >
                      {open ? t('hideProducts') : t('showProducts', { count: p.items.length })}
                    </button>
                    {open && <div className="mt-2 border-t pt-2">{items(p)}</div>}
                  </div>
                );
              })}
            </div>

            {/* Pie: lo que suma = Ventas Personales */}
            {summary && (
              <div className="mt-5 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  {t('summaryCount', { count: summary.count })}
                  {hasCancelled && (
                    <span className="block text-xs text-gray-400">{t('cancelledNote')}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <div>
                    <span className="text-gray-500">{t('summaryPoints')}: </span>
                    <span className="font-semibold text-[#3E667D]">
                      {pts(summary.points)} {t('pts')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('summaryTotal')}: </span>
                    <span className="font-bold text-gray-900">{money(summary.total, currencyCode)}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
