'use client';

// ReviewTimeline — línea de tiempo de `customer_document_reviews` (subidas,
// validaciones, rechazos, revocaciones, reinicios, vencimientos).

import { Badge } from '@/components/ui/badge';
import type { DocumentReview, PaymentDocumentKey } from '@/types/treasury-readiness';
import { isPaymentDocumentKey } from '@/types/treasury-readiness';
import { formatDateTime } from '../treasury-format';
import { ACTOR_TYPE_LABELS, DOCUMENT_LABELS, reviewActionLabel, reviewActionTone } from './readiness-labels';

interface ReviewTimelineProps {
  reviews: DocumentReview[];
  reasonLabel?: (code: string | null | undefined) => string | null;
}

function docLabel(document: string): string {
  return isPaymentDocumentKey(document) ? DOCUMENT_LABELS[document as PaymentDocumentKey] : document;
}

export function ReviewTimeline({ reviews, reasonLabel }: ReviewTimelineProps) {
  if (reviews.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin revisiones registradas todavía.</p>;
  }
  const sorted = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <ol className="space-y-2" aria-label="Historial de revisiones">
      {sorted.map((r, i) => {
        const reason = r.reasonLabel ?? (reasonLabel?.(r.reasonCode) ?? r.reasonCode);
        return (
          <li key={r.id ?? `${r.createdAt}-${i}`} className="flex gap-2 text-xs">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-border" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={reviewActionTone(r.action)} className="px-1.5 py-0">
                  {reviewActionLabel(r.action)}
                </Badge>
                <span className="font-medium text-foreground">{docLabel(r.document)}</span>
                <span className="text-muted-foreground">· {formatDateTime(r.createdAt)}</span>
              </div>
              <p className="text-muted-foreground">
                {ACTOR_TYPE_LABELS[r.actorType] ?? r.actorType}
                {r.actorName ? ` · ${r.actorName}` : ''}
                {reason ? ` · ${reason}` : ''}
              </p>
              {r.notes && <p className="mt-0.5 whitespace-pre-line text-foreground/80">{r.notes}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
