'use client';

// AmbiguousStampCard — salida operativa de un timbrado AMBIGUO (V2-L3).
//
// El API deja la factura en `stamping` cuando el PAC PUDO haber timbrado pero
// no se pudo confirmar que el CFDI encontrado sea el de esta factura. Con
// `actions.canResolveAmbiguous` el detalle trae `ambiguity.candidates`
// (best-effort, leídos de la auditoría; nunca se consulta al PAC al cargar).
//
// Solo `super_admin` resuelve (`POST /billing/invoices/:id/resolve-ambiguous`):
//   - adoptar un candidato (el API valida RFC + total + no cancelado), o
//   - marcar la fila como NO timbrada (pasa a error: se reintenta o se desecha).
// El resto ve la misma tarjeta en solo lectura.

import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useResolveAmbiguousInvoice } from '@/hooks/useBilling';
import { formatCurrency, type AmbiguityCandidate, type InvoiceDetail } from '@/types/billing';

const ADOPT_CONFIRM_TEXT = 'ADOPTAR';
const NOT_STAMPED_CONFIRM_TEXT = 'NO TIMBRADA';

/** La fecha viene tal cual del PAC: si es ISO se muestra legible SIN pasar por Date (no se corre de día). */
function formatCandidateDate(date: string | null): string {
  if (!date) return 'Sin fecha';
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(date);
  if (!match) return date;
  const [, y, m, d, time] = match;
  return time ? `${d}/${m}/${y} ${time}` : `${d}/${m}/${y}`;
}

interface AmbiguousStampCardProps {
  invoice: InvoiceDetail;
  /** `super_admin`: único rol al que el API deja resolver. */
  canResolve: boolean;
}

