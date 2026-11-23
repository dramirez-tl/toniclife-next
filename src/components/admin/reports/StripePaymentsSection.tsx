'use client';

// StripePaymentsSection - Reportes › Ventas con el filtro "Stripe (tienda en línea)" (Sistemas,
// 23-nov-2026, a pedido de Contabilidad). Lista los cobros que la tienda en línea hizo por Stripe
// (tarjeta u OXXO) con el identificador con el que se buscan en Stripe, para conciliar contra su
// archivo. Son PEDIDOS, no ventas de caja: no entran al corte de la caja. Solo consulta.

import Link from 'next/link';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { ClipboardDocumentIcon, CreditCardIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { useStripePayments } from '@/hooks/useReports';
import {
  formatStripeCentro,
  formatStripeOrderDate,
  formatStripeUtc,
  isStripeOrderVoided,
  stripeAccountLabel,
  stripeMethodLabel,
  stripeOrderStatusLabel,
  stripeSearchHint,
  type StripePaymentRow,
} from '@/lib/stripe-payments';

interface StripePaymentsSectionProps {
  branchId?: string;
  fromDate?: string;
  toDate?: string;
  customerNumber?: string;
  search?: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast.success('Identificador copiado');
  } catch {
    toast.error('No se pudo copiar; selecciónalo y cópialo a mano');
  }
}

export function StripePaymentsSection({
  branchId,
  fromDate,
  toDate,
  customerNumber,
  search,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: StripePaymentsSectionProps) {
  const { data, isLoading, isFetching, isError } = useStripePayments({
    branchId,
    fromDate,
    toDate,
    customerNumber,
    search,
    page,
    limit: pageSize,
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const hint = stripeSearchHint(data?.search ?? 'none', search);

  const columns: DataTableColumn<StripePaymentRow>[] = useMemo(
    () => [
      {
        key: 'order',
        header: 'Pedido',
        render: (r) => (
          <div>
            <Link
              href={`/admin/pedidos/${r.orderId}`}
              className="font-semibold text-[#3E667D] hover:underline"
              title="Abrir el pedido"
            >
              {r.orderNumber || '—'}
            </Link>
            <p className="mt-0.5 text-xs text-gray-500">Pedido del {formatStripeOrderDate(r.orderDate) || '—'}</p>
          </div>
        ),
      },
      {
        key: 'paidAt',
        header: 'Cobrado',
        render: (r) => (
          <div>
            <p className="text-sm text-gray-900">
              {formatStripeCentro(r.paidAt) || '—'}
              <span className="text-xs text-gray-400"> · Centro</span>
            </p>
            <p className="mt-0.5 font-mono text-xs text-gray-500" title="Hora UTC: la que trae el archivo de Stripe">
              {formatStripeUtc(r.paidAt)} UTC
            </p>
          </div>
        ),
      },
      {
        key: 'branch',
        header: 'Sucursal',
        render: (r) => (
          <span className="text-sm text-gray-700">{[r.branchCode, r.branchName].filter(Boolean).join(' ') || '—'}</span>
        ),
      },
      {
        key: 'customer',
        header: 'Cliente',
        render: (r) => (
          <div>
            <p className="text-sm font-medium text-gray-900">{r.customerName || '—'}</p>
            {r.customerNumber && <p className="text-xs text-gray-500">#{r.customerNumber}</p>}
          </div>
        ),
      },
      {
        key: 'method',
        header: 'Pago',
        render: (r) => (
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
              <CreditCardIcon className="h-3.5 w-3.5" />
              {stripeMethodLabel(r.method)}
            </span>
            <p className="mt-1 text-[11px] text-gray-400">Cuenta {stripeAccountLabel(r.gatewayAccount)}</p>
          </div>
        ),
      },
      {
        key: 'stripeId',
        header: 'Id de Stripe',
        render: (r) => (
          <div className="max-w-[260px]">
            {r.paymentIntentId ? (
              <div className="flex items-center gap-1">
                <span className="truncate font-mono text-xs text-gray-900" title={r.paymentIntentId}>
                  {r.paymentIntentId}
                </span>
                <button
                  type="button"
                  onClick={() => copyId(r.paymentIntentId as string)}
                  title="Copiar el PaymentIntent (columna «PaymentIntent ID» del archivo de Stripe)"
                  className="flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-[#3E667D]/10 hover:text-[#3E667D]"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Sin PaymentIntent guardado</span>
            )}
            {r.checkoutSessionId && (
              <p className="truncate font-mono text-[11px] text-gray-400" title={`Sesión de Checkout: ${r.checkoutSessionId}`}>
                {r.checkoutSessionId}
              </p>
            )}
            {r.oxxoReference && <p className="text-[11px] text-gray-500">Ref. OXXO {r.oxxoReference}</p>}
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Total',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (r) => (
          <span className="font-semibold tabular-nums text-gray-900">
            {money(r.amount, r.currencyCode)}
            <span className="ml-1 text-[10px] font-medium text-gray-400">{r.currencyCode}</span>
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Pedido',
        render: (r) => (
          <div>
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                isStripeOrderVoided(r.orderStatus) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {stripeOrderStatusLabel(r.orderStatus)}
            </span>
            <p className="mt-1 text-[11px] text-gray-400">{r.invoiced ? 'Facturado' : 'Sin factura'}</p>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <Card className="mb-4">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Cobros de Stripe</p>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '…' : total.toLocaleString()}</p>
              <p className="text-xs text-gray-400">
                {fromDate || toDate ? 'cobrados en el rango de fechas' : 'sin fechas = todos'}
              </p>
            </div>
            {(data?.totals ?? []).map((t) => (
              <div key={t.currencyCode} className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Cobrado {t.currencyCode}</p>
                <p className="text-2xl font-bold text-[#3E667D]">{money(t.amount, t.currencyCode)}</p>
                <p className="text-xs text-gray-400">{t.count.toLocaleString()} cobros</p>
              </div>
            ))}
          </div>
          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-900">
            <strong>Cómo conciliar:</strong> son los cobros de la tienda en línea por Stripe (tarjeta u OXXO). No son ventas
            de caja y no entran al corte de la caja. El «Id de Stripe» es la columna <strong>PaymentIntent ID</strong> del
            archivo de Stripe; también puedes pegar en el buscador el <strong>id del cargo (ch_…)</strong>. Las fechas del
            filtro son el día del cobro en hora Centro; el archivo de Stripe viene en UTC (6 horas adelante), por eso cada
            renglón trae las dos horas. Stripe deposita el neto: su comisión no está en este reporte.
          </p>
          {hint && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{hint}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
            <span className="text-sm font-medium text-gray-700">Clic en el folio para abrir el pedido</span>
            <span className="text-xs text-gray-400">{total.toLocaleString()} cobros</span>
          </div>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            loadingRows={pageSize > 10 ? 10 : pageSize}
            getRowKey={(r) => r.paymentId}
            minWidthClassName="min-w-[1100px]"
            emptyState={
              <div className="py-12 text-center">
                <ShoppingBagIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {isError ? 'No se pudieron cargar los cobros de Stripe' : 'No se encontraron cobros de Stripe'}
                </h3>
                <p className="text-sm text-gray-500">
                  {isError
                    ? 'Vuelve a intentarlo; si sigue igual, avisa a Sistemas.'
                    : 'Revisa el id o el folio buscado, o ajusta la sucursal y las fechas (día del cobro, hora Centro).'}
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>

      <DataTablePagination
        currentPage={page}
        pageSize={pageSize}
        totalItems={total}
        isLoading={isLoading || isFetching}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </>
  );
}
