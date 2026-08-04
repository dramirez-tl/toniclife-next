'use client';

// Panel de alta de un nuevo miembro en la red del distribuidor.
// - Colocación bajo cualquier nodo de su red (o bajo sí mismo).
// - Modo de pago del kit:
//     · invite  → se crea el miembro y se le envía invitación por correo para
//                 que inicie sesión, elija y pague su kit (Ruta B).
//     · sponsor → el patrocinador paga el kit ahora: se genera una orden + URL
//                 de Stripe (Ruta A). Al pagarse, el miembro se activa.

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Loader2 } from 'lucide-react';
import {
  XMarkIcon,
  CheckCircleIcon,
  CreditCardIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { kitsService } from '@/services/kits.service';
import { networkApi } from '@/services/networkApi';
import { configService } from '@/services/config.service';
import { useRegisterMember } from '@/hooks/useDistributor';
import type {
  RegisterMemberResult,
  KitPayerMode,
} from '@/services/distributorApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY = {
  firstName: '',
  lastName: '',
  mothersLastName: '',
  email: '',
  phone: '',
  rfc: '',
  // Fecha de nacimiento OBLIGATORIA + datos adicionales opcionales.
  birthDate: '',
  nationality: '',
  curp: '',
  maritalStatus: '',
  postalCode: '',
  identificationType: '',
};

// Valores canónicos (mismos que el POS) — la etiqueta se traduce, el valor no.
const MARITAL_VALUES = [
  'soltero',
  'casado',
  'union_libre',
  'divorciado',
  'viudo',
] as const;

/** Tipos de identificación oficial según el país de residencia elegido. */
function idTypeOptionsFor(countryCode?: string): string[] {
  switch (countryCode) {
    case 'MX':
    case 'FN':
      return ['INE', 'Pasaporte', 'Cédula profesional', 'Otro'];
    case 'US':
      return ['Licencia de conducir', 'Pasaporte', 'ID estatal', 'Otro'];
    default:
      return ['DNI', 'Pasaporte', 'Otro'];
  }
}

