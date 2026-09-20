'use client';

// PersonalSection.tsx — Datos personales: email (solo lectura, TRS_EMAIL_READONLY),
// teléfono, CURP con verificación en vivo y número de INE. CURP/nº INE se
// bloquean cuando la INE está validada; editarlos exige "Solicitar cambio"
// (requestChange: ['ine']) y reinicia esa validación.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { localeLanguage } from '@/i18n/config';
import { isValidLocalNumber, parsePhone } from '@/lib/phone';
import type { PaymentDataResponse, UpdatePaymentDataFields } from '@/types/distributor-payment';
import { SectionCard } from './SectionCard';
import { FieldGroup, FieldLabel, FieldMessage, LockedNotice } from './PaymentField';
import { RequestChangeDialog } from './RequestChangeDialog';
import { useSectionSave } from './useSectionSave';
import { useServerForm } from './useServerForm';
import { checkCurp, isMexicoLike, normalizeId, regionName } from './paymentUtils';

interface PersonalSectionProps {
  data: PaymentDataResponse;
  consentBlocked: boolean;
  privacyConsent: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

interface FormState {
  phone: string;
  curp: string;
  ineNumber: string;
}

function fromData(data: PaymentDataResponse): FormState {
  const p = data.sections.personal;
  return {
    phone: p.phone ?? '',
    curp: p.curp ?? '',
    ineNumber: p.ineNumber ?? '',
  };
}

export function PersonalSection({ data, consentBlocked, privacyConsent, onDirtyChange }: PersonalSectionProps) {
  const t = useTranslations('distributor.payments');
  const lang = localeLanguage(useLocale());
  const mx = isMexicoLike(data.country);
  const personal = data.sections.personal;

  const { form, setForm, baseline, dirty } = useServerForm(data, fromData);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [unlocked, setUnlocked] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const { save, isSaving, status } = useSectionSave();

  const locked = (personal.locked?.curp || personal.locked?.ineNumber) && !unlocked;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // --- validación en vivo ---
  const curpNorm = normalizeId(form.curp);
  const curpCheck = mx && curpNorm ? checkCurp(curpNorm) : null;
  const curpError =
    curpCheck && !curpCheck.ok && (touched.curp || curpNorm.length === 18)
      ? t(`validation.curp.${curpCheck.reason && t.has(`validation.curp.${curpCheck.reason}`) ? curpCheck.reason : 'generic'}`)
      : null;
  const phoneParsed = parsePhone(form.phone);
  const phoneError =
    form.phone && !isValidLocalNumber(phoneParsed.country, phoneParsed.number)
      ? t('validation.phone')
      : null;

  const canSave = !curpError && !phoneError;

  const handleSave = () => {
    setTouched({ phone: true, curp: true, ineNumber: true });
    if (!canSave) return;
    const fields: UpdatePaymentDataFields = {};
    if (form.phone !== baseline.phone) fields.phone = form.phone;
    if (mx && curpNorm !== normalizeId(baseline.curp)) fields.curp = curpNorm;
    if (mx && form.ineNumber.trim() !== baseline.ineNumber.trim()) fields.ineNumber = form.ineNumber.trim();
    const needsChange = unlocked && (fields.curp !== undefined || fields.ineNumber !== undefined);
    void save(
      {
        fields,
        privacyConsent,
        requestChange: needsChange ? ['ine'] : undefined,
      },
      {
        successMessage: t('toast.savedSection', { section: t('personal.title') }),
        onSuccess: () => {
          setUnlocked(false);
          setTouched({});
        },
      },
    );
  };

  const countryName = (code: string) => regionName(code, lang);

  return (
    <>
      <SectionCard
        id="section-personal"
        dataTour="d-payments-personal"
        title={t('personal.title')}
        description={t('personal.description')}
        icon={UserCircleIcon}
        tooltip={t('personal.tooltip')}
        tooltipAriaLabel={t('common.help', { field: t('personal.title') })}
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
            title={t('personal.lockedTitle')}
            body={t('personal.lockedBody')}
            actionLabel={t('common.requestChange')}
            onRequestChange={() => setChangeOpen(true)}
            disabled={isSaving}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Email (solo lectura) */}
          <FieldGroup id="field-email">
            <FieldLabel
              htmlFor="pay-email"
              label={t('personal.email')}
              tooltip={t('personal.emailTooltip')}
              tooltipAriaLabel={t('common.help', { field: t('personal.email') })}
            />
            <Input
              id="pay-email"
              type="email"
              value={personal.email ?? ''}
              readOnly
              disabled
              aria-describedby="pay-email-msg"
              className="bg-muted"
            />
            <FieldMessage
              id="pay-email-msg"
              hint={
                <>
                  {t('personal.emailReadOnly')}{' '}
                  <Link href="/distribuidor/perfil" className="text-primary underline underline-offset-2">
                    {t('personal.emailLink')}
                  </Link>
                </>
              }
            />
          </FieldGroup>

          {/* Teléfono */}
          <FieldGroup id="field-phone">
            <FieldLabel
              htmlFor="pay-phone"
              label={t('personal.phone')}
              tooltip={t('personal.phoneTooltip')}
              tooltipAriaLabel={t('common.help', { field: t('personal.phone') })}
              required
              requiredLabel={t('common.requiredMark')}
            />
            <PhoneInput
              id="pay-phone"
              value={form.phone}
              onChange={(v) => {
                setForm((f) => ({ ...f, phone: v }));
                setTouched((x) => ({ ...x, phone: true }));
              }}
              disabled={isSaving}
              getCountryName={(c) => countryName(c.code)}
              texts={{
                dialLabel: t('personal.phoneDial'),
                hint: t('personal.phoneHint'),
                invalid: t('personal.phoneInvalid'),
              }}
              aria-describedby="pay-phone-msg"
              aria-invalid={Boolean(phoneError && touched.phone)}
            />
            <FieldMessage id="pay-phone-msg" error={touched.phone ? phoneError : null} />
          </FieldGroup>

          {mx && (
            <>
              {/* CURP */}
              <FieldGroup id="field-curp">
                <FieldLabel
                  htmlFor="pay-curp"
                  label={t('personal.curp')}
                  tooltip={t('personal.curpTooltip')}
                  tooltipAriaLabel={t('common.help', { field: t('personal.curp') })}
                  required
                  requiredLabel={t('common.requiredMark')}
                  locked={Boolean(personal.locked?.curp && !unlocked)}
                  lockedLabel={t('common.locked')}
                />
                <Input
                  id="pay-curp"
                  value={form.curp}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-ZÑ0-9]/g, '').slice(0, 18);
                    setForm((f) => ({ ...f, curp: v }));
                  }}
                  onBlur={() => setTouched((x) => ({ ...x, curp: true }))}
                  maxLength={18}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={isSaving || Boolean(personal.locked?.curp && !unlocked)}
                  aria-invalid={Boolean(curpError)}
                  aria-describedby="pay-curp-msg"
                  className="font-mono uppercase tracking-wide"
                />
                <FieldMessage
                  id="pay-curp-msg"
                  error={curpError}
                  success={curpCheck?.ok ? t('personal.curpValid') : null}
                  hint={t('personal.curpCount', { count: curpNorm.length })}
                />
              </FieldGroup>

              {/* Número de INE */}
              <FieldGroup id="field-ineNumber">
                <FieldLabel
                  htmlFor="pay-ineNumber"
                  label={t('personal.ineNumber')}
                  tooltip={t('personal.ineNumberTooltip')}
                  tooltipAriaLabel={t('common.help', { field: t('personal.ineNumber') })}
                  required
                  requiredLabel={t('common.requiredMark')}
                  locked={Boolean(personal.locked?.ineNumber && !unlocked)}
                  lockedLabel={t('common.locked')}
                />
                <Input
                  id="pay-ineNumber"
                  value={form.ineNumber}
                  onChange={(e) => setForm((f) => ({ ...f, ineNumber: e.target.value.slice(0, 20) }))}
                  maxLength={20}
                  autoComplete="off"
                  disabled={isSaving || Boolean(personal.locked?.ineNumber && !unlocked)}
                  aria-describedby="pay-ineNumber-msg"
                />
                <FieldMessage id="pay-ineNumber-msg" hint={t('personal.ineNumberHint')} />
              </FieldGroup>
            </>
          )}
        </div>
      </SectionCard>

      <RequestChangeDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        documents={['ine']}
        subject={t('personal.title')}
        onConfirm={() => {
          setUnlocked(true);
          setChangeOpen(false);
        }}
      />
    </>
  );
}
