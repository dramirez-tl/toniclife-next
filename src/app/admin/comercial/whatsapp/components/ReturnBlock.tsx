'use client';

// ReturnBlock - Retorno de la campaña: venta incremental (IC95), costo de los
// mensajes (Meta), venta por peso gastado y puntos incrementales. SIN margen:
// todavía no hay costo de producto (se retoma en la fase de precio unitario),
// así que se reporta venta incremental por peso gastado, no el retorno neto.

import { money, n, pct, signed } from '@/lib/whatsapp-campaign/format';
import { icTexto } from '@/lib/whatsapp-campaign/reportes';
import type { RetornoCampana } from '@/types/whatsappCampaign';

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="grid content-start gap-0.5 rounded-lg border bg-muted/40 px-4 py-3.5">
      <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

/**
 * Costo que encabeza el mosaico: el de los mensajes a la población medida
 * (`costo_meta_mxn`), que es la base con la que el medidor calcula
 * `venta_por_peso`. Los mensajes a líderes van aparte (se miden aparte) y el
 * total de la campaña (todas las olas) solo se menciona como detalle.
 */
export function costoBaseRetorno(retorno: Pick<RetornoCampana, 'costo_meta_mxn' | 'costo_total_campana_mxn'>): number | null {
  return retorno.costo_meta_mxn ?? retorno.costo_total_campana_mxn;
}

/** El total de la campaña se muestra aparte solo si es otra cifra que la base (+ líderes) y no es una hija. */
export function mostrarCostoTotal(
  retorno: Pick<RetornoCampana, 'costo_meta_mxn' | 'costo_lid_mxn' | 'costo_total_campana_mxn'>,
  esHija: boolean,
): boolean {
  const total = retorno.costo_total_campana_mxn;
  if (esHija || total == null || retorno.costo_meta_mxn == null) return false;
  const propio = retorno.costo_meta_mxn + (retorno.costo_lid_mxn ?? 0);
  return Math.round(total) !== Math.round(propio);
}

export function ReturnBlock({
  retorno,
  ventaConfiable,
  esHija = false,
}: {
  retorno: RetornoCampana;
  ventaConfiable?: boolean | null;
  /** Campaña hija (ola extra): su costo es el propio; no lleva el total de la campaña. */
  esHija?: boolean;
}) {
  const vi = retorno.venta_incremental_mxn;
  const costo = costoBaseRetorno(retorno);
  const vpp = retorno.venta_por_peso;
  const pts = retorno.pts_incrementales;
  const ventaDudosa = ventaConfiable === false;
  const totalAparte = mostrarCostoTotal(retorno, esHija);
  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-semibold">¿Cuánto dejó?</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Venta incremental"
          value={money(vi?.efecto, { signo: true })}
          detail={vi ? `Intervalo 95%: ${icTexto(vi, 0)}${ventaDudosa ? ' · orientativa' : ''}` : 'Sin estimación'}
        />
        <Tile
          label="Costo de los mensajes"
          value={money(costo)}
          detail={
            retorno.costo_meta_mxn != null
              ? `Meta, a esta población (base de la venta por peso)${retorno.costo_lid_mxn != null ? ` · líderes aparte: ${money(retorno.costo_lid_mxn)}` : ''}`
              : 'Precio por mensaje entregado (Meta)'
          }
        />
        <Tile
          label="Venta por peso gastado"
          value={vpp?.efecto != null ? `${money(vpp.efecto)} por $1` : '—'}
          detail={vpp ? `Intervalo 95%: ${icTexto(vpp, 0)}` : 'Sin estimación'}
        />
        <Tile
          label="Puntos incrementales"
          value={pts?.efecto != null ? signed(pts.efecto, 0) : '—'}
          detail={pts ? `Intervalo 95%: ${icTexto(pts, 0)}` : n(null)}
        />
      </div>
      {totalAparte && (
        <p className="text-sm text-muted-foreground">
          Costo total de la campaña, todas las olas:{' '}
          <strong className="font-semibold text-foreground">{money(retorno.costo_total_campana_mxn)}</strong>{' '}
          (incluye los mensajes a líderes y la ola extra, que se miden aparte; la venta por peso se calcula con el
          costo de esta población).
        </p>
      )}
      {retorno.retorno != null && (
        <p className="text-sm">
          Retorno sobre el costo: <strong className="font-semibold">{pct(retorno.retorno)}</strong>
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {retorno.nota ? `${retorno.nota} ` : ''}
        Sin margen: no hay costo de producto en el sistema, así que se reporta la venta incremental
        por peso gastado y no el retorno neto; se retoma en la fase de precio unitario. La venta
        incremental es una estimación contra el control y hereda su intervalo: si el intervalo cruza
        el 0, la venta también puede ser 0.
        {retorno.venta_sin_recorte_mxn && (
          <> Sin recorte de valores extremos: {money(retorno.venta_sin_recorte_mxn.efecto, { signo: true })} ({icTexto(retorno.venta_sin_recorte_mxn, 0)}).</>
        )}
      </p>
    </div>
  );
}
