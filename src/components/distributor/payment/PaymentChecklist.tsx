'use client';

// PaymentChecklist.tsx — checklist lateral (sticky en escritorio) por país:
// x/N desde el API, cada renglón enlaza al campo o documento (`#field-*`,
// `#doc-*`). El estado de cada ítem lo decide el API (readiness-rules).

import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ChecklistRow, ChecklistState } from './paymentUtils';
import { scrollToAnchor } from './paymentUtils';

const STATE_ICON: Record<ChecklistState, typeof CheckCircleIcon> = {
  complete: CheckCircleIcon,
  pending: ClockIcon,
  rejected: ExclamationTriangleIcon,
  missing: MinusCircleIcon,
};

const STATE_COLOR: Record<ChecklistState, string> = {
  complete: 'text-emerald-600',
  pending: 'text-amber-600',
  rejected: 'text-destructive',
  missing: 'text-muted-foreground',
};

interface PaymentChecklistProps {
  rows: ChecklistRow[];
  completed: number;
  total: number;
  className?: string;
}

export function PaymentChecklist({ rows, completed, total, className }: PaymentChecklistProps) {
  const t = useTranslations('distributor.payments.checklist');
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const itemLabel = (row: ChecklistRow) => {
    if (row.label) return row.label;
    const key = `items.${row.key}`;
    return t.has(key) ? t(key) : row.key;
  };

  return (
    <Card className={cn('lg:sticky lg:top-24', className)} data-tour="d-payments-checklist">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
          <span className="text-xs font-bold text-foreground">
            {t('progress', { completed, total })}
          </span>
        </div>
        <div
          className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={t('title')}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              percent === 100 ? 'bg-emerald-500' : percent >= 60 ? 'bg-amber-500' : 'bg-primary',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="space-y-1">
            {rows.map((row) => {
              const Icon = STATE_ICON[row.state];
              const label = itemLabel(row);
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => scrollToAnchor(row.anchor)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    aria-label={t('goTo', { item: label })}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', STATE_COLOR[row.state])} aria-hidden="true" />
                    <span
                      className={cn(
                        'flex-1 truncate',
                        row.state === 'complete' ? 'text-muted-foreground' : 'text-foreground',
                      )}
                    >
                      {label}
                    </span>
                    <span className={cn('shrink-0 text-[11px] sm:text-xs', STATE_COLOR[row.state])}>
                      {t(`state.${row.state}`)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
