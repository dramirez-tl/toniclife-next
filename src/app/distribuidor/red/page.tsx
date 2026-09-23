'use client';

// /distribuidor/red — "Mi red" para redes grandes (contrato /distribuidor/red
// §5, V13): cabecera compacta con UN selector de periodo 26→25 (gobierna
// resumen, explorador, lista, volumen y el Excel), tira de 6 indicadores con
// las definiciones del home, búsqueda que lleva a la Lista, pestañas
// controladas por URL (Explorar · Lista · Volumen por línea directa), tarjeta
// "Descarga de tu red" (el CSV de siempre, ahora con fases y aviso desde
// cualquier página vía NetworkExportWatcher), clientes preferentes y ficha
// del socio en Sheet. Todo el estado de filtros vive en la URL
// (lib/network/filters.ts) con useQueryFilters; el deep-link ?alta=socio|
// preferente y el gate del piloto (registerMember, fail-closed) siguen igual;
// MemberEnrollmentPanel/PreferredEnrollmentPanel no cambian (V16).

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { MagnifyingGlassIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useNetworkOverview } from '@/hooks/useNetwork';
import { useMyPilotFeatures } from '@/hooks/usePilot';
import { periodsUpToCurrent, useCommissionPeriods } from '@/hooks/useCommissions';
import { useDistributorDashboard } from '@/hooks/useDistributor';
import {
  TAB_PARAM,
  URL_PARAM,
  isSearchable,
  isUuid,
  kpiToFilter,
  parseTab,
  underLinePatch,
  urlToQuery,
  type NetworkTab,
  type OverviewKpi,
} from '@/lib/network/filters';
import { ROOT_ME } from '@/lib/network/explorer-tree';
import { MemberEnrollmentPanel } from './MemberEnrollmentPanel';
import { PreferredEnrollmentPanel } from './PreferredEnrollmentPanel';
import { DirectLinesVolumeSection } from './components/DirectLinesVolumeSection';
import { InvitePanel } from './components/InvitePanel';
import { MemberSheet, type MemberSheetContext } from './components/MemberSheet';
import { NetworkExplorer } from './components/NetworkExplorer';
import { NetworkExportCard } from './components/NetworkExportCard';
import { NetworkHeader } from './components/NetworkHeader';
import { NetworkList } from './components/NetworkList';
import { NetworkOverview } from './components/NetworkOverview';
import { PreferredCustomersSection } from './components/PreferredCustomersSection';

/** Fila de GET /mlm/periods (camel o snake según el endpoint; índice para periodsUpToCurrent). */
type PeriodRow = Record<string, unknown> & {
  id: string;
  name: string;
  startDate?: string;
  start_date?: string;
  periodNumber?: number;
  period_number?: number;
  isCurrent?: boolean;
  isClosed?: boolean;
};

/** Red chica: se muestra la tarjeta "Crece tu red" (D3). */
const SMALL_NETWORK = 10;
const SEARCH_DEBOUNCE_MS = 400;
/** Estable a propósito: useQueryFilters recrea get/setParams si `defaults` cambia de identidad. */
const QUERY_DEFAULTS: Record<string, string> = {};

/** Código de referido del perfil: referralCode, o el `ref` de personalLink, o el número. */
function referralCodeOf(profile: { referralCode?: string; personalLink?: string; code?: string } | null | undefined): string | null {
  if (profile?.referralCode) return profile.referralCode;
  if (profile?.personalLink) {
    try {
      const ref = new URL(profile.personalLink).searchParams.get('ref');
      if (ref) return ref;
    } catch {
      // enlace mal formado: se cae al código
    }
  }
  return profile?.code ?? null;
}

export default function RedPage() {
  return (
    <Suspense>
      <RedContent />
    </Suspense>
  );
}

