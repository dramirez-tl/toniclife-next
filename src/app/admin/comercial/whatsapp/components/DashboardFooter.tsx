'use client';

// DashboardFooter - Corte de la sync, marca de agua del legacy, notas del
// cálculo y el periodo de negocio (fechas de tonic.commission_periods; el fin
// puede recorrerse a día hábil, así que no se escribe "26→25" fijo).

import { fechaLarga, n } from '@/lib/whatsapp-campaign/format';
import type { CampaignDashboard } from '@/types/whatsappCampaign';

export function DashboardFooter({ data }: { data: CampaignDashboard }) {
  const c = data.corte;
  const p = data.periodo;
  return (
    <footer className="grid gap-1 text-xs text-muted-foreground">
      <p>
        Cifras de puntos con corte a la actualización de{' '}
        <span className="font-mono">{c.sync_fin_cdmx || '—'}</span> (ventas del sistema hasta{' '}
        <span className="font-mono">{c.watermark_legacy || '—'}</span>). Solo cifras agregadas: el
        tablero no contiene nombres ni teléfonos; las personas están en la pestaña Personas.
      </p>
      {data.notas.map((nota) => (
        <p key={nota}>{nota}</p>
      ))}
      <p>
        Periodo de negocio {p.nombre}: del {fechaLarga(p.inicio)} al {fechaLarga(p.fin)} (no es mes
        calendario). Calificar = {n(p.umbral)} puntos personales.
      </p>
    </footer>
  );
}
