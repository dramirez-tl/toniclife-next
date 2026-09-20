'use client';

// FiscalSection.tsx — Datos fiscales (solo MX/FN): RFC con verificador y cruce
// con CURP, régimen SAT desde /distributor/payment-data/catalogs (persona
// física activos), CP fiscal y el régimen de comisión asignado por Tesorería
// (solo lectura). Bloqueado cuando la CSF está validada: "Solicitar cambio"
// (requestChange: ['taxId']).

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Skeleton } from '@/components/ui/skeleton';
import type { PaymentCatalogs, PaymentDataResponse, UpdatePaymentDataFields } from '@/types/distributor-payment';
import { SectionCard } from './SectionCard';
import { FieldGroup, FieldLabel, FieldMessage, LockedNotice } from './PaymentField';
import { RequestChangeDialog } from './RequestChangeDialog';
import { useSectionSave } from './useSectionSave';
import { useServerForm } from './useServerForm';
import { checkRfc, isValidZip, normalizeId, onlyDigits, rfcMatchesCurp } from './paymentUtils';

interface FiscalSectionProps {
  data: PaymentDataResponse;
  catalogs: PaymentCatalogs | undefined;
  catalogsLoading: boolean;
  consentBlocked: boolean;
  privacyConsent: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

interface FormState {
  rfc: string;
  satRegimeCode: string;
  fiscalZipCode: string;
}

function fromData(data: PaymentDataResponse): FormState {
  const f = data.sections.fiscal;
  return {
    rfc: f.rfc ?? '',
    satRegimeCode: f.satRegimeCode ?? '',
    fiscalZipCode: f.fiscalZipCode ?? '',
  };
}

export function FiscalSection({
  data,
  catalogs,
  catalogsLoading,
  consentBlocked,
  privacyConsent,
  onDirtyChange,
}: FiscalSectionProps) {
  const t = useTranslations('distributor.payments');
  const fiscal = data.sections.fiscal;
  const curp = data.sections.personal.curp ?? '';

  const { form, setForm, baseline, dirty } = useServerForm(data, fromData);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [unlocked, setUnlocked] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const { save, isSaving, status } = useSectionSave();

  const locked = fiscal.locked && !unlocked;
  const fieldsDisabled = isSaving || locked;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // --- validación en vivo ---
  const rfcNorm = normalizeId(form.rfc);
  const rfcCheck = rfcNorm ? checkRfc(rfcNorm) : null;
  const rfcError =
    rfcCheck && !rfcCheck.ok && (touched.rfc || rfcNorm.length >= 12)
      ? t(`validation.rfc.${rfcCheck.reason && t.has(`validation.rfc.${rfcCheck.reason}`) ? rfcCheck.reason : 'generic'}`)
      : null;
  const matchesCurp = rfcCheck?.ok ? rfcMatchesCurp(rfcNorm, curp) : null;
  const zipError = form.fiscalZipCode && !isValidZip(form.fiscalZipCode) ? t('validation.zip') : null;

  const regimeOptions = useMemo(
    () =>
      (catalogs?.satRegimes ?? []).map((r) => ({
        value: r.code,
        label: `${r.code} · ${r.description}`,
      })),
    [catalogs],
  );
  const regimeName =
    regimeOptions.find((o) => o.value === form.satRegimeCode)?.label ??
    (form.satRegimeCode ? `${form.satRegimeCode}${fiscal.satRegimeName ? ` · ${fiscal.satRegimeName}` : ''}` : '');

  const canSave = !rfcError && !zipError;

  const handleSave = () => {
    setTouched({ rfc: true, satRegimeCode: true, fiscalZipCode: true });
    if (!canSave) return;
    const fields: UpdatePaymentDataFields = {};
    if (rfcNorm !== normalizeId(baseline.rfc)) fields.rfc = rfcNorm;
    if (form.satRegimeCode !== baseline.satRegimeCode) fields.satRegimeCode = form.satRegimeCode;
    if (form.fiscalZipCode !== baseline.fiscalZipCode) fields.fiscalZipCode = form.fiscalZipCode;
    void save(
      { fields, privacyConsent, requestChange: unlocked ? ['taxId'] : undefined },
      {
        successMessage: t('toast.savedSection', { section: t('fiscal.title') }),
        onSuccess: () => {
          setUnlocked(false);
          setTouched({});
        },
      },
    );
  };

  return (
    <>
      <SectionCard
        id="section-fiscal"
        dataTour="d-payments-fiscal"
        title={t('fiscal.title')}
        description={t('fiscal.description')}
        icon={DocumentTextIcon}
        tooltip={t('fiscal.tooltip')}
        tooltipAriaLabel={t('common.help', { field: t('fiscal.title') })}
        onSave={handleSave}
        saveLabel={t('common.save')}
        savingLabel={t('common.saving')}
        dirtyLabel={t('common.dirty')}
        cleanLabel={t('common.clean')}
        isDirty={dirty}
        isSaving={isSaving}
        saveDisabled={consentBlocked}
        saveDisabledReason={consentBlocked ? t('consent.blocked') : undefined}
        statusMessage={status?.message ?? null}
        statusTone={status?.tone}
      >
        {locked && (
          <LockedNotice
            title={t('fiscal.lockedTitle')}
            body={t('fiscal.lockedBody')}
            actionLabel={t('common.requestChange')}
            onRequestChange={() => setChangeOpen(true)}
            disabled={isSaving}
          />
        )}

        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{t('fiscal.note')}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* RFC */}
          <FieldGroup id="field-rfc">
            <FieldLabel
              htmlFor="pay-rfc"
              label={t('fiscal.rfc')}
              tooltip={t('fiscal.rfcTooltip')}
              tooltipAriaLabel={t('common.help', { field: t('fiscal.rfc') })}
              required
              requiredLabel={t('common.requiredMark')}
              locked={locked}
              lockedLabel={t('common.locked')}
            />
            <Input
              id="pay-rfc"
              value={form.rfc}
              onChange={(e) => {
                const v = e.target.value.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '').slice(0, 13);
                setForm((f) => ({ ...f, rfc: v }));
              }}
              onBlur={() => setTouched((x) => ({ ...x, rfc: true }))}
              maxLength={13}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={fieldsDisabled}
              aria-invalid={Boolean(rfcError)}
              aria-describedby="pay-rfc-msg"
              className="font-mono uppercase tracking-wide"
            />
            <FieldMessage
              id="pay-rfc-msg"
              error={rfcError}
              success={
                rfcCheck?.ok
                  ? matchesCurp === true
                    ? t('fiscal.rfcMatchesCurp')
                    : matchesCurp === false
                      ? null
                      : t('fiscal.rfcValid')
                  : null
              }
              hint={
                matchesCurp === false ? (
                  <span className="text-amber-700">{t('fiscal.rfcMismatchCurp')}</span>
                ) : (
                  t('fiscal.rfcCount', { count: rfcNorm.length })
                )
              }
            />
          </FieldGroup>

