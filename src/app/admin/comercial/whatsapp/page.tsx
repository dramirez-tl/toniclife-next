'use client';

// Admin > Comercial > WhatsApp: recorridos automáticos, campañas medibles y
// resultados por periodo.
//
// Orden de la página: Salud del canal → selector de periodo → Impacto del
// periodo → pestañas Recorridos (default) | Campañas (el tablero de siempre) |
// Personas (datos personales, ligada a la campaña elegida).
//
// Estado en la URL: ?periodo=<period_number>&campana=<key>&tab=recorridos|
// campanas|personas (+ filtro, segmento, ola, grupo, alcance y page en
// Personas). El alias viejo tab=tablero se acepta como campanas. Los valores
// inválidos se normalizan con router.replace.
//
// El periodo por defecto es el que el API marca como actual en GET /mlm/periods
// (isCurrent, tabla tonic.commission_periods): el front NUNCA deduce el periodo
// por fecha. Si esa lista no se puede leer (403, red, despliegue), se navega
// por número (period_number ± 1) con el periodo que reportan los recorridos /
// el impacto.

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodSelector, useTreasuryPeriod } from '@/components/admin/treasury/PeriodSelector';
import { usePeriods } from '@/hooks/useMlmPeriods';
import {
  useWhatsAppCampaignDashboard,
  useWhatsAppCampaigns,
} from '@/hooks/useWhatsAppCampaigns';
import { useWhatsAppJourneys } from '@/hooks/useWhatsAppJourneys';
import { useWhatsAppPeriodImpact } from '@/hooks/useWhatsAppPeriodImpact';
import {
  DEFAULT_TAB,
  WHATSAPP_ADMIN_PATH,
  construirQuery,
  fechaLarga,
  isWhatsAppTab,
  normalizarParams,
  tabUsaCampana,
  type WhatsAppParams,
} from '@/lib/whatsapp-campaign/format';
import { campanaSeleccionada, opcionesSelector } from '@/lib/whatsapp-campaign/reportes';
import { CampaignsSection } from './components/CampaignsSection';
import { ChannelHealthCard } from './components/ChannelHealthCard';
import { JourneysPanel } from './components/JourneysPanel';
import { PeriodImpactPanel } from './components/PeriodImpactPanel';

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <WhatsAppContent />
    </Suspense>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">WhatsApp</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">Recorridos, campañas y resultados por WhatsApp</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

/**
 * Selector de respaldo cuando no se puede leer GET /mlm/periods (403, red,
 * despliegue): navega por number (period_number ± 1) con el nombre y las
 * fechas que reporta el API del impacto o de los recorridos. Nunca calcula
 * fechas.
 */
