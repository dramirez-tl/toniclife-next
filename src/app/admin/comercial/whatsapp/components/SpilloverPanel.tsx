'use client';

// SpilloverPanel - "¿Pasaron la voz?" (derrame, reporte 'derrame'). Pregunta:
// ¿la gente a la que le escribimos hizo que OTRAS personas (a las que NO les
// escribimos) compraran? Se compara la red (frontales, segundo nivel,
// patrocinador) de cada persona con mensaje contra la red de cada persona del
// control, con el mismo sorteo. Nadie con mensaje cuenta como vecino. Es una
// lectura exploratoria: con un control del 10% solo se detectan derrames
// grandes, y "no concluyente" no dice que no hubo derrame.

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { badgeContraste, money, n, pct, signed, toneEfecto } from '@/lib/whatsapp-campaign/format';
import {
  POBLACION_LABELS,
  UNIDAD_LABELS,
  VECINDARIO_LABELS,
  filaPrincipalDerrame,
  icTexto,
  nombreVecindario,
  pTexto,
  poblacionesDerrame,
  tablaDerrame,
  veredictoDerrame,
} from '@/lib/whatsapp-campaign/reportes';
import type {
  DerrameBlock,
  DerrameEstimate,
  DerrameFila,
  DerramePoblacion,
  DerrameTiempo,
  DerrameUnidad,
  DerrameVecindario,
} from '@/types/whatsappCampaign';
import { EmptyNote, Panel } from './Panel';

const TONO_TEXTO = {
  bien: 'text-emerald-700 dark:text-emerald-400',
  mal: 'text-[#B0432D] dark:text-[#EE8B74]',
  neutro: 'text-foreground',
} as const;

const LECTURA_EFECTO = {
  bien: { texto: 'Compraron más', variant: 'success' as const },
  mal: { texto: 'Compraron menos', variant: 'destructive' as const },
  neutro: { texto: 'No concluyente', variant: 'outline' as const },
};

/** Efecto con intervalo en una celda; la fracción de vecinos se muestra en %. */
function Efecto({
  e,
  dec = 0,
  fmt,
  sufijo = '',
}: {
  e: DerrameEstimate | null;
  dec?: number;
  fmt?: (v: number | null | undefined) => string;
  sufijo?: string;
}) {
  if (!e) return <span className="text-muted-foreground">—</span>;
  const f = fmt ?? ((v: number | null | undefined) => signed(v, dec));
  const tono = toneEfecto(e.ic_bajo, e.ic_alto);
  return (
    <span className="grid justify-items-end">
      <span className={cn('font-semibold', TONO_TEXTO[tono])}>
        {f(e.efecto)}
        {sufijo}
      </span>
      <span className="text-xs text-muted-foreground">
        {fmt ? `${fmt(e.ic_bajo)} a ${fmt(e.ic_alto)}` : icTexto(e, dec)}
        {sufijo}
      </span>
    </span>
  );
}

function BigTile({ label, value, detail, tono }: { label: string; value: string; detail: string; tono: 'bien' | 'mal' | 'neutro' }) {
  return (
    <div className="grid content-start gap-0.5 rounded-lg border bg-muted/40 px-4 py-3.5">
      <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('text-2xl font-semibold tracking-tight tabular-nums', TONO_TEXTO[tono])}>{value}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

function Headline({ fila, esPorVecino }: { fila: DerrameFila; esPorVecino: boolean }) {
  const pts = fila.pts;
  const comp = fila.compraron;
  const venta = fila.venta;
  const porQuien = esPorVecino ? 'por vecino' : 'por persona con mensaje';
  const pctFrac = (v: number | null | undefined) => (esPorVecino ? signed(v, 1) : pct(v, 1));
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <BigTile
        label={`Puntos que ganaron sus frontales (${porQuien})`}
        value={pts ? `${signed(pts.efecto, 0)} pts` : '—'}
        detail={pts ? `${n(pts.media_t)} con mensaje vs ${n(pts.media_c)} control · intervalo 95%: ${icTexto(pts, 0)} · ${pTexto(pts.p)}` : 'Sin estimación'}
        tono={pts ? toneEfecto(pts.ic_bajo, pts.ic_alto) : 'neutro'}
      />
      <BigTile
        label={`Frontales que compraron (${porQuien})`}
        value={comp ? (esPorVecino ? signed(comp.efecto, 1, ' pp') : signed(comp.efecto, 3)) : '—'}
        detail={comp ? `${pctFrac(comp.media_t)} vs ${pctFrac(comp.media_c)} · intervalo 95%: ${esPorVecino ? icTexto(comp, 1) : icTexto(comp, 3)} · ${pTexto(comp.p)}` : 'Sin estimación'}
        tono={comp ? toneEfecto(comp.ic_bajo, comp.ic_alto) : 'neutro'}
      />
      <BigTile
        label={`Venta de sus frontales (${porQuien})`}
        value={venta ? money(venta.efecto, { signo: true }) : '—'}
        detail={venta ? `${money(venta.media_t)} vs ${money(venta.media_c)} · intervalo 95%: ${money(venta.ic_bajo, { signo: true })} a ${money(venta.ic_alto, { signo: true })} · ${pTexto(venta.p)}` : 'Sin estimación'}
        tono={venta ? toneEfecto(venta.ic_bajo, venta.ic_alto) : 'neutro'}
      />
    </div>
  );
}