          {/* CP fiscal */}
          <FieldGroup id="field-fiscalZipCode">
            <FieldLabel
              htmlFor="pay-zip"
              label={t('fiscal.fiscalZipCode')}
              tooltip={t('fiscal.fiscalZipCodeTooltip')}
              tooltipAriaLabel={t('common.help', { field: t('fiscal.fiscalZipCode') })}
              required
              requiredLabel={t('common.requiredMark')}
            />
            <Input
              id="pay-zip"
              inputMode="numeric"
              value={form.fiscalZipCode}
              onChange={(e) => setForm((f) => ({ ...f, fiscalZipCode: onlyDigits(e.target.value).slice(0, 5) }))}
              onBlur={() => setTouched((x) => ({ ...x, fiscalZipCode: true }))}
              maxLength={5}
              autoComplete="postal-code"
              disabled={fieldsDisabled}
              aria-invalid={Boolean(zipError && touched.fiscalZipCode)}
              aria-describedby="pay-zip-msg"
              className="font-mono"
            />
            <FieldMessage id="pay-zip-msg" error={touched.fiscalZipCode ? zipError : null} hint={t('fiscal.fiscalZipCodeHint')} />
          </FieldGroup>

          {/* Régimen SAT */}
          <FieldGroup id="field-satRegimeCode" className="sm:col-span-2">
            <FieldLabel
              htmlFor="pay-satRegime"
              label={t('fiscal.satRegime')}
              tooltip={t('fiscal.satRegimeTooltip')}
              tooltipAriaLabel={t('common.help', { field: t('fiscal.satRegime') })}
              required
              requiredLabel={t('common.requiredMark')}
            />
            {catalogsLoading && regimeOptions.length === 0 ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <SearchableSelect
                id="pay-satRegime"
                options={regimeOptions}
                value={form.satRegimeCode}
                onChange={(v) => {
                  setForm((f) => ({ ...f, satRegimeCode: v }));
                  setTouched((x) => ({ ...x, satRegimeCode: true }));
                }}
                placeholder={regimeName || t('fiscal.satRegimePlaceholder')}
                showAllOption={false}
                disabled={fieldsDisabled}
                aria-describedby="pay-satRegime-msg"
                className="w-full"
              />
            )}
            <FieldMessage id="pay-satRegime-msg" hint={t('fiscal.satRegimeHint')} />
          </FieldGroup>

          {/* Régimen de comisión (asignado por Tesorería) */}
          <FieldGroup id="field-commissionRegime" className="sm:col-span-2">
            <FieldLabel
              htmlFor="pay-commissionRegime"
              label={t('fiscal.commissionRegime')}
              tooltip={t('fiscal.commissionRegimeTooltip')}
              tooltipAriaLabel={t('common.help', { field: t('fiscal.commissionRegime') })}
            />
            <Input
              id="pay-commissionRegime"
              value={fiscal.commissionRegime ? `${fiscal.commissionRegime.name} (${fiscal.commissionRegime.code})` : ''}
              placeholder={t('fiscal.commissionRegimeNone')}
              readOnly
              disabled
              className="bg-muted"
              aria-describedby="pay-commissionRegime-msg"
            />
            <FieldMessage id="pay-commissionRegime-msg" hint={t('fiscal.commissionRegimeHint')} />
          </FieldGroup>
        </div>
      </SectionCard>

      <RequestChangeDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        documents={['taxId']}
        subject={t('fiscal.title')}
        onConfirm={() => {
          setUnlocked(true);
          setChangeOpen(false);
        }}
      />
    </>
  );
}
