'use client';

// RejectionBanner.tsx — aviso de rechazos: un renglón por documento con el
// motivo (etiqueta del catálogo en el idioma de la cuenta), la nota del
// revisor y un enlace a la tarjeta del documento.

import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import type { PaymentDocumentKey, PaymentDocumentState } from '@/types/distributor-payment';
import { scrollToAnchor } from './paymentUtils';

export interface RejectionRow {
  key: PaymentDocumentKey;
  doc: PaymentDocumentState;
  reason: string | null;
}

interface RejectionBannerProps {
  rows: RejectionRow[];
}

export function RejectionBanner({ rows }: RejectionBannerProps) {
  const t = useTranslations('distributor.payments');
  if (rows.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
      data-tour="d-payments-rejections"
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-destructive">{t('rejection.title')}</p>
          <p className="mt-0.5 text-xs text-destructive/90">{t('rejection.body')}</p>
          <ul className="mt-3 space-y-2">
            {rows.map(({ key, doc, reason }) => (
              <li
                key={key}
                className="flex flex-col gap-1 rounded-lg border border-destructive/20 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t(`documents.${key}.title`)}
                    {doc.status === 'expired' && (
                      <span className="ml-2 text-xs font-normal text-destructive">
                        {t('documents.status.expired')}
                      </span>
                    )}
                  </p>
                  {reason && (
                    <p className="text-xs text-muted-foreground">
                      {t('rejection.reason', { reason })}
                    </p>
                  )}
                  {doc.rejectionNotes && (
                    <p className="text-xs text-muted-foreground">
                      {t('rejection.notes', { notes: doc.rejectionNotes })}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => scrollToAnchor(`doc-${key}`)}
                >
                  {t('rejection.fix')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
