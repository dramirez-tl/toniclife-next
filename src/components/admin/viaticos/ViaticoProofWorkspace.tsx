'use client';

// ViaticoProofWorkspace - Pantalla de comprobación de una solicitud aprobada.
//
// Funciona como una CAJA CHICA: lo autorizado es el fondo; cada gasto de la
// solicitud (concepto + día) lleva lo que de verdad se gastó (captura manual)
// con sus RECIBOS (fotos del ticket, PDF de una aclaración) y sus FACTURAS (PDF
// y, si lo hay, el XML), uno o varios archivos de cada uno. Arriba se ve en
// vivo Autorizado − Gastado = Sobrante (se devuelve con ficha) o lo gastado de más.
//
// - Solicitante (aprobada o regresada): captura, sube y envía → "Comprobada".
//   Lo gastado se guarda al salir de cada campo: se puede armar por partes.
// - Contabilidad (comprobada, no la propia): revisa gasto por gasto y valida o
//   regresa con motivo.
// - Lo que no cabe en un gasto (una factura que ampara varios, gastos no
//   previstos) va en "Otros comprobantes".
// - Sin la mig 199, o en solicitudes sin detalle por día, queda el flujo
//   anterior: comprobantes generales y el total tecleado.

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  ArchiveBoxIcon,
  ArrowUpTrayIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useDeleteViaticoFile,
  useReturnViaticoProof,
  useSaveViaticoItemProofs,
  useSubmitViaticoProof,
  useUploadViaticoFiles,
  useVerifyViaticoProof,
  useViaticoConcepts,
} from '@/hooks/useViaticos';
import { viaticosService } from '@/services/viaticos.service';
import { dayHeader } from '@/lib/viaticos-week';
import {
  filesOfItem,
  generalFiles,
  groupItemsByDay,
  parseAmount,
  proofTotals,
  round2,
  submitWarnings,
  type ProofItem,
} from '@/lib/viaticos-proof';
import { money, sanitizeAmount } from './ViaticoDayGrid';
import type { Viatico, ViaticoFile, ViaticoFileKind } from '@/types/viaticos';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PER_UPLOAD = 10;
const ACCEPT_ANY =
  'image/*,.heic,.pdf,.xml,.xlsx,.zip,.rar,application/pdf,application/xml,text/xml,application/zip';
const ACCEPT_RECEIPT = 'image/*,.heic,.pdf,application/pdf';
const ACCEPT_INVOICE = '.pdf,.xml,application/pdf,application/xml,text/xml,image/*';

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const fmtDateTime = (iso: string | null | undefined) =>
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
  const cls = 'h-4 w-4 shrink-0 text-muted-foreground';
  if (mime.startsWith('image/')) return <PhotoIcon className={cls} />;
  if (mime === 'application/pdf') return <DocumentTextIcon className={cls} />;
  if (mime.includes('xml')) return <CodeBracketIcon className={cls} />;
  if (mime.includes('zip') || mime.includes('rar')) return <ArchiveBoxIcon className={cls} />;
  return <DocumentIcon className={cls} />;
}

/** Mensaje del resto: + sobró (se devuelve), − gastó de más, 0 exacto. */
export function BalanceNote({ balance, mine }: { balance: number; mine: boolean }) {
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
        {mine ? 'Gastaste' : 'Gastó'} <strong className="tabular-nums">{money(-balance)}</strong> más de lo
        autorizado. Contabilidad decide si se reembolsa.
      </p>
    );
  }
  return <p className="text-sm text-emerald-700">Comprobado exactamente lo autorizado.</p>;
}

/**
 * Caja de archivos de un tipo: lista, botón para agregar y zona para soltar.
 * En solo lectura muestra la lista (o un guion si no hay).
 */