function RedContent() {
  const t = useTranslations('distributor.network');
  const tGate = useTranslations('distributor.pilotGate');
  const { searchParams, get, setParams } = useQueryFilters(QUERY_DEFAULTS);

  // ---------------------------------------------------------------------------
  // Piloto: el alta de socios/preferentes se libera POR DISTRIBUIDOR desde el
  // admin (fail-closed). Sin liberar, los botones avisan y no abren el panel.
  // ---------------------------------------------------------------------------
  const { data: pilotFeatures, isPlaceholderData: pilotLoading } = useMyPilotFeatures();
  const registerMemberEnabled = pilotFeatures?.registerMember ?? false;
  const gateMessage = tGate('registerMember');
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isPreferredOpen, setIsPreferredOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Deep-link /distribuidor/red?alta=socio|preferente (desde el home): se lee
  // UNA vez al montar, se limpia de la URL y queda pendiente hasta conocer las
  // features del piloto (gate). La resolución corre en un callback (setTimeout)
  // para no encadenar renders dentro del efecto.
  const [pendingAlta, setPendingAlta] = useState<'socio' | 'preferente' | null>(() => {
    const alta = searchParams.get('alta');
    return alta === 'socio' || alta === 'preferente' ? alta : null;
  });
  useEffect(() => {
    if (pendingAlta) setParams({ alta: null });
  }, [pendingAlta, setParams]);
  useEffect(() => {
    if (!pendingAlta || pilotLoading) return;
    const id = window.setTimeout(() => {
      if (!registerMemberEnabled) toast.error(gateMessage);
      else if (pendingAlta === 'socio') setIsEnrollOpen(true);
      else setIsPreferredOpen(true);
      setPendingAlta(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [pendingAlta, pilotLoading, registerMemberEnabled, gateMessage]);

  const openEnroll = () => {
    if (!registerMemberEnabled) {
      toast.error(gateMessage);
      return;
    }
    setIsEnrollOpen(true);
  };
  const openPreferred = () => {
    if (!registerMemberEnabled) {
      toast.error(gateMessage);
      return;
    }
    setIsPreferredOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Enlace de invitación (mismo cálculo de siempre)
  // ---------------------------------------------------------------------------
  const { profile: distributorProfile } = useDistributorDashboard();
  const referralCode = referralCodeOf(distributorProfile);
  // Solo se usa dentro del panel (portal cerrado en SSR): sin desajuste de hidratación.
  const inviteLink = typeof window !== 'undefined' && referralCode ? `${window.location.origin}/registro/distribuidor?ref=${referralCode}` : '';

  // ---------------------------------------------------------------------------
  // Periodo (26→25): selector hasta el actual; sin `periodo=` en la URL el
  // servidor resuelve el actual con CURRENT_DATE.
  // ---------------------------------------------------------------------------
  const { data: periodsData } = useCommissionPeriods();
  const periods = useMemo(() => {
    const raw = periodsData as unknown as PeriodRow[] | { data?: PeriodRow[] } | undefined;
    const list: PeriodRow[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
    const sorted = [...list].sort((a, b) => {
      const ad = String(a.startDate ?? a.start_date ?? '');
      const bd = String(b.startDate ?? b.start_date ?? '');
      if (ad && bd && ad !== bd) return bd.localeCompare(ad);
      return Number(b.periodNumber ?? b.period_number ?? 0) - Number(a.periodNumber ?? a.period_number ?? 0);
    });
    return periodsUpToCurrent(sorted);
  }, [periodsData]);
  const currentPeriod = periods.find((p) => p.isCurrent) ?? null;
  const periodParam = get(URL_PARAM.period);
  const explicitPeriodId = isUuid(periodParam) ? periodParam : null;
  /** undefined = actual (lo resuelve el servidor). */
  const periodIdForApi = explicitPeriodId ?? undefined;
  const selectedPeriodId = explicitPeriodId ?? currentPeriod?.id ?? '';
  const periodOptions = periods.map((p) => ({
    value: p.id,
    label: `${p.name}${p.isCurrent ? t('directLines.periodCurrent') : ''}`,
  }));
  const onPeriodChange = (id: string) =>
    setParams({ [URL_PARAM.period]: id && id !== currentPeriod?.id ? id : null, [URL_PARAM.page]: null });

  const overviewQuery = useNetworkOverview(periodIdForApi);
  const overview = overviewQuery.data;
  const shownPeriodId = overview?.period.id ?? selectedPeriodId;
  const periodName = overview?.period.name ?? periods.find((p) => p.id === selectedPeriodId)?.name ?? null;
  const isCurrentShown = overview?.period.isCurrent ?? explicitPeriodId === null;

  // ---------------------------------------------------------------------------
  // Pestañas y filtros por URL
  // ---------------------------------------------------------------------------
  const tab = parseTab(get(URL_PARAM.tab));
  const membersQuery = useMemo(() => urlToQuery(searchParams), [searchParams]);
  const explorerRoot = membersQuery.under ?? ROOT_ME;
  const onTabChange = (value: string) =>
    setParams({ [URL_PARAM.tab]: value === TAB_PARAM.explore ? null : value, [URL_PARAM.page]: null });

  // Búsqueda (mín. 2 caracteres o 1 si es número; debounce 400 ms): escribir
  // cambia a Lista con q=; borrar regresa a la pestaña anterior.
  const urlSearch = get(URL_PARAM.search);
  const [searchText, setSearchText] = useState(urlSearch);
  const previousTab = useRef<NetworkTab>(tab === 'list' ? 'explore' : tab);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const trimmed = searchText.trim();
      if (isSearchable(trimmed)) {
        if (trimmed !== urlSearch) setParams({ [URL_PARAM.search]: trimmed, [URL_PARAM.tab]: TAB_PARAM.list, [URL_PARAM.page]: null });
      } else if (urlSearch) {
        const back = previousTab.current;
        setParams({ [URL_PARAM.search]: null, [URL_PARAM.tab]: back === 'explore' ? null : TAB_PARAM[back], [URL_PARAM.page]: null });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchText, urlSearch, setParams]);
  const onSearchChange = (value: string) => {
    if (tab !== 'list') previousTab.current = tab;
    setSearchText(value);
  };
  const searchHint = searchText.trim().length > 0 && !isSearchable(searchText.trim());

  // Ficha del socio (Sheet)
  const [member, setMember] = useState<{ customerId: string; context: MemberSheetContext } | null>(null);
  const openMember = (customerId: string, context: MemberSheetContext) => setMember({ customerId, context });
  const openLine = (memberId: string | null) => {
    setMember(null);
    setParams({ [URL_PARAM.tab]: null, [URL_PARAM.under]: memberId, [URL_PARAM.page]: null });
  };
  const seeList = (memberId: string) => {
    setMember(null);
    setParams(underLinePatch(memberId));
  };
  const [highlightLine, setHighlightLine] = useState<string | null>(null);
  const seeVolume = (memberId: string) => {
    setHighlightLine(memberId);
    setParams({ [URL_PARAM.tab]: TAB_PARAM.volume });
  };

  // Tira: ficha activa según el filtro de la Lista
  const activeKpi: OverviewKpi | null =
    tab !== 'list'
      ? null
      : membersQuery.activity
        ? membersQuery.activity === 'none'
          ? null
          : membersQuery.activity
        : membersQuery.joinedPeriodId && membersQuery.joinedPeriodId === shownPeriodId
          ? 'newThisPeriod'
          : 'total';
  const activeLevel = tab === 'list' ? (membersQuery.level ?? null) : null;
  const onKpi = (kpi: OverviewKpi) => setParams(kpiToFilter(kpi, shownPeriodId));
  const onLevel = (level: number) =>
    setParams({ [URL_PARAM.tab]: TAB_PARAM.list, [URL_PARAM.level]: activeLevel === level ? null : String(level), [URL_PARAM.page]: null });

  // "Descargar Excel" del encabezado desplaza a la tarjeta
  const exportRef = useRef<HTMLDivElement | null>(null);
  const scrollToExport = () => exportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const showGrow = Boolean(overview) && (overview?.totals.total ?? 0) < SMALL_NETWORK;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
        <NetworkHeader
          period={overview?.period ?? null}
          periodOptions={periodOptions}
          selectedPeriodId={selectedPeriodId}
          onPeriodChange={onPeriodChange}
          registerMemberEnabled={registerMemberEnabled}
          gateMessage={gateMessage}
          onEnroll={openEnroll}
          onPreferred={openPreferred}
          onInvite={() => setIsInviteOpen(true)}
          onDownload={scrollToExport}
        />

        <NetworkOverview
          overview={overview}
          isLoading={overviewQuery.isLoading}
          isError={overviewQuery.isError}
          onRetry={() => void overviewQuery.refetch()}
          onKpi={onKpi}
          onLevel={onLevel}
          activeKpi={activeKpi}
          activeLevel={activeLevel}
        />

        {/* Red chica: un solo llamado al alta (D3) */}
        {showGrow && (
          <Card className="border-0 bg-gradient-to-br from-[#3E667D] to-[#0A4B94] text-white shadow-lg">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">{t('grow.title')}</h2>
                <p className="text-sm text-white/80">{t('grow.subtitle')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={openEnroll}
                  title={registerMemberEnabled ? undefined : gateMessage}
                  className={`bg-white text-[#3E667D] shadow-md shadow-black/10 hover:bg-white/90 ${registerMemberEnabled ? '' : 'opacity-60'}`}
                >
                  <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
                  {t('grow.enrollPartner')}
                </Button>
                <Button
                  variant="outline"
                  onClick={openPreferred}
                  title={registerMemberEnabled ? undefined : gateMessage}
                  className={`border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white ${registerMemberEnabled ? '' : 'opacity-60'}`}
                >
                  <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
                  {t('grow.preferredCustomer')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Búsqueda (encima de las pestañas) */}
        <div>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('list.searchPlaceholder')}
              aria-label={t('list.searchPlaceholder')}
              aria-describedby="red-search-hint"
              maxLength={80}
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3E667D] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label={t('list.filters.clear')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <p id="red-search-hint" className={`mt-1 text-xs ${searchHint ? 'text-amber-700' : 'text-gray-400'}`}>
            {t('list.searchHint')}
          </p>
        </div>

        <Tabs value={TAB_PARAM[tab]} onValueChange={onTabChange}>
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value={TAB_PARAM.explore}>{t('tabs.explore')}</TabsTrigger>
            <TabsTrigger value={TAB_PARAM.list}>{t('tabs.list')}</TabsTrigger>
            <TabsTrigger value={TAB_PARAM.volume}>{t('tabs.directLineVolume')}</TabsTrigger>
          </TabsList>
          <TabsContent value={TAB_PARAM.explore} className="mt-4">
            <NetworkExplorer
              key={`${explorerRoot}:${periodIdForApi ?? 'current'}`}
              rootMemberId={explorerRoot}
              periodId={periodIdForApi}
              registerMemberEnabled={registerMemberEnabled}
              gateMessage={gateMessage}
              onEnroll={openEnroll}
              onOpenLine={openLine}
              onSeeList={seeList}
              onSeeVolume={seeVolume}
              onOpenMember={openMember}
            />
          </TabsContent>
          <TabsContent value={TAB_PARAM.list} className="mt-4">
            <NetworkList
              query={membersQuery}
              maxLevel={overview?.totals.maxLevel}
              periods={periods.map((p) => ({ id: p.id, name: p.name }))}
              setParams={setParams}
              onOpenMember={openMember}
            />
          </TabsContent>
          <TabsContent value={TAB_PARAM.volume} className="mt-4">
            <DirectLinesVolumeSection periodId={periodIdForApi} highlightMemberId={highlightLine} />
          </TabsContent>
        </Tabs>

        <div ref={exportRef} className="scroll-mt-4">
          <NetworkExportCard periodId={explicitPeriodId} periodName={periodName} isCurrentPeriod={isCurrentShown} />
        </div>

        <PreferredCustomersSection onAdd={openPreferred} />
      </div>

      <InvitePanel open={isInviteOpen} onClose={() => setIsInviteOpen(false)} link={inviteLink} />

      {/* Panel de alta estructurada (colocación + kit + modo de pago): sin cambios */}
      <MemberEnrollmentPanel isOpen={isEnrollOpen} onClose={() => setIsEnrollOpen(false)} />

      {/* Panel de alta de cliente preferente (sin kit): sin cambios */}
      <PreferredEnrollmentPanel isOpen={isPreferredOpen} onClose={() => setIsPreferredOpen(false)} />

      <MemberSheet
        customerId={member?.customerId ?? null}
        context={member?.context ?? null}
        onClose={() => setMember(null)}
        onOpenLine={openLine}
        onSeeList={seeList}
      />
    </TooltipProvider>
  );
}