function TablaVecindarios({ filas, esPorVecino }: { filas: DerrameFila[]; esPorVecino: boolean }) {
  const fracFmt = esPorVecino ? (v: number | null | undefined) => signed(v, 1) : (v: number | null | undefined) => signed(v, 3);
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vecindario</TableHead>
            <TableHead className="text-right">Con vecinos sin mensaje (campaña / control)</TableHead>
            <TableHead className="text-right">Vecinos (campaña / control)</TableHead>
            <TableHead className="text-right">Pts de los vecinos, media (campaña vs control)</TableHead>
            <TableHead className="text-right">Efecto en puntos (IC95)</TableHead>
            <TableHead className="text-right">p</TableHead>
            <TableHead className="text-right">Vecinos que compraron{esPorVecino ? ' (pp)' : ''}</TableHead>
            <TableHead className="text-right">Venta (MXN)</TableHead>
            <TableHead>Lectura</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          {filas.map((f) => {
            const tono = f.pts ? toneEfecto(f.pts.ic_bajo, f.pts.ic_alto) : 'neutro';
            const lectura = f.pts ? LECTURA_EFECTO[tono] : null;
            const ayuda = VECINDARIO_LABELS[f.vecindario as DerrameVecindario]?.ayuda;
            return (
              <TableRow key={f.vecindario}>
                <TableCell className="whitespace-normal">
                  {nombreVecindario(f)}
                  {ayuda && <div className="text-xs text-muted-foreground">{ayuda}</div>}
                </TableCell>
                <TableCell className="text-right">
                  {n(f.con_vecinos_t)} / {n(f.con_vecinos_c)}
                  {!esPorVecino && f.n_t != null && (
                    <div className="text-xs text-muted-foreground">de {n(f.n_t)} / {n(f.n_c)}</div>
                  )}
                </TableCell>
                <TableCell className="text-right">{n(f.vecinos_t)} / {n(f.vecinos_c)}</TableCell>
                <TableCell className="text-right">
                  {f.pts ? <>{n(f.pts.media_t)} vs {n(f.pts.media_c)}</> : '—'}
                </TableCell>
                <TableCell className="text-right"><Efecto e={f.pts} dec={0} /></TableCell>
                <TableCell className="text-right">{f.pts?.p != null ? f.pts.p.toFixed(2) : '—'}</TableCell>
                <TableCell className="text-right"><Efecto e={f.compraron} fmt={fracFmt} /></TableCell>
                <TableCell className="text-right"><Efecto e={f.venta} fmt={(v) => money(v, { signo: true })} /></TableCell>
                <TableCell>
                  {lectura ? (
                    <Badge variant={lectura.variant} className={badgeContraste(lectura.variant)}>
                      {lectura.texto}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin estimación</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TiempoFila({ nombre, t }: { nombre: string; t: DerrameTiempo | null }) {
  if (!t) return null;
  return (
    <TableRow>
      <TableCell className="whitespace-normal">{nombre}</TableCell>
      <TableCell className="text-right">{n(t.indices)} <span className="text-xs text-muted-foreground">({n(t.con_lectura)} con lectura)</span></TableCell>
      <TableCell className="text-right">{n(t.vecinos)}</TableCell>
      <TableCell className="text-right">{n(t.docs_antes)} / {n(t.docs_despues)}</TableCell>
      <TableCell className="text-right">{pct(t.share_pts_despues)}</TableCell>
      <TableCell className="text-right">{n(t.vecinos_compraron_despues)}</TableCell>
      <TableCell className="text-right">{n(t.docs_24h)}</TableCell>
    </TableRow>
  );
}

function Detalles({ d }: { d: DerrameBlock }) {
  const lid = d.lid?.conocido ?? null;
  const tl = d.tiempo_lectura;
  const suc = d.sucursales;
  const periodos = suc ? Object.keys(suc.totales).sort((a, b) => Number(b) - Number(a)) : [];
  return (
    <details className="group rounded-md border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Más lecturas (líderes, antes vs después de leer, sucursales)</summary>
      <div className="mt-3 grid gap-4">
        {lid && (
          <div className="grid gap-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Líderes (exploratorio)</h4>
            <p className="text-muted-foreground">
              A los líderes se les escribió para que movieran a su red. Sus frontales que estaban debajo
              del umbral ganaron{' '}
              <strong className={cn('font-semibold', TONO_TEXTO[toneEfecto(lid.ic_bajo, lid.ic_alto)])}>
                {signed(lid.efecto, 0)} pts por líder
              </strong>{' '}
              contra los frontales de los líderes del control (intervalo 95%: {icTexto(lid, 0)}
              {pTexto(lid.p) ? `; ${pTexto(lid.p)}` : ''}; {n(lid.n_t)} / {n(lid.n_c)} líderes)
              {lid.frontales_calif && (
                <>; frontales que califican: {signed(lid.frontales_calif.efecto, 2)} por líder ({icTexto(lid.frontales_calif, 2)})</>
              )}
              . Escribirle a los líderes no movió a su red de forma medible.
            </p>
          </div>
        )}
        {tl?.principal && (
          <div className="grid gap-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compras de los vecinos antes y después de la primera lectura (descriptivo)</h4>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="text-right">Personas</TableHead>
                    <TableHead className="text-right">Vecinos</TableHead>
                    <TableHead className="text-right">Tickets antes / después</TableHead>
                    <TableHead className="text-right">% de los puntos después</TableHead>
                    <TableHead className="text-right">Vecinos que compraron después</TableHead>
                    <TableHead className="text-right">Tickets en las 24 h siguientes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular-nums">
                  <TiempoFila nombre="Con mensaje (hora real de lectura)" t={tl.principal.tratados} />
                  <TiempoFila nombre="Control (hora de lectura sorteada)" t={tl.principal.control_lectura_ficticia} />
                  {tl.extra?.tratados && <TiempoFila nombre="Ola extra: con mensaje" t={tl.extra.tratados} />}
                  {tl.extra?.control_lectura_ficticia && <TiempoFila nombre="Ola extra: control" t={tl.extra.control_lectura_ficticia} />}
                </TableBody>
              </Table>
            </div>
            {tl.nota && <p className="text-xs text-muted-foreground">{tl.nota}</p>}
          </div>
        )}
        {suc && periodos.length > 0 && (
          <div className="grid gap-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compras de gente sin mensaje en la ventana del cierre, por periodo (descriptivo)</h4>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Ventana</TableHead>
                    <TableHead className="text-right">Sin mensaje: compradores</TableHead>
                    <TableHead className="text-right">Sin mensaje: puntos</TableHead>
                    <TableHead className="text-right">Sin mensaje: tickets</TableHead>
                    <TableHead className="text-right">Con mensaje: compradores</TableHead>
                    <TableHead className="text-right">Con mensaje: puntos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular-nums">
                  {periodos.map((k) => {
                    const t = suc.totales[k];
                    return (
                      <TableRow key={k}>
                        <TableCell>P{k}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {t.ventana ? `${t.ventana[0]} → ${t.ventana[1]}` : '—'}
                        </TableCell>
                        <TableCell className="text-right">{n(t.sin_msg?.compradores)}</TableCell>
                        <TableCell className="text-right">{n(t.sin_msg?.pts)}</TableCell>
                        <TableCell className="text-right">{n(t.sin_msg?.tickets)}</TableCell>
                        <TableCell className="text-right">{n(t.con_msg?.compradores)}</TableCell>
                        <TableCell className="text-right">{n(t.con_msg?.pts)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              {suc.corr_tratados_vs_cambio != null && (
                <>
                  Correlación entre cuánta gente con mensaje tiene cada sucursal y el cambio de sus
                  compras sin mensaje contra los dos periodos anteriores: {suc.corr_tratados_vs_cambio.toFixed(2)}
                  {suc.sucursales_con_datos != null && <> ({n(suc.sucursales_con_datos)} sucursales)</>}.{' '}
                </>
              )}
              {suc.nota}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

export function SpilloverPanel({ derrame, pctControl }: { derrame: DerrameBlock | null; pctControl: number | null }) {
  const poblaciones = poblacionesDerrame(derrame);
  const [poblacion, setPoblacion] = useState<DerramePoblacion>('principal');
  const [unidad, setUnidad] = useState<DerrameUnidad>('suma_por_indice');

  if (!derrame) {
    return (
      <Panel id="t-derrame" title="¿Pasaron la voz?">
        <EmptyNote>
          Sin lectura de derrame todavía. Aparece cuando Sistemas importe el reporte de «pasaron
          la voz»: las compras de la red (frontales, segundo nivel y patrocinador) de quienes
          recibieron el mensaje, contra la red de quienes quedaron en el control.
        </EmptyNote>
      </Panel>
    );
  }

  const v = veredictoDerrame(derrame.veredicto);
  const pobActual: DerramePoblacion = poblaciones.includes(poblacion) ? poblacion : (poblaciones[0] ?? 'principal');
  const tabla = tablaDerrame(derrame, pobActual, unidad);
  const esPorVecino = unidad === 'por_vecino';
  const headline = filaPrincipalDerrame(derrame);

  return (
    <Panel
      id="t-derrame"
      title="¿Pasaron la voz?"
      aside={
        <>
          Lectura exploratoria del {derrame.generado_cdmx ?? '—'}
          {derrame.corte && <> · compras hasta el {derrame.corte}</>}
          {derrame.lectura && <> · {derrame.lectura}</>}
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          <p className="font-semibold">
            ¿La gente a la que le escribimos hizo que otras personas, a las que no les escribimos, compraran?
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={v.variant} className={badgeContraste(v.variant)}>
              {v.texto}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Red de quienes recibieron el mensaje contra la red de quienes quedaron en el control (mismo
              sorteo). Nadie con mensaje cuenta como vecino
              {derrame.excluidos_con_mensaje != null && <> ({n(derrame.excluidos_con_mensaje)} personas excluidas)</>}.
            </span>
          </div>
          {derrame.veredicto_texto && <p className="rounded-md bg-muted p-3 text-sm">{derrame.veredicto_texto}</p>}
        </div>

        {headline && <Headline fila={headline} esPorVecino={false} />}

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Por tipo de vecindario</h3>
            <div className="flex flex-wrap gap-2">
              {poblaciones.length > 1 && (
                <Tabs value={pobActual} onValueChange={(x) => setPoblacion(x as DerramePoblacion)}>
                  <TabsList aria-label="Población">
                    {poblaciones.map((p) => (
                      <TabsTrigger key={p} value={p} className="text-xs">
                        {POBLACION_LABELS[p]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
              <Tabs value={unidad} onValueChange={(x) => setUnidad(x as DerrameUnidad)}>
                <TabsList aria-label="Unidad de medida">
                  <TabsTrigger value="suma_por_indice" className="text-xs">{UNIDAD_LABELS.suma_por_indice}</TabsTrigger>
                  <TabsTrigger value="por_vecino" className="text-xs">{UNIDAD_LABELS.por_vecino}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          {tabla && tabla.filas.length > 0 ? (
            <TablaVecindarios filas={tabla.filas} esPorVecino={esPorVecino} />
          ) : (
            <EmptyNote>Sin estimación para esta vista: ningún grupo tiene suficientes personas con vecinos sin mensaje en los dos lados.</EmptyNote>
          )}
          <p className="text-xs text-muted-foreground">
            {esPorVecino
              ? 'Por vecino: solo cuenta a quienes tienen al menos un vecino sin mensaje; cada vecino pesa igual. Es más estable, pero condiciona en tener red.'
              : 'Por persona con mensaje: se suma lo que compró toda su red sin mensaje (0 si no tiene). Es la unidad del sorteo, pero la dominan pocas personas con red grande.'}
            {' '}El patrocinador se comparte entre varias personas, así que su intervalo es optimista.
          </p>
        </div>

        <Detalles d={derrame} />

        <div className="grid gap-1 rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">
            Con un control de {pct(pctControl)}
            {derrame.mde_pts != null && <>, solo se detectan derrames de al menos ~{n(derrame.mde_pts)} pts por persona con mensaje</>}
            : &quot;no concluyente&quot; no dice que no hubo derrame, dice que este cierre no alcanza para verlo.
          </p>
          {derrame.notas.map((nota) => (
            <p key={nota} className="text-xs text-muted-foreground">
              {nota}
            </p>
          ))}
        </div>
      </div>
    </Panel>
  );
}
