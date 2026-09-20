'use client';

// PaymentStepper.tsx — "Captura → Documentos → Revisión (≤ N días) → Validado".
// El paso actual sale de `nextStep` del API; `fix_rejected` marca Documentos
// en error. Es una lista ordenada con aria-current para lectores de pantalla.

import { useTranslations } from 'next-intl';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { PaymentNextStep } from '@/types/distributor-payment';

type StepKey = 'capture' | 'documents' | 'review' | 'validated';

const STEPS: StepKey[] = ['capture', 'documents', 'review', 'validated'];

function currentIndex(nextStep: PaymentNextStep): number {
  switch (nextStep) {
    case 'capture':
      return 0;
    case 'submit_docs':
    case 'fix_rejected':
      return 1;
    case 'in_review':
      return 2;
    case 'ready':
      return 3;
    default:
      return 0;
  }
}

interface PaymentStepperProps {
  nextStep: PaymentNextStep;
  slaDays: number;
  className?: string;
}

export function PaymentStepper({ nextStep, slaDays, className }: PaymentStepperProps) {
  const t = useTranslations('distributor.payments.stepper');
  const current = currentIndex(nextStep);
  const hasRejection = nextStep === 'fix_rejected';

  return (
    <ol
      className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}
      aria-label={t('ariaLabel')}
      data-tour="d-payments-stepper"
    >
      {STEPS.map((step, idx) => {
        const done = idx < current || (idx === 3 && current === 3);
        const active = idx === current;
        const error = active && hasRejection && step === 'documents';
        const label = step === 'review' ? t('review', { days: slaDays }) : t(step);
        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm',
              done && 'border-emerald-200 bg-emerald-50 text-emerald-800',
              active && !error && 'border-primary bg-primary/5 font-semibold text-primary',
              error && 'border-destructive/40 bg-destructive/5 font-semibold text-destructive',
              !done && !active && 'border-border bg-card text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                done && 'border-emerald-500 bg-emerald-500 text-white',
                active && !error && 'border-primary bg-primary text-primary-foreground',
                error && 'border-destructive bg-destructive text-white',
                !done && !active && 'border-border bg-muted text-muted-foreground',
              )}
              aria-hidden="true"
            >
              {done ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : error ? (
                <ExclamationTriangleIcon className="h-3.5 w-3.5" />
              ) : (
                idx + 1
              )}
            </span>
            <span className="min-w-0 truncate">
              {label}
              <span className="sr-only">
                {done ? ` — ${t('done')}` : active ? ` — ${t('current')}` : ''}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
