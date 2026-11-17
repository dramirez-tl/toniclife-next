'use client';

// MyInvoiceOrderCard - Una compra de la tienda en "Mis facturas": qué se puede hacer con
// su factura (facturarla, descargarla o por qué se pide a Contabilidad).

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDownTrayIcon,
  BuildingStorefrontIcon,
  DocumentCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { saveBlob } from '@/lib/download';
import {
  invoiceFileName,
  invoiceTone,
  isKnownInvoiceStatus,
  type InvoiceTone,
} from '@/lib/invoicing/my-invoicing';
import { customerInvoicingService } from '@/services/customerInvoicing.service';
import type { MyInvoiceOrder } from '@/types/customer-invoicing';

type InvoicesT = ReturnType<typeof useTranslations<'distributor.invoices'>>;

const TONE_BADGE: Record<InvoiceTone, 'info' | 'success' | 'warning' | 'secondary' | 'outline'> = {
  ready: 'info',
  done: 'success',
  wait: 'warning',
  accounting: 'secondary',
  muted: 'outline',
};

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const formatInvoiceMoney = (value: number) => money.format(value || 0);

function formatDay(iso: string, dateLocale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  // El día se lee en hora del centro de México, como el corte del mes.
  return date.toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  });
}

interface MyInvoiceOrderCardProps {
  order: MyInvoiceOrder;
  /** La función está encendida (el servidor deja timbrar desde la cuenta). */
  enabled: boolean;
  fiscalReady: boolean;
  /** El formulario de datos fiscales está abierto: primero se guarda, luego se factura. */
  editingFiscal: boolean;
  /** Este pedido se está timbrando. */
  stamping: boolean;
  /** Hay un timbrado en curso (de este u otro pedido): no se lanza otro. */
  locked: boolean;
  dateLocale: string;
  onInvoice: (order: MyInvoiceOrder) => void;
  onNeedsFiscal: () => void;
}

export function MyInvoiceOrderCard({
  order,
  enabled,
  fiscalReady,
  editingFiscal,
  stamping,
  locked,
  dateLocale,
  onInvoice,
  onNeedsFiscal,
}: MyInvoiceOrderCardProps) {
  const t = useTranslations('distributor.invoices');
  const tone = invoiceTone(order.status);
  const known = isKnownInvoiceStatus(order.status);
  const label = known ? t(`status.${order.status}` as never) : order.label;
  // El motivo traducido; si el servidor manda un estado nuevo, su propio texto.
  const reason =
    order.message === null ? null : known && order.status !== 'invoiceable' && order.status !== 'invoiced'
      ? t(`reason.${order.status}` as never)
      : order.message;
  const canInvoice = enabled && order.canInvoice;

  return (
    <Card className="border border-gray-200 py-0">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{t('orders.orderNumber', { number: order.orderNumber })}</p>
            <p className="mt-0.5 text-sm text-gray-600">
              {t('orders.paidOn', { date: formatDay(order.date, dateLocale) })}
              <span aria-hidden="true"> · </span>
              {t('orders.items', { count: order.items })}
            </p>
            {order.branchName && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600">
                <BuildingStorefrontIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#3E667D]" />
                <span className="min-w-0 break-words">{t('orders.branch', { branch: order.branchName })}</span>
              </p>
            )}
          </div>
          {/* Teléfono: importe y estado en un renglón; escritorio: en columna a la derecha. */}
          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1.5">
            <p className="text-lg font-semibold tabular-nums text-gray-900">{formatInvoiceMoney(order.total)}</p>
            <Badge variant={TONE_BADGE[tone]}>{label}</Badge>
          </div>
        </div>

        {reason && (
          <p className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <InformationCircleIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <span>{reason}</span>
          </p>
        )}

        {order.invoice && <InvoiceFiles order={order} t={t} />}

        {canInvoice && (
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            {fiscalReady && !editingFiscal ? (
              <span />
            ) : (
              <p className="text-sm text-amber-800">
                {fiscalReady ? t('orders.finishEditing') : t('orders.needsFiscal')}{' '}
                <button type="button" className="font-medium underline underline-offset-2" onClick={onNeedsFiscal}>
                  {t('fiscal.title')}
                </button>
              </p>
            )}
            <Button
              className="h-11 sm:min-w-36"
              disabled={!fiscalReady || editingFiscal || locked}
              aria-busy={stamping}
              onClick={() => onInvoice(order)}
            >
              <DocumentCheckIcon aria-hidden="true" className="h-4 w-4" />
              {stamping ? t('orders.invoicing') : t('orders.invoice')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Archivos de la factura =====

function InvoiceFiles({ order, t }: { order: MyInvoiceOrder; t: InvoicesT }) {
  const [busy, setBusy] = useState<'pdf' | 'xml' | null>(null);
  const invoice = order.invoice;
  if (!invoice) return null;

  const download = async (kind: 'pdf' | 'xml') => {
    setBusy(kind);
    try {
      const blob = await customerInvoicingService.downloadFile(invoice.id, kind);
      saveBlob(blob, invoiceFileName(kind, order), kind === 'pdf' ? 'application/pdf' : 'application/xml');
    } catch {
      toast.error(t('orders.downloadError'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {invoice.folio ? t('orders.folio', { folio: invoice.folio }) : t('orders.folioPending')}
        </p>
        {invoice.uuid && <p className="break-all font-mono text-xs text-gray-500">{invoice.uuid}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          className="h-11 flex-1 sm:flex-none"
          disabled={busy !== null}
          aria-label={t('orders.downloadPdf', { number: order.orderNumber })}
          onClick={() => void download('pdf')}
        >
          <ArrowDownTrayIcon aria-hidden="true" className="h-4 w-4" />
          {t('orders.pdf')}
        </Button>
        <Button
          variant="outline"
          className="h-11 flex-1 sm:flex-none"
          disabled={busy !== null}
          aria-label={t('orders.downloadXml', { number: order.orderNumber })}
          onClick={() => void download('xml')}
        >
          <ArrowDownTrayIcon aria-hidden="true" className="h-4 w-4" />
          {t('orders.xml')}
        </Button>
      </div>
    </div>
  );
}
