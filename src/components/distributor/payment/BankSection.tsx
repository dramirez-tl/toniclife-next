'use client';

// BankSection.tsx — Cuenta para depósitos, por país:
//  · MX/FN: CLABE (banco detectado al teclear 3 dígitos + dígito verificador) + titular.
//  · US: routing ABA + número de cuenta + tipo + titular.
//  · CO/GT (u otros): banco + número de cuenta + titular.
// La moneda es la del país (API). Cambiar la cuenta crea una fila NUEVA sin
// verificar (la anterior se retira); si la carátula ya estaba validada, hay
// que "Solicitar cambio" (requestChange: ['bankStatement']).

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BuildingLibraryIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { localeLanguage } from '@/i18n/config';
import type {
  BankAccountType,
  PaymentCatalogs,
  PaymentDataResponse,
  UpdatePaymentDataFields,
} from '@/types/distributor-payment';
import { SectionCard } from './SectionCard';
import { FieldGroup, FieldLabel, FieldMessage, LockedNotice } from './PaymentField';
import { RequestChangeDialog } from './RequestChangeDialog';
import { useSectionSave } from './useSectionSave';
import { useServerForm } from './useServerForm';
import {
  bankFormKind,
  bankFromClabe,
  checkClabe,
  checkRouting,
  formatDate,
  onlyDigits,
  regionName,
} from './paymentUtils';

