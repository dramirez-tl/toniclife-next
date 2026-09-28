'use client';

// ExtraWavePanel - "Ola extra: última llamada". La ola extra es una campaña
// HIJA (otra población: distribuidores con puntos que no estaban en la
// campaña original) con su propio grupo de control, así que se mide aparte y
// no entra en las cifras de arriba. Cada hija se lee de su propio tablero
// (GET /whatsapp/campaigns/:key/dashboard) y aquí se resume: entrega, compra y
// calificación contra su control, y su lectura oficial (venta solo si es
// confiable). "Ver detalle" abre el tablero completo de la hija.

import Link from 'next/link';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhatsAppCampaignDashboard } from '@/hooks/useWhatsAppCampaigns';
import { apiErrorInfo } from '@/lib/api-error';
import {
  WHATSAPP_ADMIN_PATH,
  badgeContraste,
  badgeImpacto,
  construirQuery,
  money,
  n,
  signed,
} from '@/lib/whatsapp-campaign/format';
import { icTexto } from '@/lib/whatsapp-campaign/reportes';
import type { CampaignDashboard, ComplementoItem } from '@/types/whatsappCampaign';
import { CompareLegend, CompareRow } from './CompareBar';
import { EmptyNote, Panel } from './Panel';
import { OlaCard } from './WavesPanel';

function ExtraWaveCard({ hija, umbral }: { hija: ComplementoItem; umbral: number }) {
  const q = useWhatsAppCampaignDashboard(hija.key);
  const href = `${WHATSAPP_ADMIN_PATH}${construirQuery({ campana: hija.key })}`;

  if (q.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    const info = apiErrorInfo(q.error, 'No se pudo cargar la ola extra.');
    return (
      <EmptyNote>
        {info.message}{' '}
        <Link href={href} className="underline decoration-dotted underline-offset-4 hover:text-primary">
          Abrir su tablero
        </Link>
        .
      </EmptyNote>
    );
  }

  const d: CampaignDashboard = q.data;
  const ola = d.olas.find((o) => o.estado !== 'programada') ?? d.olas[0] ?? null;
  const t = d.total;
  const at = d.atribucion?.total ?? null;
  const im = d.impacto;
  const pctCompraT = at?.pct_compraron_desde_t0_trat ?? t?.pct_compraron_trat ?? null;
  const pctCompraC = at?.pct_compraron_desde_t0_ctrl ?? t?.pct_compraron_ctrl ?? null;
  const compraronT = at?.compraron_desde_t0_trat ?? t?.compraron_trat ?? null;
  const compraronC = at?.compraron_desde_t0_ctrl ?? t?.compraron_ctrl ?? null;
  const tp = im ? badgeImpacto(im.tipo) : null;
  const vi = im?.retorno?.venta_incremental_mxn ?? null;

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 lg:grid-cols-2">
        {ola ? (
          <OlaCard ola={{ ...ola, nombre: 'Entrega' }} />
        ) : (
          <div className="rounded-lg border p-3.5 text-sm text-muted-foreground">Sin envíos registrados todavía.</div>
        )}

        <article className="grid content-start gap-3 rounded-lg border bg-card p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Efecto contra su control</h3>
              <span className="text-xs text-muted-foreground">
                {n(d.embudo.tratados)} con el aviso · {n(d.embudo.control)} sin aviso
              </span>
            </div>
            {tp && (
              <Badge variant={tp.variant} className={badgeContraste(tp.variant)}>
                {tp.texto}
              </Badge>
            )}
          </div>

          <div className="grid gap-2">
            <p className="text-sm">Compraron después del aviso</p>
            <CompareRow label="Con aviso" tone="trat" value={pctCompraT} />
            <CompareRow label="Control" tone="ctrl" value={pctCompraC} />
            <p className="text-xs text-muted-foreground">
              {n(compraronT)} contra {n(compraronC)}
              {im?.compra_pp && (
                <>
                  {' '}· diferencia {signed(im.compra_pp.efecto, 1, ' pp')} (intervalo 95%: {icTexto(im.compra_pp, 1)})
                </>
              )}
            </p>
          </div>

          <div className="grid gap-2">
            <p className="text-sm">Ya llegaron a {n(umbral)}</p>
            <CompareRow label="Con aviso" tone="trat" value={t?.pct_califican_trat} />
            <CompareRow label="Control" tone="ctrl" value={t?.pct_califican_ctrl} />
            <p className="text-xs text-muted-foreground">
              {n(t?.califican_trat)} de {n(t?.base_trat)} contra {n(t?.califican_ctrl)} de {n(t?.base_ctrl)}
              {im?.calificacion_pp && (
                <>
                  {' '}· diferencia {signed(im.calificacion_pp.efecto, 1, ' pp')} (intervalo 95%: {icTexto(im.calificacion_pp, 1)})
                </>
              )}
            </p>
          </div>

          {im?.puntos && (
            <p className="text-xs text-muted-foreground">
              Puntos extra por persona: <strong className="font-semibold text-foreground">{signed(im.puntos.efecto, 0)} pts</strong>{' '}
              (intervalo 95%: {icTexto(im.puntos, 0)}).
            </p>
          )}

          {im && (
            <p className="text-xs text-muted-foreground">
              {im.venta_confiable && vi ? (
                <>
                  Venta atribuible estimada: <strong className="font-semibold text-foreground">{money(vi.efecto, { signo: true })}</strong>{' '}
                  (intervalo 95%: {icTexto(vi, 0)}).
                </>
              ) : (
                <>
                  El control tiene muy pocas compras para saber cuánto de la venta se debe al aviso
                  {vi ? <>; la estimación ({money(vi.efecto, { signo: true })}, intervalo {icTexto(vi, 0)}) es solo orientativa</> : null}.
                </>
              )}
            </p>
          )}

          <CompareLegend pctControl={d.campana.pct_control || null} />
        </article>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted p-3 text-sm">
        <p>
          Es otra población
          {d.segmentos.length === 1 && d.segmentos[0].nombre ? ` (${d.segmentos[0].nombre.toLowerCase()})` : ''}, con su
          propio grupo de control ({n(d.embudo.control)} personas): se mide aparte y no entra en las cifras
          de arriba.
          {im?.venta_confiable === false && ' Con tan pocas compras en el control, la venta es solo orientativa.'}
        </p>
        <Link
          href={href}
          className="inline-flex items-center gap-1 whitespace-nowrap font-medium underline decoration-dotted underline-offset-4 hover:text-primary"
        >
          Ver detalle
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function ExtraWavePanel({ data }: { data: CampaignDashboard }) {
  const hijas = data.complementos;
  if (!hijas.length) return null;
  const primera = hijas[0];
  return (
    <Panel
      id="t-extra"
      title={hijas.length === 1 ? 'Ola extra: última llamada' : 'Olas complementarias'}
      aside={
        <>
          {primera.t0_cdmx && <>Enviada {primera.t0_cdmx} · </>}
          {n(primera.tratados)} con aviso · {n(primera.control)} de control
        </>
      }
    >
      <div className="grid gap-5">
        {hijas.map((h) => (
          <div key={h.key} className="grid gap-2">
            {hijas.length > 1 && <h3 className="text-sm font-semibold">{h.nombre}</h3>}
            <ExtraWaveCard hija={h} umbral={data.periodo.umbral} />
          </div>
        ))}
      </div>
    </Panel>
  );
}
