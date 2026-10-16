'use client';

// ViaticoProofSection - Comprobación de una solicitud aprobada (mig 158).
//
// - Solicitante (aprobada o regresada): sube sus comprobantes (fotos de
//   tickets, PDF, XML, ZIP/RAR como en el sistema anterior) y, si le sobró
//   dinero, la ficha del depósito de devolución; captura el total comprobado
//   y envía → "Comprobada". Resto = autorizado − comprobado, en vivo.
// - Contabilidad (comprobada, no la propia): valida o regresa con motivo.
// - Quien la ve: resumen de lo comprobado, resto, revisión y archivos.
//
// Vive dentro del detalle (keyed por solicitud): el estado local arranca con
// los datos de la solicitud y las mutaciones actualizan el detalle en caché.

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  ArchiveBoxIcon,
  ArrowUpTrayIcon,
  CodeBracketIcon,
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useDeleteViaticoFile,
  useReturnViaticoProof,
  useSubmitViaticoProof,
  useUploadViaticoFiles,
  useVerifyViaticoProof,
  useViaticoConcepts,
} from '@/hooks/useViaticos';
import { viaticosService } from '@/services/viaticos.service';
import { money, sanitizeAmount } from './ViaticoDayGrid';
import type { Viatico, ViaticoFile, ViaticoFileKind } from '@/types/viaticos';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PER_UPLOAD = 10;
const ACCEPT =
  'image/*,.heic,.pdf,.xml,.xlsx,.zip,.rar,application/pdf,application/xml,text/xml,application/zip';

const round2 = (n: number) => Math.round(n * 100) / 100;

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

function errorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string | string[] } } };
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join(' · ');
  return m || fallback;
}

function FileIcon({ mime }: { mime: string }) {
  const cls = 'h-5 w-5 shrink-0 text-muted-foreground';
  if (mime.startsWith('image/')) return <PhotoIcon className={cls} />;
  if (mime === 'application/pdf') return <DocumentTextIcon className={cls} />;
  if (mime.includes('xml')) return <CodeBracketIcon className={cls} />;
  if (mime.includes('zip') || mime.includes('rar')) return <ArchiveBoxIcon className={cls} />;
  return <DocumentIcon className={cls} />;
}

/** Mensaje del resto: + sobró (se devuelve), − gastó de más, 0 exacto. */
function BalanceNote({ balance, mine }: { balance: number; mine: boolean }) {
  if (balance > 0) {
    return (
      <p className="text-sm text-amber-700">
        {mine ? 'Te sobran' : 'Le sobraron'} <strong className="tabular-nums">{money(balance)}</strong>:{' '}
        {mine
          ? 'deposítalos a la cuenta de la empresa y sube la ficha de devolución.'
          : 'debe devolverlos (ficha de devolución).'}
      </p>
    );
  }
  if (balance < 0) {
    return (
      <p className="text-sm text-red-700">
        {mine ? 'Comprobaste' : 'Comprobó'} <strong className="tabular-nums">{money(-balance)}</strong> más de lo
        autorizado. Contabilidad decide si se reembolsa.
      </p>
    );
  }
  return <p className="text-sm text-emerald-700">Comprobado exactamente lo autorizado.</p>;
}

