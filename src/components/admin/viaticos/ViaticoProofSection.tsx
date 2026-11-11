'use client';

// ViaticoProofSection - Resumen de la comprobación dentro del detalle de una
// solicitud aprobada, con el acceso a la PANTALLA de comprobación
// (/admin/viaticos/[id]/comprobacion), donde se suben los recibos y facturas de
// cada gasto, se captura lo gastado y Contabilidad valida o regresa.
//
// Hasta el 10-nov-2026 todo eso vivía aquí, en un recuadro del detalle con los
// comprobantes de la solicitud completa; con los comprobantes por gasto
// (mig 199) necesita una pantalla propia.

import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { money } from './ViaticoDayGrid';
import { BalanceNote, fmtDateTime } from './ViaticoProofWorkspace';
import type { Viatico } from '@/types/viaticos';

export function ViaticoProofSection({ viatico: v, canApprove }: { viatico: Viatico; canApprove: boolean }) {
  const mayProve = v.isMine && v.status === 'approved';
  const mayReview = canApprove && !v.isMine && v.status === 'proof_submitted';
  const submitted = v.status === 'proof_submitted' || v.status === 'verified';
  const returned = v.status === 'approved' && !!v.proofReviewNotes && !!v.proofReviewedAt;

  const files = v.files ?? [];
  const proofFiles = files.filter((f) => f.kind === 'receipt' || f.kind === 'invoice').length;
  const items = v.items ?? [];
  const withProof = new Set(files.filter((f) => f.itemId && f.kind !== 'refund').map((f) => f.itemId)).size;

  const action = mayProve
    ? proofFiles > 0
      ? 'Continuar comprobación'
      : 'Subir comprobantes'
    : mayReview
      ? 'Revisar comprobación'
      : 'Ver comprobación';

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Comprobación</h3>
          <p className="text-xs text-muted-foreground">
            Autorizado: <span className="font-semibold tabular-nums text-foreground">{money(v.approvedAmount ?? 0)}</span>
            {' · '}
            {proofFiles === 0
              ? 'sin comprobantes'
              : `${proofFiles} ${proofFiles === 1 ? 'comprobante' : 'comprobantes'}`}
            {items.length > 0 && withProof > 0 ? ` · ${withProof} de ${items.length} gastos con comprobante` : ''}
          </p>
        </div>
        <Button asChild variant={mayProve || mayReview ? 'default' : 'outline'} size="sm">
          <Link href={`/admin/viaticos/${v.id}/comprobacion`}>{action}</Link>
        </Button>
      </div>

      {returned && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertDescription>
            Contabilidad regresó la comprobación para corrección ({fmtDateTime(v.proofReviewedAt)}
            {v.proofReviewedByName ? `, ${v.proofReviewedByName}` : ''}): <strong>{v.proofReviewNotes}</strong>
          </AlertDescription>
        </Alert>
      )}

      {v.status === 'approved' && !returned && (
        <p className="text-sm text-muted-foreground">
          {v.isMine
            ? 'Sube los recibos y facturas de cada gasto y captura lo que gastaste para cerrar esta solicitud.'
            : 'El solicitante aún no envía su comprobación.'}
        </p>
      )}

      {submitted && (
        <div className="space-y-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Comprobado</p>
              <p className="text-base font-semibold tabular-nums text-foreground">{money(v.proofTotal ?? 0)}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {(v.proofBalance ?? 0) < 0 ? 'Gastó de más' : 'Sobrante'}
              </p>
              <p className="text-base font-semibold tabular-nums text-foreground">
                {money(Math.abs(v.proofBalance ?? 0))}
              </p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Comprobada el</p>
              <p className="text-sm font-medium text-foreground">{fmtDateTime(v.proofSubmittedAt)}</p>
            </div>
          </div>
          {v.proofBalance != null && <BalanceNote balance={v.proofBalance} mine={v.isMine} />}
          {v.status === 'verified' && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Validada{v.proofReviewedByName ? ` por ${v.proofReviewedByName}` : ''} · {fmtDateTime(v.proofReviewedAt)}
              {v.proofReviewNotes ? ` — ${v.proofReviewNotes}` : ''}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