function FilesBox({
  label,
  hint,
  files,
  accept,
  editable,
  busy,
  deletingId,
  onPick,
  onView,
  onDelete,
}: {
  label: string;
  hint?: string;
  files: ViaticoFile[];
  accept: string;
  editable: boolean;
  busy: boolean;
  deletingId: string | null;
  onPick: (files: File[]) => void;
  onView: (f: ViaticoFile) => void;
  onDelete: (f: ViaticoFile) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`rounded-md border p-2 transition-colors ${
        over ? 'border-primary bg-primary/5' : 'border-dashed border-border'
      } ${editable ? '' : 'border-solid'}`}
      onDragOver={
        editable
          ? (e) => {
              e.preventDefault();
              setOver(true);
            }
          : undefined
      }
      onDragLeave={editable ? () => setOver(false) : undefined}
      onDrop={
        editable
          ? (e) => {
              e.preventDefault();
              setOver(false);
              onPick(Array.from(e.dataTransfer.files ?? []));
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          {label}
          {files.length > 0 && <span className="ml-1 text-muted-foreground">({files.length})</span>}
        </p>
        {editable && (
          <>
            <input
              ref={input}
              type="file"
              multiple
              accept={accept}
              className="hidden"
              onChange={(e) => {
                onPick(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {busy ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUpTrayIcon className="mr-1 h-3.5 w-3.5" />
              )}
              Agregar
            </Button>
          </>
        )}
      </div>
      {files.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">{editable ? (hint ?? 'Suelta aquí los archivos') : '—'}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1">
              <FileIcon mime={f.mimeType} />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-xs text-foreground hover:underline"
                title={`${f.fileName} · ${fmtSize(f.sizeBytes)} · ${fmtDateTime(f.createdAt)}`}
                onClick={() => onView(f)}
              >
                {f.fileName}
              </button>
              {editable && (
                <button
                  type="button"
                  aria-label={`Quitar ${f.fileName}`}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-red-700 disabled:opacity-50"
                  disabled={deletingId === f.id}
                  onClick={() => onDelete(f)}
                >
                  {deletingId === f.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XMarkIcon className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'red' | 'emerald' }) {
  const color =
    tone === 'amber'
      ? 'text-amber-700'
      : tone === 'red'
        ? 'text-red-700'
        : tone === 'emerald'
          ? 'text-emerald-700'
          : 'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

export function ViaticoProofWorkspace({ viatico: v, canApprove }: { viatico: Viatico; canApprove: boolean }) {
  const catalog = useViaticoConcepts();
  const proofEnabled = catalog.data?.proofEnabled ?? false;
  const itemProofEnabled = catalog.data?.itemProofEnabled ?? false;
  const editable = v.isMine && v.status === 'approved';
  const reviewable = canApprove && !v.isMine && v.status === 'proof_submitted';
  const submitted = v.status === 'proof_submitted' || v.status === 'verified';

  const files = useMemo(() => v.files ?? [], [v.files]);
  const days = useMemo(() => groupItemsByDay(v.items ?? []), [v.items]);
  const items = useMemo(() => days.flatMap((d) => d.items), [days]);
  // Por gasto: BD con mig 199 y solicitud con detalle por día.
  const perItem = itemProofEnabled && items.length > 0;
  const authorized = v.approvedAmount ?? 0;
  const refunds = files.filter((f) => f.kind === 'refund');
  const generalReceipts = generalFiles(files, 'receipt');
  const generalInvoices = generalFiles(files, 'invoice');
  const returned = v.status === 'approved' && !!v.proofReviewNotes && !!v.proofReviewedAt;

  // Lo tecleado (texto) por gasto; arranca con lo guardado.
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((it) => [it.id, it.spentAmount != null ? String(it.spentAmount) : ''])),
  );
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((it) => [it.id, it.proofNote ?? ''])),
  );
  const [openNotes, setOpenNotes] = useState<Set<string>>(
    () => new Set(items.filter((it) => !!it.proofNote).map((it) => it.id)),
  );
  const [extra, setExtra] = useState(v.proofExtraAmount != null ? String(v.proofExtraAmount) : '');
  const [typedTotal, setTypedTotal] = useState(v.proofTotal != null ? String(v.proofTotal) : '');
  const [notes, setNotes] = useState(v.proofNotes ?? '');
  const [reviewMode, setReviewMode] = useState<'none' | 'verify' | 'return'>('none');
  const [reviewText, setReviewText] = useState('');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const upload = useUploadViaticoFiles();
  const remove = useDeleteViaticoFile();
  const saveProofs = useSaveViaticoItemProofs();
  const submit = useSubmitViaticoProof();
  const verify = useVerifyViaticoProof();
  const giveBack = useReturnViaticoProof();

  const totals = useMemo(
    () =>
      proofTotals({
        authorized,
        items,
        files,
        spentOf: (it) => (editable ? parseAmount(amounts[it.id]) : (it.spentAmount ?? null)),
        extra: editable ? parseAmount(extra) : (v.proofExtraAmount ?? null),
      }),
    [authorized, items, files, editable, amounts, extra, v.proofExtraAmount],
  );

  // Lo que se muestra arriba: en vivo al capturar; lo enviado después.
  const legacyTotal = parseAmount(typedTotal);
  const shownTotal = submitted ? (v.proofTotal ?? 0) : perItem ? totals.total : (legacyTotal ?? 0);
  const shownBalance = submitted
    ? (v.proofBalance ?? 0)
    : perItem
      ? totals.balance
      : legacyTotal != null
        ? round2(authorized - legacyTotal)
        : null;

  // El solicitante va a media captura: aún hay gastos sin lo gastado.
  const capturing = editable && perItem && totals.itemsWithoutAmount > 0;

  // ---- Archivos -------------------------------------------------------------

  const pick = async (kind: ViaticoFileKind, itemId: string | undefined, picked: File[]) => {
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
    setUploadingKey(`${itemId ?? 'general'}:${kind}`);
    try {
      await upload.mutateAsync({ id: v.id, kind, files: picked, itemId });
      toast.success(picked.length === 1 ? 'Archivo subido' : `${picked.length} archivos subidos`);
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudieron subir los archivos.'));
    } finally {
      setUploadingKey(null);
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

  const box = (label: string, kind: ViaticoFileKind, list: ViaticoFile[], accept: string, itemId?: string, hint?: string) => (
    <FilesBox
      label={label}
      hint={hint}
      files={list}
      accept={accept}
      editable={editable}
      busy={uploadingKey === `${itemId ?? 'general'}:${kind}`}
      deletingId={deletingId}
      onPick={(picked) => void pick(kind, itemId, picked)}
      onView={(f) => void viewFile(f)}
      onDelete={(f) => void deleteFile(f)}
    />
  );

  // ---- Lo gastado por gasto ---------------------------------------------------

  const saveAmount = async (it: ProofItem, raw: string) => {
    const next = parseAmount(raw);
    if (next === (it.spentAmount ?? null)) return;
    try {
      await saveProofs.mutateAsync({ id: v.id, dto: { items: [{ itemId: it.id, spentAmount: next }] } });
    } catch (e) {
      toast.error(errorMessage(e, `No se guardó lo gastado en ${it.conceptLabel}.`));
    }
  };

  const saveNote = async (it: ProofItem, raw: string) => {
    const next = raw.trim() || null;
    if (next === (it.proofNote ?? null)) return;
    try {
      await saveProofs.mutateAsync({ id: v.id, dto: { items: [{ itemId: it.id, note: next }] } });
    } catch (e) {
      toast.error(errorMessage(e, 'No se guardó la aclaración.'));
    }
  };

  const saveExtra = async (raw: string) => {
    const next = parseAmount(raw);
    if (next === (v.proofExtraAmount ?? null)) return;
    try {
      await saveProofs.mutateAsync({ id: v.id, dto: { extraAmount: next } });
    } catch (e) {
      toast.error(errorMessage(e, 'No se guardaron los gastos no previstos.'));
    }
  };

  /** "Gasté lo solicitado" en un gasto. */
  const fillWithRequested = (it: ProofItem) => {
    const text = String(it.amount);
    setAmounts((a) => ({ ...a, [it.id]: text }));
    void saveAmount(it, text);
  };

  /** Llena con lo solicitado todos los gastos que siguen sin capturar. */
  const fillEmptyWithRequested = async () => {
    const empty = items.filter((it) => parseAmount(amounts[it.id]) == null);
    if (empty.length === 0) return;
    setAmounts((a) => ({ ...a, ...Object.fromEntries(empty.map((it) => [it.id, String(it.amount)])) }));
    try {
      await saveProofs.mutateAsync({
        id: v.id,
        dto: { items: empty.map((it) => ({ itemId: it.id, spentAmount: it.amount })) },
      });
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo guardar lo gastado.'));
    }
  };

  // ---- Enviar / revisar -------------------------------------------------------

  const sendProof = async () => {
    const proofFiles = files.filter((f) => f.kind === 'receipt' || f.kind === 'invoice').length;
    if (proofFiles === 0) {
      toast.error('Sube al menos un recibo o una factura.');
      return;
    }
    if (!perItem) {
      if (legacyTotal == null) {
        toast.error('Captura el total comprobado.');
        return;
      }
      const balance = round2(authorized - legacyTotal);
      if (
        balance > 0 &&
        refunds.length === 0 &&
        !window.confirm(`Te sobran ${money(balance)} y no subiste la ficha de devolución. ¿Enviar de todos modos?`)
      ) {
        return;
      }
    } else {
      const warnings = submitWarnings(totals, refunds.length, (n) => money(n));
      if (
        warnings.length > 0 &&
        !window.confirm(`Antes de enviar:\n\n• ${warnings.join('\n• ')}\n\n¿Enviar la comprobación de todos modos?`)
      ) {
        return;
      }
    }
    setSending(true);
    try {
      if (perItem) {
        // Se guarda TODO lo que está en pantalla antes de enviar: el total lo
        // calcula el API con lo guardado.
        await saveProofs.mutateAsync({
          id: v.id,
          dto: {
            items: items.map((it) => ({
              itemId: it.id,
              spentAmount: parseAmount(amounts[it.id]),
              note: (itemNotes[it.id] ?? '').trim() || null,
            })),
            extraAmount: parseAmount(extra),
          },
        });
      }
      await submit.mutateAsync({
        id: v.id,
        dto: perItem
          ? { notes: notes.trim() || undefined }
          : { proofTotal: legacyTotal ?? 0, notes: notes.trim() || undefined },
      });
      toast.success(`Comprobación de ${v.folio} enviada`);
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo enviar la comprobación.'));
    } finally {
      setSending(false);
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

  return (
    <div className="space-y-5">
      {/* Caja chica: fondo, gastado y sobrante, en vivo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Autorizado" value={money(authorized)} />
        <Stat label={submitted ? 'Comprobado' : 'Gastado'} value={money(shownTotal)} />
        <Stat
          label={shownBalance != null && shownBalance < 0 ? 'Gastó de más' : capturing ? 'Por comprobar' : 'Sobrante'}
          value={shownBalance == null ? '—' : money(Math.abs(shownBalance))}
          tone={
            shownBalance == null || capturing
              ? undefined
              : shownBalance > 0
                ? 'amber'
                : shownBalance < 0
                  ? 'red'
                  : 'emerald'
          }
        />
      </div>
      {capturing ? (
        // A media captura lo que falta no es sobrante todavía: no se anuncia devolución.
        <p className="text-sm text-muted-foreground">
          {totals.itemsWithoutAmount === 1
            ? 'Falta 1 gasto por capturar'
            : `Faltan ${totals.itemsWithoutAmount} gastos por capturar`}
          : el sobrante se calcula cuando captures lo gastado en todos.
        </p>
      ) : (
        shownBalance != null &&
        (perItem || submitted || legacyTotal != null) && <BalanceNote balance={shownBalance} mine={v.isMine} />
      )}

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

      {editable && proofEnabled && !itemProofEnabled && items.length > 0 && (
        <Alert>
          <AlertDescription>
            Los comprobantes por gasto se activan cuando Sistemas aplique la migración 199. Mientras tanto sube todos
            tus comprobantes juntos aquí abajo y captura el total.
          </AlertDescription>
        </Alert>
      )}

      {!editable && v.status === 'approved' && !returned && (
        <p className="text-sm text-muted-foreground">
          {v.isMine ? 'Sube tus comprobantes para cerrar esta solicitud.' : 'El solicitante aún no envía su comprobación.'}
        </p>
      )}

      {/* Gastos de la solicitud, por día */}
      {perItem && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Gastos de la solicitud</h3>
              <p className="text-xs text-muted-foreground">
                {totals.itemsWithProof} de {totals.itemsCount} gastos con comprobante
                {editable ? ' · lo gastado se guarda al salir de cada campo' : ''}
              </p>
            </div>
            {editable && totals.itemsWithoutAmount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saveProofs.isPending}
                onClick={() => void fillEmptyWithRequested()}
                title="Pone lo solicitado como gastado en los gastos que siguen vacíos"
              >
                Gasté lo solicitado en los {totals.itemsWithoutAmount} sin capturar
              </Button>
            )}
          </div>

          {days.map((day) => {
            const h = dayHeader(day.date);
            return (
              <div key={day.date} className="overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between bg-muted/60 px-4 py-2">
                  <p className="text-sm font-semibold capitalize text-foreground">
                    {h.weekday} {h.day} {h.month}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Solicitado <span className="tabular-nums">{money(day.requested)}</span>
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  {day.items.map((it) => {
                    const receipts = filesOfItem(files, it.id, 'receipt');
                    const invoices = filesOfItem(files, it.id, 'invoice');
                    const done = receipts.length + invoices.length > 0;
                    const noteOpen = openNotes.has(it.id);
                    return (
                      <li key={it.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            {done && <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Con comprobante" />}
                            <span className="truncate">{it.conceptLabel}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Solicitado <span className="tabular-nums">{money(it.amount)}</span>
                          </p>
                          {editable ? (
                            noteOpen ? (
                              <Input
                                value={itemNotes[it.id] ?? ''}
                                onChange={(e) => setItemNotes((n) => ({ ...n, [it.id]: e.target.value }))}
                                onBlur={(e) => void saveNote(it, e.target.value)}
                                placeholder="Aclaración (p. ej. taxi sin recibo)"
                                maxLength={500}
                                className="mt-1.5 h-8 text-xs"
                                aria-label={`Aclaración de ${it.conceptLabel}`}
                              />
                            ) : (
                              <button
                                type="button"
                                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => setOpenNotes((s) => new Set(s).add(it.id))}
                              >
                                <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" />
                                Agregar aclaración
                              </button>
                            )
                          ) : (
                            it.proofNote && <p className="mt-1 text-xs italic text-muted-foreground">“{it.proofNote}”</p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-medium text-foreground">Gastado</p>
                          {editable ? (
                            <>
                              <Input
                                inputMode="decimal"
                                value={amounts[it.id] ?? ''}
                                onChange={(e) => setAmounts((a) => ({ ...a, [it.id]: sanitizeAmount(e.target.value) }))}
                                onBlur={(e) => void saveAmount(it, e.target.value)}
                                placeholder="0.00"
                                className="mt-1 h-8 text-right tabular-nums"
                                aria-label={`Gastado en ${it.conceptLabel}`}
                              />
                              {parseAmount(amounts[it.id]) == null && (
                                <button
                                  type="button"
                                  className="mt-1 text-xs text-primary hover:underline"
                                  onClick={() => fillWithRequested(it)}
                                >
                                  = lo solicitado
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                                {it.spentAmount != null ? money(it.spentAmount) : '—'}
                              </p>
                              {/* Para quien revisa: diferencia contra lo solicitado y gasto sin comprobante. */}
                              {it.spentAmount != null && round2(it.spentAmount - it.amount) !== 0 && (
                                <p
                                  className={`text-xs tabular-nums ${it.spentAmount > it.amount ? 'text-red-700' : 'text-muted-foreground'}`}
                                >
                                  {it.spentAmount > it.amount ? '+' : '−'}
                                  {money(Math.abs(round2(it.spentAmount - it.amount)))} vs. solicitado
                                </p>
                              )}
                              {(it.spentAmount ?? 0) > 0 && !done && (
                                <p className="text-xs font-medium text-amber-700">Sin comprobante</p>
                              )}
                            </>
                          )}
                        </div>

                        {box('Recibos', 'receipt', receipts, ACCEPT_RECEIPT, it.id, 'Foto del ticket o PDF')}
                        {box('Facturas', 'invoice', invoices, ACCEPT_INVOICE, it.id, 'PDF y, si lo tienes, el XML')}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {/* Lo que no cabe en un gasto */}
      {(editable ? proofEnabled : generalReceipts.length + generalInvoices.length > 0 || (v.proofExtraAmount ?? 0) > 0) && (
        <section className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {perItem ? 'Otros comprobantes y gastos no previstos' : 'Comprobantes'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {perItem
                ? 'Lo que no corresponde a un solo gasto: una factura que ampara varios, o un gasto que no venía en la solicitud.'
                : 'Fotos de tickets, facturas PDF/XML o un ZIP/RAR con todo (hasta 20 MB c/u).'}
            </p>
          </div>
          <div className={`grid gap-3 ${itemProofEnabled ? 'sm:grid-cols-2' : ''}`}>
            {box(perItem ? 'Recibos generales' : 'Comprobantes', 'receipt', generalReceipts, ACCEPT_ANY)}
            {itemProofEnabled && box('Facturas generales', 'invoice', generalInvoices, ACCEPT_INVOICE)}
          </div>
          {perItem &&
            (editable ? (
              <div className="max-w-xs">
                <Label htmlFor="via-proof-extra">Gastos no previstos (MXN)</Label>
                <Input
                  id="via-proof-extra"
                  inputMode="decimal"
                  value={extra}
                  onChange={(e) => setExtra(sanitizeAmount(e.target.value))}
                  onBlur={(e) => void saveExtra(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5 text-right tabular-nums"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Se suma a lo gastado. Explica qué fue en las notas para Contabilidad.
                </p>
              </div>
            ) : (
              (v.proofExtraAmount ?? 0) > 0 && (
                <p className="text-sm text-foreground">
                  Gastos no previstos: <strong className="tabular-nums">{money(v.proofExtraAmount ?? 0)}</strong>
                </p>
              )
            ))}
        </section>
      )}

      {/* Sin detalle por día o sin la mig 199: el total se teclea */}
      {editable && proofEnabled && !perItem && (
        <div className="max-w-xs">
          <Label htmlFor="via-proof-total">Total comprobado (MXN) *</Label>
          <Input
            id="via-proof-total"
            inputMode="decimal"
            value={typedTotal}
            onChange={(e) => setTypedTotal(sanitizeAmount(e.target.value))}
            placeholder="Suma de tus tickets y facturas"
            className="mt-1.5 text-right tabular-nums"
          />
        </div>
      )}

      {/* Sobrante: ficha de devolución */}
      {(editable ? proofEnabled && (shownBalance == null || shownBalance > 0 || refunds.length > 0) : refunds.length > 0) && (
        <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sobrante y devolución</h3>
            <p className="text-xs text-muted-foreground">
              {editable
                ? 'Si te sobró dinero, deposítalo a la cuenta de la empresa y sube aquí la ficha (foto o PDF).'
                : 'Ficha del depósito con que se devolvió el sobrante.'}
            </p>
          </div>
          {box('Ficha de devolución', 'refund', refunds, ACCEPT_RECEIPT, undefined, 'Foto o PDF del depósito')}
        </section>
      )}

      {editable && proofEnabled && (
        <>
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 px-4 py-3">
            <p className="text-sm text-foreground">
              Total a comprobar: <strong className="tabular-nums">{money(shownTotal)}</strong>
              {shownBalance != null && shownBalance !== 0 && (
                <span className={shownBalance > 0 ? 'text-amber-700' : 'text-red-700'}>
                  {' '}
                  · {shownBalance > 0 ? 'sobrante' : 'de más'} {money(Math.abs(shownBalance))}
                </span>
              )}
            </p>
            <Button type="button" onClick={() => void sendProof()} disabled={sending || upload.isPending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar comprobación
            </Button>
          </div>
        </>
      )}

      {submitted && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Comprobación enviada el <span className="font-medium text-foreground">{fmtDateTime(v.proofSubmittedAt)}</span>
          </p>
          {v.proofNotes && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Notas del solicitante:</span> {v.proofNotes}
            </p>
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
        <div className="space-y-3 border-t border-border pt-4">
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
                  onClick={() => void confirmReview()}
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
    </div>
  );
}