function PeriodFallbackBar({
  periodNumber,
  name,
  startDate,
  endDate,
  isClosed,
  isDefault,
  onChange,
}: {
  periodNumber: number | null;
  name: string | null;
  startDate: string | null;
  endDate: string | null;
  isClosed: boolean | null;
  /** true = se muestra el periodo actual (sin ?periodo). */
  isDefault: boolean;
  onChange: (periodo: number | null) => void;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <CalendarDaysIcon className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Periodo · impacto y recorridos
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-bold leading-tight text-foreground">
                  {name ?? (periodNumber != null ? `Periodo ${periodNumber}` : '—')}
                </p>
                {startDate && endDate && (
                  <span className="text-xs text-muted-foreground">
                    del {fechaLarga(startDate)} al {fechaLarga(endDate)}
                  </span>
                )}
                {isDefault && <Badge variant="success">Actual</Badge>}
                {!isDefault && isClosed === true && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Cerrado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                No se pudo leer la lista de periodos; se navega por número de periodo.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-2.5"
              disabled={periodNumber == null || periodNumber <= 1}
              onClick={() => periodNumber != null && onChange(periodNumber - 1)}
              title="Periodo anterior"
              aria-label="Periodo anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-2.5"
              disabled={periodNumber == null || isDefault}
              onClick={() => periodNumber != null && onChange(periodNumber + 1)}
              title="Periodo siguiente"
              aria-label="Periodo siguiente"
            >
              <ChevronRightIcon className="h-4 w-4" aria-hidden />
            </Button>
            {!isDefault && (
              <Button variant="ghost" size="sm" className="h-10 text-primary" onClick={() => onChange(null)}>
                Ir al actual
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WhatsAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = normalizarParams(searchParams);

  // ── Periodo (tonic.commission_periods vía GET /mlm/periods) ──
  const periodsQ = usePeriods();
  const periods = periodsQ.data ?? [];
  const periodIdParam =
    params.periodo != null ? (periods.find((p) => p.periodNumber === params.periodo)?.id ?? '') : '';
  const selection = useTreasuryPeriod(periodIdParam);
  const selectedPeriod = selection.selectedPeriod;

  // Respaldo del periodo actual cuando no se puede leer la lista (403).
  const journeys = useWhatsAppJourneys();
  const periodNumber: number | null = periodsQ.isSuccess
    ? (selectedPeriod?.periodNumber ?? params.periodo ?? journeys.data?.period?.number ?? null)
    : (params.periodo ?? journeys.data?.period?.number ?? null);
  const impact = useWhatsAppPeriodImpact(periodNumber);

  // ── Campañas (pestañas Campañas y Personas) ──
  const campaigns = useWhatsAppCampaigns();
  const list = campaigns.data ?? [];
  // Sin ?campana, la primera campaña principal (el API las manda primero).
  const selected = campanaSeleccionada(list, params.campana);
  const opciones = opcionesSelector(list, selected);
  const necesitaCampana = tabUsaCampana(params.tab);
  const dashboard = useWhatsAppCampaignDashboard(necesitaCampana ? selected : null);

  // Sin useCallback: el React Compiler lo memoiza solo (con la memoización
  // manual se quejaba de que no podía conservarla).
  const navigate = (next: Partial<Omit<WhatsAppParams, 'invalido'>>) => {
    const merged = { ...params, ...next };
    const tab = merged.tab ?? DEFAULT_TAB;
    const campana = tabUsaCampana(tab) ? (selected ?? merged.campana) : merged.campana;
    router.replace(`${WHATSAPP_ADMIN_PATH}${construirQuery({ ...merged, campana })}`, { scroll: false });
  };

  // URL canónica: parámetros inválidos (o alias viejo), campaña ausente o
  // inexistente en las pestañas que la usan, periodo inexistente en la lista.
  const periodoCanonico =
    periodsQ.isSuccess && params.periodo != null && !periods.some((p) => p.periodNumber === params.periodo)
      ? null
      : params.periodo;
  const campanaCanonica = necesitaCampana && campaigns.isSuccess && selected ? selected : params.campana;
  const canonical = `${WHATSAPP_ADMIN_PATH}${construirQuery({
    ...params,
    periodo: periodoCanonico,
    campana: campanaCanonica,
  })}`;
  useEffect(() => {
    if (params.invalido || periodoCanonico !== params.periodo || campanaCanonica !== params.campana) {
      router.replace(canonical, { scroll: false });
    }
  }, [params.invalido, params.periodo, params.campana, periodoCanonico, campanaCanonica, canonical, router]);

  const onPeriodChange = (periodId: string | null) => {
    const p = periodId ? periods.find((x) => x.id === periodId) : null;
    navigate({ periodo: p?.periodNumber ?? null });
  };

  return (
    <PageShell>
      <div className="grid gap-5">
        <ChannelHealthCard />

        {periodsQ.isError ? (
          <PeriodFallbackBar
            periodNumber={periodNumber}
            name={impact.data?.periodo.nombre || journeys.data?.period?.name || null}
            startDate={impact.data?.periodo.inicio || journeys.data?.period?.startDate || null}
            endDate={impact.data?.periodo.fin || journeys.data?.period?.endDate || null}
            isClosed={impact.data ? impact.data.periodo.cerrado : null}
            isDefault={params.periodo == null}
            onChange={(periodo) => navigate({ periodo })}
          />
        ) : (
          <div className="-mb-6">
            <PeriodSelector
              selection={selection}
              onChange={onPeriodChange}
              caption="Periodo · impacto y recorridos"
            />
          </div>
        )}

        <PeriodImpactPanel
          periodNumber={periodNumber}
          impact={impact}
          periodsLoading={periodsQ.isLoading || journeys.isLoading}
        />

        <Tabs
          value={params.tab}
          onValueChange={(v) => navigate({ tab: isWhatsAppTab(v) ? v : DEFAULT_TAB })}
        >
          <TabsList>
            <TabsTrigger value="recorridos">Recorridos</TabsTrigger>
            <TabsTrigger value="campanas">Campañas</TabsTrigger>
            <TabsTrigger value="personas">Personas</TabsTrigger>
          </TabsList>

          <TabsContent value="recorridos" className="mt-5">
            <JourneysPanel periodNumber={periodNumber} />
          </TabsContent>

          <TabsContent value="campanas" className="mt-5">
            <CampaignsSection
              tab="campanas"
              campaigns={campaigns}
              dashboard={dashboard}
              selected={selected}
              opciones={opciones}
              params={params}
              navigate={navigate}
            />
          </TabsContent>

          <TabsContent value="personas" className="mt-5">
            <CampaignsSection
              tab="personas"
              campaigns={campaigns}
              dashboard={dashboard}
              selected={selected}
              opciones={opciones}
              params={params}
              navigate={navigate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
