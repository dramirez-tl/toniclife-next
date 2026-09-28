'use client';

// VerdictPanel - "Veredicto oficial": la decisión de la campaña según la regla
// del plan de medición (§6) aplicada al IC95 del efecto en puntos, los tres
// efectos contra el control (puntos, calificación, compra) con su intervalo,
// el retorno (venta incremental, costo, venta por peso) y, plegados, la
// robustez (sensibilidades y subestratos). Solo con lectura preliminar u
// oficial: la intermedia no decide nada.

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { badgeContraste, badgeImpacto, n, pct, signed, toneEfecto } from '@/lib/whatsapp-campaign/format';
import { icTexto, pTexto, resultadoRegla } from '@/lib/whatsapp-campaign/reportes';
import type { CampaignDashboard, EffectEstimate } from '@/types/whatsappCampaign';
import { DecisionRule } from './DecisionRule';
import { EffectInterval } from './EffectInterval';
import { EmptyNote, Panel } from './Panel';
import { ReturnBlock } from './ReturnBlock';

const TONO_TEXTO = {
  bien: 'text-emerald-700 dark:text-emerald-400',
  mal: 'text-[#B0432D] dark:text-[#EE8B74]',
  neutro: 'text-foreground',
} as const;

function EffectTile({
  label,
  est,
  dec,
  unidad,
  sufijo,
  detalle,
}: {
  label: string;
  est: EffectEstimate | null;
  dec: number;
  unidad: string;
  sufijo: string;
  detalle?: string;
}) {
  const tono = est ? toneEfecto(est.ic_bajo, est.ic_alto) : 'neutro';
  return (
    <div className="grid content-start gap-1 rounded-lg border bg-card px-4 py-3.5">
      <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {!est ? (
        <span className="text-sm text-muted-foreground">Sin estimación</span>
      ) : (
        <>
          <span className={cn('text-2xl font-semibold tabular-nums', TONO_TEXTO[tono])}>
            {signed(est.efecto, dec)}
            {sufijo}
          </span>
          <EffectInterval est={est.efecto} lo={est.ic_bajo} hi={est.ic_alto} unidad={unidad} />
          <span className="text-xs text-muted-foreground">
            Intervalo 95%: {icTexto(est, dec)}
            {sufijo}
            {pTexto(est.p) ? ` · ${pTexto(est.p)}` : ''}
          </span>
          {detalle && <span className="text-xs text-muted-foreground">{detalle}</span>}
        </>
      )}
    </div>
  );
}

