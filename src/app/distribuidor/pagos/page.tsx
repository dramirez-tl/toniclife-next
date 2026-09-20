'use client';

// /distribuidor/pagos — "Datos para Comisiones" (contrato Tesorería v2 §4.6/§5.6).
// Secciones con guardado independiente, subida inmediata de documentos,
// stepper + checklist por país, consentimiento, candados con "Solicitar
// cambio", historial paginado y convenios (si el ajuste lo permite).
// ES/EN completo por `distributor.payments`; anclas data-tour="d-payments-*".

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { localeLanguage } from '@/i18n/config';
import {
  useDistributorPaymentCatalogs,
  useDistributorPaymentData,
} from '@/hooks/useDistributorPayment';
import type { PaymentDataResponse, PaymentOverallStatus } from '@/types/distributor-payment';
import { PaymentStepper } from '@/components/distributor/payment/PaymentStepper';
import { PaymentChecklist } from '@/components/distributor/payment/PaymentChecklist';
import { RejectionBanner, type RejectionRow } from '@/components/distributor/payment/RejectionBanner';
import { ConsentSection } from '@/components/distributor/payment/ConsentSection';
import { PersonalSection } from '@/components/distributor/payment/PersonalSection';
import { FiscalSection } from '@/components/distributor/payment/FiscalSection';
import { BankSection } from '@/components/distributor/payment/BankSection';
import { DocumentsSection } from '@/components/distributor/payment/DocumentsSection';
import { PaymentHistory } from '@/components/distributor/payment/PaymentHistory';
import { WithholdingsSection } from '@/components/distributor/payment/WithholdingsSection';
import { useSectionSave } from '@/components/distributor/payment/useSectionSave';
import { useUnsavedChanges } from '@/components/distributor/payment/useUnsavedChanges';
import { usePaymentErrors } from '@/components/distributor/payment/usePaymentErrors';
import {
  isMexicoLike,
  normalizeChecklist,
  rejectedDocuments,
  rejectionReasonLabel,
} from '@/components/distributor/payment/paymentUtils';

const OVERALL_VARIANT: Record<PaymentOverallStatus, 'outline' | 'warning' | 'info' | 'destructive' | 'success'> = {
  not_started: 'outline',
  incomplete: 'warning',
  pending_validation: 'info',
  rejected: 'destructive',
  validated: 'success',
};

export default function PagosPage() {
  const t = useTranslations('distributor.payments');
  const lang = localeLanguage(useLocale());
  const { data, isLoading, isError, error, refetch, isFetching } = useDistributorPaymentData();
  const catalogsQ = useDistributorPaymentCatalogs();
  const { resolve } = usePaymentErrors();

  // Consentimiento (checkbox local; el API exige `privacyConsent` en el primer guardado).
  const [consentChecked, setConsentChecked] = useState(false);
  const consentSave = useSectionSave();

  // Cambios sin guardar por sección → aviso beforeunload.
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const setDirty = useCallback((key: string, dirty: boolean) => {
    setDirtyMap((m) => (m[key] === dirty ? m : { ...m, [key]: dirty }));
  }, []);
  const onPersonalDirty = useCallback((d: boolean) => setDirty('personal', d), [setDirty]);
  const onFiscalDirty = useCallback((d: boolean) => setDirty('fiscal', d), [setDirty]);
  const onBankDirty = useCallback((d: boolean) => setDirty('bank', d), [setDirty]);
  const anyDirty = Object.values(dirtyMap).some(Boolean);
  useUnsavedChanges(anyDirty);

  const checklist = useMemo(() => normalizeChecklist(data?.checklist), [data?.checklist]);
  const rejectionRows = useMemo<RejectionRow[]>(() => {
    if (!data) return [];
    return rejectedDocuments(data).map((key) => {
      const doc = data.documents[key];
      return {
        key,
        doc,
        reason: rejectionReasonLabel(
          catalogsQ.data?.rejectionReasons,
          doc.rejectionReasonCode,
          lang,
          doc.rejectionReasonLabel,
        ),
      };
    });
  }, [data, catalogsQ.data, lang]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    const message = resolve(error, 'errors.load').message;
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <div className="flex items-center gap-2 text-destructive">
            <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm font-semibold">{t('errors.loadTitle')}</p>
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            {t('errors.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const consentBlocked = data.consent.required && !consentChecked;
  const privacyConsent = data.consent.required && consentChecked;

  const acceptConsent = () => {
    void consentSave.save(
      { privacyConsent: true },
      { successMessage: t('consent.saved'), onSuccess: () => setConsentChecked(false) },
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCardIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={OVERALL_VARIANT[data.overallStatus] ?? 'outline'}>
              {t(`overall.${data.overallStatus}`)}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t('protected')}
            </span>
          </div>
        </header>

        {/* Siguiente paso */}
        <NextStepNotice data={data} />

        {/* Stepper */}
        <PaymentStepper nextStep={data.nextStep} slaDays={data.slaDays} />

        {/* Rechazos */}
        <RejectionBanner rows={rejectionRows} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Checklist (arriba en móvil, lateral sticky en escritorio) */}
          <aside className="order-first lg:order-last">
            <PaymentChecklist
              rows={checklist}
              completed={data.progress?.completed ?? 0}
              total={data.progress?.total ?? checklist.length}
            />
          </aside>

          <div className="space-y-6">
            <ConsentSection
              consent={data.consent}
              checked={consentChecked}
              onCheckedChange={setConsentChecked}
              onAccept={acceptConsent}
              isSaving={consentSave.isSaving}
            />

            <PersonalSection
              data={data}
              consentBlocked={consentBlocked}
              privacyConsent={privacyConsent}
              onDirtyChange={onPersonalDirty}
            />

            {isMexicoLike(data.country) && (
              <FiscalSection
                data={data}
                catalogs={catalogsQ.data}
                catalogsLoading={catalogsQ.isLoading}
                consentBlocked={consentBlocked}
                privacyConsent={privacyConsent}
                onDirtyChange={onFiscalDirty}
              />
            )}

            <BankSection
              data={data}
              catalogs={catalogsQ.data}
              consentBlocked={consentBlocked}
              privacyConsent={privacyConsent}
              onDirtyChange={onBankDirty}
            />

            <DocumentsSection
              data={data}
              catalogs={catalogsQ.data}
              consentBlocked={consentBlocked}
              privacyConsent={privacyConsent}
            />

            <WithholdingsSection />

            <PaymentHistory overallStatus={data.overallStatus} />

            {/* Contacto */}
            <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
              <p className="mb-1 text-sm font-semibold text-primary">{t('contact.title')}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t.rich('contact.body', {
                  email: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                  whatsapp: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                  phone: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function NextStepNotice({ data }: { data: PaymentDataResponse }) {
  const t = useTranslations('distributor.payments.hero');
  const step = data.nextStep;
  const tone =
    step === 'ready'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : step === 'fix_rejected'
        ? 'border-destructive/30 bg-destructive/5 text-destructive'
        : step === 'in_review'
          ? 'border-sky-200 bg-sky-50 text-sky-900'
          : 'border-amber-200 bg-amber-50 text-amber-900';
  const Icon = step === 'ready' ? CheckCircleIcon : step === 'in_review' ? ClockIcon : ExclamationTriangleIcon;
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${tone}`} role="status" data-tour="d-payments-next">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{t(`title.${step}`)}</p>
        <p className="text-xs opacity-90">
          {t(`body.${step}`, { days: data.slaDays })}
          {' · '}
          {t('progress', { completed: data.progress?.completed ?? 0, total: data.progress?.total ?? 0 })}
        </p>
      </div>
    </div>
  );
}
