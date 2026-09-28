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

export function ReturnBlock({ retorno, ventaConfiable }: { retorno: RetornoCampana; ventaConfiable?: boolean | null }) {
  const vi = retorno.venta_incremental_mxn;
  const costo = retorno.costo_total_campana_mxn ?? (retorno.costo_meta_mxn != null || retorno.costo_lid_mxn != null
    ? (retorno.costo_meta_mxn ?? 0) + (retorno.costo_lid_mxn ?? 0)
    : null);
  const vpp = retorno.venta_por_peso;
  const pts = retorno.pts_incrementales;
  const ventaDudosa = ventaConfiable === false;
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
              ? `Meta: ${money(retorno.costo_meta_mxn)}${retorno.costo_lid_mxn != null ? ` · líderes ${money(retorno.costo_lid_mxn)}` : ''}`
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
