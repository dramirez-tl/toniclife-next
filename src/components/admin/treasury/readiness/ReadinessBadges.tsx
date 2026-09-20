'use client';

// ReadinessBadges — piezas visuales de Validación de Datos: estado general,
// estado por documento (Badge textual, no puntos de 8 px), barra de progreso
// accesible y celda de cuenta bancaria enmascarada.

import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import type {
  PaymentDocumentKey,
  PaymentDocumentStatus,
  ReadinessBankSummary,
  ReadinessOverallStatus,
  ReadinessProgress,
} from '@/types/treasury-readiness';
import {
  DOCUMENT_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONES,
  READINESS_STATUS_LABELS,
  READINESS_STATUS_TONES,
} from './readiness-labels';

export function ReadinessStatusBadge({ status }: { status: ReadinessOverallStatus }) {
  return <Badge variant={READINESS_STATUS_TONES[status]}>{READINESS_STATUS_LABELS[status]}</Badge>;
}

export function DocStatusBadge({
  document,
  status,
  showName = true,
  className,
}: {
  document: PaymentDocumentKey;
  status: PaymentDocumentStatus;
  showName?: boolean;
  className?: string;
}) {
  const key = status ?? 'missing';
  const label = DOCUMENT_STATUS_LABELS[key];
  return (
    <Badge
      variant={DOCUMENT_STATUS_TONES[key]}
      className={className}
      title={`${DOCUMENT_LABELS[document]}: ${label}`}
    >
      {showName ? (
        <>
          <span>{DOCUMENT_LABELS[document]}</span>
          <span aria-hidden>·</span>
          <span className="sr-only">: </span>
          <span>{label}</span>
        </>
      ) : (
        label
      )}
    </Badge>
  );
}

export function ProgressBar({ progress, className }: { progress: ReadinessProgress; className?: string }) {
  const total = Math.max(0, progress.total);
  const completed = Math.min(Math.max(0, progress.completed), total || progress.completed);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const tone = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-destructive/70';
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div
        className="h-2 w-20 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-label={`Progreso ${completed} de ${total}`}
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {completed}/{total || '—'}
      </span>
    </div>
  );
}

export function BankCell({ account }: { account: ReadinessBankSummary | null }) {
  if (!account) return <span className="text-xs text-muted-foreground">Sin cuenta</span>;
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span className="text-foreground">
        {account.bankName ?? 'Banco no identificado'}
        {account.accountLast4 && (
          <span className="ml-1 font-mono text-muted-foreground">****{account.accountLast4}</span>
        )}
        {account.currency && <span className="ml-1 text-muted-foreground">{account.currency}</span>}
      </span>
      {account.isVerified ? (
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden />
          Verificada
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-amber-700">
          <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden />
          Sin verificar
        </span>
      )}
    </div>
  );
}

/** Leyenda de colores de los documentos (accesibilidad: no solo color). */
export function DocLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Leyenda de estados de documento">
      {(['missing', 'pending', 'validated', 'rejected', 'expired'] as const).map((s) => (
        <li key={s} className="inline-flex items-center gap-1">
          <Badge variant={DOCUMENT_STATUS_TONES[s]} className="px-1.5 py-0">
            {DOCUMENT_STATUS_LABELS[s]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