function FileList({
  files,
  onView,
  onDelete,
  busyId,
}: {
  files: ViaticoFile[];
  onView: (f: ViaticoFile) => void;
  onDelete?: (f: ViaticoFile) => void;
  busyId?: string | null;
}) {
  if (files.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {files.map((f) => (
        <li key={f.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileIcon mime={f.mimeType} />
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground" title={f.fileName}>
                {f.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {fmtSize(f.sizeBytes)} · {fmtDateTime(f.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onView(f)}>
              Ver
            </Button>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar ${f.fileName}`}
                disabled={busyId === f.id}
                onClick={() => onDelete(f)}
              >
                {busyId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ViaticoProofSection({ viatico: v, canApprove }: { viatico: Viatico; canApprove: boolean }) {
  const catalog = useViaticoConcepts();
  const proofEnabled = catalog.data?.proofEnabled ?? false;
  const editable = v.isMine && v.status === 'approved';
  const reviewable = canApprove && !v.isMine && v.status === 'proof_submitted';

  const [total, setTotal] = useState(v.proofTotal != null ? String(v.proofTotal) : '');
  const [notes, setNotes] = useState(v.proofNotes ?? '');
  const [reviewMode, setReviewMode] = useState<'none' | 'verify' | 'return'>('none');
  const [reviewText, setReviewText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const receiptInput = useRef<HTMLInputElement>(null);
  const refundInput = useRef<HTMLInputElement>(null);

  const upload = useUploadViaticoFiles();
  const remove = useDeleteViaticoFile();
  const submit = useSubmitViaticoProof();
  const verify = useVerifyViaticoProof();
  const giveBack = useReturnViaticoProof();

  const files = v.files ?? [];
  const receipts = files.filter((f) => f.kind === 'receipt');
  const refunds = files.filter((f) => f.kind === 'refund');
  const authorized = v.approvedAmount ?? 0;
  const typedTotal = total.trim() === '' ? null : Number(total);
  const balance = editable
    ? typedTotal != null && Number.isFinite(typedTotal)
      ? round2(authorized - typedTotal)
      : null
    : (v.proofBalance ?? null);
  const returned = v.status === 'approved' && !!v.proofReviewNotes && !!v.proofReviewedAt;

  const pickFiles = async (kind: ViaticoFileKind, list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (picked.length === 0) return;
    if (picked.length > MAX_PER_UPLOAD) {
      toast.error(`Sube a lo más ${MAX_PER_UPLOAD} archivos a la vez.`);
      return;
    }
    const big = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (big) {
      toast.error(`"${big.name}" pesa más de 20 MB.`);
      return;
    }
    try {
      await upload.mutateAsync({ id: v.id, kind, files: picked });
      toast.success(picked.length === 1 ? 'Archivo subido' : `${picked.length} archivos subidos`);
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudieron subir los archivos.'));
    }
  };

  const viewFile = async (f: ViaticoFile) => {
    // Se abre la pestaña dentro del clic (si no, el navegador la bloquea) y
    // se le pone la URL firmada en cuanto llega.
    const tab = window.open('about:blank', '_blank');
    try {
      const { url } = await viaticosService.getFileUrl(v.id, f.id);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (e) {
      tab?.close();
      toast.error(errorMessage(e, 'No se pudo abrir el archivo.'));
    }
  };

  const deleteFile = async (f: ViaticoFile) => {
    if (!window.confirm(`¿Quitar "${f.fileName}"?`)) return;
    setDeletingId(f.id);
    try {
      await remove.mutateAsync({ id: v.id, fileId: f.id });
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo quitar el archivo.'));
    } finally {
      setDeletingId(null);
    }
  };

  const sendProof = async () => {
    if (receipts.length === 0) {
      toast.error('Sube al menos un comprobante (ticket, factura o ZIP).');
      return;
    }
    if (typedTotal == null || !Number.isFinite(typedTotal) || typedTotal < 0) {
      toast.error('Captura el total comprobado.');
      return;
    }
    if (
      balance != null &&
      balance > 0 &&
      refunds.length === 0 &&
      !window.confirm(`Te sobran ${money(balance)} y no subiste la ficha de devolución. ¿Enviar de todos modos?`)
    ) {
      return;
    }
    try {
      await submit.mutateAsync({ id: v.id, dto: { proofTotal: typedTotal, notes: notes.trim() || undefined } });
      toast.success(`Comprobación de ${v.folio} enviada`);
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo enviar la comprobación.'));
    }
  };

  const confirmReview = async () => {
    try {
      if (reviewMode === 'verify') {
        await verify.mutateAsync({ id: v.id, notes: reviewText.trim() || undefined });
        toast.success(`Comprobación de ${v.folio} validada`);
      } else {
        if (reviewText.trim().length < 3) {
          toast.error('Escribe qué debe corregir.');
          return;
        }
        await giveBack.mutateAsync({ id: v.id, reason: reviewText.trim() });
        toast.success(`Comprobación de ${v.folio} regresada para corrección`);
      }
      setReviewMode('none');
      setReviewText('');
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo guardar la revisión.'));
    }
  };

  const uploadButton = (kind: ViaticoFileKind, ref: React.RefObject<HTMLInputElement | null>, label: string) => (
    <>
      <input
        ref={ref}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void pickFiles(kind, e.target.files);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={upload.isPending}
        onClick={() => ref.current?.click()}
      >
        {upload.isPending && upload.variables?.kind === kind ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
        )}
        {label}
      </Button>
    </>
  );

  return (
    <section className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Comprobación</h3>
        <p className="text-xs text-muted-foreground">
          Autorizado: <span className="font-semibold tabular-nums text-foreground">{money(authorized)}</span>
        </p>
      </div>

      {returned && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertDescription>
            Contabilidad regresó la comprobación para corrección ({fmtDateTime(v.proofReviewedAt)}
            {v.proofReviewedByName ? `, ${v.proofReviewedByName}` : ''}): <strong>{v.proofReviewNotes}</strong>
          </AlertDescription>
        </Alert>
      )}

      {editable && !proofEnabled && (
        <Alert>
          <AlertDescription>
            La comprobación se activa cuando Sistemas aplique la migración 158. Mientras tanto no se pueden subir
            comprobantes.
          </AlertDescription>
        </Alert>
      )}

      {editable && proofEnabled && (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">Comprobantes *</p>
                <p className="text-xs text-muted-foreground">
                  Fotos de tickets, facturas PDF/XML o un ZIP/RAR con todo (hasta 20 MB c/u).
                </p>
              </div>
              {uploadButton('receipt', receiptInput, 'Subir comprobantes')}
            </div>
            <FileList files={receipts} onView={viewFile} onDelete={deleteFile} busyId={deletingId} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="via-proof-total">Total comprobado (MXN) *</Label>
              <Input
                id="via-proof-total"
                inputMode="decimal"
                value={total}
                onChange={(e) => setTotal(sanitizeAmount(e.target.value))}
                placeholder="Suma de tus tickets y facturas"
                className="mt-1.5"
              />
            </div>
            <div className="flex items-end">
              {balance != null && (
                <div className="w-full rounded-md bg-muted/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Resto (autorizado − comprobado)</p>
                  <p className="text-lg font-bold tabular-nums text-foreground">{money(balance)}</p>
                </div>
              )}
            </div>
          </div>
          {balance != null && <BalanceNote balance={balance} mine />}

          {(balance == null || balance > 0 || refunds.length > 0) && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Ficha de devolución</p>
                  <p className="text-xs text-muted-foreground">Si te sobró dinero: foto o PDF del depósito.</p>
                </div>
                {uploadButton('refund', refundInput, 'Subir ficha')}
              </div>
              <FileList files={refunds} onView={viewFile} onDelete={deleteFile} busyId={deletingId} />
            </div>
          )}

          <div>
            <Label htmlFor="via-proof-notes">Notas para Contabilidad (opcional)</Label>
            <Textarea
              id="via-proof-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              className="mt-1.5"
            />
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={sendProof} disabled={submit.isPending || upload.isPending}>
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar comprobación
            </Button>
          </div>
        </>
      )}

      {!editable && v.status === 'approved' && !returned && (
        <p className="text-sm text-muted-foreground">
          {v.isMine ? 'Sube tus comprobantes para cerrar esta solicitud.' : 'El solicitante aún no sube su comprobación.'}
        </p>
      )}

      {(v.status === 'proof_submitted' || v.status === 'verified') && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Comprobado</p>
              <p className="text-base font-semibold tabular-nums text-foreground">{money(v.proofTotal ?? 0)}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Resto</p>
              <p className="text-base font-semibold tabular-nums text-foreground">{money(v.proofBalance ?? 0)}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Comprobada el</p>
              <p className="text-sm font-medium text-foreground">{fmtDateTime(v.proofSubmittedAt)}</p>
            </div>
          </div>
          {v.proofBalance != null && <BalanceNote balance={v.proofBalance} mine={v.isMine} />}
          {v.proofNotes && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Notas del solicitante:</span> {v.proofNotes}
            </p>
          )}
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Comprobantes ({receipts.length})
            </p>
            <FileList files={receipts} onView={viewFile} />
          </div>
          {refunds.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ficha de devolución</p>
              <FileList files={refunds} onView={viewFile} />
            </div>
          )}
          {v.status === 'verified' && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Validada{v.proofReviewedByName ? ` por ${v.proofReviewedByName}` : ''} · {fmtDateTime(v.proofReviewedAt)}
              {v.proofReviewNotes ? ` — ${v.proofReviewNotes}` : ''}
            </div>
          )}
        </div>
      )}

      {reviewable && (
        <div className="space-y-3 border-t border-border pt-3">
          {reviewMode !== 'none' && (
            <div>
              <Label htmlFor="via-proof-review">
                {reviewMode === 'verify' ? 'Comentario (opcional)' : 'Qué debe corregir *'}
              </Label>
              <Textarea
                id="via-proof-review"
                rows={2}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={reviewMode === 'return' ? 'El solicitante verá este motivo' : undefined}
                className="mt-1.5"
              />
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {reviewMode === 'none' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setReviewMode('return')}
                >
                  Regresar para corrección
                </Button>
                <Button type="button" onClick={() => setReviewMode('verify')}>
                  Validar comprobación
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewMode('none')}
                  disabled={verify.isPending || giveBack.isPending}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  variant={reviewMode === 'return' ? 'destructive' : 'default'}
                  onClick={confirmReview}
                  disabled={verify.isPending || giveBack.isPending}
                >
                  {(verify.isPending || giveBack.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {reviewMode === 'verify' ? 'Confirmar validación' : 'Confirmar regreso'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
