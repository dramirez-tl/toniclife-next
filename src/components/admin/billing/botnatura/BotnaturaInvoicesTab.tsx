'use client';

// BotnaturaInvoicesTab - Facturas emitidas a Botnatura desde este módulo (GET billing/botnatura/
// invoices). Solo lectura: la cancelación, el reenvío y el complemento de pago se hacen en la
// ficha de la factura, igual que con cualquier otro CFDI.

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownTrayIcon, DocumentPlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/admin/billing/invoices/InvoiceBadges';
import { useBotnaturaInvoices } from '@/hooks/useBotnatura';
import { billingErrorMessage } from '@/lib/billing-error';
import { priceModeLabel } from '@/lib/billing/botnatura';
import { moneyMx as money } from '@/lib/billing/manual-free';
import { downloadInvoiceFile } from '@/lib/invoice-download';
import type { InvoiceStatus } from '@/types/billing';
import type { BotnaturaInvoiceRow } from '@/types/botnatura';

const TH = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2.5 text-sm align-middle whitespace-nowrap';
const dateTime = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function BotnaturaInvoicesTab({ onNew }: { onNew: () => void }) {
  const [page, setPage] = useState(1);
  const invoices = useBotnaturaInvoices(page);
  const rows = invoices.data?.data ?? [];
  const total = invoices.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (invoices.data?.limit ?? 25)));

  if (invoices.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        {billingErrorMessage(invoices.error, 'No se pudieron leer las facturas de Botnatura')}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <p className="text-sm text-gray-600">
            {invoices.isLoading ? 'Cargando…' : `${total} factura${total === 1 ? '' : 's'} a Botnatura`}
          </p>
          <Button type="button" size="sm" className="gap-2" onClick={onNew}>
            <DocumentPlusIcon className="h-4 w-4" />
            Nueva factura
          </Button>
        </div>
        {!invoices.isLoading && rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">Todavía no se ha facturado nada a Botnatura.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className={TH}>Folio</th>
                  <th className={TH}>Fecha</th>
                  <th className={TH}>Sucursal</th>
                  <th className={TH}>Precio</th>
                  <th className={TH}>Pago</th>
                  <th className={`${TH} text-right`}>Conceptos</th>
                  <th className={`${TH} text-right`}>Subtotal</th>
                  <th className={`${TH} text-right`}>IVA</th>
                  <th className={`${TH} text-right`}>Total</th>
                  <th className={TH}>Estado</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((inv) => (
                  <InvoiceRow key={inv.id} inv={inv} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 p-3 text-sm text-gray-600">
            <span>
              Página {page} de {pages}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvoiceRow({ inv }: { inv: BotnaturaInvoiceRow }) {
  const stamped = !!inv.satUuid;
  return (
    <tr className="hover:bg-gray-50">
      <td className={`${TD} font-medium text-gray-900`}>
        <Link href={`/admin/facturacion/${inv.id}`} className="text-[#3E667D] hover:underline">
          {inv.folioDisplay ?? 'Sin folio'}
        </Link>
      </td>
      <td className={`${TD} text-gray-600`}>{dateTime.format(new Date(inv.stampedAt ?? inv.createdAt))}</td>
      <td className={`${TD} text-gray-600`}>{inv.branchCode ? `${inv.branchCode} - ${inv.branchName ?? ''}` : '—'}</td>
      <td className={`${TD} text-gray-600`}>{priceModeLabel(inv.priceMode)}</td>
      <td className={`${TD} text-gray-600`}>
        {inv.paymentMethod ?? '—'}
        {inv.paymentForm ? ` · ${inv.paymentForm}` : ''}
      </td>
      <td className={`${TD} text-right tabular-nums text-gray-600`}>{inv.concepts}</td>
      <td className={`${TD} text-right tabular-nums text-gray-600`}>{money(inv.subtotal)}</td>
      <td className={`${TD} text-right tabular-nums text-gray-600`}>{money(inv.taxAmount)}</td>
      <td className={`${TD} text-right font-semibold tabular-nums text-gray-900`}>{money(inv.total)}</td>
      <td className={TD}>
        <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
        {inv.error && inv.status === 'error' && (
          <p className="mt-0.5 max-w-[260px] truncate text-xs text-red-600" title={inv.error}>
            {inv.error}
          </p>
        )}
      </td>
      <td className={`${TD} text-right`}>
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2" title="Ver la factura">
            <Link href={`/admin/facturacion/${inv.id}`}>
              <EyeIcon className="h-4 w-4" />
            </Link>
          </Button>
          {stamped && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                onClick={() => void downloadInvoiceFile('pdf', inv.id, inv.folioDisplay)}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                onClick={() => void downloadInvoiceFile('xml', inv.id, inv.folioDisplay)}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                XML
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
