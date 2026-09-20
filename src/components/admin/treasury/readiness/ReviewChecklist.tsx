'use client';

// ReviewChecklist — checklist por país (mismos ítems que readiness-rules.lib)
// en formato compacto: estado + etiqueta + detalle. Los documentos no van
// aquí (tienen su propia lista con acciones); se muestran campos, cuenta,
// régimen y consentimiento.

import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import type { ReadinessChecklistItem } from '@/types/treasury-readiness';
import { CHECKLIST_STATUS_LABELS, checklistLabel } from './readiness-labels';

function StatusIcon({ status, done }: { status: string; done: boolean }) {
  if (status === 'ok' || status === 'validated')
    return <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  if (status === 'pending')
    return <ClockIcon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />;
  if (status === 'rejected' || status === 'expired' || status === 'invalid')
    return <XCircleIcon className="h-4 w-4 shrink-0 text-destructive" aria-hidden />;
  if (done) return <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  return <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
}

interface ReviewChecklistProps {
  items: ReadinessChecklistItem[];
  /** Oculta los ítems `doc:*` (tienen su propia sección). */
  hideDocuments?: boolean;
}

export function ReviewChecklist({ items, hideDocuments = true }: ReviewChecklistProps) {
  const visible = hideDocuments ? items.filter((i) => !i.key.startsWith('doc:')) : items;
  if (visible.length === 0) {
    return <p className="text-xs text-muted-foreground">El API no devolvió el checklist de este distribuidor.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-md border border-border" aria-label="Checklist de requisitos">
      {visible.map((item) => (
        <li key={item.key} className="flex items-start gap-2 px-3 py-2 text-sm">
          <StatusIcon status={item.status} done={item.done} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-foreground">{checklistLabel(item.key, item.label)}</span>
              <span className="text-xs text-muted-foreground">
                {CHECKLIST_STATUS_LABELS[item.status] ?? item.status}
              </span>
            </div>
            {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
