'use client';

// WithholdingsSection.tsx — "Convenios con la empresa". Solo se pinta cuando
// GET /distributor/withholdings responde (ajuste distributor_sees_agreements);
// con 404 el hook devuelve null y no se muestra nada.

import { useLocale, useTranslations } from 'next-intl';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { localeLanguage } from '@/i18n/config';
import { useDistributorWithholdings } from '@/hooks/useDistributorPayment';
import type { DistributorWithholdingAgreement } from '@/types/distributor-payment';
import { formatDate } from './paymentUtils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'outline'> = {
  active: 'success',
  paused: 'warning',
  settled: 'secondary',
  cancelled: 'outline',
};

export function WithholdingsSection() {
  const t = useTranslations('distributor.payments.withholdings');
  const lang = localeLanguage(useLocale());
  const { data, isLoading, isError } = useDistributorWithholdings();

  if (isLoading || isError || !data) return null;
  const agreements: DistributorWithholdingAgreement[] = Array.isArray(data.agreements) ? data.agreements : [];
  if (agreements.length === 0) return null;

  const applicationsOf = (a: DistributorWithholdingAgreement) =>
    a.applications ?? (data.applications ?? []).filter((x) => (x as { agreementId?: string }).agreementId === a.id);

  return (
    <Card id="section-withholdings" className="scroll-mt-24" data-tour="d-payments-withholdings">
      <CardContent className="p-5">
        <header className="mb-3 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardDocumentListIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t('title')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('description')}</p>
          </div>
        </header>

        <ul className="space-y-3">
          {agreements.map((a) => {
            const apps = applicationsOf(a);
            const statusKey = `status.${a.status}`;
            return (
              <li key={a.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.has(`concept.${a.concept}`) ? t(`concept.${a.concept}`) : a.concept}
                      {' · '}
                      {t('since', { date: formatDate(a.createdAt, lang) })}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status] ?? 'outline'}>
                    {t.has(statusKey) ? t(statusKey) : a.status}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">{t('total')}</dt>
                    <dd className="font-semibold text-foreground">
                      {a.totalAmount != null ? formatCurrency(a.totalAmount, a.currencyCode, lang) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('balance')}</dt>
                    <dd className="font-semibold text-foreground">
                      {a.balanceRemaining != null ? formatCurrency(a.balanceRemaining, a.currencyCode, lang) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('installment')}</dt>
                    <dd className="font-semibold text-foreground">
                      {formatCurrency(a.installmentAmount, a.currencyCode, lang)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('maxPct')}</dt>
                    <dd className="font-semibold text-foreground">{a.maxPctOfNet}%</dd>
                  </div>
                </dl>
                {apps.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-primary">
                      {t('applications', { count: apps.length })}
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs">
                      {apps.map((x) => (
                        <li key={x.id} className="flex flex-wrap justify-between gap-2 border-t border-border py-1">
                          <span className="text-muted-foreground">
                            {x.periodName ?? x.periodId} · {formatDate(x.appliedAt, lang)}
                          </span>
                          <span className="font-medium text-foreground">
                            −{formatCurrency(x.amountWithheld, x.currencyCode, lang)}
                            {x.balanceAfter != null && (
                              <span className="ml-2 text-muted-foreground">
                                {t('balanceAfter', { amount: formatCurrency(x.balanceAfter, x.currencyCode, lang) })}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
