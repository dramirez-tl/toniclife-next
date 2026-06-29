'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { DataTable, type DataTableColumn } from '@/components/ui';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  BanknotesIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  LockClosedIcon,
  BuildingLibraryIcon,
  IdentificationIcon,
  EnvelopeIcon,
  PhoneIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/FileUpload';
import { usePaymentData, useUpdatePaymentData, useCommissionPayments } from '@/hooks/usePaymentData';
import type { CommissionPayment } from '@/types/payment-data';

// ===== HELPERS =====

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

function resolveDocUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

function isPdf(url: string): boolean {
  const path = url.split('?')[0];
  return /\.pdf/i.test(path) || path.includes('constancia');
}

// ===== TOOLTIP COMPONENT =====

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group/tip inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-gray-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 text-center">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

// ===== FIELD LABEL WITH TOOLTIP =====

function FieldLabel({ label, tooltip, required = false }: { label: string; tooltip: string; required?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-400 text-xs">*</span>}
      <Tooltip text={tooltip}>
        <InformationCircleIcon className="h-3.5 w-3.5 text-gray-400 hover:text-[#3E667D] cursor-help transition-colors" />
      </Tooltip>
    </label>
  );
}

// ===== FIELD STATUS BADGE =====

function FieldBadge({ value }: { value: string | null | undefined }) {
  const t = useTranslations('distributor.payments');
  if (value) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 border border-emerald-100">
        <CheckCircleIcon className="h-3 w-3" />
        {t('badges.completed')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 border border-amber-100">
        <ExclamationTriangleIcon className="h-3 w-3" />
        {t('badges.pending')}
    </span>
  );
}

// ===== PROGRESS INDICATOR =====

