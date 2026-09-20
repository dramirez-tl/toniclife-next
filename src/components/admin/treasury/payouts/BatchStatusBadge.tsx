'use client';

// BatchStatusBadge — estado del lote (generated | sent | reconciled | cancelled)
// y estado de fila del lote (pending | paid | failed).

import { Badge } from '@/components/ui/badge';
import type { PayoutBatchStatus, PayoutItemRowStatus } from '@/types/treasury';
import {
  BATCH_STATUS_TONES,
  ROW_STATUS_TONES,
  batchStatusLabel,
  rowStatusLabel,
} from './payout-format';

export function BatchStatusBadge({ status }: { status: PayoutBatchStatus | string }) {
  const tone = (BATCH_STATUS_TONES as Record<string, (typeof BATCH_STATUS_TONES)[PayoutBatchStatus]>)[status];
  return <Badge variant={tone ?? 'secondary'}>{batchStatusLabel(status)}</Badge>;
}

export function RowStatusBadge({ status }: { status: PayoutItemRowStatus | string }) {
  const tone = (ROW_STATUS_TONES as Record<string, (typeof ROW_STATUS_TONES)[PayoutItemRowStatus]>)[status];
  return <Badge variant={tone ?? 'secondary'}>{rowStatusLabel(status)}</Badge>;
}