export function MemberEnrollmentPanel({ isOpen, onClose }: Props) {
  const t = useTranslations('distributor.enroll');
  const [form, setForm] = useState({ ...EMPTY });
  const [uplineCustomerId, setUplineCustomerId] = useState(''); // '' = bajo mí
  const [countryId, setCountryId] = useState(''); // '' = mismo país que el patrocinador
  const [kitProductId, setKitProductId] = useState('');
  const [payerMode, setPayerMode] = useState<KitPayerMode>('invite');
  const [result, setResult] = useState<RegisterMemberResult | null>(null);

  const registerMutation = useRegisterMember();

  // País de residencia del nuevo miembro: define portal, catálogo y precios.
  const countriesQuery = useQuery({
    queryKey: ['active-countries'],
    queryFn: () => configService.getActiveCountries(),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const kitsQuery = useQuery({
    queryKey: ['enrollment-kits'],
    queryFn: () => kitsService.listKits({ limit: 100 }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const downlinesQuery = useQuery({
    queryKey: ['enroll-downlines'],
    queryFn: () =>
      networkApi.getDownlines({
        limit: 100,
        sortBy: 'level',
        sortOrder: 'asc',
      }),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const kitOptions = useMemo(
    () =>
      (kitsQuery.data?.data ?? []).map((k) => ({
        value: k.id,
        label: k.price
          ? t('member.kitOptionWithPrice', {
              name: k.name,
              price: Number(k.price).toLocaleString(),
            })
          : k.name,
      })),
    [kitsQuery.data, t],
  );

  const uplineOptions = useMemo(
    () =>
      (downlinesQuery.data?.data ?? []).map((m) => ({
        value: m.id,
        label: t('member.uplineOption', { name: m.fullName, level: m.level }),
      })),
    [downlinesQuery.data, t],
  );

  const set = (k: keyof typeof EMPTY, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const countryOptions = useMemo(
    () =>
      (countriesQuery.data ?? []).map((c) => ({
        value: c.id,
        label: c.currencyCode ? `${c.name} (${c.currencyCode})` : c.name,
      })),
    [countriesQuery.data],
  );

  const resetAll = () => {
    setForm({ ...EMPTY });
    setUplineCustomerId('');
    setCountryId('');
    setKitProductId('');
    setPayerMode('invite');
  };

  const handleClose = () => {
    onClose();
    // limpiar tras la animación de cierre
    window.setTimeout(() => {
      setResult(null);
      resetAll();
    }, 300);
  };

  // País elegido (o defaults MX cuando hereda el del patrocinador — el
  // mercado dominante): decide CURP y las opciones de identificación.
  const selectedCountryCode = countryId
    ? (countriesQuery.data ?? [])
        .find((c) => c.id === countryId)
        ?.code?.trim()
        .toUpperCase()
    : 'MX';
  const showCurp = selectedCountryCode === 'MX' || selectedCountryCode === 'FN';
  const todayIso = new Date().toISOString().slice(0, 10);

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.birthDate.trim() &&
    form.birthDate <= todayIso &&
    (payerMode === 'invite' || !!kitProductId) &&
    !registerMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (payerMode === 'sponsor' && !kitProductId) {
      toast.error(t('member.errChooseKit'));
      return;
    }
    try {
      const res = await registerMutation.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mothersLastName: form.mothersLastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim(),
        rfc: form.rfc.trim() || undefined,
        birthDate: form.birthDate,
        nationality: form.nationality.trim() || undefined,
        curp: showCurp ? form.curp.trim().toUpperCase() || undefined : undefined,
        maritalStatus: form.maritalStatus || undefined,
        postalCode: form.postalCode.trim() || undefined,
        identificationType: form.identificationType || undefined,
        uplineCustomerId: uplineCustomerId || undefined,
        countryId: countryId || undefined,
        kitProductId: kitProductId || undefined,
        payerMode,
      });
      setResult(res);
      toast.success(t('member.createdSuccess'));
      if (payerMode === 'sponsor' && res.paymentUrl) {
        window.open(res.paymentUrl, '_blank', 'noopener');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t('member.createError');
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('common.copied'));
    } catch {
      toast.error(t('common.copyError'));
    }
  };

  return (
    <>
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-xl transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t('member.ariaLabel')}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-lg font-bold text-gray-900">
              {t('member.title')}
            </h3>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label={t('common.closeAria')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {result ? (
              <ResultView result={result} onCopy={copy} onClose={handleClose} />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Datos personales */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('common.firstName')} required>
                    <input
                      className={inputCls}
                      value={form.firstName}
                      onChange={(e) => set('firstName', e.target.value)}
                      required
                    />
                  </Field>
                  <Field label={t('common.lastName')} required>
                    <input
                      className={inputCls}
                      value={form.lastName}
                      onChange={(e) => set('lastName', e.target.value)}
                      required
                    />
                  </Field>
                  <Field label={t('common.mothersLastName')}>
                    <input
                      className={inputCls}
                      value={form.mothersLastName}
                      onChange={(e) => set('mothersLastName', e.target.value)}
                    />
                  </Field>
                  <Field label={t('common.rfc')}>
                    <input
                      className={`${inputCls} uppercase`}
                      value={form.rfc}
                      onChange={(e) => set('rfc', e.target.value)}
                      maxLength={13}
                    />
                  </Field>
                  <Field label={t('common.email')} required>
                    <input
                      type="email"
                      className={inputCls}
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      required
                    />
                  </Field>
                  <Field label={t('common.phone')} required>
                    <PhoneInput
                      value={form.phone}
                      onChange={(v) => set('phone', v)}
                    />
                  </Field>
                  <Field label={t('common.birthDate')} required>
                    <input
                      type="date"
                      className={inputCls}
                      value={form.birthDate}
                      max={todayIso}
                      onChange={(e) => set('birthDate', e.target.value)}
                      required
                    />
                  </Field>
                </div>

                {/* Datos adicionales (todos opcionales) */}
                <div className="rounded-lg border border-dashed border-gray-300 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t('common.extraTitle')}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('common.nationality')}>
                      <input
                        className={inputCls}
                        value={form.nationality}
                        onChange={(e) => set('nationality', e.target.value)}
                      />
                    </Field>
                    <Field label={t('common.maritalStatus')}>
                      <SearchableSelect
                        options={MARITAL_VALUES.map((v) => ({
                          value: v,
                          label: t(`common.marital.${v}`),
                        }))}
                        value={form.maritalStatus}
                        onChange={(v) => set('maritalStatus', v)}
                        allLabel={t('common.maritalNone')}
                        allValue=""
                      />
                    </Field>
                    {showCurp && (
                      <Field label={t('common.curp')}>
                        <input
                          className={`${inputCls} uppercase`}
                          value={form.curp}
                          onChange={(e) => set('curp', e.target.value)}
                          maxLength={18}
                        />
                      </Field>
                    )}
                    <Field label={t('common.postalCode')}>
                      <input
                        className={inputCls}
                        value={form.postalCode}
                        onChange={(e) => set('postalCode', e.target.value)}
                        maxLength={10}
                      />
                    </Field>
                    <Field label={t('common.idType')}>
                      <SearchableSelect
                        options={idTypeOptionsFor(selectedCountryCode).map(
                          (v) => ({ value: v, label: v }),
                        )}
                        value={form.identificationType}
                        onChange={(v) => set('identificationType', v)}
                        allLabel={t('common.idTypeNone')}
                        allValue=""
                      />
                    </Field>
                  </div>
                </div>

                {/* País de residencia: define portal, catálogo y precios */}
                <Field label={t('member.countryLabel')}>
                  <SearchableSelect
                    options={countryOptions}
                    value={countryId}
                    onChange={setCountryId}
                    allLabel={t('member.countryInherit')}
                    allValue=""
                    placeholder={
                      countriesQuery.isLoading
                        ? t('member.countryLoading')
                        : t('member.countryLabel')
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('member.countryHelp')}
                  </p>
                </Field>

                {/* Colocación en la red */}
                <Field label={t('member.uplineLabel')}>
                  <SearchableSelect
                    options={uplineOptions}
                    value={uplineCustomerId}
                    onChange={setUplineCustomerId}
                    allLabel={t('member.uplineAll')}
                    allValue=""
                    placeholder={
                      downlinesQuery.isLoading
                        ? t('member.uplineLoading')
                        : t('member.uplinePlaceholder')
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('member.uplineHelp')}
                  </p>
                </Field>

                {/* Modo de pago del kit */}
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    {t('member.kitPaymentTitle')}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <PayerOption
                      active={payerMode === 'invite'}
                      onClick={() => setPayerMode('invite')}
                      icon={<EnvelopeIcon className="h-5 w-5" />}
                      title={t('member.inviteOptionTitle')}
                      desc={t('member.inviteOptionDesc')}
                    />
                    <PayerOption
                      active={payerMode === 'sponsor'}
                      onClick={() => setPayerMode('sponsor')}
                      icon={<CreditCardIcon className="h-5 w-5" />}
                      title={t('member.sponsorOptionTitle')}
                      desc={t('member.sponsorOptionDesc')}
                    />
                  </div>
                </div>

                {/* Kit (solo si el patrocinador paga) */}
                {payerMode === 'sponsor' && (
                  <Field label={t('member.kitLabel')} required>
                    <SearchableSelect
                      options={kitOptions}
                      value={kitProductId}
                      onChange={setKitProductId}
                      allLabel={t('member.kitSelectPlaceholder')}
                      allValue=""
                      placeholder={
                        kitsQuery.isLoading
                          ? t('member.kitLoading')
                          : t('member.kitSearchPlaceholder')
                      }
                    />
                  </Field>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full"
                    disabled={registerMutation.isPending || (!canSubmit)}
                  >
                    {registerMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {payerMode === 'sponsor'
                      ? t('member.submitSponsor')
                      : t('member.submitInvite')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#a7c1e2]';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function PayerOption({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        active
          ? 'border-[#3E667D] bg-[#C8DDF2]/20 ring-1 ring-[#3E667D]'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span
        className={`mt-0.5 flex-shrink-0 ${active ? 'text-[#3E667D]' : 'text-gray-400'}`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-900">
          {title}
        </span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </span>
    </button>
  );
}

function ResultView({
  result,
  onCopy,
  onClose,
}: {
  result: RegisterMemberResult;
  onCopy: (text: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations('distributor.enroll');
  const isSponsor = result.payerMode === 'sponsor';
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-4">
        <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-800">
            {result.fullName}
            {t('common.createdSuffix')}
          </p>
          <p className="text-xs text-green-700">
            {result.email}
            {result.customerNumber ? ` · #${result.customerNumber}` : ''}
          </p>
        </div>
      </div>

      {/* Ruta A: pago del patrocinador */}
      {isSponsor && (
        <div className="rounded-xl border border-gray-200 p-4">
          {result.paymentUrl ? (
            <>
              <p className="text-sm text-gray-700">
                {t('member.kitOrderGenerated')}
                {result.kitOrderNumber ? (
                  <span className="font-mono"> #{result.kitOrderNumber}</span>
                ) : null}
                {t('member.kitOrderGeneratedSuffix')}
              </p>
              <a
                href={result.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block"
              >
                <Button variant="default" className="w-full">
                  <CreditCardIcon className="h-4 w-4" />
                  {t('member.goToPayKit')}
                </Button>
              </a>
              <p className="mt-2 text-xs text-gray-500">
                {t('member.autoOpenHint')}
              </p>
            </>
          ) : (
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <p className="text-sm text-amber-700">
                {t('member.paymentNotGenerated')}
                {result.paymentError ? `: ${result.paymentError}` : ''}
                {t('member.paymentNotGeneratedRetry')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ruta B: invitación */}
      {!isSponsor && (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-700">
            {result.invitationSent
              ? t('common.invitationSent')
              : t('member.inviteNotSent')}
          </p>
          {result.tempPassword && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('common.tempPasswordLabel')}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-[#3E667D]">
                  {result.tempPassword}
                </span>
                <button
                  type="button"
                  onClick={() => onCopy(result.tempPassword as string)}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-200"
                  aria-label={t('common.tempPasswordCopyAria')}
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t('common.mustChangeOnLogin')}
              </p>
            </div>
          )}
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={onClose}>
        {t('common.ready')}
      </Button>
    </div>
  );
}
