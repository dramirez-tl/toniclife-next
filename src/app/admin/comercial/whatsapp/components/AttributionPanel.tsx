'use client';

// AttributionPanel - "¿Tomaron en cuenta el aviso?" (bloque ➕ `atribucion`,
// SPEC §3.7). Responde: de quienes recibieron el aviso, ¿cuántos ya
// calificaron?; ¿cuántos lo leyeron y DESPUÉS compraron o calificaron?; ¿cómo
// se compara con el grupo de control? Es una lectura descriptiva: el efecto
// causal es solo campaña vs control (bloque "¿Está funcionando?").

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  embudoAtribucion,
  etiquetaFiltro,
  hrefPersonas,
  n,
  pct,
} from '@/lib/whatsapp-campaign/format';
import type {
  AttributionFields,
  CampaignDashboard,
  CampaignMemberFilter,
} from '@/types/whatsappCampaign';
import { CompareLegend, CompareRow, TONE_FILL } from './CompareBar';
import { EmptyNote, Panel } from './Panel';

/** Umbral de cobertura de hora exacta bajo el cual se avisa (ver backfill). */
const COBERTURA_MINIMA = 0.95;

/**
 * Cifra con enlace a la pestaña Personas (si hay a quién mostrar).
 * `total` = la cifra es del total o de la tabla por ola (sin los segmentos que
 * no entran al total, p. ej. líderes): la lista usa alcance=total para cuadrar.
 */
function PeopleLink({
  campana,
  filtro,
  segmento,
  ola,
  total,
  value,
  children,
}: {
  campana: string;
  filtro: CampaignMemberFilter;
  segmento?: string | null;
  ola?: string | null;
  total?: boolean;
  value: number | null | undefined;
  children?: ReactNode;
}) {
  const content = children ?? n(value);
  if (!campana || !value) return <>{content}</>;
  return (
    <Link
      href={hrefPersonas(campana, filtro, { segmento, ola, alcance: total ? 'total' : null })}
      className="underline decoration-dotted underline-offset-4 hover:text-primary hover:decoration-solid"
      title="Ver personas"
      aria-label={`Ver personas: ${n(value)} (${etiquetaFiltro(filtro).toLowerCase()})`}
    >
      {content}
    </Link>
  );
}

function BigTile({
  label,
  value,
  detail,
  extra,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="grid content-start gap-0.5 rounded-lg border bg-muted/40 px-4 py-3.5">
      <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      {extra}
    </div>
  );
}

function SinHora({ value }: { value: number | null | undefined }) {
  if (!value) return null;
  return (
    <span className="text-xs text-amber-700 dark:text-amber-400">
      + {n(value)} mismo día, sin hora
    </span>
  );
}

