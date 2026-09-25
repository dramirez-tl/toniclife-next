'use client';

// Admin > Comercial > WhatsApp: campañas de WhatsApp medibles.
//
// Réplica en el admin del tablero de la campaña de cierre (artefacto de
// claude.ai) conectada al API (GET /whatsapp/campaigns/*, permiso
// 'comercial'), más el bloque "¿Tomaron en cuenta el aviso?" (quién leyó y
// DESPUÉS compró o calificó, contra el grupo de control) y la pestaña
// Personas (con datos personales).
//
// Estado en la URL: ?campana=<key>&tab=tablero|personas (+ filtro, segmento,
// ola, grupo y page en Personas). Los valores inválidos se normalizan con
// router.replace. El tablero se consulta cada 2 min solo mientras la campaña
// está activa y la pestaña del navegador está visible.

import { Suspense, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useWhatsAppCampaignDashboard,
  useWhatsAppCampaigns,
} from '@/hooks/useWhatsAppCampaigns';
import { apiErrorInfo, type ApiErrorMessages } from '@/lib/api-error';
import {
  WHATSAPP_ADMIN_PATH,
  construirQuery,
  normalizarParams,
  type WhatsAppParams,
} from '@/lib/whatsapp-campaign/format';
import { AttributionPanel } from './components/AttributionPanel';
import { BranchesTable } from './components/BranchesTable';
import { CampaignHeader } from './components/CampaignHeader';
import { DashboardFooter } from './components/DashboardFooter';
import { EffectPanel } from './components/EffectPanel';
import { EvolutionChart } from './components/EvolutionChart';
import { HourlyChart } from './components/HourlyChart';
import { KpiTiles } from './components/KpiTiles';
import { PeopleTab } from './components/PeopleTab';
import { RepliesPanel } from './components/RepliesPanel';
import { SegmentsTable } from './components/SegmentsTable';
import { WavesPanel } from './components/WavesPanel';

const ERROR_MESSAGES: ApiErrorMessages = {
  forbidden:
    'Tu rol no tiene acceso a las campañas de WhatsApp. Pide a Sistemas que habilite el permiso Comercial.',
  unavailable:
    'Las campañas de WhatsApp aún no están habilitadas: falta aplicar la migración 151 en la base de datos.',
  notFound: 'El API todavía no expone las campañas de WhatsApp (despliegue pendiente).',
};

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
          <p className="text-base text-white/80 sm:text-lg">Campañas y resultados por WhatsApp</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

function AccessDenied({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-6 text-sm">
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Acceso denegado</p>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** 403 → tarjeta; 503/404/otros → Alert (el 503 es la migración 151 pendiente). */
function ErrorState({ error, fallback }: { error: unknown; fallback: string }) {
  const info = apiErrorInfo(error, fallback, ERROR_MESSAGES);
  if (info.status === 403) return <AccessDenied message={info.message} />;
  const title =
    info.status === 503
      ? 'Falta aplicar la migración 151'
      : info.status === 404
        ? 'No disponible todavía'
        : 'No se pudo cargar';
  return (
    <Alert variant={info.status === 503 || info.status === 404 ? 'default' : 'destructive'}>
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{info.message}</AlertDescription>
    </Alert>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function WhatsAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = normalizarParams(searchParams);

  const campaigns = useWhatsAppCampaigns();
  const list = campaigns.data ?? [];
  const selected =
    (params.campana && list.some((c) => c.key === params.campana) ? params.campana : null) ??
    list[0]?.key ??
    null;

  const dashboard = useWhatsAppCampaignDashboard(selected);

  const navigate = useCallback(
    (next: Partial<Omit<WhatsAppParams, 'invalido'>>) => {
      const merged = { ...params, campana: selected, ...next };
      router.replace(`${WHATSAPP_ADMIN_PATH}${construirQuery(merged)}`, { scroll: false });
    },
    [params, selected, router],
  );

  // URL canónica: parámetros inválidos, campaña ausente o inexistente.
  const canonical = `${WHATSAPP_ADMIN_PATH}${construirQuery({ ...params, campana: selected })}`;
  useEffect(() => {
    if (!campaigns.isSuccess) return;
    if (params.invalido || (selected && params.campana !== selected)) {
      router.replace(canonical, { scroll: false });
    }
  }, [campaigns.isSuccess, params.invalido, params.campana, selected, canonical, router]);

  if (campaigns.isLoading) {
    return (
      <PageShell>
        <DashboardSkeleton />
      </PageShell>
    );
  }

  if (campaigns.isError) {
    return (
      <PageShell>
        <ErrorState error={campaigns.error} fallback="Error al cargar las campañas de WhatsApp." />
      </PageShell>
    );
  }

  if (!selected) {
    return (
      <PageShell>
        <Card>
          <CardContent className="flex items-start gap-3 p-6 text-sm">
            <ChatBubbleLeftRightIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Todavía no hay campañas registradas</p>
              <p className="text-muted-foreground">
                Las campañas aparecen aquí cuando Sistemas las registra con su población (grupo con
                campaña y grupo de control) y sus envíos.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const data = dashboard.data;
  const dashboardForbidden = dashboard.isError && apiErrorInfo(dashboard.error, '').status === 403;

  return (
    <PageShell>
      <div className="grid gap-5">
        {list.length > 1 && (
          <label className="grid max-w-md gap-1 text-xs font-medium text-muted-foreground">
            Campaña
            <Select
              value={selected}
              onValueChange={(v) =>
                navigate({ campana: v, page: 1, filtro: 'todos', segmento: null, ola: null, grupo: null })
              }
            >
              <SelectTrigger className="w-full bg-card text-sm text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {list.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.nombre} · {c.periodo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        {dashboardForbidden ? (
          <ErrorState error={dashboard.error} fallback="" />
        ) : (
          <>
            {data && (
              <CampaignHeader
                data={data}
                isFetching={dashboard.isFetching}
                onRefresh={() => void dashboard.refetch()}
              />
            )}

            <Tabs
              value={params.tab}
              onValueChange={(v) => navigate({ tab: v === 'personas' ? 'personas' : 'tablero' })}
            >
              <TabsList>
                <TabsTrigger value="tablero">Tablero</TabsTrigger>
                <TabsTrigger value="personas">Personas</TabsTrigger>
              </TabsList>

              <TabsContent value="tablero" className="mt-5">
                {dashboard.isError && (
                  <div className="mb-5">
                    <ErrorState error={dashboard.error} fallback="Error al cargar el tablero." />
                  </div>
                )}
                {!data ? (
                  dashboard.isError ? null : <DashboardSkeleton />
                ) : (
                  <div className="grid gap-5">
                    <KpiTiles data={data} />
                    <AttributionPanel data={data} />
                    <EffectPanel data={data} />
                    <WavesPanel olas={data.olas} />
                    <SegmentsTable data={data} />
                    <div className="grid gap-5 lg:grid-cols-2">
                      <HourlyChart data={data.lecturas_por_hora} />
                      <EvolutionChart data={data} />
                    </div>
                    <div className="grid gap-5 lg:grid-cols-2">
                      <RepliesPanel data={data} />
                      <BranchesTable data={data.sucursales} />
                    </div>
                    <DashboardFooter data={data} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="personas" className="mt-5">
                <PeopleTab
                  campaignKey={selected}
                  dashboard={data}
                  params={params}
                  onChange={(next) => navigate({ tab: 'personas', ...next })}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </PageShell>
  );
}
