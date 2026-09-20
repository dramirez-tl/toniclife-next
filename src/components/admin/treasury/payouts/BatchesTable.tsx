'use client';

// BatchesTable — listado de lotes (número, periodo, moneda, formato, filas,
// total, retenido, estado, generado por/fecha, hash) con acciones por estado.

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import type { PayoutBatchFull } from '@/types/treasury';
import { actorName, formatDateOnly, formatDateTime, formatInt, formatMoney } from '../treasury-format';
import { BatchActionButtons, batchPendingRows, type BatchActionTarget } from './BatchActions';
import { BatchStatusBadge } from './BatchStatusBadge';
import { layoutFormatLabel, shortHash } from './payout-format';

interface BatchesTableProps {
  batches: PayoutBatchFull[];
  isLoading: boolean;
  onAction: (target: BatchActionTarget) => void;
  emptyMessage?: string;
}

export function BatchesTable({ batches, isLoading, onAction, emptyMessage }: BatchesTableProps) {
  const columns: DataTableColumn<PayoutBatchFull>[] = [
    {
      key: 'batchNumber',
      header: 'Lote',
      render: (b) => (
        <div className="min-w-[11rem]">
          <Link href={`/admin/tesoreria/dispersion/${b.id}`} className="font-mono font-medium text-primary hover:underline">
            {b.batchNumber}
          </Link>
          <p className="text-xs text-muted-foreground">
            {b.period?.name ?? b.periodId} · fecha valor {formatDateOnly(b.paymentDate)}
          </p>
        </div>
      ),
    },
    {
      key: 'currency',
      header: 'Moneda / formato',
      render: (b) => (
        <div className="space-y-0.5">
          <Badge variant="outline" className="font-mono">
            {b.currencyCode}
          </Badge>
          <p className="text-xs text-muted-foreground">{layoutFormatLabel(b.layoutFormat)}</p>
          {b.fxRateToMxn !== null && b.fxRateToMxn !== undefined && b.currencyCode !== 'MXN' && (
            <p className="text-xs text-muted-foreground">FX {String(b.fxRateToMxn)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Filas',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (b) => {
        // `rows{pending,paid,failed}` del PayoutBatchDto (aplanado por normalizeBatch).
        const pending = batchPendingRows(b);
        const paid = b.rows?.paid ?? b.paidCount ?? null;
        const failed = b.rows?.failed ?? b.failedCount ?? null;
        const hasCounts = pending !== null || paid !== null || failed !== null;
        return (
          <>
            <p>{formatInt(b.itemsCount)}</p>
            {hasCounts && (
              <p className="text-xs text-muted-foreground">
                {formatInt(paid ?? 0)} pagadas · {formatInt(failed ?? 0)} rechazadas
                {b.status === 'sent' && pending !== null && pending > 0 ? ` · ${formatInt(pending)} pendientes` : ''}
              </p>
            )}
          </>
        );
      },
    },
    {
      key: 'total',
      header: 'Total del layout',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (b) => (
        <>
          <p className="font-semibold">{formatMoney(b.totalNetPayout, b.currencyCode)}</p>
          <p className="text-xs text-muted-foreground">retenido {formatMoney(b.totalWithheld, b.currencyCode)}</p>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (b) => (
        <div className="space-y-0.5">
          <BatchStatusBadge status={b.status} />
          {b.status === 'sent' && b.sentAt && <p className="text-xs text-muted-foreground">{formatDateTime(b.sentAt)}</p>}
          {b.status === 'reconciled' && b.reconciledAt && <p className="text-xs text-muted-foreground">{formatDateTime(b.reconciledAt)}</p>}
          {b.status === 'cancelled' && b.cancelReason && (
            <p className="max-w-48 truncate text-xs text-muted-foreground" title={b.cancelReason}>
              {b.cancelReason}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Generado',
      cellClassName: 'text-xs text-muted-foreground',
      render: (b) => (
        <>
          <p>{formatDateTime(b.createdAt)}</p>
          <p>{actorName(b.createdBy)}</p>
        </>
      ),
    },
    {
      key: 'hash',
      header: 'Hash',
      render: (b) => (
        <span className="font-mono text-xs text-muted-foreground" title={b.layoutSha256 ?? undefined}>
          {shortHash(b.layoutSha256)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (b) => <BatchActionButtons batch={b} onAction={onAction} compact />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={batches}
      getRowKey={(b) => b.id}
      isLoading={isLoading}
      minWidthClassName="min-w-[64rem]"
      emptyMessage={emptyMessage ?? 'Sin lotes con estos filtros.'}
    />
  );
}
