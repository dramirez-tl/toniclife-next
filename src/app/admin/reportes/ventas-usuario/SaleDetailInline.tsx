'use client';

// SaleDetailInline — detalle de SOLO LECTURA de una venta POS, desplegado en
// línea (acordeón) debajo del renglón en "Ventas por Usuario": productos con
// precio y puntos, pagos, totales y saldo de puntos del periodo. Sin acciones:
// cancelar, editar pago y reimprimir viven en Reportes › Ventas (pos:manage).

import { useSale } from '@/hooks/usePos';
import { paymentMethodLabel } from '@/lib/delivery-print';
import { DEFAULT_TIMEZONE, formatDateTimeLocal } from '@/lib/timezone-utils';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente de cobro', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Cobrada', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  refunded: { label: 'Reembolsada', className: 'bg-gray-200 text-gray-700' },
  partial_refund: { label: 'Reembolso parcial', className: 'bg-gray-200 text-gray-700' },
};

function money(value: number, currency = 'MXN'): string {
  try {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

const num = (v: number) => v.toLocaleString('es-MX', { maximumFractionDigits: 2 });

export function SaleDetailInline({ saleId, timeZone = DEFAULT_TIMEZONE }: { saleId: string; timeZone?: string }) {
  const { data: sale, isLoading, isError } = useSale(saleId, !!saleId);

  if (isLoading) return <p className="py-4 text-center text-sm text-gray-500">Cargando venta…</p>;
  if (isError || !sale) {
    return (
      <p className="py-4 text-center text-sm text-red-600">
        No se pudo cargar la venta (si eres de Call Center, verifica que tu cuenta pueda ver ventas del POS).
      </p>
    );
  }

  const currency = sale.currencyCode || 'MXN';
  const salePoints = sale.items.reduce((s, it) => s + it.points * it.quantity, 0);
  const units = sale.items.reduce((s, it) => s + it.quantity, 0);
  const status = STATUS_LABELS[sale.status] ?? { label: sale.status, className: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-3 rounded-lg border border-[#3E667D]/20 bg-white p-4 text-sm shadow-inner">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        <span className="font-mono text-sm font-semibold text-gray-900">{sale.saleNumber}</span>
        <span>{formatDateTimeLocal(sale.createdAt, timeZone)}</span>
        <span>{sale.branchName}{sale.cashRegisterName ? ` · ${sale.cashRegisterName}` : ''}</span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${status.className}`}>{status.label}</span>
        {sale.cancelledAt ? (
          <span className="text-red-700">
            Cancelada {formatDateTimeLocal(sale.cancelledAt, timeZone)}
            {sale.cancelledByName ? ` · ${sale.cancelledByName}` : ''}
            {sale.cancellationReason ? ` · ${sale.cancellationReason}` : ''}
          </span>
        ) : null}
        {sale.invoiceUuid ? <span>Facturada · {sale.invoiceUuid}</span> : sale.requiresInvoice ? <span>Requiere factura</span> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-gray-500">Distribuidor</p>
          <p className="font-semibold">
            {sale.customerNumber ? <span className="font-mono">{sale.customerNumber} </span> : null}
            {sale.customerName ?? 'Público general'}
          </p>
          {sale.customerRfc ? <p className="text-xs text-gray-500">RFC {sale.customerRfc}</p> : null}
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Vendedor</p>
          <p>
            {sale.sellerName}{' '}
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
              {sale.capturedVia === 'usuario'
                ? 'Call center / corporativo'
                : sale.posLicenseLabel
                  ? `Terminal ${sale.posLicenseLabel}`
                  : 'Terminal de sucursal'}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Pagos</p>
          {sale.payments.length === 0 ? (
            <p className="text-gray-500">{paymentMethodLabel(sale.paymentMethod)} · sin pagos registrados</p>
          ) : (
            <ul className="space-y-0.5">
              {sale.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span>
                    {paymentMethodLabel(p.paymentMethod)}
                    {p.cardLast4 ? <span className="text-xs text-gray-500"> · **** {p.cardLast4}</span> : null}
                    {p.referenceNumber ? <span className="text-xs text-gray-500"> · ref. {p.referenceNumber}</span> : null}
                    {p.changeGiven ? <span className="text-xs text-gray-500"> · cambio {money(p.changeGiven, currency)}</span> : null}
                  </span>
                  <span className="font-medium whitespace-nowrap">{money(p.amount, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th className="py-1 pr-2">Clave</th>
            <th className="py-1 pr-2">Producto</th>
            <th className="py-1 text-right">Cant.</th>
            <th className="py-1 pl-2 text-right">Precio</th>
            <th className="py-1 pl-2 text-right">Importe</th>
            <th className="py-1 pl-2 text-right">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it) => (
            <tr key={it.id} className="border-b border-gray-100">
              <td className="py-1 pr-2 font-mono text-gray-600">{it.productSku}</td>
              <td className="py-1 pr-2">
                {it.productName}
                {it.discountAmount > 0 ? (
                  <span className="ml-1 text-xs text-gray-500">(desc. {money(it.discountAmount, currency)})</span>
                ) : null}
              </td>
              <td className="py-1 text-right font-semibold">{it.quantity}</td>
              <td className="py-1 pl-2 text-right whitespace-nowrap text-gray-700">{money(it.unitPrice, currency)}</td>
              <td className="py-1 pl-2 text-right whitespace-nowrap font-medium">{money(it.total, currency)}</td>
              <td className="py-1 pl-2 text-right whitespace-nowrap text-gray-700">{num(it.points * it.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 text-xs text-gray-600">
            <td colSpan={2} className="py-1 text-right">
              {sale.items.length} renglón(es) · {units} pza(s)
            </td>
            <td colSpan={2} className="py-1 pl-2 text-right">Subtotal</td>
            <td className="py-1 pl-2 text-right whitespace-nowrap">{money(sale.subtotal, currency)}</td>
            <td className="py-1 pl-2 text-right font-semibold text-gray-900">{num(salePoints)}</td>
          </tr>
          {sale.discountAmount > 0 ? (
            <tr className="text-xs text-gray-600">
              <td colSpan={4} className="py-0.5 text-right">
                Descuento{sale.discountReason ? ` (${sale.discountReason})` : ''}
              </td>
              <td className="py-0.5 pl-2 text-right whitespace-nowrap">−{money(sale.discountAmount, currency)}</td>
              <td />
            </tr>
          ) : null}
          <tr className="text-xs text-gray-600">
            <td colSpan={4} className="py-0.5 text-right">Impuestos</td>
            <td className="py-0.5 pl-2 text-right whitespace-nowrap">{money(sale.taxAmount, currency)}</td>
            <td />
          </tr>
          <tr>
            <td colSpan={4} className="py-1 text-right text-xs uppercase text-gray-500">Total</td>
            <td className="py-1 pl-2 text-right text-base font-bold whitespace-nowrap">{money(sale.total, currency)}</td>
            <td className="py-1 pl-2 text-right text-xs text-gray-500">
              {typeof sale.pointsBalanceAfter === 'number'
                ? `saldo ${num(sale.pointsBalanceAfter)}${typeof sale.pointsBalanceBefore === 'number' ? ` (antes ${num(sale.pointsBalanceBefore)})` : ''}`
                : ''}
            </td>
          </tr>
        </tfoot>
      </table>
      {sale.notes ? <p className="text-xs text-gray-600">Notas: {sale.notes}</p> : null}
    </div>
  );
}
