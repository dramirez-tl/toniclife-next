'use client';

// KpiTiles - Las 5 cifras clave del tablero (mismos textos que el artefacto).

import { kpisTablero } from '@/lib/whatsapp-campaign/format';
import type { CampaignDashboard } from '@/types/whatsappCampaign';

export function KpiTiles({ data }: { data: CampaignDashboard }) {
  const tiles = kpisTablero(data);
  return (
    <section aria-label="Cifras clave" className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {tiles.map((k) => (
        <div key={k.id} className="grid gap-0.5 rounded-lg border bg-card px-4 py-3.5 shadow-xs">
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {k.etiqueta}
          </span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.7rem]">
            {k.valor}
          </span>
          <span className="text-xs text-muted-foreground">{k.detalle}</span>
        </div>
      ))}
    </section>
  );
}