interface BankSectionProps {
  data: PaymentDataResponse;
  catalogs: PaymentCatalogs | undefined;
  consentBlocked: boolean;
  privacyConsent: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

interface FormState {
  clabe: string;
  routingNumber: string;
  accountNumber: string;
  accountType: BankAccountType | '';
  bankName: string;
  accountHolder: string;
}

const EMPTY: FormState = {
  clabe: '',
  routingNumber: '',
  accountNumber: '',
  accountType: '',
  bankName: '',
  accountHolder: '',
};

/** Los números de cuenta nunca vuelven del API (solo máscara): el form arranca vacío. */
function fromData(data: PaymentDataResponse): FormState {
  const b = data.sections.bank;
  return {
    ...EMPTY,
    accountType: b.accountType ?? '',
    bankName: bankFormKind(data.country) === 'generic' ? (b.bankName ?? '') : '',
    accountHolder: b.accountHolder ?? '',
  };
}

export function BankSection({ data, catalogs, consentBlocked, privacyConsent, onDirtyChange }: BankSectionProps) {
  const t = useTranslations('distributor.payments');
  const lang = localeLanguage(useLocale());
  const kind = bankFormKind(data.country);
  const bank = data.sections.bank;
  const currency = bank.currency || data.currency;

  const { form, setForm, baseline, dirty } = useServerForm(data, fromData);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [unlocked, setUnlocked] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const { save, isSaving, status } = useSectionSave();

  const locked = bank.locked && !unlocked;
  const fieldsDisabled = isSaving || locked;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // --- validación en vivo ---
  const clabeDigits = onlyDigits(form.clabe);
  const detected = kind === 'clabe' ? bankFromClabe(clabeDigits) : null;
  const catalogBank =
    detected && catalogs?.banks?.find((b) => b.code === detected.code);
  const detectedName = catalogBank?.name ?? detected?.name ?? null;
  const clabeCheck = kind === 'clabe' && clabeDigits ? checkClabe(clabeDigits) : null;
  const clabeError =
    clabeCheck && !clabeCheck.ok && (touched.clabe || clabeDigits.length === 18)
      ? t(`validation.clabe.${clabeCheck.reason && t.has(`validation.clabe.${clabeCheck.reason}`) ? clabeCheck.reason : 'generic'}`)
      : null;
  const routingDigits = onlyDigits(form.routingNumber);
  const routingCheck = kind === 'us' && routingDigits ? checkRouting(routingDigits) : null;
  const routingError =
    routingCheck && !routingCheck.ok && (touched.routingNumber || routingDigits.length === 9)
      ? t('validation.routing.generic')
      : null;
  const accountError =
    kind !== 'clabe' && form.accountNumber && (form.accountNumber.length < 4 || form.accountNumber.length > 20)
      ? t('validation.accountNumber')
      : null;

  // Solo se manda la cuenta cuando el distribuidor capturó una nueva.
  const enteringNewAccount =
    kind === 'clabe' ? clabeDigits.length > 0 : kind === 'us' ? routingDigits.length > 0 || form.accountNumber.length > 0 : form.accountNumber.length > 0;

  const canSave = !clabeError && !routingError && !accountError;

  const handleSave = () => {
    setTouched({ clabe: true, routingNumber: true, accountNumber: true, accountType: true, bankName: true, accountHolder: true });
    if (!canSave) return;
    const fields: UpdatePaymentDataFields = {};
    const holder = form.accountHolder.trim().toUpperCase();
    if (holder !== baseline.accountHolder.trim().toUpperCase()) fields.accountHolder = holder;
    if (enteringNewAccount) {
      fields.accountHolder = holder;
      if (kind === 'clabe') {
        fields.clabe = clabeDigits;
      } else if (kind === 'us') {
        fields.routingNumber = routingDigits;
        fields.accountNumber = form.accountNumber.trim();
        if (form.accountType) fields.accountType = form.accountType;
      } else {
        fields.bankName = form.bankName.trim();
        fields.accountNumber = form.accountNumber.trim();
      }
    } else if (kind === 'generic' && form.bankName.trim() !== baseline.bankName.trim()) {
      fields.bankName = form.bankName.trim();
    } else if (kind === 'us' && form.accountType && form.accountType !== baseline.accountType) {
      fields.accountType = form.accountType;
    }
    void save(
      { fields, privacyConsent, requestChange: unlocked ? ['bankStatement'] : undefined },
      {
        successMessage: t('toast.savedSection', { section: t('bank.title') }),
        onSuccess: () => {
          setUnlocked(false);
          setTouched({});
          setForm((f) => ({ ...f, clabe: '', routingNumber: '', accountNumber: '' }));
        },
      },
    );
  };

  const hasAccount = Boolean(bank.accountMasked);

  return (
    <>
      <SectionCard
        id="section-bank"
        dataTour="d-payments-bank"
        title={t('bank.title')}
        description={t('bank.currencyNote', { currency, country: regionName(data.country, lang) })}
        icon={BuildingLibraryIcon}
        tooltip={t(`bank.tooltip.${kind}`)}
        tooltipAriaLabel={t('common.help', { field: t('bank.title') })}
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
        headerBadge={
          hasAccount ? (
            bank.isVerified ? (
              <Badge variant="success" className="gap-1">
                <CheckBadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {t('bank.verified')}
              </Badge>
            ) : (
              <Badge variant="warning">{t('bank.unverified')}</Badge>
            )
          ) : null
        }
      >
        {locked && (
          <LockedNotice
            title={t('bank.lockedTitle')}
            body={t('bank.lockedBody')}
            actionLabel={t('common.requestChange')}
            onRequestChange={() => setChangeOpen(true)}
            disabled={isSaving}
          />
        )}

        {/* Cuenta actual (enmascarada) */}
        {hasAccount && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm" id="field-bank-current">
            <p className="font-medium text-foreground">
              {t('bank.current', {
                bank: bank.bankName || (bank.bankCode ? `#${bank.bankCode}` : '—'),
                masked: bank.accountMasked ?? '',
              })}
              {bank.routingMasked && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {t('bank.routing')}: {bank.routingMasked}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {bank.accountHolder ? `${t('bank.accountHolder')}: ${bank.accountHolder} · ` : ''}
              {bank.currency ?? currency}
              {bank.isVerified && bank.verifiedAt
                ? ` · ${t('bank.verifiedAt', { date: formatDate(bank.verifiedAt, lang) })}`
                : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('bank.replaceNotice')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" id="field-bank">
          {kind === 'clabe' && (
            <FieldGroup id="field-clabe" className="sm:col-span-2">
              <FieldLabel
                htmlFor="pay-clabe"
                label={hasAccount ? t('bank.clabeNew') : t('bank.clabe')}
                tooltip={t('bank.clabeTooltip')}
                tooltipAriaLabel={t('common.help', { field: t('bank.clabe') })}
                required={!hasAccount}
                requiredLabel={t('common.requiredMark')}
                locked={locked}
                lockedLabel={t('common.locked')}
              />
              <Input
                id="pay-clabe"
                inputMode="numeric"
                value={form.clabe}
                onChange={(e) => setForm((f) => ({ ...f, clabe: onlyDigits(e.target.value).slice(0, 18) }))}
                onBlur={() => setTouched((x) => ({ ...x, clabe: true }))}
                maxLength={18}
                autoComplete="off"
                disabled={fieldsDisabled}
                aria-invalid={Boolean(clabeError)}
                aria-describedby="pay-clabe-msg"
                className="font-mono tracking-widest"
              />
              <FieldMessage
                id="pay-clabe-msg"
                error={clabeError}
                success={
                  clabeCheck?.ok
                    ? t('bank.clabeValid', { bank: detectedName ?? t('bank.bankUnknown') })
                    : null
                }
                hint={
                  <>
                    {t('bank.clabeCount', { count: clabeDigits.length })}
                    {clabeDigits.length >= 3 && !clabeCheck?.ok && (
                      <>
                        {' · '}
                        {detectedName
                          ? t('bank.bankDetected', { bank: detectedName })
                          : t('bank.bankUnknown')}
                      </>
                    )}
                  </>
                }
              />
            </FieldGroup>
          )}

          {kind === 'us' && (
            <>
              <FieldGroup id="field-routing">
                <FieldLabel
                  htmlFor="pay-routing"
                  label={t('bank.routing')}
                  tooltip={t('bank.routingTooltip')}
                  tooltipAriaLabel={t('common.help', { field: t('bank.routing') })}
                  required={!hasAccount}
                  requiredLabel={t('common.requiredMark')}
                  locked={locked}
                  lockedLabel={t('common.locked')}
                />
                <Input
                  id="pay-routing"
                  inputMode="numeric"
                  value={form.routingNumber}
                  onChange={(e) => setForm((f) => ({ ...f, routingNumber: onlyDigits(e.target.value).slice(0, 9) }))}
                  onBlur={() => setTouched((x) => ({ ...x, routingNumber: true }))}
                  maxLength={9}
                  autoComplete="off"
                  disabled={fieldsDisabled}
                  aria-invalid={Boolean(routingError)}
                  aria-describedby="pay-routing-msg"
                  className="font-mono tracking-widest"
                />
                <FieldMessage
                  id="pay-routing-msg"
                  error={routingError}
                  success={routingCheck?.ok ? t('bank.routingValid') : null}
                  hint={t('bank.routingHint', { count: routingDigits.length })}
                />
              </FieldGroup>

              <FieldGroup id="field-accountNumber">
                <FieldLabel
                  htmlFor="pay-account"
                  label={t('bank.accountNumber')}
                  tooltip={t('bank.accountNumberTooltip')}
                  tooltipAriaLabel={t('common.help', { field: t('bank.accountNumber') })}
                  required={!hasAccount}
                  requiredLabel={t('common.requiredMark')}
                />
                <Input
                  id="pay-account"
                  inputMode="numeric"
                  value={form.accountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\s+/g, '').slice(0, 20) }))}
                  onBlur={() => setTouched((x) => ({ ...x, accountNumber: true }))}
                  maxLength={20}
                  autoComplete="off"
                  disabled={fieldsDisabled}
                  aria-invalid={Boolean(accountError && touched.accountNumber)}
                  aria-describedby="pay-account-msg"
                  className="font-mono tracking-widest"
                />
                <FieldMessage id="pay-account-msg" error={touched.accountNumber ? accountError : null} hint={t('bank.accountNumberHint')} />
              </FieldGroup>

              <FieldGroup id="field-accountType" className="sm:col-span-2">
                <FieldLabel
                  htmlFor="pay-accountType-checking"
                  label={t('bank.accountType')}
                  required={!hasAccount}
                  requiredLabel={t('common.requiredMark')}
                />
                <RadioGroup
                  value={form.accountType}
                  onValueChange={(v) => setForm((f) => ({ ...f, accountType: v as BankAccountType }))}
                  disabled={fieldsDisabled}
                  className="flex flex-wrap gap-4"
                  aria-label={t('bank.accountType')}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="pay-accountType-checking" value="checking" />
                    <Label htmlFor="pay-accountType-checking" className="font-normal">
                      {t('bank.accountTypeChecking')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="pay-accountType-savings" value="savings" />
                    <Label htmlFor="pay-accountType-savings" className="font-normal">
                      {t('bank.accountTypeSavings')}
                    </Label>
                  </div>
                </RadioGroup>
              </FieldGroup>
            </>
          )}

          {kind === 'generic' && (
            <>
              <FieldGroup id="field-bankName">
                <FieldLabel
                  htmlFor="pay-bankName"
                  label={t('bank.bankName')}
                  tooltip={t('bank.bankNameTooltip')}
                  tooltipAriaLabel={t('common.help', { field: t('bank.bankName') })}
                  required={!hasAccount}
                  requiredLabel={t('common.requiredMark')}
                  locked={locked}
                  lockedLabel={t('common.locked')}
                />
                <Input
                  id="pay-bankName"
                  value={form.bankName}
                  onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value.slice(0, 100) }))}
                  maxLength={100}
                  autoComplete="organization"
                  placeholder={t('bank.bankNamePlaceholder')}
                  disabled={fieldsDisabled}
                  aria-describedby="pay-bankName-msg"
                />
                <FieldMessage id="pay-bankName-msg" hint={t('bank.bankNameHint')} />
              </FieldGroup>

