'use client';

// ConsentSection.tsx — aviso de privacidad para INE/CURP/RFC/datos bancarios.
// Obligatorio antes del primer guardado (428 TRS_CONSENT_REQUIRED) y cuando
// cambia la versión vigente. Se guarda solo (POST con `privacyConsent`).

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { localeLanguage } from '@/i18n/config';
import type { PaymentConsent } from '@/types/distributor-payment';
import { formatDate } from './paymentUtils';

interface ConsentSectionProps {
  consent: PaymentConsent;
  /** Estado local del checkbox (lo lee el resto de secciones para permitir guardar). */
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onAccept: () => void;
  isSaving: boolean;
  /** URL del aviso de privacidad (enlace externo). */
  privacyUrl?: string;
}

export function ConsentSection({
  consent,
  checked,
  onCheckedChange,
  onAccept,
  isSaving,
  privacyUrl = 'https://toniclife.com/aviso-de-privacidad',
}: ConsentSectionProps) {
  const t = useTranslations('distributor.payments.consent');
  const lang = localeLanguage(useLocale());
  const [touched, setTouched] = useState(false);
  const outdated = !consent.required
    ? false
    : Boolean(consent.acceptedAt && consent.version && consent.version !== consent.currentVersion);
  const accepted = !consent.required;
  const showError = touched && !checked;

  return (
    <Card id="consent" className="scroll-mt-24" data-tour="d-payments-consent">
      <CardContent className="p-5">
        <section aria-labelledby="consent-heading">
          <header className="mb-3 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="consent-heading" className="text-base font-semibold text-foreground">
                {t('title')}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('body')}</p>
            </div>
          </header>

          {accepted ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">
              {t('accepted', {
                date: formatDate(consent.acceptedAt, lang),
                version: consent.version ?? consent.currentVersion,
              })}
            </p>
          ) : (
            <div className="space-y-3">
              {outdated && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
                  {t('outdated', { version: consent.currentVersion })}
                </p>
              )}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent-checkbox"
                  checked={checked}
                  onCheckedChange={(v) => {
                    setTouched(true);
                    onCheckedChange(v === true);
                  }}
                  aria-describedby="consent-help"
                  aria-invalid={showError || undefined}
                  disabled={isSaving}
                />
                <div className="space-y-1">
                  <Label htmlFor="consent-checkbox" className="text-sm leading-snug font-normal">
                    {t('checkbox', { version: consent.currentVersion })}
                  </Label>
                  <p id="consent-help" className="text-xs text-muted-foreground">
                    <a
                      href={privacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      {t('link')}
                    </a>
                  </p>
                  {showError && (
                    <p role="alert" className="text-xs text-destructive">
                      {t('required')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={!checked || isSaving}
                  onClick={() => {
                    setTouched(true);
                    if (checked) onAccept();
                  }}
                >
                  {isSaving ? t('saving') : t('save')}
                </Button>
              </div>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
