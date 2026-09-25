'use client';

// EffectPanel - "¿Está funcionando?": comparación en vivo campaña vs control
// (bloque `total`, sin líderes) y la última lectura de impacto importada de la
// medición (interina, preliminar u oficial).

import { Badge } from '@/components/ui/badge';
import { badgeContraste, badgeImpacto, n, pct, signed } from '@/lib/whatsapp-campaign/format';
import type { CampaignDashboard } from '@/types/whatsappCampaign';
import { CompareLegend, CompareRow } from './CompareBar';
import { EffectInterval } from './EffectInterval';
import { Panel } from './Panel';

function Compare({ data }: { data: CampaignDashboard }) {
  const t = data.total;
  const umbral = n(data.periodo.umbral);
  if (!t) {
    return <p className="text-sm text-muted-foreground">Sin datos de comparación todavía.</p>;
  }
  return (
    <div className="grid content-start gap-3.5">
      <p className="font-semibold">
        De quienes estaban debajo de {umbral} al primer aviso, ¿cuántos ya llegaron?
      </p>
      <CompareRow
        label="Con campaña"
        tone="trat"
        value={t.pct_califican_trat}
        base={t.base_historica_califica}
      />
      <CompareRow
        label="Control"
        tone="ctrl"
        value={t.pct_califican_ctrl}
        base={t.base_historica_califica}
      />
      <p className="text-xs text-muted-foreground">
        {n(t.califican_trat)} de {n(t.base_trat)} con campaña · {n(t.califican_ctrl)} de{' '}
        {n(t.base_ctrl)} en el control. Compraron algo: {pct(t.pct_compraron_trat)} contra{' '}
        {pct(t.pct_compraron_ctrl)}. Puntos ganados en promedio: {n(t.pts_ganados_prom_trat)} contra{' '}
        {n(t.pts_ganados_prom_ctrl)}.
      </p>
      {t.base_historica_califica != null && (
        <p className="text-xs text-muted-foreground">
          Sin campaña, en los tres cierres anteriores llegó el {pct(t.base_historica_califica)} en el
          mismo tramo (línea vertical).
        </p>
      )}
      <p className="rounded-md bg-muted p-3 text-sm">
        Es una comparación en vivo con las cifras que llegan cada 2 horas. El grupo de control es
        chico ({n(data.embudo.control)} personas), así que las diferencias de un día pueden ser azar.
        La conclusión la dan las mediciones preliminar y oficial.
      </p>
    </div>
  );
}

function Impact({ data }: { data: CampaignDashboard }) {
  const im = data.impacto;
  if (!im) {
    return (
      <div className="grid content-start gap-2">
        <p className="font-semibold">Medición oficial</p>
        <p className="text-sm text-muted-foreground">
          Todavía no hay lectura de la medición. Aparece aquí en cuanto se importe la lectura
          intermedia, la preliminar o la oficial.
        </p>
      </div>
    );
  }
  const tp = badgeImpacto(im.tipo);
  const p = im.puntos ?? { efecto: null, ic_bajo: null, ic_alto: null };
  const c = im.calificacion_pp;
  return (
    <div className="grid content-start gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">Efecto medido contra el control</p>
        <Badge variant={tp.variant} className={badgeContraste(tp.variant)}>
          {tp.texto}
        </Badge>
      </div>
      <div>
        <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Puntos extra por persona
        </span>
        <div className="text-2xl font-semibold tabular-nums">{signed(p.efecto, 0)} pts</div>
        <EffectInterval est={p.efecto} lo={p.ic_bajo} hi={p.ic_alto} unidad="puntos" />
        <p className="text-xs text-muted-foreground">
          Intervalo de confianza 95%: {signed(p.ic_bajo, 0)} a {signed(p.ic_alto, 0)} pts

        </p>
      </div>
      {c?.efecto != null && (
        <div>
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Tasa de calificación
          </span>
          <div className="text-xl font-semibold tabular-nums">{signed(c.efecto, 1, ' puntos porcentuales')}</div>
          <p className="text-xs text-muted-foreground">
            Intervalo 95%: {signed(c.ic_bajo, 1)} a {signed(c.ic_alto, 1)} puntos porcentuales
          </p>
        </div>
      )}
      <p className="rounded-md bg-muted p-3 text-sm">
        {im.veredicto}
        {im.corte && <span className="font-mono text-xs"> (corte {im.corte})</span>}
      </p>
      {(im.mde_pts || im.mde_pp) && (
        <p className="text-xs text-muted-foreground">
          Con un control de {pct(data.campana.pct_control || null)}, este cierre solo confirma efectos
          de al menos {im.mde_pts || '—'} pts por persona o {im.mde_pp || '—'} puntos porcentuales.
        </p>
      )}
    </div>
  );
}

export function EffectPanel({ data }: { data: CampaignDashboard }) {
  return (
    <Panel
      id="t-funciona"
      title="¿Está funcionando?"
      aside={<CompareLegend pctControl={data.campana.pct_control || null} withBase />}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Compare data={data} />
        <Impact data={data} />
      </div>
    </Panel>
  );
}