              <FieldGroup id="field-accountNumber">
                <FieldLabel
                  htmlFor="pay-account"
                  label={t('bank.accountNumber')}
                  tooltip={t('bank.accountNumberTooltip')}
                  tooltipAriaLabel={t('common.help', { field: t('bank.accountNumber') })}
                  required={!hasAccount}
                  requiredLabel={t('common.requiredMark')}
                />
                <Input
                  id="pay-account"
                  inputMode="numeric"
                  value={form.accountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\s+/g, '').slice(0, 20) }))}
                  onBlur={() => setTouched((x) => ({ ...x, accountNumber: true }))}
                  maxLength={20}
                  autoComplete="off"
                  disabled={fieldsDisabled}
                  aria-invalid={Boolean(accountError && touched.accountNumber)}
                  aria-describedby="pay-account-msg"
                  className="font-mono tracking-widest"
                />
                <FieldMessage id="pay-account-msg" error={touched.accountNumber ? accountError : null} hint={t('bank.accountNumberHint')} />
              </FieldGroup>
            </>
          )}

          {/* Titular */}
          <FieldGroup id="field-accountHolder" className="sm:col-span-2">
            <FieldLabel
              htmlFor="pay-holder"
              label={t('bank.accountHolder')}
              tooltip={t('bank.accountHolderTooltip')}
              tooltipAriaLabel={t('common.help', { field: t('bank.accountHolder') })}
              required
              requiredLabel={t('common.requiredMark')}
            />
            <Input
              id="pay-holder"
              value={form.accountHolder}
              onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value.toUpperCase().slice(0, 200) }))}
              maxLength={200}
              autoComplete="name"
              autoCapitalize="characters"
              placeholder={t('bank.accountHolderPlaceholder')}
              disabled={fieldsDisabled}
              aria-describedby="pay-holder-msg"
              className="uppercase"
            />
            <FieldMessage id="pay-holder-msg" hint={t('bank.accountHolderHint')} />
          </FieldGroup>
        </div>
      </SectionCard>

      <RequestChangeDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        documents={['bankStatement']}
        subject={t('bank.title')}
        onConfirm={() => {
          setUnlocked(true);
          setChangeOpen(false);
        }}
      />
    </>
  );
}
