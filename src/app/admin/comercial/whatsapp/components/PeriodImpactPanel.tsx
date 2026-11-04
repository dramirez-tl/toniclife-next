'use client';

// PeriodImpactPanel - "Impacto del periodo": todo lo que salió por WhatsApp en
// el periodo elegido (recorridos y campañas), en dinero y en lectura.
// GET /whatsapp/campaigns/periods/:numero (rollup del API, snake_case).
//
// Mosaicos: enviados · entregados · leídos · respuestas · bajas; costo (MXN y
// USD al tipo de cambio del periodo) · compraron después · venta atribuida ·
// venta incremental contra el control (con intervalo) · venta por peso
// gastado. Luego la tabla por recorrido (con "Recalcular lectura" por
// recorrido con control, solo con whatsapp:manage: POST
// /whatsapp/campaigns/:key/impact/refresh e invalidación de
// ['whatsapp','impact']), la gráfica por día y el bloque "Consentimientos".
// Sin margen (no hay costo de producto): nunca "ganancias".

import { ArrowPathIcon } from '@heroicons/react/24/outline';
import type { UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRefreshCampaignImpact } from '@/hooks/useWhatsAppPeriodImpact';
import { hasAnyPermission } from '@/lib/admin-nav-filter';
import { apiErrorMessage, type ApiErrorMessages } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import {
  CONTROL_COLOR,
  badgeContraste,
  fechaLarga,
  money,
  n,
  pct,
  usd,
  type KpiTile,
} from '@/lib/whatsapp-campaign/format';
import {
  efectoVentaTexto,
  filasConsentimiento,
  filasRecorridos,
  hayEnvios,
  icDinero,
  kpisDinero,
  kpisImpacto,
  puntosPorDia,
} from '@/lib/whatsapp-campaign/impacto';
import { PERMISO_RECORRIDOS, etiquetaCategoria, toneCategoriaRecorrido } from '@/lib/whatsapp-campaign/recorridos';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions } from '@/store/slices/authSlice';
import type { ImpactoPeriodo } from '@/types/whatsappImpact';
import { ErrorState } from './ErrorState';
import { CHART_TICK, CHART_TOOLTIP } from './HourlyChart';
import { KpiTiles } from './KpiTiles';
import { EmptyNote, Panel } from './Panel';
import { EffectTile } from './VerdictPanel';

const IMPACT_ERROR_MESSAGES: ApiErrorMessages = {
  forbidden: 'Tu rol no tiene acceso al impacto por periodo. Pide a Sistemas que habilite el permiso Comercial.',
  unavailable: 'El impacto por periodo aún no está habilitado en el servidor (pendiente de Sistemas).',
  notFound: 'El API todavía no expone el impacto por periodo (despliegue pendiente).',
};

const EFECTO_CLASS = {
  bien: 'text-emerald-700 dark:text-emerald-400',
  mal: 'text-[#B0432D] dark:text-[#EE8B74]',
  neutro: 'text-foreground',
} as const;

function Tile({ k }: { k: KpiTile }) {
  return (
    <div className="grid content-start gap-0.5 rounded-lg border bg-card px-4 py-3.5 shadow-xs">
      <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {k.etiqueta}
      </span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.7rem]">{k.valor}</span>
      <span className="text-xs text-muted-foreground">{k.detalle}</span>
    </div>
  );
}

const REFRESH_ERRORS: ApiErrorMessages = {
  forbidden: 'Tu rol no puede recalcular el impacto (permiso whatsapp:manage).',
  unavailable: 'El recálculo del impacto aún no está habilitado en el servidor.',
  notFound: 'El API todavía no expone el recálculo del impacto (despliegue pendiente).',
};

