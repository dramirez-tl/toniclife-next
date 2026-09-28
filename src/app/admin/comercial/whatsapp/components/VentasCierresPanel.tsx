'use client';

// VentasCierresPanel - "Ventas: el día del cierre contra cierres anteriores"
// (reporte 'ventas_cierres', fuente sistema anterior con hora real de
// captura). DESCRIBE, NO DEMUESTRA: el último día del periodo siempre trae
// pico, así que se compara contra otros días de cierre (mediana) y contra el
// periodo completo (26→25); el efecto de la campaña se mide contra el grupo
// de control (paneles de veredicto y "¿Está funcionando?").
//
// Gráficas (recharts): tickets acumulados del día de cierre contra el
// promedio de cierres anteriores y el mismo día de la semana anterior, con
// las marcas de los envíos de WhatsApp; tickets por día de la semana.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { CONTROL_COLOR, money, moneyCorto, n, signed } from '@/lib/whatsapp-campaign/format';
import {
  comparacionesResumen,
  curvaTickets,
  deltaPct,
  horaDe,
  tituloCierre,
  type DeltaPct,
} from '@/lib/whatsapp-campaign/reportes';
import type { VentasCierresBlock, VentasSegBaseRow, VentasTPV } from '@/types/whatsappCampaign';
import { CHART_TICK, CHART_TOOLTIP } from './HourlyChart';
import { EmptyNote, Panel } from './Panel';

/** Marcas de los envíos de WhatsApp en la curva (ámbar, distinto de las dos series). */
const OLA_COLOR = '#B45309';

const DELTA_CLASS: Record<DeltaPct['tono'], string> = {
  bien: 'text-emerald-700 dark:text-emerald-400',
  mal: 'text-[#B0432D] dark:text-[#EE8B74]',
  neutro: 'text-muted-foreground',
};

function Delta({ v, dec = 1 }: { v: number | null | undefined; dec?: number }) {
  const d = deltaPct(v, dec);
  return <span className={cn('font-semibold tabular-nums', DELTA_CLASS[d.tono])}>{d.texto}</span>;
}

function Par({
  label,
  valor,
  ref,
  pctVsRef,
  fmt,
}: {
  label: string;
  valor: number | null | undefined;
  ref: number | null | undefined;
  pctVsRef: number | null | undefined;
  fmt: (v: number | null | undefined) => string;
}) {
  return (
    <div className="grid content-start gap-0.5 rounded-lg border bg-muted/40 px-4 py-3.5">
      <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{fmt(valor)}</span>
      <span className="text-xs text-muted-foreground">
        Cierres anteriores: {fmt(ref)} · <Delta v={pctVsRef} />
      </span>
    </div>
  );
}

