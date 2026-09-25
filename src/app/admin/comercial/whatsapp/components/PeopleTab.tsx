'use client';

// PeopleTab - Pestaña "Personas": quién leyó, compró, calificó o contestó.
// CONTIENE DATOS PERSONALES (GET /whatsapp/campaigns/:key/members, permiso
// 'comercial'). Los filtros viven en la URL (?filtro, segmento, ola, grupo,
// page) para poder llegar desde las cifras del tablero ("Ver personas").

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWhatsAppCampaignMembers } from '@/hooks/useWhatsAppCampaigns';
import { apiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import {
  FILTRO_LABELS,
  GRUPO_LABELS,
  badgeContraste,
  califico,
  evidenciaBadge,
  isCampaignGroup,
  isCampaignMemberFilter,
  n,
  toneCategoria,
  type WhatsAppParams,
} from '@/lib/whatsapp-campaign/format';
import {
  CAMPAIGN_GROUPS,
  CAMPAIGN_MEMBER_FILTERS,
  type CampaignDashboard,
} from '@/types/whatsappCampaign';

const PAGE_SIZE = 50;
const ALL = '__all';

type PeopleParams = Pick<WhatsAppParams, 'filtro' | 'segmento' | 'ola' | 'grupo' | 'alcance' | 'page'>;

/** Filtros de lectura que, con una ola elegida, se miden con la lectura de ESA ola. */
const FILTROS_POR_OLA = new Set([
  'leyeron_compraron',
  'leyeron_calificaron',
  'leyeron_mismo_dia_sin_hora',
  'leyeron_no_compraron',
]);
/** Filtros de respuestas: listan solo integrantes de la campaña. */
const FILTROS_RESPUESTA = new Set(['respondieron', 'por_contestar', 'bajas']);

const CATEGORIA_CLASS = {
  alerta: 'text-[#B0432D] dark:text-[#EE8B74]',
  accion: 'text-amber-700 dark:text-amber-400',
  normal: 'text-muted-foreground',
} as const;

function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <label className={cn('grid gap-1 text-xs font-medium text-muted-foreground', className)}>
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-card text-sm text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function PeopleTab({
  campaignKey,
  dashboard,
  params,
  onChange,
}: {
  campaignKey: string;
  dashboard: CampaignDashboard | undefined;
  params: PeopleParams;
  onChange: (next: Partial<PeopleParams>) => void;
}) {
  const query = useWhatsAppCampaignMembers(campaignKey, {
    filtro: params.filtro,
    segmento: params.segmento ?? undefined,
    ola: params.ola ?? undefined,
    grupo: params.grupo ?? undefined,
    alcance: params.alcance ?? undefined,
    page: params.page,
    limit: PAGE_SIZE,
  });

  const segmentos = dashboard?.atribucion?.segmentos ?? dashboard?.segmentos ?? [];
  const olas = dashboard?.olas ?? [];
  const olaNombre = new Map(olas.map((o) => [o.id, o.nombre]));
  const catNombre = new Map(
    (dashboard?.respuestas?.por_categoria ?? []).map((c) => [c.id, c.nombre]),
  );
  const page = query.data;
  const totalPages = page?.totalPages ?? 0;

  // Cambiar un filtro regresa a la página 1.
  const set = (next: Partial<PeopleParams>) => onChange({ page: 1, ...next });

  return (
    <div className="grid gap-4">
      <Alert>
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Datos personales</AlertTitle>
        <AlertDescription>
          Esta lista contiene datos personales. Úsala solo para dar seguimiento; no la compartas fuera
          de la operación.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="Filtro"
          value={params.filtro}
          onChange={(v) => set({ filtro: isCampaignMemberFilter(v) ? v : 'todos' })}
          options={CAMPAIGN_MEMBER_FILTERS.map((f) => ({ value: f, label: FILTRO_LABELS[f] }))}
        />
        <FilterSelect
          label="Segmento"
          value={params.segmento ?? ALL}
          onChange={(v) => set({ segmento: v === ALL ? null : v })}
          options={[
            { value: ALL, label: 'Todos los segmentos' },
            ...segmentos.map((s) => ({ value: s.id, label: `${s.id} · ${s.nombre}` })),
          ]}
        />
        <FilterSelect
          label="Ola"
          value={params.ola ?? ALL}
          onChange={(v) => set({ ola: v === ALL ? null : v })}
          options={[
            { value: ALL, label: 'Todas las olas' },
            ...olas.map((o) => ({ value: o.id, label: o.nombre })),
          ]}
        />
        <FilterSelect
          label="Grupo"
          value={params.grupo ?? ALL}
          onChange={(v) => set({ grupo: v !== ALL && isCampaignGroup(v) ? v : null })}
          options={[
            { value: ALL, label: 'Todos los grupos' },
            ...CAMPAIGN_GROUPS.map((g) => ({ value: g, label: GRUPO_LABELS[g] })),
          ]}
        />
      </div>

      {(params.alcance === 'total' ||
        (params.ola && FILTROS_POR_OLA.has(params.filtro)) ||
        FILTROS_RESPUESTA.has(params.filtro)) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {params.alcance === 'total' && (
            <>
              <Badge variant="outline">Sin líderes, igual que el total del tablero</Badge>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => set({ alcance: null })}
              >
                Incluir líderes
              </Button>
            </>
          )}
          {params.ola && FILTROS_POR_OLA.has(params.filtro) && (
            <span>
              Lectura medida con{' '}
              {(olaNombre.get(params.ola) ?? `la ola ${params.ola}`).toLowerCase()}.
            </span>
          )}
          {FILTROS_RESPUESTA.has(params.filtro) && (
            <span>
              Solo integrantes de la campaña; el conteo del tablero también incluye a quien escribió sin
              estar en ella.
            </span>
          )}
        </div>
      )}

      {query.isError ? (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>No se pudo cargar la lista</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(query.error, 'Error al cargar las personas de la campaña.', {
              forbidden: 'Tu rol no tiene el permiso Comercial para ver las personas de la campaña.',
              unavailable: 'Las campañas de WhatsApp aún no están habilitadas (pendiente de Sistemas).',
            })}
          </AlertDescription>
        </Alert>
      ) : query.isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {n(page?.total ?? 0)} {page?.total === 1 ? 'persona' : 'personas'} ·{' '}
              {FILTRO_LABELS[params.filtro]}
            </span>
            {query.isFetching && <span className="text-xs">Actualizando…</span>}
          </div>
          <div
            className={cn(
              'overflow-x-auto rounded-md border bg-card transition-opacity',
              query.isPlaceholderData && 'opacity-60',
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead className="text-right">Puntos al primer aviso → ahora</TableHead>
                  <TableHead className="text-right">Faltan</TableHead>
                  <TableHead>Leyó</TableHead>
                  <TableHead>Compra tras leer</TableHead>
                  <TableHead>Respuesta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="tabular-nums">
                {(page?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Nadie cumple este filtro todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  page!.items.map((m) => {
                    const ev = evidenciaBadge(m.evidencia);
                    const cat = toneCategoria(m.categoria_respuesta);
                    return (
                      <TableRow key={`${m.customer_number}-${m.grupo}`}>
                        <TableCell className="whitespace-normal">
                          <div className="font-mono text-xs text-muted-foreground">{m.customer_number}</div>
                          <div className="font-medium">{m.nombre || '—'}</div>
                          {m.grupo !== 'tratado' && (
                            <Badge variant="outline" className="mt-0.5">
                              {GRUPO_LABELS[m.grupo] ?? m.grupo}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.telefono || '—'}</TableCell>
                        <TableCell className="whitespace-normal text-sm">{m.sucursal || '—'}</TableCell>
                        <TableCell>{m.segmento}</TableCell>
                        <TableCell className="text-right">
                          {n(m.pp_t0)} → <strong>{n(m.pp_ahora)}</strong>
                          {califico(m) && (
                            <div className="text-xs text-emerald-700 dark:text-emerald-400">Calificó</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{m.faltan > 0 ? n(m.faltan) : '—'}</TableCell>
                        <TableCell className="text-sm">
                          {m.leyo ? (
                            <>
                              <span className="font-mono text-xs">{m.primer_leido_cdmx || 'sin hora'}</span>
                              {m.ola_leida && (
                                <div className="text-xs text-muted-foreground">
                                  {olaNombre.get(m.ola_leida) ?? `Ola ${m.ola_leida}`}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {m.recibio ? 'Recibió, sin leer' : m.grupo === 'tratado' ? 'No le llegó' : '—'}
                              {m.opt_out && ' · baja'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {m.primera_compra_tras_leer_cdmx && (
                            <div className="font-mono text-xs">{m.primera_compra_tras_leer_cdmx}</div>
                          )}
                          {ev ? (
                            <Badge variant={ev.variant} className={badgeContraste(ev.variant)} title={ev.ayuda}>
                              {ev.texto}
                            </Badge>
                          ) : (
                            !m.primera_compra_tras_leer_cdmx && <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {m.categoria_respuesta ? (
                            <>
                              <span className={cn('font-medium', CATEGORIA_CLASS[cat])}>
                                {catNombre.get(m.categoria_respuesta) ?? m.categoria_respuesta.replace(/_/g, ' ')}
                              </span>
                              {m.ultima_respuesta_cdmx && (
                                <div className="font-mono text-xs text-muted-foreground">
                                  {m.ultima_respuesta_cdmx}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                Página {n(params.page)} de {n(totalPages)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={params.page <= 1 || query.isFetching}
                  onClick={() => onChange({ page: params.page - 1 })}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={params.page >= totalPages || query.isFetching}
                  onClick={() => onChange({ page: params.page + 1 })}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