export function AmbiguousStampCard({ invoice, canResolve }: AmbiguousStampCardProps) {
  const resolve = useResolveAmbiguousInvoice();
  const [adoptTarget, setAdoptTarget] = useState<AmbiguityCandidate | null>(null);
  const [notStampedOpen, setNotStampedOpen] = useState(false);

  const candidates = invoice.ambiguity?.candidates ?? [];

  const adoptNow = async () => {
    if (!adoptTarget) return;
    try {
      await resolve.mutateAsync({ id: invoice.id, data: { action: 'adopt', uuid: adoptTarget.uuid } });
      setAdoptTarget(null);
    } catch {
      // El hook ya avisó.
    }
  };

  const markNotStampedNow = async () => {
    try {
      await resolve.mutateAsync({
        id: invoice.id,
        data: { action: 'mark_not_stamped', confirmation: NOT_STAMPED_CONFIRM_TEXT },
      });
      setNotStampedOpen(false);
    } catch {
      // El hook ya avisó.
    }
  };

  return (
    <>
      <Card className="border-amber-300 bg-amber-50" role="alert" aria-labelledby="ambiguous-stamp-title">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 text-amber-600" aria-hidden />
            <div className="min-w-0 flex-1 text-sm text-amber-900">
              <h3 id="ambiguous-stamp-title" className="font-semibold text-amber-950">
                Timbrado sin confirmar
              </h3>
              <p className="mt-1">
                Es posible que el PAC (Facturama) sí haya timbrado esta factura, pero el sistema no pudo confirmarlo.
                Para no timbrarla dos veces, quedó detenida hasta que alguien revise y decida.
              </p>
              <p className="mt-1">
                {candidates.length > 0
                  ? 'Estos son los CFDI que aparecen en el PAC y que podrían ser el de esta factura. Compáralos con el portal del PAC antes de decidir:'
                  : 'No se guardó el detalle de los CFDI sospechosos. Revisa en el portal del PAC si existe un CFDI para este receptor y total antes de decidir.'}
              </p>

              <dl className="mt-3 grid gap-x-6 gap-y-1 rounded-md border border-amber-200 bg-white/60 p-3 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-amber-800">RFC del receptor (esta factura)</dt>
                  <dd className="font-mono font-medium">{invoice.receiver.rfc || '—'}</dd>
                </div>
                <div>
                  <dt className="text-amber-800">Total (esta factura)</dt>
                  <dd className="font-medium">{formatCurrency(invoice.total)}</dd>
                </div>
                <div>
                  <dt className="text-amber-800">Folio interno</dt>
                  <dd className="font-medium">{invoice.folioDisplay}</dd>
                </div>
              </dl>

              {candidates.length > 0 && (
                <ul className="mt-3 space-y-2" aria-label="CFDI candidatos en el PAC">
                  {candidates.map((c) => (
                    <li
                      key={c.uuid}
                      className="flex flex-col gap-3 rounded-md border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                        <div className="sm:col-span-3">
                          <dt className="text-gray-500">Folio fiscal (UUID)</dt>
                          <dd className="break-all font-mono text-sm font-medium text-gray-900">{c.uuid}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Fecha en el PAC</dt>
                          <dd className="font-medium text-gray-900">{formatCandidateDate(c.date)}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Total</dt>
                          <dd className="font-medium text-gray-900">
                            {c.total !== null ? formatCurrency(c.total) : 'Sin dato'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">RFC del receptor</dt>
                          <dd className="font-mono font-medium text-gray-900">{c.rfcMasked ?? 'Sin dato'}</dd>
                        </div>
                        {c.orderNumber && (
                          <div className="sm:col-span-3">
                            <dt className="text-gray-500">Referencia en el PAC</dt>
                            <dd className="break-all font-mono text-gray-900">{c.orderNumber}</dd>
                          </div>
                        )}
                      </dl>
                      {canResolve && (
                        <Button
                          size="sm"
                          className="flex-shrink-0"
                          onClick={() => setAdoptTarget(c)}
                          disabled={resolve.isPending}
                          aria-label={`Es este CFDI: adoptarlo (UUID ${c.uuid})`}
                        >
                          Es este CFDI: adoptarlo
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canResolve ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-amber-200 pt-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setNotStampedOpen(true)}
                    disabled={resolve.isPending}
                  >
                    No se timbró: marcar como no timbrada
                  </Button>
                  <p className="text-xs text-amber-800">
                    Úsalo solo si ya verificaste en el PAC que ninguno de estos CFDI es el de esta factura.
                  </p>
                </div>
              ) : (
                <p className="mt-4 border-t border-amber-200 pt-3 font-medium">Pide a Sistemas que lo resuelva.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={adoptTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAdoptTarget(null);
        }}
        title="Adoptar este CFDI"
        description="La factura quedará timbrada con este folio fiscal. No se timbra nada nuevo en el PAC."
        confirmLabel="Adoptar CFDI"
        confirmText={ADOPT_CONFIRM_TEXT}
        isPending={resolve.isPending}
        onConfirm={adoptNow}
      >
        {adoptTarget && (
          <div className="space-y-2">
            <p>
              Vas a registrar el CFDI <span className="break-all font-mono font-semibold">{adoptTarget.uuid}</span> como
              el timbre de la factura <strong>{invoice.folioDisplay}</strong>.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-gray-600">
              <li>
                Fecha en el PAC: {formatCandidateDate(adoptTarget.date)} · Total:{' '}
                {adoptTarget.total !== null ? formatCurrency(adoptTarget.total) : 'sin dato'} · RFC:{' '}
                {adoptTarget.rfcMasked ?? 'sin dato'}
              </li>
              <li>
                El sistema vuelve a verificar en el PAC que el RFC y el total coincidan y que el CFDI no esté cancelado;
                si no coincide, lo rechaza.
              </li>
              <li>Se descargan el PDF y el XML, y se envía el correo al cliente como en un timbrado normal.</li>
              <li>Queda registrado en la auditoría con tu usuario.</li>
            </ul>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={notStampedOpen}
        onOpenChange={setNotStampedOpen}
        title="Marcar como no timbrada"
        description="Confirma que esta factura NO se timbró en el PAC."
        confirmLabel="Marcar como no timbrada"
        confirmText={NOT_STAMPED_CONFIRM_TEXT}
        destructive
        isPending={resolve.isPending}
        onConfirm={markNotStampedNow}
      >
        <div className="space-y-2">
          <p>
            La factura <strong>{invoice.folioDisplay}</strong> pasará a estado de error y se podrá volver a timbrar o
            desechar.
          </p>
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            Si alguno de los CFDI del PAC sí era el de esta factura, al reintentar se timbrará <strong>dos veces</strong>{' '}
            y habrá que cancelar uno ante el SAT. Verifica primero en el portal del PAC.
          </p>
          <p className="text-xs text-gray-600">Queda registrado en la auditoría con tu usuario.</p>
        </div>
      </ConfirmDialog>
    </>
  );
}
