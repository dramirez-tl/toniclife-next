'use client';

// MyFiscalDataCard - "Mis datos fiscales" en Mis facturas (portal del distribuidor,
// 17-nov-2026). Dos caras: el resumen de lo guardado y el formulario para capturarlo o
// corregirlo (PUT /distributor/invoicing/fiscal-data). Lo guardado sirve para las
// siguientes facturas. Las reglas de fondo las valida el servidor; aquí solo se avisa lo
// que de entrada falta (lib/invoicing/my-invoicing).

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInvoicingCatalogs, useSaveMyFiscalData } from '@/hooks/useCustomerInvoicing';
import { billingErrorMessage } from '@/lib/billing-error';
import {
  catalogLabel,
  fiscalFormFrom,
  normalizeRfcInput,
  regimesForRfc,
  toFiscalPayload,
  validateFiscalForm,
  type FiscalField,
  type FiscalForm,
} from '@/lib/invoicing/my-invoicing';
import { cn } from '@/lib/utils';
import type { MyInvoicingOverview } from '@/types/customer-invoicing';

type InvoicesT = ReturnType<typeof useTranslations<'distributor.invoices'>>;

interface MyFiscalDataCardProps {
  overview: MyInvoicingOverview;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export function MyFiscalDataCard({ overview, editing, onEditingChange }: MyFiscalDataCardProps) {
  const t = useTranslations('distributor.invoices');
  const { fiscalReady, fiscalMissing, enabled } = overview;
  // Apagado, la cuenta no guarda datos fiscales: solo se muestra lo que haya.
  const showForm = enabled && editing;

  return (
    <Card id="mis-datos-fiscales" className="scroll-mt-24 border border-gray-200 py-0">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3E667D]/10 text-[#3E667D]">
              <IdentificationIcon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{t('fiscal.title')}</h2>
                {fiscalReady ? (
                  <Badge variant="success">
                    <CheckCircleIcon aria-hidden="true" />
                    {t('fiscal.ready')}
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <ExclamationTriangleIcon aria-hidden="true" />
                    {t('fiscal.incomplete')}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-600">{t('fiscal.hint')}</p>
              {!fiscalReady && fiscalMissing.length > 0 && !showForm && (
                <p className="mt-1 text-sm font-medium text-amber-800">
                  {t('fiscal.missing', { fields: fiscalMissing.join(', ') })}
                </p>
              )}
            </div>
          </div>
          {enabled && !showForm && (
            <Button variant="outline" size="sm" className="min-h-11 sm:min-h-0" onClick={() => onEditingChange(true)}>
              <PencilSquareIcon aria-hidden="true" className="h-4 w-4" />
              {t('fiscal.edit')}
            </Button>
          )}
        </div>

        {showForm ? (
          <FiscalForm overview={overview} onDone={() => onEditingChange(false)} t={t} />
        ) : (
          <FiscalSummary overview={overview} t={t} />
        )}
      </CardContent>
    </Card>
  );
}

// ===== Resumen de lo guardado =====

function FiscalSummary({ overview, t }: { overview: MyInvoicingOverview; t: InvoicesT }) {
  const { fiscal } = overview;
  const catalogs = useInvoicingCatalogs(fiscal.taxRegime);
  const rows: { label: string; value: string }[] = [
    { label: t('fiscal.rfc'), value: fiscal.rfc },
    { label: t('fiscal.legalName'), value: fiscal.legalName },
    { label: t('fiscal.regime'), value: catalogLabel(catalogs.data?.regimes, fiscal.taxRegime) },
    { label: t('fiscal.cfdiUse'), value: catalogLabel(catalogs.data?.cfdiUses, fiscal.cfdiUse) },
    { label: t('fiscal.postalCode'), value: fiscal.postalCode },
    { label: t('fiscal.email'), value: fiscal.email },
  ];
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{row.label}</dt>
          <dd className={cn('break-words text-sm', row.value ? 'font-medium text-gray-900' : 'text-gray-400')}>
            {row.value || t('fiscal.notSet')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ===== Formulario =====

function FiscalForm({
  overview,
  onDone,
  t,
}: {
  overview: MyInvoicingOverview;
  onDone: () => void;
  t: InvoicesT;
}) {
  const baseId = useId();
  const [form, setForm] = useState<FiscalForm>(() => fiscalFormFrom(overview.fiscal));
  const [showErrors, setShowErrors] = useState(false);
  const catalogs = useInvoicingCatalogs(form.taxRegime);
  const save = useSaveMyFiscalData();

  const regimes = regimesForRfc(catalogs.data?.regimes ?? [], form.rfc, form.taxRegime);
  const uses = form.taxRegime ? (catalogs.data?.cfdiUses ?? []) : [];
  // Al cambiar de régimen, un uso que ya no aplica cuenta como "sin elegir" (616 solo admite S01).
  const usesLoaded = !!form.taxRegime && !!catalogs.data && !catalogs.isPlaceholderData;
  const cfdiUse = usesLoaded && !uses.some((u) => u.code === form.cfdiUse) ? '' : form.cfdiUse;
  const effective: FiscalForm = { ...form, cfdiUse };
  const errors = validateFiscalForm(effective);
  const errorOf = (field: FiscalField) => (showErrors ? errors[field] : undefined);

  const set = (field: FiscalField, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    save.mutate(toFiscalPayload(effective), {
      onSuccess: () => {
        toast.success(t('fiscal.saved'));
        onDone();
      },
      onError: (err) => toast.error(billingErrorMessage(err, t('fiscal.saveError'))),
    });
  };

  const fieldId = (field: FiscalField) => `${baseId}-${field}`;
  const describedBy = (field: FiscalField, hasHint: boolean) =>
    [errorOf(field) ? `${fieldId(field)}-error` : '', hasHint ? `${fieldId(field)}-hint` : ''].filter(Boolean).join(' ') ||
    undefined;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field id={fieldId('rfc')} label={t('fiscal.rfc')} hint={t('fiscal.rfcHint')} error={errorOf('rfc')} t={t}>
          <Input
            id={fieldId('rfc')}
            value={form.rfc}
            onChange={(e) => set('rfc', normalizeRfcInput(e.target.value))}
            maxLength={13}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={!!errorOf('rfc')}
            aria-describedby={describedBy('rfc', true)}
            className="h-11 font-mono uppercase tracking-wide"
          />
        </Field>

        <Field
          id={fieldId('legalName')}
          label={t('fiscal.legalName')}
          hint={t('fiscal.legalNameHint')}
          error={errorOf('legalName')}
          t={t}
        >
          <Input
            id={fieldId('legalName')}
            value={form.legalName}
            onChange={(e) => set('legalName', e.target.value)}
            maxLength={300}
            autoComplete="organization"
            aria-invalid={!!errorOf('legalName')}
            aria-describedby={describedBy('legalName', true)}
            className="h-11 uppercase"
          />
        </Field>

        <Field id={fieldId('taxRegime')} label={t('fiscal.regime')} error={errorOf('taxRegime')} t={t}>
          <Select value={form.taxRegime} onValueChange={(value) => set('taxRegime', value)} disabled={catalogs.isLoading}>
            <SelectTrigger
              id={fieldId('taxRegime')}
              aria-invalid={!!errorOf('taxRegime')}
              aria-describedby={describedBy('taxRegime', false)}
              className="h-11 w-full"
            >
              <SelectValue placeholder={catalogs.isLoading ? t('fiscal.loading') : t('fiscal.regimePlaceholder')} />
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-2rem)]">
              {regimes.map((regime) => (
                <SelectItem key={regime.code} value={regime.code}>
                  {regime.code} · {regime.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id={fieldId('cfdiUse')} label={t('fiscal.cfdiUse')} error={errorOf('cfdiUse')} t={t}>
          <Select
            value={cfdiUse}
            onValueChange={(value) => set('cfdiUse', value)}
            disabled={!form.taxRegime || !usesLoaded}
          >
            <SelectTrigger
              id={fieldId('cfdiUse')}
              aria-invalid={!!errorOf('cfdiUse')}
              aria-describedby={describedBy('cfdiUse', false)}
              className="h-11 w-full"
            >
              <SelectValue
                placeholder={
                  !form.taxRegime
                    ? t('fiscal.cfdiUseNeedsRegime')
                    : usesLoaded
                      ? t('fiscal.cfdiUsePlaceholder')
                      : t('fiscal.loading')
                }
              />
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-2rem)]">
              {uses.map((use) => (
                <SelectItem key={use.code} value={use.code}>
                  {use.code} · {use.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id={fieldId('postalCode')}
          label={t('fiscal.postalCode')}
          hint={t('fiscal.postalCodeHint')}
          error={errorOf('postalCode')}
          t={t}
        >
          <Input
            id={fieldId('postalCode')}
            value={form.postalCode}
            onChange={(e) => set('postalCode', e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
            aria-invalid={!!errorOf('postalCode')}
            aria-describedby={describedBy('postalCode', true)}
            className="h-11"
          />
        </Field>

        <Field id={fieldId('email')} label={t('fiscal.email')} hint={t('fiscal.emailHint')} error={errorOf('email')} t={t}>
          <Input
            id={fieldId('email')}
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            maxLength={200}
            autoComplete="email"
            aria-invalid={!!errorOf('email')}
            aria-describedby={describedBy('email', true)}
            className="h-11"
          />
        </Field>
      </div>

      {catalogs.isError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {t('fiscal.catalogError')}{' '}
          <button type="button" className="font-medium underline" onClick={() => void catalogs.refetch()}>
            {t('fiscal.retry')}
          </button>
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {overview.fiscalReady && (
          <Button type="button" variant="outline" className="h-11" disabled={save.isPending} onClick={onDone}>
            {t('fiscal.cancel')}
          </Button>
        )}
        <Button type="submit" className="h-11" disabled={save.isPending}>
          {save.isPending ? t('fiscal.saving') : t('fiscal.save')}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  t,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  t: InvoicesT;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
          {t(`errors.${error}` as never)}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
