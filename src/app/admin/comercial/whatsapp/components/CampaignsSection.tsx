'use client';

// CampaignsSection - Pestañas "Campañas" y "Personas": el bloque de campañas
// medibles tal como existía antes del rediseño (selector de campaña,
// encabezado y, según la pestaña, el tablero completo o la lista de
// personas). Movido intacto desde page.tsx: mismos datos, mismo orden de
// paneles (cifras clave → veredicto oficial → atribución → ¿está funcionando?
// → ola extra → ventas del cierre → ¿pasaron la voz? → envíos por ola →
// segmentos → gráficas → respuestas/sucursales → pie).
//
// El selector lista las campañas principales y, debajo de cada una, sus hijas
// (la ola extra, marcada como complementaria); una hija también se abre por
// enlace (?campana=cierre-p73-extra). Personas sigue ligada a ?campana.

import Link from 'next/link';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import type { UseQueryResult } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorInfo } from '@/lib/api-error';
import {
  WHATSAPP_ADMIN_PATH,
  construirQuery,
  kpisTablero,
  type WhatsAppParams,
} from '@/lib/whatsapp-campaign/format';
import type { CampaignDashboard, CampaignListItem } from '@/types/whatsappCampaign';
import { AttributionPanel } from './AttributionPanel';
import { BranchesTable } from './BranchesTable';
import { CampaignHeader } from './CampaignHeader';
import { DashboardFooter } from './DashboardFooter';
import { EffectPanel } from './EffectPanel';
import { ErrorState } from './ErrorState';
import { EvolutionChart } from './EvolutionChart';
import { ExtraWavePanel } from './ExtraWavePanel';
import { HourlyChart } from './HourlyChart';
import { KpiTiles } from './KpiTiles';
import { EmptyNote, Panel } from './Panel';
import { PeopleTab } from './PeopleTab';
import { RepliesPanel } from './RepliesPanel';
import { SegmentsTable } from './SegmentsTable';
import { SpilloverPanel } from './SpilloverPanel';
import { VentasCierresPanel } from './VentasCierresPanel';
import { VerdictPanel } from './VerdictPanel';
import { WavesPanel } from './WavesPanel';

export type CampaignsSectionTab = 'campanas' | 'personas';

/**
 * Una campaña hija (ola extra) no lleva ventas del cierre ni derrame: esas
 * dos lecturas se hacen una vez por cierre y viven en el tablero del padre
 * (su derrame ya incluye a la población de la hija). En vez de dos paneles
 * vacíos que nunca se llenarían, un enlace al padre.
 */
function ParentOnlyNote({ padre }: { padre: string }) {
  const href = `${WHATSAPP_ADMIN_PATH}${construirQuery({ campana: padre, tab: 'campanas' })}`;
  return (
    <Panel id="t-padre" title="Ventas del cierre y ¿pasaron la voz?">
      <EmptyNote>
        Estas dos lecturas se hacen una sola vez por cierre y se ven en el tablero de la campaña
        principal; su lectura de «pasaron la voz» incluye a esta población.{' '}
        <Link href={href} className="underline decoration-dotted underline-offset-4 hover:text-primary">
          Abrir la campaña principal
        </Link>
        .
      </EmptyNote>
    </Panel>
  );
}

export function DashboardSkeleton() {
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

export function CampaignsSection({
  tab,
  campaigns,
  dashboard,
  selected,
  opciones,
  params,
  navigate,
}: {
  tab: CampaignsSectionTab;
  campaigns: UseQueryResult<CampaignListItem[]>;
  dashboard: UseQueryResult<CampaignDashboard>;
  /** Campaña a mostrar (la de la URL o la primera principal). */
  selected: string | null;
  opciones: CampaignListItem[];
  params: WhatsAppParams;
  navigate: (next: Partial<Omit<WhatsAppParams, 'invalido'>>) => void;
}) {
  if (campaigns.isLoading) return <DashboardSkeleton />;

  if (campaigns.isError) {
    return (
      <ErrorState
        error={campaigns.error}
        fallback="Error al cargar las campañas de WhatsApp."
        onRetry={() => void campaigns.refetch()}
        retrying={campaigns.isFetching}
      />
    );
  }

  if (!selected) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-6 text-sm">
          <ChatBubbleLeftRightIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Todavía no hay campañas registradas</p>
            <p className="text-muted-foreground">
              Las campañas aparecen aquí cuando Sistemas las registra con su población (grupo con
              campaña y grupo de control) y sus envíos. Los recorridos automáticos crean la suya por
              periodo en cuanto mandan el primer mensaje.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = dashboard.data;
  const dashboardForbidden = dashboard.isError && apiErrorInfo(dashboard.error, '').status === 403;

  return (
    <div className="grid gap-5">
      {opciones.length > 1 && (
        <label className="grid max-w-md gap-1 text-xs font-medium text-muted-foreground">
          Campaña
          <Select
            value={selected}
            onValueChange={(v) =>
              navigate({
                campana: v,
                page: 1,
                filtro: 'todos',
                segmento: null,
                ola: null,
                grupo: null,
                alcance: null,
              })
            }
          >
            <SelectTrigger className="w-full bg-card text-sm text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.padre ? '↳ ' : ''}
                  {c.nombre} · {c.periodo.nombre}
                  {c.padre ? ' (ola complementaria)' : ''}
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

          {tab === 'campanas' ? (
            <>
              {dashboard.isError && (
                <ErrorState
                  error={dashboard.error}
                  fallback="Error al cargar el tablero."
                  onRetry={() => void dashboard.refetch()}
                  retrying={dashboard.isFetching}
                  staleAt={data?.generado_cdmx ?? null}
                />
              )}
              {!data ? (
                dashboard.isError ? null : <DashboardSkeleton />
              ) : (
                <div className="grid gap-5">
                  <KpiTiles tiles={kpisTablero(data)} />
                  <VerdictPanel data={data} />
                  <AttributionPanel data={data} />
                  <EffectPanel data={data} />
                  <ExtraWavePanel data={data} />
                  {data.campana.padre ? (
                    <ParentOnlyNote padre={data.campana.padre} />
                  ) : (
                    <>
                      <VentasCierresPanel
                        ventas={data.ventas_cierres}
                        nombresSegmentos={Object.fromEntries(data.segmentos.map((s) => [s.id, s.nombre]))}
                        periodo={data.periodo}
                      />
                      <SpilloverPanel derrame={data.derrame} pctControl={data.campana.pct_control || null} />
                    </>
                  )}
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
            </>
          ) : (
            <PeopleTab
              campaignKey={selected}
              dashboard={data}
              params={params}
              onChange={(next) => navigate({ tab: 'personas', ...next })}
            />
          )}
        </>
      )}
    </div>
  );
}