export function AttributionPanel({ data }: { data: CampaignDashboard }) {
  const a = data.atribucion;
  const key = data.campana.key;
  const umbral = n(data.periodo.umbral);

  if (!a) {
    return (
      <Panel id="t-atribucion" title="¿Tomaron en cuenta el aviso?">
        <EmptyNote>
          La atribución (quién leyó el aviso y después compró o calificó) aparece cuando el API
          tenga ligados los envíos y las compras de la campaña.
        </EmptyNote>
      </Panel>
    );
  }

  const t: AttributionFields = a.total;
  const pasos = embudoAtribucion(t);
  const tieneLid = a.segmentos.some((s) => s.id === 'LID');
  const cobertura = a.evidencia.cobertura_hora_legacy;

  return (
    <Panel
      id="t-atribucion"
      title="¿Tomaron en cuenta el aviso?"
      aside={<>Desde el primer aviso ({a.t0_cdmx || data.campana.t0_cdmx}) · total sin líderes</>}
    >
      <div className="grid gap-6">
        {/* Fila principal */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BigTile
            label="Recibieron el aviso"
            value={n(t.recibieron)}
            detail={`de ${n(t.tratados)} con campaña`}
          />
          <BigTile
            label="De ellos, ya calificaron"
            value={
              <PeopleLink campana={key} filtro="recibieron_calificaron" total value={t.calificaron_recibieron} />
            }
            detail={`${pct(t.pct_calificaron_recibieron, 1)} de ${n(t.base_recibieron)} que estaban debajo de ${umbral}`}
          />
          <BigTile
            label="Lo leyeron y después compraron"
            value={
              <PeopleLink campana={key} filtro="leyeron_compraron" total value={t.compraron_despues_de_leer} />
            }
            detail={`${pct(t.pct_compraron_despues_de_leer, 1)} de ${n(t.leyeron)} que lo leyeron`}
            extra={<SinHora value={t.compraron_mismo_dia_sin_hora} />}
          />
          <BigTile
            label="Lo leyeron y después calificaron"
            value={
              <PeopleLink campana={key} filtro="leyeron_calificaron" total value={t.calificaron_despues_de_leer} />
            }
            detail={`${pct(t.pct_calificaron_despues_de_leer, 1)} de ${n(t.base_leyeron)} que lo leyeron y estaban debajo`}
            extra={<SinHora value={t.calificaron_mismo_dia_sin_hora} />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Embudo */}
          <div className="grid content-start gap-2.5">
            <h3 className="text-sm font-semibold">Del aviso a la compra</h3>
            {pasos.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_4.8rem] items-center gap-2.5 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_5.2rem]"
              >
                <span className="text-muted-foreground">{p.etiqueta}</span>
                <div className="h-3.5 w-full rounded bg-muted" role="img" aria-label={`${p.etiqueta}: ${n(p.n)} (${pct(p.frac)} de quienes lo recibieron)`}>
                  <span
                    className={cn('block h-full rounded', TONE_FILL.trat)}
                    style={{ width: `${(p.frac * 100).toFixed(1)}%` }}
                  />
                </div>
                <span className="text-right tabular-nums">
                  <strong className="font-semibold">
                    {p.filtro ? <PeopleLink campana={key} filtro={p.filtro} total value={p.n} /> : n(p.n)}
                  </strong>{' '}
                  <span className="text-xs text-muted-foreground">{pct(p.frac)}</span>
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Porcentajes sobre quienes recibieron el aviso.
            </p>
          </div>

          {/* Con aviso vs control */}
          <div className="grid content-start gap-3">
            <h3 className="text-sm font-semibold">Con aviso vs. control</h3>
            <div className="grid gap-2">
              <p className="text-sm">Compraron desde el primer aviso</p>
              <CompareRow label="Con campaña" tone="trat" value={t.pct_compraron_desde_t0_trat} />
              <CompareRow label="Control" tone="ctrl" value={t.pct_compraron_desde_t0_ctrl} />
              <p className="text-xs text-muted-foreground">
                {n(t.compraron_desde_t0_trat)} de {n(t.tratados)} con campaña ·{' '}
                <PeopleLink campana={key} filtro="control_compraron" total value={t.compraron_desde_t0_ctrl} /> de{' '}
                {n(t.control)} en el control
                {(t.compraron_desde_t0_trat_sin_hora || t.compraron_desde_t0_ctrl_sin_hora) ? (
                  <>
                    {' '}
                    (sin contar {n(t.compraron_desde_t0_trat_sin_hora)} y{' '}
                    {n(t.compraron_desde_t0_ctrl_sin_hora)} del mismo día sin hora)
                  </>
                ) : null}
              </p>
            </div>
            <div className="grid gap-2">
              <p className="text-sm">Llegaron a {umbral}</p>
              <CompareRow label="Con campaña" tone="trat" value={t.pct_calificaron_trat} />
              <CompareRow label="Control" tone="ctrl" value={t.pct_calificaron_ctrl} />
              <p className="text-xs text-muted-foreground">
                {n(t.calificaron_trat)} de {n(t.base_trat)} con campaña ·{' '}
                <PeopleLink campana={key} filtro="control_calificaron" total value={t.calificaron_ctrl} /> de{' '}
                {n(t.base_ctrl)} en el control
              </p>
              {t.pct_calificaron_desde_t0_trat !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Con una compra desde el primer aviso:{' '}
                  <strong className="font-semibold text-foreground">
                    {pct(t.pct_calificaron_desde_t0_trat, 1)}
                  </strong>{' '}
                  con campaña ({n(t.calificaron_desde_t0_trat)}) vs.{' '}
                  <strong className="font-semibold text-foreground">
                    {pct(t.pct_calificaron_desde_t0_ctrl, 1)}
                  </strong>{' '}
                  en el control ({n(t.calificaron_desde_t0_ctrl)}).
                </p>
              )}
            </div>
            <CompareLegend pctControl={data.campana.pct_control || null} />
          </div>
        </div>

        {/* Por segmento */}
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Por grupo de distribuidores</h3>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-right">Recibieron</TableHead>
                  <TableHead className="text-right">Leyeron</TableHead>
                  <TableHead className="text-right">Compraron después de leer</TableHead>
                  <TableHead className="text-right">Mismo día sin hora</TableHead>
                  <TableHead className="text-right">Calificaron después de leer</TableHead>
                  <TableHead className="text-right">Compraron sin leer</TableHead>
                  <TableHead className="text-right">Control: compraron</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="tabular-nums">
                {a.segmentos.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-normal">
                      {s.nombre}
                      {s.id === 'LID' && (
                        <div className="text-xs text-muted-foreground">Fuera del total</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{n(s.recibieron)}</TableCell>
                    <TableCell className="text-right">{n(s.leyeron)}</TableCell>
                    <TableCell className="text-right">
                      <PeopleLink campana={key} filtro="leyeron_compraron" segmento={s.id} value={s.compraron_despues_de_leer} />{' '}
                      <span className="text-xs text-muted-foreground">{pct(s.pct_compraron_despues_de_leer, 1)}</span>
                    </TableCell>
                    <TableCell className="text-right text-amber-700 dark:text-amber-400">
                      <PeopleLink campana={key} filtro="leyeron_mismo_dia_sin_hora" segmento={s.id} value={s.compraron_mismo_dia_sin_hora} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PeopleLink campana={key} filtro="leyeron_calificaron" segmento={s.id} value={s.calificaron_despues_de_leer} />{' '}
                      <span className="text-xs text-muted-foreground">{pct(s.pct_calificaron_despues_de_leer, 1)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <PeopleLink campana={key} filtro="compraron_sin_leer" segmento={s.id} value={s.compraron_sin_leer} />{' '}
                      <span className="text-xs text-muted-foreground">{pct(s.pct_compraron_sin_leer, 1)}</span>
                    </TableCell>
                    <TableCell className="text-right">{pct(s.pct_compraron_desde_t0_ctrl, 1)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
                  <TableCell>Todos{tieneLid ? ' (sin líderes)' : ''}</TableCell>
                  <TableCell className="text-right">{n(t.recibieron)}</TableCell>
                  <TableCell className="text-right">{n(t.leyeron)}</TableCell>
                  <TableCell className="text-right">
                    {n(t.compraron_despues_de_leer)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">{pct(t.pct_compraron_despues_de_leer, 1)}</span>
                  </TableCell>
                  <TableCell className="text-right text-amber-700 dark:text-amber-400">
                    {n(t.compraron_mismo_dia_sin_hora)}
                  </TableCell>
                  <TableCell className="text-right">
                    {n(t.calificaron_despues_de_leer)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">{pct(t.pct_calificaron_despues_de_leer, 1)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {n(t.compraron_sin_leer)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">{pct(t.pct_compraron_sin_leer, 1)}</span>
                  </TableCell>
                  <TableCell className="text-right">{pct(t.pct_compraron_desde_t0_ctrl, 1)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {tieneLid && (
            <p className="text-xs text-muted-foreground">
              Los líderes no entran en el total: la mayoría ya estaba calificada y su efecto se
              mide en las compras de su primera línea.
            </p>
          )}
        </div>

        {/* Por ola */}
        {a.olas.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold">Por ola</h3>
            {tieneLid && (
              <p className="text-xs text-muted-foreground">
                Sin líderes, igual que el total. Cada ola se mide con la lectura de ese mensaje.
              </p>
            )}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ola</TableHead>
                    <TableHead className="text-right">Recibieron</TableHead>
                    <TableHead className="text-right">Leyeron</TableHead>
                    <TableHead className="text-right">Minutos a la lectura (mediana)</TableHead>
                    <TableHead className="text-right">Compraron después</TableHead>
                    <TableHead className="text-right">Mismo día sin hora</TableHead>
                    <TableHead className="text-right">Calificaron después</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular-nums">
                  {a.olas.map((o) => (
                    <TableRow key={o.id} className={cn(!o.es_aviso && 'text-muted-foreground')}>
                      <TableCell className="whitespace-normal">
                        {o.nombre}
                        {!o.es_aviso && <div className="text-xs">No cuenta como aviso</div>}
                      </TableCell>
                      <TableCell className="text-right">{n(o.recibieron)}</TableCell>
                      <TableCell className="text-right">{n(o.leyeron)}</TableCell>
                      <TableCell className="text-right">{n(o.mediana_min_lectura)}</TableCell>
                      <TableCell className="text-right">
                        {o.es_aviso ? (
                          <PeopleLink campana={key} filtro="leyeron_compraron" ola={o.id} total value={o.compraron_despues} />
                        ) : (
                          n(o.compraron_despues)
                        )}{' '}
                        <span className="text-xs text-muted-foreground">{pct(o.pct_compraron_despues, 1)}</span>
                      </TableCell>
                      <TableCell className="text-right">{n(o.compraron_mismo_dia_sin_hora)}</TableCell>
                      <TableCell className="text-right">
                        {o.es_aviso ? (
                          <>
                            <PeopleLink campana={key} filtro="leyeron_calificaron" ola={o.id} total value={o.calificaron_despues} />{' '}
                            <span className="text-xs text-muted-foreground">{pct(o.pct_calificaron_despues, 1)}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Pie del bloque */}
        <div className="grid gap-1.5 rounded-md bg-muted p-3 text-sm">
          {a.notas[0] && <p className="font-medium">{a.notas[0]}</p>}
          {cobertura != null && cobertura < COBERTURA_MINIMA && (
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Solo {pct(cobertura)} de las ventas del sistema anterior tienen hora de captura: las
              demás cuentan por día y pueden quedar en &quot;mismo día, sin hora&quot;. Pide a Sistemas
              que actualice las horas.
            </p>
          )}
          <p className="text-muted-foreground">
            {cobertura == null
              ? 'Sin ventas del sistema anterior en la ventana.'
              : `Hora exacta en ${pct(cobertura)} de las ventas capturadas en el sistema anterior.`}{' '}
            Compras con hora exacta: {n(a.evidencia.compras_hora_exacta)} · solo con día:{' '}
            {n(a.evidencia.compras_solo_dia)}.
          </p>
          {a.notas.slice(1).map((nota) => (
            <p key={nota} className="text-xs text-muted-foreground">
              {nota}
            </p>
          ))}
        </div>
      </div>
    </Panel>
  );
}