function TablaRecorridos({ data, canManage }: { data: ImpactoPeriodo; canManage: boolean }) {
  const filas = filasRecorridos(data);
  const t = data.totales;
  const refresh = useRefreshCampaignImpact();
  const recalcular = async (key: string, nombre: string) => {
    try {
      await refresh.mutateAsync(key);
      toast.success(`${nombre}: lectura recalculada`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo recalcular la lectura.', REFRESH_ERRORS));
    }
  };
  if (filas.length === 0) return <EmptyNote>Sin recorridos ni campañas con envíos en este periodo.</EmptyNote>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recorrido</TableHead>
            <TableHead>Plantilla</TableHead>
            <TableHead className="text-right">Enviados</TableHead>
            <TableHead className="text-right">Entregados</TableHead>
            <TableHead className="text-right">Leídos</TableHead>
            <TableHead className="text-right">Contestaron</TableHead>
            <TableHead className="text-right">Bajas</TableHead>
            <TableHead className="text-right">Costo</TableHead>
            <TableHead className="text-right">Compraron</TableHead>
            <TableHead className="text-right">Venta atribuida</TableHead>
            <TableHead className="text-right">Venta incremental vs control</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          {filas.map((f) => (
            <TableRow key={f.key}>
              <TableCell className="whitespace-normal">
                <span className="font-mono text-xs text-muted-foreground">{f.codigo}</span>{' '}
                <span className="font-medium">{f.nombre}</span>
                {f.ultimo_envio_cdmx && (
                  <span className="block text-xs text-muted-foreground">último envío {f.ultimo_envio_cdmx}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs">{f.plantilla ?? '—'}</span>
                  {f.categoria && (
                    <Badge
                      variant={toneCategoriaRecorrido(f.categoria)}
                      className={badgeContraste(toneCategoriaRecorrido(f.categoria))}
                    >
                      {etiquetaCategoria(f.categoria)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">{n(f.enviados)}</TableCell>
              <TableCell className="text-right">
                {n(f.entregados)}
                <span className="block text-xs text-muted-foreground">{pct(f.pct_entregados)}</span>
              </TableCell>
              <TableCell className="text-right">
                {n(f.leidos)}
                <span className="block text-xs text-muted-foreground">{pct(f.pct_leidos)}</span>
              </TableCell>
              <TableCell className="text-right">{n(f.respondieron)}</TableCell>
              <TableCell className="text-right">{n(f.bajas)}</TableCell>
              <TableCell className="text-right">
                {money(f.costo_mxn)}
                <span className="block text-xs text-muted-foreground">{usd(f.costo_usd)}</span>
              </TableCell>
              <TableCell className="text-right">{n(f.compraron_despues)}</TableCell>
              <TableCell className="text-right">{money(f.venta_atribuida_mxn)}</TableCell>
              <TableCell className={cn('text-right whitespace-normal', EFECTO_CLASS[f.efecto_tono])}>
                {f.efecto_texto}
                {f.impacto?.tipo && f.efecto && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    lectura {f.impacto.tipo}
                    {f.control != null ? ` · control ${n(f.control)}` : ''}
                  </span>
                )}
                {canManage && (f.control ?? 0) > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 px-2 text-xs font-normal"
                    onClick={() => void recalcular(f.key, `${f.codigo} ${f.nombre}`)}
                    disabled={refresh.isPending}
                    title="Vuelve a calcular tratados vs control con las compras de hoy (permiso whatsapp:manage)"
                  >
                    <ArrowPathIcon
                      className={cn('h-3.5 w-3.5', refresh.isPending && refresh.variables === f.key && 'motion-safe:animate-spin')}
                    />
                    Recalcular lectura
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
            <TableCell colSpan={2}>Total del periodo</TableCell>
            <TableCell className="text-right">{n(t.enviados)}</TableCell>
            <TableCell className="text-right">{n(t.entregados)}</TableCell>
            <TableCell className="text-right">{n(t.leidos)}</TableCell>
            <TableCell className="text-right">{n(t.respondieron)}</TableCell>
            <TableCell className="text-right">{n(t.bajas)}</TableCell>
            <TableCell className="text-right">{money(t.costo_mxn)}</TableCell>
            <TableCell className="text-right">{n(t.compraron_despues)}</TableCell>
            <TableCell className="text-right">{money(t.venta_atribuida_mxn)}</TableCell>
            <TableCell className="text-right">
              {t.venta_incremental_mxn?.efecto != null
                ? `${money(t.venta_incremental_mxn.efecto, { signo: true })} (${icDinero(t.venta_incremental_mxn)})`
                : '—'}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function GraficaPorDia({ data }: { data: ImpactoPeriodo }) {
  const puntos = puntosPorDia(data);
  if (puntos.length === 0) return <EmptyNote>Sin envíos por día todavía.</EmptyNote>;
  const enviados = puntos.reduce((a, p) => a + p.enviados, 0);
  const leidos = puntos.reduce((a, p) => a + p.leidos, 0);
  return (
    <div
      role="img"
      aria-label={`Mensajes por día del ${puntos[0].dia} al ${puntos[puntos.length - 1].dia}: ${n(enviados)} enviados y ${n(leidos)} leídos en total.`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={puntos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="dia"
            tick={CHART_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={CHART_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
            tickFormatter={(v: number) => n(v)}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
            {...CHART_TOOLTIP}
            formatter={(value, name) => [n(Number(value) || 0), String(name)] as [string, string]}
          />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="enviados" name="Enviados" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="entregados" name="Entregados" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="leidos" name="Leídos" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="respuestas"
            name="Respuestas"
            stroke={CONTROL_COLOR}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Consentimientos({ data }: { data: ImpactoPeriodo }) {
  const filas = filasConsentimiento(data.consentimiento);
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold">Consentimientos</h3>
      {filas.length === 0 ? (
        <EmptyNote>Sin datos de consentimiento todavía.</EmptyNote>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {filas.map((f) => (
            <div key={f.id} className="rounded-md border bg-muted/40 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{f.etiqueta}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums">{f.valor}</p>
              <p className="text-xs text-muted-foreground">{f.detalle}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Las promociones (Marketing) solo salen a quien aceptó recibirlas; los avisos de cuenta
        (Utilidad) salen a todos menos a quien pidió baja total. &ldquo;En el periodo&rdquo; =
        consentimientos y bajas registrados entre {fechaLarga(data.periodo.inicio)} y{' '}
        {fechaLarga(data.periodo.fin)}.
      </p>
    </div>
  );
}

export function PeriodImpactPanel({
  periodNumber,
  impact,
  periodsLoading = false,
}: {
  periodNumber: number | null;
  impact: UseQueryResult<ImpactoPeriodo>;
  /** Todavía no se sabe qué periodo mostrar (lista de periodos cargando). */
  periodsLoading?: boolean;
}) {
  // "Recalcular lectura" escribe en el API: solo con whatsapp:manage (nunca por rol).
  const permissions = useAppSelector(selectUserPermissions);
  const canManage = hasAnyPermission(permissions, [PERMISO_RECORRIDOS]);
  if (periodNumber == null) {
    if (periodsLoading) return <Skeleton className="h-40 w-full" />;
    return (
      <Panel id="t-impacto" title="Impacto del periodo">
        <EmptyNote>
          No se pudo determinar el periodo a mostrar: el API no mandó el número de periodo. Elige uno
          en el selector de arriba.
        </EmptyNote>
      </Panel>
    );
  }
  if (impact.isLoading) return <Skeleton className="h-64 w-full" />;

  const data = impact.data;
  if (!data) {
    return (
      <ErrorState
        error={impact.error}
        fallback="No se pudo cargar el impacto del periodo."
        onRetry={() => void impact.refetch()}
        retrying={impact.isFetching}
        messages={IMPACT_ERROR_MESSAGES}
        unavailableTitle="Impacto aún no habilitado"
      />
    );
  }

  const conEnvios = hayEnvios(data);
  const efecto = efectoVentaTexto(data.totales.venta_incremental_mxn);

  return (
    <Panel
      id="t-impacto"
      title={`Impacto del periodo${data.periodo.nombre ? ` · ${data.periodo.nombre}` : ''}`}
      aside={
        <span className="flex flex-wrap items-center gap-2">
          {data.periodo.inicio && data.periodo.fin && (
            <span>
              del {fechaLarga(data.periodo.inicio)} al {fechaLarga(data.periodo.fin)}
            </span>
          )}
          <Badge variant={data.periodo.cerrado ? 'outline' : 'info'}>
            {data.periodo.cerrado ? 'Periodo cerrado' : 'Periodo en curso'}
          </Badge>
          {data.generado_cdmx && (
            <Badge variant="outline" className="font-mono" title="Hora del centro de México">
              Actualizado {data.generado_cdmx}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => void impact.refetch()}
            disabled={impact.isFetching}
            title="Volver a calcular"
            aria-label="Actualizar el impacto del periodo"
          >
            <ArrowPathIcon className={cn('h-4 w-4', impact.isFetching && 'motion-safe:animate-spin')} />
          </Button>
        </span>
      }
    >
      <div className="grid gap-5">
        {impact.isError && (
          <ErrorState
            error={impact.error}
            fallback="No se pudo actualizar el impacto."
            onRetry={() => void impact.refetch()}
            retrying={impact.isFetching}
            staleAt={data.generado_cdmx || '—'}
            messages={IMPACT_ERROR_MESSAGES}
          />
        )}

        {!conEnvios ? (
          <EmptyNote>
            Sin envíos de WhatsApp en este periodo todavía. Las cifras aparecen en cuanto un recorrido
            o una campaña mande su primer mensaje; el costo, las compras y la venta se calculan sobre
            los mensajes entregados.
          </EmptyNote>
        ) : (
          <>
            <KpiTiles tiles={kpisImpacto(data)} label="Mensajes del periodo" />
            <section aria-label="Costo y venta del periodo" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {kpisDinero(data).map((k) => (
                <Tile key={k.id} k={k} />
              ))}
              <EffectTile
                label="Venta incremental vs control"
                est={data.totales.venta_incremental_mxn}
                dec={0}
                unidad="pesos"
                sufijo=""
                valor={efecto.valor}
                intervalo={icDinero(data.totales.venta_incremental_mxn)}
                vacio="Solo con grupo de control"
              />
            </section>
            <p className="text-xs text-muted-foreground">
              &ldquo;Compraron después&rdquo; y &ldquo;venta atribuida&rdquo; describen lo que pasó tras
              recibir el aviso (no demuestran causa). La venta incremental sí se mide contra el grupo de
              control de los recorridos que lo tienen y hereda su intervalo: si cruza el 0, también puede
              ser 0. Sin margen: no hay costo de producto en el sistema, así que se reporta venta por peso
              gastado y no el retorno neto.
            </p>

            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">Por recorrido</h3>
              <TablaRecorridos data={data} canManage={canManage} />
            </div>

            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">Por día</h3>
              <GraficaPorDia data={data} />
            </div>
          </>
        )}

        <Consentimientos data={data} />

        {data.notas.length > 0 && (
          <div className="grid gap-1 text-xs text-muted-foreground">
            {data.notas.map((nota) => (
              <p key={nota}>{nota}</p>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
