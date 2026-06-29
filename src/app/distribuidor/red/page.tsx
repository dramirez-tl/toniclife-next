'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { selectUser } from '@/store/slices/authSlice';
import { useNetworkDownlines, useNetworkDirectLines } from '@/hooks/useNetwork';
import { useCurrentPeriod, useCommissionPeriods, periodsUpToCurrent } from '@/hooks/useCommissions';
import { networkApi } from '@/services/networkApi';
import {
  useDistributorDashboard,
  useCopyReferralLink,
  useShareReferralLink,
  usePreferredCustomers,
} from '@/hooks/useDistributor';
import { DownlineItem, DownlineQuery, DirectLineVolume } from '@/types/network';
import { RANK_ORDER, RANK_LABELS } from '@/constants/ranks';
import {
  UsersIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  ShareIcon,
  XMarkIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import { MemberEnrollmentPanel } from './MemberEnrollmentPanel';
import { PreferredEnrollmentPanel } from './PreferredEnrollmentPanel';

export default function RedPage() {
  return <Suspense><RedContent /></Suspense>;
}

function RedContent() {
  const t = useTranslations('distributor.network');
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isPreferredOpen, setIsPreferredOpen] = useState(false);
  const user = useSelector(selectUser);

  // Deep-link: /distribuidor/red?alta=socio|preferente abre el panel directo
  // (usado desde el dashboard para que el alta sea fácil de encontrar).
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const alta = searchParams.get('alta');
    if (alta !== 'socio' && alta !== 'preferente') return;
    if (alta === 'socio') setIsEnrollOpen(true);
    else setIsPreferredOpen(true);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete('alta');
    router.replace(
      `/distribuidor/red${params.toString() ? `?${params}` : ''}`,
      { scroll: false },
    );
  }, [searchParams, router]);

  const { profile: distributorProfile } = useDistributorDashboard();

  const copyLinkMutation = useCopyReferralLink();
  const shareLinkMutation = useShareReferralLink();

  const referralCode = useMemo(() => {
    if (distributorProfile?.referralCode) return distributorProfile.referralCode;
    if (distributorProfile?.personalLink) {
      try {
        const url = new URL(distributorProfile.personalLink);
        const refParam = url.searchParams.get('ref');
        if (refParam) return refParam;
      } catch {
        // no-op
      }
    }
    if (distributorProfile?.code) return distributorProfile.code;
    return null;
  }, [distributorProfile?.referralCode, distributorProfile?.personalLink, distributorProfile?.code]);

  const dynamicPersonalLink = useMemo(() => {
    if (typeof window === 'undefined' || !referralCode) return '';
    return `${window.location.origin}/registro/distribuidor?ref=${referralCode}`;
  }, [referralCode]);

  const handleInviteMember = () => {
    setIsInvitePanelOpen(true);
  };

  const handleCopyInviteLink = async () => {
    if (!dynamicPersonalLink) return;
    try {
      await copyLinkMutation.mutateAsync(dynamicPersonalLink);
      toast.success(t('toasts.inviteLinkCopied'));
    } catch {
      toast.error(t('toasts.copyError'));
    }
  };

  const handleShareInviteLink = async () => {
    if (!dynamicPersonalLink) return;
    try {
      const result = await shareLinkMutation.mutateAsync({
        link: dynamicPersonalLink,
        title: t('toasts.shareTitle'),
        text: t('toasts.shareText'),
      });
      if (result.method === 'clipboard') {
        toast.success(t('toasts.linkCopiedClipboard'));
      } else {
        toast.success(t('toasts.linkShared'));
      }
    } catch {
      toast.error(t('toasts.shareError'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UsersIcon className="h-8 lg:h-10 w-8 lg:w-10" />
                <h1 className="text-2xl lg:text-4xl font-bold">{t('title')}</h1>
              </div>
              <p className="text-white/80 text-base lg:text-lg">
                {t('subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary" size="sm">
                  {t('backToPanel')}
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleInviteMember}
              >
                <ShareIcon className="h-4 w-4" />
                {t('inviteLink')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Acciones rápidas: dar de alta (prominente, fácil de encontrar) */}
        <Card className="mb-6 border-0 bg-gradient-to-br from-[#3E667D] to-[#0A4B94] text-white shadow-lg">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">{t('grow.title')}</h2>
              <p className="text-sm text-white/80">
                {t('grow.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setIsEnrollOpen(true)}
                className="bg-white text-[#3E667D] hover:bg-white/90 shadow-md shadow-black/10"
              >
                <UserPlusIcon className="h-4 w-4" />
                {t('grow.enrollPartner')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPreferredOpen(true)}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                <UserPlusIcon className="h-4 w-4" />
                {t('grow.preferredCustomer')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pestañas: Descendencia de Red (lista) y Volumen por línea directa */}
        <Tabs defaultValue="descendencia" className="mb-2">
          <TabsList>
            <TabsTrigger value="descendencia">{t('tabs.downline')}</TabsTrigger>
            <TabsTrigger value="volumen">{t('tabs.directLineVolume')}</TabsTrigger>
          </TabsList>
          <TabsContent value="descendencia" className="mt-4">
            <TreeListView />
          </TabsContent>
          <TabsContent value="volumen" className="mt-4">
            <DirectLinesVolumeSection />
          </TabsContent>
        </Tabs>

        {/* Clientes preferentes */}
        <PreferredCustomersSection onAdd={() => setIsPreferredOpen(true)} />

        {/* Help CTA */}
        <Card className="mt-8 border-0 bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white shadow-lg">
          <CardContent className="p-6 lg:p-8">
            <h3 className="text-xl lg:text-2xl font-bold mb-3">{t('helpCta.title')}</h3>
            <p className="text-white/85 mb-6 max-w-2xl">
              {t('helpCta.body')}
            </p>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setIsEnrollOpen(true)}
            >
              <UserPlusIcon className="h-5 w-5" />
              {t('helpCta.enrollNewMember')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal lateral de invitación */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isInvitePanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t('invitePanel.ariaLabel')}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-lg font-bold text-gray-900">{t('invitePanel.title')}</h3>
            <button
              onClick={() => setIsInvitePanelOpen(false)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label={t('invitePanel.closeAria')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="rounded-xl border border-[#a7c1e2]/25 bg-[#C8DDF2]/10 p-4">
              <p className="text-sm font-semibold text-[#3E667D]">{t('invitePanel.howToTitle')}</p>
              <p className="mt-1 text-sm text-gray-600">
                {t('invitePanel.howToBody')}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('invitePanel.registrationLink')}</p>
              <p className="mt-2 break-all font-mono text-sm text-[#3E667D]">
                {dynamicPersonalLink || t('invitePanel.loadingLink')}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={handleCopyInviteLink}
                disabled={!dynamicPersonalLink || copyLinkMutation.isPending}
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                {t('invitePanel.copy')}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleShareInviteLink}
                disabled={!dynamicPersonalLink || shareLinkMutation.isPending}
              >
                <ShareIcon className="h-4 w-4" />
                {t('invitePanel.share')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isInvitePanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setIsInvitePanelOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Panel de alta estructurada (colocación + kit + modo de pago) */}
      <MemberEnrollmentPanel
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
      />

      {/* Panel de alta de cliente preferente (sin kit) */}
      <PreferredEnrollmentPanel
        isOpen={isPreferredOpen}
        onClose={() => setIsPreferredOpen(false)}
      />
    </div>
  );
}

// Sección: Volumen de grupo por LÍNEA DIRECTA (con tope/rollover por rango).
// Permite ver qué líneas tienen menos volumen y entender el rollover.
const fmtPts = (n: number) =>
  Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });

function DirectLinesVolumeSection() {
  const t = useTranslations('distributor.network.directLines');
  const { data: periodsData } = useCommissionPeriods();
  const periodsArray: any[] = Array.isArray(periodsData)
    ? periodsData
    : ((periodsData as unknown as { data?: any[] })?.data ?? []);
  const sortedPeriods = [...periodsArray].sort((a: any, b: any) => {
    const ad = String(a?.startDate ?? a?.start_date ?? '');
    const bd = String(b?.startDate ?? b?.start_date ?? '');
    return bd.localeCompare(ad);
  });
  // Solo hasta el periodo actual (oculta los futuros, sin datos).
  const visiblePeriods = periodsUpToCurrent(sortedPeriods);
  const currentPeriodId =
    (visiblePeriods.find((p: any) => p.isCurrent)?.id as string) ?? '';

  const [periodId, setPeriodId] = useState(''); // se inicializa al periodo actual
  useEffect(() => {
    if (currentPeriodId && !periodId) setPeriodId(currentPeriodId);
  }, [currentPeriodId, periodId]);
  const { data, isLoading, isFetching } = useNetworkDirectLines(
    periodId || undefined,
  );

  const lines: DirectLineVolume[] = data?.lines ?? [];
  const cap = data?.rollOverLimit ?? 0;
  const hasCap = data?.hasCap ?? false;
  const maxBar = Math.max(1, cap, ...lines.map((l) => l.legVolume));

  return (
    <Card className="mb-6">
      <CardContent className="p-4 lg:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#3E667D]/10 p-2 text-[#3E667D]">
              <ScaleIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {t('title')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#3E667D]/10 bg-[#3E667D]/5 px-3 py-2">
            <CalendarDaysIcon className="h-5 w-5 text-[#3E667D]" />
            <SearchableSelect
              options={visiblePeriods.map((p: any) => ({
                value: p.id,
                label: `${p.name}${p.isCurrent ? t('periodCurrent') : ''}`,
              }))}
              value={periodId}
              onChange={setPeriodId}
              showAllOption={false}
              className="min-w-[180px]"
            />
          </div>
        </div>

        {/* Explicación del rollover (tope por línea) */}
        {hasCap && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <span>
              <strong>{t('rolloverPrefix')}</strong> {t('rolloverBody1')}{' '}
              <strong>{fmtPts(cap)} {t('ptsUnit')}</strong>
              {data?.viewerRankName ? t('rolloverViewerRank', { rank: data.viewerRankName }) : ''}.
              {' '}<strong>“{t('rolloverWord')}”</strong>{' '}
              {t('rolloverBody2')} <strong>{t('rolloverStrengthen')}</strong>{' '}
              {t('rolloverBody3')}
            </span>
          </div>
        )}

        {/* Totales */}
        {data && lines.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-400">{t('totalLinesVolume')}</p>
              <p className="text-xl font-bold text-gray-900">{fmtPts(data.totalGroupVolume)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-emerald-600">{t('countsForGroup')}</p>
              <p className="text-xl font-bold text-emerald-700">{fmtPts(data.totalCounted)}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-amber-600">{t('rollsOver')}</p>
              <p className="text-xl font-bold text-amber-700">{fmtPts(data.totalRolledOver)}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
            <p className="text-sm text-gray-500">
              {t('empty')}
            </p>
          </div>
        ) : (
          <div className={`space-y-2 ${isFetching ? 'opacity-60' : ''}`}>
            {lines.map((l, i) => {
              const countedPct = (Math.min(l.counted, maxBar) / maxBar) * 100;
              const rolledPct = (Math.min(l.rolledOver, maxBar) / maxBar) * 100;
              const capPct = hasCap ? (Math.min(cap, maxBar) / maxBar) * 100 : 0;
              const toCap = hasCap ? Math.max(0, cap - l.legVolume) : 0;
              return (
                <div
                  key={l.memberId}
                  className="rounded-xl border border-gray-100 p-3 hover:bg-gray-50/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {i === 0 && lines.length > 1 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            {t('lowest')}
                          </span>
                        )}
                        <span className="truncate font-semibold text-gray-900">{l.name}</span>
                        <span className="text-xs text-gray-400">#{l.customerNumber}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {l.rankName ? `${l.rankName} · ` : ''}
                        {t('activeOfTotal', { active: l.activeCount, total: l.memberCount })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {fmtPts(l.legVolume)} <span className="text-xs font-normal text-gray-400">{t('ptsUnit')}</span>
                      </p>
                      {l.rolledOver > 0 ? (
                        <span className="text-xs font-medium text-amber-600">
                          {t('rollsOverAmount', { amount: fmtPts(l.rolledOver) })}
                        </span>
                      ) : hasCap && toCap > 0 ? (
                        <span className="text-xs font-medium text-gray-400">
                          {t('remainingToCap', { amount: fmtPts(toCap) })}
                        </span>
                      ) : hasCap ? (
                        <span className="text-xs font-medium text-emerald-600">{t('capReached')}</span>
                      ) : null}
                    </div>
                  </div>
                  {/* Barra: cuenta (teal) + excedente que rolla (ámbar); marcador del tope */}
                  <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="absolute left-0 top-0 h-full bg-[#3E667D]"
                      style={{ width: `${countedPct}%` }}
                    />
                    <div
                      className="absolute top-0 h-full bg-amber-400"
                      style={{ left: `${countedPct}%`, width: `${rolledPct}%` }}
                    />
                    {hasCap && (
                      <div
                        className="absolute top-[-2px] h-[14px] w-0.5 bg-gray-700"
                        style={{ left: `${capPct}%` }}
                        title={t('capTitle', { amount: fmtPts(cap) })}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Sección: clientes preferentes del distribuidor (no son parte del árbol MLM)
function PreferredCustomersSection({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations('distributor.network.preferred');
  const { data: preferred = [], isLoading } = usePreferredCustomers();

  return (
    <Card className="mt-8">
      <CardContent className="p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {t('title')}
            </h3>
            <p className="text-sm text-gray-500">
              {t('subtitle')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <UserPlusIcon className="h-4 w-4" />
            {t('add')}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : preferred.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-500">
              {t('empty')}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={onAdd}
            >
              <UserPlusIcon className="h-4 w-4" />
              {t('enrollFirst')}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4 font-medium">{t('columns.id')}</th>
                  <th className="py-2 pr-4 font-medium">{t('columns.name')}</th>
                  <th className="py-2 pr-4 font-medium">{t('columns.email')}</th>
                  <th className="py-2 pr-4 font-medium">{t('columns.phone')}</th>
                  <th className="py-2 pr-4 font-medium">{t('columns.joinDate')}</th>
                </tr>
              </thead>
              <tbody>
                {preferred.map((c) => (
                  <tr
                    key={c.customerId}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-mono text-[#3E667D]">
                      {c.customerNumber || '—'}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-gray-900">
                      {c.fullName}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{c.email}</td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {c.phone || '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString('es-MX')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Etiquetas de estado para el archivo exportado
const STATUS_LABELS_EXPORT: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
};

// Genera y descarga un CSV (UTF-8 + BOM, separador ";") que Excel abre en columnas.
// Se antepone la directiva "sep=;" para que Excel use ";" sin importar el separador
// de lista del locale (si no, en Excel con "," queda todo en una sola celda).
function downloadDownlinesCsv(rows: DownlineItem[]) {
  const headers = ['ID distribuidor', 'Nombre', 'Nivel', 'Profundidad', 'Rango', 'Patrocinador', 'ID patrocinador', 'Estado', 'Puntos personales', 'Fecha de ingreso'];
  const esc = (v: string | number | null | undefined) =>
    `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`;

  const body = rows.map((r) =>
    [
      r.customerNumber || '',
      r.fullName,
      r.level,
      r.level > 0 ? Array(r.level).fill('*').join(' ') : '',
      r.rankName || 'Distribuidor',
      r.sponsorName || '',
      r.sponsorCode || '',
      STATUS_LABELS_EXPORT[r.status] || r.status,
      r.personalPoints ?? 0,
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-MX') : '',
    ]
      .map(esc)
      .join(';'),
  );

  const csv = '﻿' + 'sep=;\r\n' + [headers.map(esc).join(';'), ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `descendencia-red-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Colores por rango (etiquetas en español devueltas por el backend)
const rankColors: Record<string, string> = {
  'Diamante': 'text-blue-600 bg-blue-50',
  'Diamante Doble': 'text-blue-600 bg-blue-50',
  'Diamante Triple': 'text-blue-600 bg-blue-50',
  'Platino': 'text-purple-600 bg-purple-50',
  'Oro': 'text-yellow-600 bg-yellow-50',
  'Plata': 'text-gray-600 bg-gray-100',
  'Bronce': 'text-orange-600 bg-orange-50',
  'Distribuidor': 'text-green-700 bg-green-50',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'text-green-700 bg-green-50' },
  inactive: { label: 'Inactivo', color: 'text-red-600 bg-red-50' },
  suspended: { label: 'Suspendido', color: 'text-amber-600 bg-amber-50' },
};

// Vista de la descendencia de red (tabla con paginación del servidor)
function TreeListView() {
  const t = useTranslations('distributor.network.downline');
  const tStatus = useTranslations('distributor.network.status');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportPct, setExportPct] = useState(0);

  // Reconectar a un job de exportación en curso tras recargar/navegar.
  useEffect(() => {
    const saved = localStorage.getItem('tl_red_export_job');
    if (saved) setExportJobId(saved);
  }, []);

  // Polling del job de exportación: avanza %, auto-descarga al terminar, limpia
  // al fallar/expirar. Sobrevive recargas porque el trabajo corre en el servidor.
  useEffect(() => {
    if (!exportJobId) return;
    let active = true;
    const finish = (msg: string, isError = false) => {
      if (!active) return;
      localStorage.removeItem('tl_red_export_job');
      setExportJobId(null);
      setExportPct(0);
      if (isError) toast.error(msg);
      else toast.success(msg);
    };
    const poll = async () => {
      try {
        const st = await networkApi.getNetworkExportJob(exportJobId);
        if (!active) return;
        setExportPct(st.percent);
        if (st.status === 'done') {
          await networkApi.downloadNetworkExportFile(exportJobId, st.filename);
          finish(t('exportDownloaded', { count: st.total.toLocaleString() }));
        } else if (st.status === 'error') {
          finish(st.error || t('exportGenError'), true);
        }
      } catch {
        finish(t('exportExpired'), true);
      }
    };
    void poll();
    const intervalId = window.setInterval(() => void poll(), 1800);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [exportJobId]);
  const { get, getNumber, setParams } = useQueryFilters({ page: '1', limit: '20' });
  const levelFilterStr = get('level');
  const levelFilter = levelFilterStr ? parseInt(levelFilterStr) : undefined;
  const statusFilterStr = get('status');
  const statusFilter = (statusFilterStr || undefined) as DownlineQuery['status'] | undefined;
  const qualifiedStr = get('qualified');
  const qualified = qualifiedStr === 'true' ? true : qualifiedStr === 'false' ? false : undefined;
  const rankStr = get('rank');
  const rankNumber = rankStr ? parseInt(rankStr) : undefined;
  const joinedPeriod = get('joinedPeriod') || '';
  const page = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  // Periodos para el filtro "nuevos socios del periodo" (26→25)
  const { data: currentPeriodData } = useCurrentPeriod();
  const { data: periodsData } = useCommissionPeriods();
  const periodsArray = Array.isArray(periodsData)
    ? periodsData
    : (periodsData as any)?.data ?? [];
  const sortedPeriods = [...periodsArray].sort((a: any, b: any) => {
    const ad = String(a?.startDate ?? a?.start_date ?? '');
    const bd = String(b?.startDate ?? b?.start_date ?? '');
    if (ad && bd && ad !== bd) return bd.localeCompare(ad);
    return (
      Number(b?.periodNumber ?? b?.period_number ?? 0) -
      Number(a?.periodNumber ?? a?.period_number ?? 0)
    );
  });

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setParams({ page: '1' });
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const query: DownlineQuery = useMemo(() => ({
    search: debouncedSearch || undefined,
    level: levelFilter,
    status: statusFilter,
    qualified,
    rankNumber,
    joinedPeriodId: joinedPeriod || undefined,
    page,
    limit: pageSize,
    sortBy: 'level',
    sortOrder: 'asc',
  }), [debouncedSearch, levelFilter, statusFilter, qualified, rankNumber, joinedPeriod, page, pageSize]);

  const { data: response, isLoading, isFetching, error, refetch } = useNetworkDownlines(query);

  const hasActiveFilters = Boolean(
    debouncedSearch || levelFilter || statusFilter || qualifiedStr || rankStr || joinedPeriod,
  );

  const clearFilters = () => {
    setSearch('');
    setParams({
      level: null,
      status: null,
      qualified: null,
      rank: null,
      joinedPeriod: null,
      page: null,
    });
  };

  // Arranca la exportación de la red COMPLETA en SEGUNDO PLANO (el servidor genera
  // el CSV). Se persiste el jobId en localStorage para reconectar tras una recarga;
  // el polling muestra el % y auto-descarga al terminar.
  const handleExport = async () => {
    if (exportJobId) return;
    try {
      const { jobId } = await networkApi.startNetworkExport();
      localStorage.setItem('tl_red_export_job', jobId);
      setExportPct(0);
      setExportJobId(jobId);
      toast.info(t('exportStarted'));
    } catch {
      toast.error(t('exportStartError'));
    }
  };

  const columns: DataTableColumn<DownlineItem>[] = [
    {
      key: 'fullName',
      header: t('columns.distributor'),
      sortable: true,
      sortValue: (m) => m.fullName,
      render: (m) => {
        const initials = m.fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#3E667D] to-[#C8DDF2] rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{m.fullName}</p>
              <p className="text-xs text-gray-500 truncate">
                {m.email}
                {m.phone ? ` · ${m.phone}` : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'level',
      header: t('columns.level'),
      sortable: true,
      sortValue: (m) => m.level,
      render: (m) => <span className="text-sm text-gray-600">{t('columns.levelValue', { level: m.level })}</span>,
    },
    {
      key: 'depthMarker',
      header: t('columns.depth'),
      sortable: false,
      render: (m) => (
        <span className="font-mono text-sm tracking-widest text-[#3E667D]/70">
          {m.level > 0 ? Array(m.level).fill('*').join(' ') : '—'}
        </span>
      ),
    },
    {
      key: 'rankName',
      header: t('columns.rank'),
      sortable: true,
      sortValue: (m) => m.rankName || 'Distribuidor',
      render: (m) => {
        const rank = m.rankName || 'Distribuidor';
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${rankColors[rank] || rankColors['Distribuidor']}`}>
            {rank}
          </span>
        );
      },
    },
    {
      key: 'sponsorName',
      header: t('columns.sponsor'),
      sortable: true,
      sortValue: (m) => m.sponsorName || '',
      render: (m) =>
        m.sponsorName ? (
          <div className="min-w-0">
            <p className="text-sm text-gray-700 truncate">{m.sponsorName}</p>
            {m.sponsorCode && (
              <p className="text-xs text-gray-400 font-mono">{t('columns.sponsorId', { code: m.sponsorCode })}</p>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      sortable: true,
      sortValue: (m) => m.status,
      render: (m) => {
        const s = statusLabels[m.status] || statusLabels.active;
        const label = statusLabels[m.status]
          ? tStatus(m.status as 'active' | 'inactive' | 'suspended')
          : m.status;
        return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.color}`}>{label}</span>;
      },
    },
    {
      key: 'personalPoints',
      header: t('columns.personalPoints'),
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      sortable: true,
      sortValue: (m) => m.personalPoints ?? 0,
      render: (m) => (
        <span className="font-bold text-gray-900">{(m.personalPoints ?? 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('columns.joinDate'),
      sortable: true,
      sortValue: (m) => m.createdAt || '',
      render: (m) => (
        <span className="text-sm text-gray-500">
          {m.createdAt ? new Date(m.createdAt).toLocaleDateString('es-MX') : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Encabezado: Descendencia de Red + descarga */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
              <p className="text-sm text-gray-500">{t('subtitle')}</p>
            </div>
            <Button
              variant="default"
              onClick={handleExport}
              disabled={!!exportJobId}
            >
              {exportJobId ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('generating', { percent: exportPct })}
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {t('downloadExcel')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Búsqueda + limpiar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                />
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="shrink-0 text-gray-500"
                >
                  <XMarkIcon className="h-4 w-4" />
                  {t('clear')}
                </Button>
              )}
            </div>
            {/* Filtros */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Filtro de nivel */}
            <SearchableSelect
              options={[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: t('filters.levelOption', { n }) }))}
              value={levelFilterStr}
              onChange={(val) => setParams({ level: val || null, page: null })}
              allLabel={t('filters.allLevels')}
              allValue=""
            />
            {/* Filtro de estado */}
            <SearchableSelect
              options={[
                { value: 'active', label: t('filters.active') },
                { value: 'inactive', label: t('filters.inactive') },
                { value: 'suspended', label: t('filters.suspended') },
              ]}
              value={statusFilterStr}
              onChange={(val) => setParams({ status: val || null, page: null })}
              allLabel={t('filters.allStatuses')}
              allValue=""
            />
            {/* Filtro de calificación */}
            <SearchableSelect
              options={[
                { value: 'false', label: t('filters.notQualified') },
                { value: 'true', label: t('filters.qualified') },
              ]}
              value={qualifiedStr}
              onChange={(val) => setParams({ qualified: val || null, page: null })}
              allLabel={t('filters.allQualification')}
              allValue=""
            />
            {/* Filtro de rango */}
            <SearchableSelect
              options={RANK_ORDER.map((code, i) => ({
                value: String(i + 1),
                label: RANK_LABELS[code],
              }))}
              value={rankStr}
              onChange={(val) => setParams({ rank: val || null, page: null })}
              allLabel={t('filters.allRanks')}
              allValue=""
            />
            {/* Filtro: nuevos socios del periodo (26→25) */}
            <SearchableSelect
              options={sortedPeriods.map((p: any) => ({
                value: p.id,
                label: `${t('filters.newInPeriod', { period: p.name })}${
                  currentPeriodData?.id === p.id ? t('periodCurrent') : ''
                }`,
              }))}
              value={joinedPeriod}
              onChange={(val) => setParams({ joinedPeriod: val || null, page: null })}
              allLabel={t('filters.allPeriods')}
              allValue=""
            />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      {error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500 mb-2">{t('error.title')}</p>
            <p className="text-sm text-gray-500">{t('error.body')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              <ArrowPathIcon className="h-4 w-4" />
              {t('error.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-6">
            {isFetching && !isLoading && (
              <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                {t('updating')}
              </div>
            )}
            <DataTable
              columns={columns}
              data={response?.data ?? []}
              isLoading={isLoading}
              getRowKey={(m) => m.id}
              minWidthClassName="min-w-[920px]"
              emptyState={
                <div className="py-4 text-center">
                  <UsersIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? t('empty.withFilters')
                      : t('empty.noFilters')}
                  </p>
                </div>
              }
            />

            {response && response.total > 0 && (
              <DataTablePagination
                currentPage={page}
                pageSize={pageSize}
                totalItems={response.total}
                isLoading={isLoading || isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