function Robustez({ data }: { data: CampaignDashboard }) {
  const im = data.impacto;
  if (!im || (!im.sensibilidades.length && !im.por_subestrato.length && !im.cace)) return null;
  const segNombre = (id: string) => data.segmentos.find((s) => s.id === id)?.nombre ?? id;
  // La lectura del CACE se compara con el efecto principal en vez de afirmarla fija.
  const lecturaCace =
    im.cace && toneEfecto(im.cace.ic_bajo, im.cace.ic_alto) === toneEfecto(im.puntos?.ic_bajo, im.puntos?.ic_alto)
      ? 'Misma conclusión: el intervalo se estira, no cambia de signo.'
      : 'Ojo: entre quienes sí lo recibieron la conclusión cambia; léase con el intervalo, no con el número suelto.';
  return (
    <details className="group rounded-md border p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        ¿Cambia el resultado si se mide de otra forma? (robustez)
      </summary>
      <div className="mt-3 grid gap-4">
        {im.cace && (
          <p className="text-muted-foreground">
            El efecto de arriba cuenta a todos los asignados, les haya llegado o no el mensaje (así se
            protege el sorteo). Entre quienes sí lo recibieron ({pct(im.cace.pct_entregado)} de los
            tratados) el efecto sería {signed(im.cace.efecto, 0)} pts (intervalo {icTexto(im.cace, 0)})
            {im.cace.efecto_leido != null && <>; entre quienes lo leyeron, {signed(im.cace.efecto_leido, 0)} pts</>}.{' '}
            {lecturaCace}
          </p>
        )}
        {im.sensibilidades.length > 0 && (
          <div className="grid gap-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sensibilidades (puntos por persona)</h4>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forma de medir</TableHead>
                    <TableHead className="text-right">Efecto</TableHead>
                    <TableHead className="text-right">Intervalo 95%</TableHead>
                    <TableHead className="text-right">p</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular-nums">
                  {im.sensibilidades.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-normal">{s.nombre}</TableCell>
                      <TableCell className={cn('text-right font-medium', TONO_TEXTO[toneEfecto(s.ic_bajo, s.ic_alto)])}>{signed(s.efecto, 0)}</TableCell>
                      <TableCell className="text-right">{icTexto(s, 0)}</TableCell>
                      <TableCell className="text-right">{s.p != null ? s.p.toFixed(2) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {im.por_subestrato.length > 0 && (
          <div className="grid gap-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Por grupo (exploratorio, sin ajuste por comparaciones múltiples)</h4>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="text-right">Con campaña / control</TableHead>
                    <TableHead className="text-right">Pts ganados (media)</TableHead>
                    <TableHead className="text-right">Efecto</TableHead>
                    <TableHead className="text-right">Intervalo 95%</TableHead>
                    <TableHead className="text-right">Ajustado (Bonferroni)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular-nums">
                  {im.por_subestrato.map((s) => (
                    <TableRow key={s.sub}>
                      <TableCell className="whitespace-normal">
                        {segNombre(s.sub)}
                        {segNombre(s.sub) !== s.sub && <span className="ml-1 font-mono text-xs text-muted-foreground">{s.sub}</span>}
                      </TableCell>
                      <TableCell className="text-right">{n(s.nt)} / {n(s.nc)}</TableCell>
                      <TableCell className="text-right">{n(s.media_t)} vs {n(s.media_c)}</TableCell>
                      <TableCell className={cn('text-right font-medium', TONO_TEXTO[toneEfecto(s.ic_bajo, s.ic_alto)])}>{signed(s.efecto, 0)}</TableCell>
                      <TableCell className="text-right">{icTexto(s, 0)}</TableCell>
                      <TableCell className="text-right">{icTexto({ ic_bajo: s.ic_bonf_bajo, ic_alto: s.ic_bonf_alto }, 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Con seis grupos, alguno sale alto por azar: la lectura por grupo orienta el siguiente
              cierre, no decide.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

export function VerdictPanel({ data }: { data: CampaignDashboard }) {
  const im = data.impacto;
  const regla = im?.regla_decision ?? null;

  if (!im || im.tipo === 'interino' || !regla) {
    return (
      <Panel id="t-veredicto" title="Veredicto oficial">
        <EmptyNote>
          {im
            ? `Por ahora solo hay una lectura intermedia (corte ${im.corte ?? '—'}), que no decide nada. `
            : 'Todavía no hay lectura de la medición. '}
          El veredicto aparece cuando Sistemas importe la lectura preliminar u oficial de la campaña:
          ahí se aplica la regla de decisión al efecto medido contra el grupo de control.
        </EmptyNote>
      </Panel>
    );
  }

  const tp = badgeImpacto(im.tipo);
  const r = resultadoRegla(regla.resultado);
  const esHija = !!data.campana.padre;

  return (
    <Panel
      id="t-veredicto"
      title={esHija ? 'Veredicto de la ola extra' : 'Veredicto oficial'}
      aside={
        <>
          Medido contra el grupo de control ({pct(data.campana.pct_control || null)}, sin mensajes)
          {im.corte && <> · corte {im.corte}</>}
        </>
      }
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={tp.variant} className={badgeContraste(tp.variant)}>
            {tp.texto}
          </Badge>
          <span className={cn('text-2xl font-bold tracking-tight sm:text-3xl')}>{r.texto}</span>
        </div>
        <p className="rounded-md bg-muted p-3 text-sm">
          {im.veredicto || regla.texto || r.siguiente}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <EffectTile
            label="Puntos extra por persona"
            est={im.puntos}
            dec={0}
            unidad="puntos"
            sufijo=" pts"
            detalle="Lo que decide: puntos ganados desde el primer aviso, con campaña menos control."
          />
          <EffectTile
            label={`Llegaron a ${n(data.periodo.umbral)} (tasa)`}
            est={im.calificacion_pp}
            dec={1}
            unidad="puntos porcentuales"
            sufijo=" pp"
            detalle="De quienes estaban debajo al primer aviso."
          />
          <EffectTile
            label="Compraron algo (tasa)"
            est={im.compra_pp}
            dec={1}
            unidad="puntos porcentuales"
            sufijo=" pp"
            detalle="Al menos una compra desde el primer aviso."
          />
        </div>

        {im.retorno && <ReturnBlock retorno={im.retorno} ventaConfiable={im.venta_confiable} esHija={esHija} />}

        <DecisionRule regla={regla} impacto={im} pctControl={data.campana.pct_control || null} />

        <Robustez data={data} />
      </div>
    </Panel>
  );
}