function CompletionProgress({ paymentData }: { paymentData: any }) {
  if (!paymentData) return null;
  const totalFields = 9;
  const completed = totalFields - paymentData.missingFields.length;
  const percent = Math.round((completed / totalFields) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percent === 100 ? 'bg-emerald-500' : percent >= 60 ? 'bg-amber-500' : 'bg-red-400'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${
        percent === 100 ? 'text-emerald-600' : 'text-gray-500'
      }`}>
        {completed}/{totalFields}
      </span>
    </div>
  );
}

// ===== STATUS BADGE COMPONENT =====

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('distributor.payments');
  // Las claves (completed/pending/...) son códigos de estado del backend; NO se traducen.
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: t('status.paid'), className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending: { label: t('status.pending'), className: 'bg-amber-50 text-amber-700 border-amber-200' },
    failed: { label: t('status.failed'), className: 'bg-red-50 text-red-700 border-red-200' },
    reversed: { label: t('status.reversed'), className: 'bg-gray-50 text-gray-700 border-gray-200' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

// ===== OVERALL STATUS BANNER =====

function OverallStatusBanner({ status, missingFields }: { status: string; missingFields: string[] }) {
  const t = useTranslations('distributor.payments');
  if (status === 'complete') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheckIcon className="h-6 w-6 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">{t('banner.completeTitle')}</p>
          <p className="text-xs text-emerald-600">{t('banner.completeBody')}</p>
        </div>
      </div>
    );
  }
  if (status === 'pending_validation') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ClockIcon className="h-6 w-6 text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">{t('banner.validationTitle')}</p>
          <p className="text-xs text-amber-600">{t('banner.validationBody')}</p>
        </div>
      </div>
    );
  }
  // Las claves de campo (email/phone/...) son identificadores del backend; solo se traduce su etiqueta.
  const fieldLabel = (f: string) => {
    const known = ['email', 'phone', 'curp', 'rfc', 'ineNumber', 'ineDocument', 'taxIdDocument', 'bankStatement', 'clabe'];
    return known.includes(f) ? t(`missingFields.${f}` as never) : f;
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-800">{t('banner.incompleteTitle')}</p>
        <p className="text-xs text-red-600 mt-1">
          {t('banner.missing', { fields: missingFields.map(fieldLabel).join(', ') })}
        </p>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====

export default function PagosPage() {
  const t = useTranslations('distributor.payments');
  const { data: paymentData, isLoading } = usePaymentData();
  const updateMutation = useUpdatePaymentData();
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>(undefined);
  const { data: paymentsData } = useCommissionPayments({ status: paymentFilter });

  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [curp, setCurp] = useState('');
  const [rfc, setRfc] = useState('');
  const [ineNumber, setIneNumber] = useState('');
  const [taxRegime, setTaxRegime] = useState('');
  const [bankName, setBankName] = useState('');
  const [clabe, setClabe] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [formInitialized, setFormInitialized] = useState(false);

  // File state
  const [ineFile, setIneFile] = useState<File | null>(null);
  const [taxIdFile, setTaxIdFile] = useState<File | null>(null);
  const [bankStatFile, setBankStatFile] = useState<File | null>(null);

  // Initialize form when data loads (una sola vez; no sobreescribe ediciones)
  useEffect(() => {
    if (!paymentData || formInitialized) return;
    setEmail(paymentData.personal.email || '');
    setPhone(paymentData.personal.phone || '');
    setCurp(paymentData.fiscal.curp || '');
    setRfc(paymentData.fiscal.rfc || '');
    setIneNumber(paymentData.fiscal.ineNumber || '');
    setTaxRegime(paymentData.fiscal.taxRegime || '');
    setBankName(paymentData.banking.bankName || '');
    setClabe(paymentData.banking.clabe || '');
    setAccountHolder(paymentData.banking.accountHolder || '');
    setFormInitialized(true);
  }, [paymentData, formInitialized]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate CLABE
    if (clabe && !/^[0-9]{18}$/.test(clabe)) {
      toast.error(t('validation.clabeLength'));
      return;
    }

    const formData = new FormData();
    if (email) formData.append('email', email);
    if (phone) formData.append('phone', phone);
    if (curp) formData.append('curp', curp.toUpperCase());
    if (rfc) formData.append('rfc', rfc.toUpperCase());
    if (ineNumber) formData.append('ineNumber', ineNumber);
    if (taxRegime) formData.append('taxRegime', taxRegime);
    if (bankName) formData.append('bankName', bankName);
    if (clabe) formData.append('clabe', clabe);
    if (accountHolder) formData.append('accountHolder', accountHolder.toUpperCase());

    if (ineFile) formData.append('ineDocument', ineFile);
    if (taxIdFile) formData.append('taxIdDocument', taxIdFile);
    if (bankStatFile) formData.append('bankStatement', bankStatFile);

    try {
      await updateMutation.mutateAsync(formData);
      toast.success(t('toast.updated'));
      setIneFile(null);
      setTaxIdFile(null);
      setBankStatFile(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('toast.saveError'));
    }
  }, [email, phone, curp, rfc, ineNumber, taxRegime, bankName, clabe, accountHolder, ineFile, taxIdFile, bankStatFile, updateMutation, t]);

  // Definir columnas ANTES de cualquier early return (Rules of Hooks).
  const paymentColumns: DataTableColumn<CommissionPayment>[] = useMemo(() => [
    {
      key: 'period',
      header: t('history.columns.period'),
      headerClassName: 'text-xs font-semibold text-gray-500 uppercase',
      cellClassName: 'font-medium text-gray-900',
      render: (p) => p.periodName || p.periodCode,
    },
    {
      key: 'amount',
      header: t('history.columns.amount'),
      headerClassName: 'text-right text-xs font-semibold text-gray-500 uppercase',
      cellClassName: 'text-right font-semibold text-gray-900',
      render: (p) => (
        <>
          ${p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          <span className="text-xs text-gray-400 ml-1">{p.currencyCode}</span>
        </>
      ),
    },
    {
      key: 'date',
      header: t('history.columns.date'),
      headerClassName: 'text-xs font-semibold text-gray-500 uppercase',
      cellClassName: 'text-gray-600',
      render: (p) =>
        p.paymentDate
          ? new Date(p.paymentDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
    },
    {
      key: 'method',
      header: t('history.columns.method'),
      headerClassName: 'text-xs font-semibold text-gray-500 uppercase',
      cellClassName: 'text-gray-600 capitalize',
      render: (p) => p.paymentMethod || '—',
    },
    {
      key: 'reference',
      header: t('history.columns.reference'),
      headerClassName: 'text-xs font-semibold text-gray-500 uppercase',
      cellClassName: 'text-gray-500 font-mono text-xs',
      render: (p) => p.reference || '—',
    },
    {
      key: 'status',
      header: t('history.columns.status'),
      headerClassName: 'text-center text-xs font-semibold text-gray-500 uppercase',
      cellClassName: 'text-center',
      render: (p) => <StatusBadge status={p.status} />,
    },
  ], [t]);

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const payments = paymentsData?.data || [];

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <BanknotesIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            </div>
            <p className="text-sm text-white/70 mt-2 max-w-lg">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
            <LockClosedIcon className="h-4 w-4 text-white/60" />
            <span className="text-xs text-white/70">{t('protected')}</span>
          </div>
        </div>
      </div>

      {/* Status banner + progress */}
      {paymentData && (
        <div className="space-y-3">
          <OverallStatusBanner
            status={paymentData.overallStatus}
            missingFields={paymentData.missingFields}
          />
          <CompletionProgress paymentData={paymentData} />
        </div>
      )}

      {/* Info cards - what this is for */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <IdentificationIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">{t('infoCards.identityTitle')}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{t('infoCards.identityBody')}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">{t('infoCards.fiscalTitle')}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{t('infoCards.fiscalBody')}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <BuildingLibraryIcon className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">{t('infoCards.depositTitle')}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{t('infoCards.depositBody')}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Personal + Fiscal */}
          <div className="space-y-6">
            {/* Personal Data */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <DocumentTextIcon className="h-4 w-4 text-[#3E667D]" />
                    {t('personal.title')}
                  </h2>
                  <Tooltip text={t('personal.tooltip')}>
                    <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400 hover:text-[#3E667D] cursor-help" />
                  </Tooltip>
                </div>
                <div className="space-y-3">
                  {/* Read-only name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <FieldLabel label={t('personal.fullName')} tooltip={t('personal.fullNameTooltip')} />
                      <FieldBadge value={paymentData?.personal.fullName} />
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-sm text-gray-900 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                        {paymentData?.personal.fullName || '—'}
                      </p>
                      <LockClosedIcon className="h-4 w-4 text-gray-300 flex-shrink-0" title={t('personal.readOnlyField')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <FieldLabel label={t('personal.email')} tooltip={t('personal.emailTooltip')} required />
                        <FieldBadge value={email} />
                      </div>
                      <div className="relative">
                        <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                          placeholder={t('personal.emailPlaceholder')}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <FieldLabel label={t('personal.phone')} tooltip={t('personal.phoneTooltip')} required />
                        <FieldBadge value={phone} />
                      </div>
                      <PhoneInput
                        value={phone}
                        onChange={(v) => setPhone(v)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fiscal Data */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-[#3E667D]" />
                    {t('fiscal.title')}
                  </h2>
                  <Tooltip text={t('fiscal.tooltip')}>
                    <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400 hover:text-[#3E667D] cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-[10px] text-gray-400 mb-4">
                  {t('fiscal.note')}
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <FieldLabel label={t('fiscal.curp')} tooltip={t('fiscal.curpTooltip')} required />
                        <FieldBadge value={curp} />
                      </div>
                      <input
                        type="text"
                        value={curp}
                        onChange={(e) => setCurp(e.target.value.toUpperCase())}
                        maxLength={18}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                        placeholder="GARM850101HGTRZR09"
                      />
                      {curp && curp.length > 0 && curp.length < 18 && (
                        <p className="text-[10px] text-amber-500 mt-0.5">{t('fiscal.curpCount', { count: curp.length })}</p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <FieldLabel label={t('fiscal.rfc')} tooltip={t('fiscal.rfcTooltip')} required />
                        <FieldBadge value={rfc} />
                      </div>
                      <input
                        type="text"
                        value={rfc}
                        onChange={(e) => setRfc(e.target.value.toUpperCase())}
                        maxLength={13}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                        placeholder="GARM850101AB1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <FieldLabel label={t('fiscal.ineNumber')} tooltip={t('fiscal.ineNumberTooltip')} required />
                        <FieldBadge value={ineNumber} />
                      </div>
                      <input
                        type="text"
                        value={ineNumber}
                        onChange={(e) => setIneNumber(e.target.value)}
                        maxLength={20}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                        placeholder="1234567890123"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <FieldLabel label={t('fiscal.taxRegime')} tooltip={t('fiscal.taxRegimeTooltip')} required />
                        <FieldBadge value={taxRegime} />
                      </div>
                      <select
                        value={taxRegime}
                        onChange={(e) => setTaxRegime(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none bg-white"
                      >
                        <option value="">{t('fiscal.selectPlaceholder')}</option>
                        {/* Nombres oficiales de régimen fiscal SAT: NO se traducen. */}
                        <option value="ASIMILADOS">Asimilados a Salarios</option>
                        <option value="FIC">Fideicomiso (FIC)</option>
                        <option value="RESICO">RESICO</option>
                        <option value="MORAL">Persona Moral</option>
                        <option value="FRONTERIZA">Zona Fronteriza</option>
                        <option value="SIN_IMPUESTO">Sin Impuesto</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Banking Data */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <CreditCardIcon className="h-4 w-4 text-[#3E667D]" />
                    {t('banking.title')}
                  </h2>
                  <Tooltip text={t('banking.tooltip')}>
                    <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400 hover:text-[#3E667D] cursor-help" />
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1.5 mb-4">
                  <LockClosedIcon className="h-3 w-3 text-gray-400" />
                  <p className="text-[10px] text-gray-400">{t('banking.note')}</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <FieldLabel label={t('banking.bank')} tooltip={t('banking.bankTooltip')} required />
                      <FieldBadge value={bankName} />
                    </div>
                    <div className="relative">
                      <BuildingLibraryIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                        placeholder={t('banking.bankPlaceholder')}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <FieldLabel label={t('banking.clabe')} tooltip={t('banking.clabeTooltip')} required />
                      <FieldBadge value={clabe && clabe.length === 18 ? clabe : undefined} />
                    </div>
                    <input
                      type="text"
                      value={clabe}
                      onChange={(e) => setClabe(e.target.value.replace(/\D/g, '').slice(0, 18))}
                      maxLength={18}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono tracking-wider focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                      placeholder="012345678901234567"
                    />
                    <div className="flex items-center justify-between mt-1">
                      {clabe ? (
                        <p className={`text-[10px] font-medium ${clabe.length === 18 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {t('banking.clabeCount', { count: clabe.length })} {clabe.length === 18 && `- ${t('banking.clabeComplete')}`}
                        </p>
                      ) : (
                        <span />
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <FieldLabel label={t('banking.accountHolder')} tooltip={t('banking.accountHolderTooltip')} required />
                      <FieldBadge value={accountHolder} />
                    </div>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                      placeholder={t('banking.accountHolderPlaceholder')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Documents */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <ArrowDownTrayIcon className="h-4 w-4 text-[#3E667D]" />
                    {t('documents.title')}
                  </h2>
                  <Tooltip text={t('documents.tooltip')}>
                    <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400 hover:text-[#3E667D] cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-[10px] text-gray-400 mb-4">
                  {t('documents.note')}
                </p>
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{t('documents.ineTitle')}</span>
                      <FieldBadge value={paymentData?.documents.ineDocument.url} />
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">{t('documents.ineHint')}</p>
                    <FileUpload
                      label=""
                      name="ineDocument"
                      existingUrl={resolveDocUrl(paymentData?.documents.ineDocument.url)}
                      status={paymentData?.documents.ineDocument.status}
                      rejectionReason={paymentData?.documents.ineDocument.rejectionReason}
                      onChange={setIneFile}
                    />
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{t('documents.taxIdTitle')}</span>
                      <FieldBadge value={paymentData?.documents.taxIdDocument.url} />
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">{t('documents.taxIdHint')}</p>
                    <FileUpload
                      label=""
                      name="taxIdDocument"
                      existingUrl={resolveDocUrl(paymentData?.documents.taxIdDocument.url)}
                      status={paymentData?.documents.taxIdDocument.status}
                      rejectionReason={paymentData?.documents.taxIdDocument.rejectionReason}
                      onChange={setTaxIdFile}
                    />
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{t('documents.bankStatementTitle')}</span>
                      <FieldBadge value={paymentData?.documents.bankStatement.url} />
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">{t('documents.bankStatementHint')}</p>
                    <FileUpload
                      label=""
                      name="bankStatement"
                      existingUrl={resolveDocUrl(paymentData?.documents.bankStatement.url)}
                      status={paymentData?.documents.bankStatement.status}
                      rejectionReason={paymentData?.documents.bankStatement.rejectionReason}
                      onChange={setBankStatFile}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact info */}
            <div className="rounded-xl border border-[#3E667D]/10 bg-[#3E667D]/5 p-4">
              <p className="text-xs font-semibold text-[#3E667D] mb-1">{t('contact.title')}</p>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                {t.rich('contact.body', {
                  email: (chunks) => <span className="font-medium">{chunks}</span>,
                  whatsapp: (chunks) => <span className="font-medium">{chunks}</span>,
                  phone: (chunks) => <span className="font-medium">{chunks}</span>,
                })}
              </p>
            </div>

          </div>
        </div>

        {/* Barra de guardado sticky (siempre visible al final del formulario) */}
        <div className="sticky bottom-0 z-10 mt-6 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <p className="hidden items-center gap-1.5 text-xs text-gray-500 sm:flex">
              <LockClosedIcon className="h-3.5 w-3.5" />
              {t('save.footerNote')}
            </p>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E667D] px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#2f5165] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t('save.saving')}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  {t('save.save')}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Commission Payments History */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <BanknotesIcon className="h-4 w-4 text-[#3E667D]" />
              {t('history.title')}
            </h2>
            <select
              value={paymentFilter || ''}
              onChange={(e) => setPaymentFilter(e.target.value || undefined)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none bg-white"
            >
              <option value="">{t('history.filterAll')}</option>
              <option value="completed">{t('history.filterPaid')}</option>
              <option value="pending">{t('history.filterPending')}</option>
              <option value="failed">{t('history.filterFailed')}</option>
            </select>
          </div>

          {paymentData?.overallStatus === 'incomplete' && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-4 text-xs text-amber-700">
              <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
              {t('history.incompleteWarning')}
            </div>
          )}

          <DataTable<CommissionPayment>
            columns={paymentColumns}
            data={payments}
            getRowKey={(p) => String(p.id)}
            emptyMessage={t('history.empty')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
