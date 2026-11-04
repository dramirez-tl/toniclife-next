'use client';

// JourneyPreviewDialog - "Vista previa" de un recorrido: cuántos entrarían hoy
// y por qué se omitirían los demás (GET /whatsapp/journeys/:code/preview, no
// envía nada). La muestra (≤ 20 filas) CONTIENE DATOS PERSONALES (número y
// primer nombre): solo para verificar la segmentación, como la pestaña
// Personas.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useJourneyPreview } from '@/hooks/useWhatsAppJourneys';
import { apiErrorMessage } from '@/lib/api-error';
import { n, pct, ratio } from '@/lib/whatsapp-campaign/format';
import { etiquetaMotivo, motivosOrdenados } from '@/lib/whatsapp-campaign/recorridos';
import type { JourneyItem } from '@/types/whatsappJourneys';

function Cifra({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function JourneyPreviewDialog({
  open,
  onOpenChange,
  item,
  periodNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Pick<JourneyItem, 'code' | 'name'>;
  periodNumber: number | null;
}) {
  const q = useJourneyPreview(item.code, periodNumber, open);
  const p = q.data;
  // `eligible` = evaluados hoy (el API evalúa con tope de 4,000); `audience` =
  // alcance completo del segmento. Porcentajes y muestra van sobre los evaluados.
  const omitidos = p ? Math.max(0, p.eligible - p.wouldSend - p.control) : null;
  const cumplen = p ? (p.audience ?? p.eligible) : null;
  const recortado = p != null && p.audience != null && p.audience > p.eligible;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Vista previa · {item.code} {item.name}
          </DialogTitle>
          <DialogDescription>
            Quién entraría si el recorrido corriera ahora, con todos los candados aplicados. No envía
            nada.
            {p?.period?.name ? ` Periodo ${p.period.name}.` : ''}
          </DialogDescription>
        </DialogHeader>

        {q.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : q.isError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {apiErrorMessage(q.error, 'No se pudo calcular la vista previa.', {
              forbidden: 'Tu rol no tiene acceso a la vista previa (permiso Comercial).',
              unavailable: 'Falta la migración 185 en la base: la vista previa aún no está disponible.',
              notFound: 'El API todavía no expone la vista previa (despliegue pendiente).',
            })}
          </p>
        ) : p ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Cifra
                label="Cumplen el segmento"
                value={n(cumplen)}
                detail={recortado ? `evaluados hoy: ${n(p.eligible)} (tope de la vista previa)` : undefined}
              />
              <Cifra
                label="Saldrían hoy"
                value={n(p.wouldSend)}
                detail={`${pct(ratio(p.wouldSend, p.eligible))} de los evaluados`}
              />
              <Cifra
                label="Grupo de control"
                value={n(p.control)}
                detail={`${pct(ratio(p.control, p.eligible))} de los evaluados; no reciben, sirven de comparación`}
              />
              <Cifra
                label="Omitidos por candados"
                value={n(omitidos)}
                detail={`${pct(ratio(omitidos, p.eligible))} de los evaluados`}
              />
            </div>

            {motivosOrdenados(p.byReason).length > 0 && (
              <div className="grid gap-1.5">
                <h3 className="text-sm font-semibold">Por qué se omiten</h3>
                <ul className="grid gap-1 text-sm sm:grid-cols-2">
                  {motivosOrdenados(p.byReason).map((m) => (
                    <li key={m.id} className="flex items-baseline justify-between gap-3 rounded-md border px-3 py-1.5">
                      <span>{m.etiqueta}</span>
                      <span className="font-semibold tabular-nums">{n(m.n)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-1.5">
              <h3 className="text-sm font-semibold">
                Muestra{' '}
                <span className="font-normal text-muted-foreground">
                  ({p.sample.length} de {n(p.eligible)} evaluados; contiene datos personales, solo para
                  verificar)
                </span>
              </h3>
              {p.sample.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin personas en la muestra.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Sucursal</TableHead>
                        <TableHead className="text-right">Puntos</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="tabular-nums">
                      {p.sample.map((s, i) => (
                        <TableRow key={`${s.customerNumber}-${i}`}>
                          <TableCell className="font-mono text-xs">{s.customerNumber || '—'}</TableCell>
                          <TableCell>{s.firstName || '—'}</TableCell>
                          <TableCell className="whitespace-normal">{s.branch || '—'}</TableCell>
                          <TableCell className="text-right">{n(s.points)}</TableCell>
                          <TableCell className="text-xs">
                            {s.reason ? (
                              <span className="text-muted-foreground">{etiquetaMotivo(s.reason)}</span>
                            ) : (
                              <span className="font-medium text-emerald-700 dark:text-emerald-400">Saldría</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
