'use client';

// Badges de estado/tipo de factura compartidos por listado, detalle y pedido.

import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { INVOICE_STATUS_CONFIG, InvoiceStatus, type InvoiceSummary, type SatStatus } from '@/types/billing';
import { SAT_STATUS_LABELS, invoiceTypeLabel } from './labels';

function StatusIcon({ status }: { status: InvoiceStatus }) {
  const cls = 'h-3.5 w-3.5';
  switch (status) {
    case InvoiceStatus.STAMPED:
    case InvoiceStatus.SENT:
      return <CheckCircleIcon className={cls} aria-hidden />;
    case InvoiceStatus.CANCELLED:
      return <XMarkIcon className={cls} aria-hidden />;
    case InvoiceStatus.ERROR:
      return <ExclamationTriangleIcon className={cls} aria-hidden />;
    default:
      return <ClockIcon className={cls} aria-hidden />;
  }
}

export function InvoiceStatusBadge({
  status,
  satCancellationStatus,
  size = 'sm',
}: {
  status: InvoiceStatus;
  /** Se muestra junto a `cancel_pending`. */
  satCancellationStatus?: string | null;
  size?: 'sm' | 'lg';
}) {
  const config = INVOICE_STATUS_CONFIG[status];
  const label = config?.label ?? status;
  const color = config?.color ?? 'bg-gray-100 text-gray-800';
  const pad = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${pad} ${color}`}
      title={status === InvoiceStatus.CANCEL_PENDING && satCancellationStatus ? satCancellationStatus : undefined}
    >
      <StatusIcon status={status} />
      {label}
      {status === InvoiceStatus.CANCEL_PENDING && satCancellationStatus ? (
        <span className="font-normal opacity-80">· {satCancellationStatus}</span>
      ) : null}
    </span>
  );
}

export function InvoiceTypeBadge({
  invoice,
}: {
  invoice: Pick<InvoiceSummary, 'invoiceType' | 'posSaleId' | 'orderId' | 'isReplacement'>;
}) {
  const label = invoiceTypeLabel(invoice);
  const variant =
    invoice.isReplacement
      ? 'warning'
      : invoice.invoiceType === 'global'
        ? 'info'
        : invoice.invoiceType === 'payment'
          ? 'secondary'
          : 'outline';
  return <Badge variant={variant}>{label}</Badge>;
}

export function SatStatusBadge({ status }: { status: SatStatus | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">Sin consultar</span>;
  const variant = status === 'vigente' ? 'success' : status === 'cancelado' ? 'destructive' : 'warning';
  return <Badge variant={variant}>SAT: {SAT_STATUS_LABELS[status]}</Badge>;
}