const horaEtiqueta = (x: number): string => {
  const h = Math.floor(x);
  const m = Math.round((x - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

function CurvaTickets({ ventas }: { ventas: VentasCierresBlock }) {
  const c = curvaTickets(ventas);
  if (!c) return <EmptyNote>Sin serie por hora.</EmptyNote>;
  const ticks: number[] = [];
  for (let h = c.h0; h <= c.h1; h += 2) ticks.push(h);
  const ult = c.ultimo;
  return (
    <div className="grid gap-2">
      <div
        role="img"
        aria-label={`Tickets acumulados por hora el día del cierre contra el promedio de cierres anteriores. Hasta las ${c.corte}: ${n(ult?.y)} tickets.`}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={c.puntos} margin={{ top: 18, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[c.h0, c.h1]}
              ticks={ticks}
              tickFormatter={(h: number) => `${h}:00`}
              tick={CHART_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tick={CHART_TICK}
              tickLine={false}
              axisLine={false}
              width={48}
              allowDecimals={false}
              tickFormatter={(v: number) => n(v)}
            />
            <Tooltip
              {...CHART_TOOLTIP}
              labelFormatter={(x) => horaEtiqueta(Number(x))}
              formatter={(value, name) => [n(typeof value === 'number' ? value : null), String(name)] as [string, string]}
            />
            {c.olas.map((o) => (
              <ReferenceLine
                key={o.id}
                x={o.x}
                stroke={OLA_COLOR}
                strokeDasharray="3 3"
                label={{ value: o.etiqueta, position: 'insideTopLeft', fontSize: 10, fill: OLA_COLOR }}
              />
            ))}
            {c.viernesDia && (
              <Line
                type="monotone"
                dataKey="viernes"
                name={`Semana anterior (${c.viernesDia})`}
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
              />
            )}
            <Line
              type="monotone"
              dataKey="promedio"
              name="Promedio de cierres anteriores"
              stroke={CONTROL_COLOR}
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="hoy"
              name="Día del cierre"
              stroke="var(--chart-1)"
              strokeWidth={3}
              dot={false}
              connectNulls={false}
            />
            {ult && <ReferenceDot x={ult.x} y={ult.y} r={5} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-3 rounded bg-chart-1" style={{ height: 3 }} />
          Día del cierre
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block w-3 rounded" style={{ height: 3, background: CONTROL_COLOR }} />
          Promedio de cierres anteriores
        </span>
        {c.viernesDia && (
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block w-3 border-t border-dashed border-muted-foreground" />
            Semana anterior ({c.viernesDia})
          </span>
        )}
        {c.olas.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-3 w-0.5" style={{ background: OLA_COLOR }} />
            Envío de WhatsApp
          </span>
        )}
      </div>
    </div>
  );
}

function SemanaChart({ ventas }: { ventas: VentasCierresBlock }) {
  const s = ventas.semana;
  if (!s.length) return null;
  const corte = horaDe(ventas.corte_hoy);
  return (
    <div className="grid gap-1">
      <p className="text-sm font-semibold">Tickets por día, última semana</p>
      <div role="img" aria-label={`Tickets por día de la última semana; el día del cierre lleva ${n(s.find((x) => x.es_hoy)?.tickets)} tickets hasta las ${corte}.`}>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={s} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="dia" tick={CHART_TICK} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} width={44} allowDecimals={false} tickFormatter={(v: number) => n(v)} />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              {...CHART_TOOLTIP}
              formatter={(value) => [n(typeof value === 'number' ? value : null), 'Tickets'] as [string, string]}
            />
            <Bar dataKey="tickets" name="Tickets" fill="var(--chart-1)" radius={[2, 2, 0, 0]}>
              {s.map((d, i) => (
                <Cell key={d.fecha ?? i} fillOpacity={d.es_hoy ? 1 : 0.4} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">El día del cierre va hasta las {corte}.</p>
    </div>
  );
}

function CierresTable({ ventas }: { ventas: VentasCierresBlock }) {
  const corte = horaDe(ventas.corte_hoy);
  const h = ventas.hoy.al_corte;
  // "Tickets del día" del cierre actual con la MISMA definición que `total_dia`
  // de los cierres anteriores: el día completo del bloque dia_completo. Si no
  // viene, la cifra al corte solo vale como total con la lectura oficial
  // (corte al final del día); en curso se dice "en curso".
  const totalHoy = ventas.dia_completo?.periodos.find((p) => p.es_actual)?.dia_cierre?.tickets ?? null;
  const totalHoyTexto = totalHoy != null ? n(totalHoy) : ventas.lectura === 'oficial' ? n(h?.tickets) : 'en curso';
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cierre</TableHead>
            <TableHead className="text-right">Tickets a las {corte}</TableHead>
            <TableHead className="text-right">Puntos a las {corte}</TableHead>
            <TableHead className="text-right">Venta a las {corte}</TableHead>
            <TableHead className="text-right">Tickets del día</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
            <TableCell className="whitespace-nowrap">
              Este cierre <span className="font-normal text-muted-foreground">({ventas.hoy.dia ?? '—'})</span>
            </TableCell>
            <TableCell className="text-right">{n(h?.tickets)}</TableCell>
            <TableCell className="text-right">{n(h?.pts)}</TableCell>
            <TableCell className="text-right">{moneyCorto(h?.venta)}</TableCell>
            <TableCell className="text-right font-normal text-muted-foreground">{totalHoyTexto}</TableCell>
          </TableRow>
          {ventas.cierres.map((c) => (
            <TableRow key={`${c.n ?? ''}-${c.fecha ?? ''}`}>
              <TableCell className="whitespace-nowrap">
                {tituloCierre(c.nombre)} <span className="text-muted-foreground">({c.dia ?? c.fecha ?? '—'})</span>
              </TableCell>
              <TableCell className="text-right">{n(c.al_corte?.tickets)}</TableCell>
              <TableCell className="text-right">{n(c.al_corte?.pts)}</TableCell>
              <TableCell className="text-right">{moneyCorto(c.al_corte?.venta)}</TableCell>
              <TableCell className="text-right">{n(c.total_dia?.tickets)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DiaCompleto({ ventas }: { ventas: VentasCierresBlock }) {
  const dc = ventas.dia_completo;
  if (!dc) return null;
  const resumen = comparacionesResumen(dc);
  const periodos = dc.periodos.slice().sort((a, b) => (b.n ?? 0) - (a.n ?? 0));
  const tpv = (t: VentasTPV | null, k: keyof VentasTPV) => (k === 'venta' ? moneyCorto(t?.[k]) : n(t?.[k]));
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-semibold">Día completo y periodo, contra los {Math.max(0, periodos.length - 1)} periodos anteriores</h3>
        <p className="text-xs text-muted-foreground">
          Lugar = dónde queda este periodo entre los {periodos.length || 7} (1.º = el más alto). El periodo va del 26 al 25 (no es mes calendario).
        </p>
      </div>
      {resumen.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ventana</TableHead>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-right">Este periodo</TableHead>
                <TableHead className="text-right">Mediana anteriores</TableHead>
                <TableHead className="text-right">vs. mediana</TableHead>
                <TableHead className="text-right">Lugar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tabular-nums">
              {resumen.map((f, i) => (
                <TableRow key={`${f.ventana}-${f.metrica}`} className={cn(i > 0 && resumen[i - 1].ventana !== f.ventana && 'border-t-2')}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{f.ventanaNombre}</TableCell>
                  <TableCell>{f.metricaNombre}</TableCell>
                  <TableCell className="text-right font-medium">{f.actual}</TableCell>
                  <TableCell className="text-right">{f.mediana}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn('font-semibold', DELTA_CLASS[f.delta.tono])}>{f.delta.texto}</span>
                  </TableCell>
                  <TableCell className="text-right">{f.rango}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {periodos.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead className="text-right">Tickets del cierre</TableHead>
                <TableHead className="text-right">Puntos del cierre</TableHead>
                <TableHead className="text-right">Venta del cierre</TableHead>
                <TableHead className="text-right">Tickets del periodo</TableHead>
                <TableHead className="text-right">Puntos del periodo</TableHead>
                <TableHead className="text-right">Venta del periodo</TableHead>
                <TableHead className="text-right">Calificados</TableHead>
                <TableHead className="text-right">% calif. de con puntos</TableHead>
                <TableHead className="text-right">Peso del cierre (pts)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tabular-nums">
              {periodos.map((p) => (
                <TableRow key={p.n ?? p.nombre ?? ''} className={cn(p.es_actual && 'bg-muted/50 font-semibold hover:bg-muted/50')}>
                  <TableCell className="whitespace-nowrap">
                    {tituloCierre(p.nombre)}
                    {p.es_actual && <span className="ml-1 text-xs font-normal text-muted-foreground">(campaña)</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {p.dow_cierre ?? ''} {p.fin ?? ''}
                  </TableCell>
                  <TableCell className="text-right">{tpv(p.dia_cierre, 'tickets')}</TableCell>
                  <TableCell className="text-right">{tpv(p.dia_cierre, 'pts')}</TableCell>
                  <TableCell className="text-right">{tpv(p.dia_cierre, 'venta')}</TableCell>
                  <TableCell className="text-right">{tpv(p.periodo, 'tickets')}</TableCell>
                  <TableCell className="text-right">{tpv(p.periodo, 'pts')}</TableCell>
                  <TableCell className="text-right">{tpv(p.periodo, 'venta')}</TableCell>
                  <TableCell className="text-right">{n(p.calificados)}</TableCell>
                  <TableCell className="text-right">{p.pct_calif_de_con_puntos != null ? `${p.pct_calif_de_con_puntos.toFixed(1)}%` : '—'}</TableCell>
                  <TableCell className="text-right">
                    {p.participacion?.pts?.dia_cierre_pct != null ? `${p.participacion.pts.dia_cierre_pct.toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SegLado({ r, k }: { r: VentasSegBaseRow; k: 'pct_califica' | 'pct_compra' }) {
  const f = (v: number | null | undefined) => (v != null ? `${v.toFixed(1)}%` : '—');
  return (
    <>
      <TableCell className="text-right font-medium">{f(r.tratados?.[k])}</TableCell>
      <TableCell className="text-right">{f(r.control?.[k])}</TableCell>
      <TableCell className="text-right">{f(k === 'pct_califica' ? r.base_pct_califica : r.base_pct_compra)}</TableCell>
    </>
  );
}

function SegmentosVsBase({ ventas, nombres }: { ventas: VentasCierresBlock; nombres: Record<string, string> }) {
  const s = ventas.segmentos_vs_base;
  if (!s) return null;
  const filas = s.total ? [...s.segmentos, s.total] : s.segmentos;
  const pp = (v: number | null | undefined) => (v != null ? signed(v, 1, ' pp') : '—');
  return (
    <details className="group rounded-md border p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        Cada grupo contra su propia historia (cierres anteriores sin campaña)
      </summary>
      <div className="mt-3 grid gap-2">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
              <TableHead>Grupo</TableHead>
                <TableHead className="text-right">Con campaña / control</TableHead>
                <TableHead className="text-right">Califica: campaña</TableHead>
                <TableHead className="text-right">Control</TableHead>
                <TableHead className="text-right">Historia</TableHead>
                <TableHead className="text-right">Campaña − control</TableHead>
                <TableHead className="text-right">Compra: campaña</TableHead>
                <TableHead className="text-right">Control</TableHead>
                <TableHead className="text-right">Historia</TableHead>
                <TableHead className="text-right">Campaña − control</TableHead>
                <TableHead className="text-right">Venta media (camp. / ctrl)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tabular-nums">
              {filas.map((r) => (
                <TableRow key={r.id} className={cn(r.id === 'total' && 'bg-muted/50 font-semibold hover:bg-muted/50')}>
                  <TableCell className="whitespace-nowrap">{r.id === 'total' ? 'Todos (sin líderes)' : nombres[r.id] ?? r.id}</TableCell>
                  <TableCell className="text-right">{n(r.tratados?.n)} / {n(r.control?.n)}</TableCell>
                  <SegLado r={r} k="pct_califica" />
                  <TableCell className="text-right">{pp(r.califica_pp?.trat_vs_ctrl)}</TableCell>
                  <SegLado r={r} k="pct_compra" />
                  <TableCell className="text-right">{pp(r.compra_pp?.trat_vs_ctrl)}</TableCell>
                  <TableCell className="text-right">{money(r.tratados?.venta_mxn_media)} / {money(r.control?.venta_mxn_media)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          Historia = la misma regla en los tres cierres anteriores (otros periodos, otras personas):
          describe. Fíjate si el control quedó por debajo de su historia: entonces la diferencia
          contra el control viene en parte de un control bajo, no solo de que la campaña subiera.
        </p>
      </div>
    </details>
  );
}

export function VentasCierresPanel({
  ventas,
  nombresSegmentos = {},
}: {
  ventas: VentasCierresBlock | null;
  nombresSegmentos?: Record<string, string>;
}) {
  if (!ventas) {
    return (
      <Panel id="t-ventas" title="Ventas: el día del cierre contra cierres anteriores">
        <EmptyNote>
          Sin datos de ventas del cierre todavía. Aparecen cuando Sistemas importe el reporte de
          ventas (fuente: sistema anterior, con la hora real de captura de cada ticket).
        </EmptyNote>
      </Panel>
    );
  }
  const corte = horaDe(ventas.corte_hoy);
  const h = ventas.hoy.al_corte;
  const m = ventas.mediana_al_corte;
  const p = ventas.hoy_vs_mediana_pct;
  const hayHoy = !!h;
  return (
    <Panel
      id="t-ventas"
      title="Ventas: el día del cierre contra cierres anteriores"
      aside={
        <>
          Ventas capturadas hasta las {corte} · hora del centro de México
          {ventas.generado_cdmx && <> · importadas el {ventas.generado_cdmx}</>}
        </>
      }
    >
      <div className="grid gap-6">
        {hayHoy && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="grid content-start gap-3">
              <p className="font-semibold">
                El día del cierre hasta las {corte}, contra la mediana de los {ventas.cierres.length} cierres
                anteriores a la misma hora
              </p>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <Par label="Tickets" valor={h?.tickets} ref={m?.tickets} pctVsRef={p?.tickets} fmt={n} />
                <Par label="Puntos" valor={h?.pts} ref={m?.pts} pctVsRef={p?.pts} fmt={n} />
                <Par label="Venta" valor={h?.venta} ref={m?.venta} pctVsRef={p?.venta} fmt={money} />
              </div>
              <p className="text-xs text-muted-foreground">
                Se compara contra otros días de cierre porque el último día del periodo siempre trae
                más ventas. La mediana evita que un cierre con un pedido muy grande mueva la
                referencia. Esto describe: el efecto de la campaña se mide contra el grupo de control.
              </p>
            </div>
            <div className="grid content-start gap-2">
              <p className="font-semibold">Tickets acumulados en el día</p>
              <CurvaTickets ventas={ventas} />
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <CierresTable ventas={ventas} />
          <SemanaChart ventas={ventas} />
        </div>

        <DiaCompleto ventas={ventas} />

        <SegmentosVsBase ventas={ventas} nombres={nombresSegmentos} />

        <div className="grid gap-1 text-xs text-muted-foreground">
          {ventas.notas.map((nota) => (
            <p key={nota}>{nota}</p>
          ))}
        </div>
      </div>
    </Panel>
  );
}
