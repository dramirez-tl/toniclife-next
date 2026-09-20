'use client';

// DocumentCard.tsx — un documento de pago: estado (pendiente/aprobado/rechazado
// con motivo/vencido), fechas, subida INMEDIATA con progreso y error explícito
// por tipo/tamaño/contenido, vista previa en Dialog con URL firmada (15 min),
// Reemplazar (si está validado, pasa por "Solicitar cambio") y Eliminar
// (solo `pending`).

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  LockClosedIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileUpload, type FileUploadTexts } from '@/components/ui/FileUpload';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { localeLanguage } from '@/i18n/config';
import {
  useDeleteDistributorDocument,
  useDistributorDocumentUrl,
} from '@/hooks/useDistributorPayment';
import type { PaymentDocumentKey, PaymentDocumentState } from '@/types/distributor-payment';
import { RequestChangeDialog } from './RequestChangeDialog';
import { useSectionSave } from './useSectionSave';
import { usePaymentErrors } from './usePaymentErrors';
import { formatDateTime } from './paymentUtils';

interface DocumentCardProps {
  docKey: PaymentDocumentKey;
  doc: PaymentDocumentState;
  /** Motivo de rechazo ya resuelto al idioma de la cuenta. */
  reasonLabel: string | null;
  consentBlocked: boolean;
  privacyConsent: boolean;
  uploadTexts: Partial<FileUploadTexts>;
}

function isPdfUrl(url: string, contentType?: string | null): boolean {
  if (contentType) return contentType.toLowerCase().includes('pdf');
  return /\.pdf(\?|$)/i.test(url.split('#')[0]);
}

export function DocumentCard({
  docKey,
  doc,
  reasonLabel,
  consentBlocked,
  privacyConsent,
  uploadTexts,
}: DocumentCardProps) {
  const t = useTranslations('distributor.payments');
  const lang = localeLanguage(useLocale());
  const { save, isSaving, status, setStatus } = useSectionSave();
  const { resolve } = usePaymentErrors();
  const urlMutation = useDistributorDocumentUrl();
  const deleteMutation = useDeleteDistributorDocument();

  const [progress, setProgress] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [replaceMode, setReplaceMode] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{ url: string; expiresAt: string; contentType?: string | null } | null>(null);

  const uploaded = doc.status !== null;
  const rejected = doc.status === 'rejected' || doc.status === 'expired';
  const showUpload = !uploaded || rejected || replaceMode;

  // Al cambiar el estado del documento (respuesta del API) se cierra el modo
  // reemplazo. Se ajusta durante el render (estado derivado), no en un efecto.
  const docSignature = `${doc.status ?? ''}|${doc.uploadedAt ?? ''}`;
  const [seenSignature, setSeenSignature] = useState(docSignature);
  if (seenSignature !== docSignature) {
    setSeenSignature(docSignature);
    setReplaceMode(false);
  }

  const upload = (file: File, requestChange?: PaymentDocumentKey[]) => {
    setProgress(0);
    void save(
      {
        files: { [docKey]: file },
        privacyConsent,
        requestChange,
        onUploadProgress: setProgress,
      },
      {
        successMessage: t('toast.docUploaded', { document: t(`documents.${docKey}.title`) }),
        onSuccess: () => {
          setProgress(null);
          setResetKey((k) => k + 1);
          setReplaceMode(false);
        },
        onError: () => {
          setProgress(null);
          setResetKey((k) => k + 1);
        },
      },
    );
  };

  // Documento validado: el reemplazo exige confirmar una sola vez ("Solicitar
  // reemplazo" o al elegir archivo); después la subida lleva requestChange.
  const [unlocked, setUnlocked] = useState(false);
  if (unlocked && !doc.locked) setUnlocked(false);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (doc.locked && !unlocked) {
      setPendingFile(file);
      setChangeOpen(true);
      return;
    }
    upload(file, doc.locked ? [docKey] : undefined);
  };

  const openPreview = async () => {
    setPreviewOpen(true);
    setPreview(null);
    try {
      const res = await urlMutation.mutateAsync(docKey);
      setPreview(res);
    } catch (err) {
      const r = resolve(err, 'documents.previewUnavailable');
      toast.error(r.message);
      setPreviewOpen(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(docKey);
      toast.success(t('toast.docDeleted', { document: t(`documents.${docKey}.title`) }));
      setDeleteOpen(false);
      setStatus(null);
    } catch (err) {
      const r = resolve(err);
      toast.error(r.message);
      setStatus({ message: r.message, tone: 'error' });
      setDeleteOpen(false);
    }
  };

  const statusBadge = () => {
    switch (doc.status) {
      case 'validated':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('documents.status.validated')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" className="gap-1">
            <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('documents.status.pending')}
          </Badge>
        );
      case 'rejected':
      case 'expired':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t(`documents.status.${doc.status}`)}
          </Badge>
        );
      default:
        return <Badge variant="outline">{t('documents.status.missing')}</Badge>;
    }
  };

  const title = t(`documents.${docKey}.title`);
  const hintId = `doc-${docKey}-hint`;

  return (
    <div
      id={`doc-${docKey}`}
      className="scroll-mt-28 rounded-xl border border-border bg-card p-4"
      role="group"
      aria-labelledby={`doc-${docKey}-title`}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`doc-${docKey}-title`} className="text-sm font-semibold text-foreground">
            {title}
            {!doc.required && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {t('documents.optional')}
              </span>
            )}
          </h3>
          <p id={hintId} className="mt-0.5 text-xs text-muted-foreground">
            {t(`documents.${docKey}.hint`)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {doc.locked && (
            <LockClosedIcon className="h-4 w-4 text-emerald-600" aria-label={t('common.locked')} />
          )}
          {statusBadge()}
        </div>
      </div>

      {(doc.uploadedAt || doc.reviewedAt) && (
        <p className="mb-2 text-xs text-muted-foreground">
          {doc.uploadedAt && t('documents.uploadedAt', { date: formatDateTime(doc.uploadedAt, lang) })}
          {doc.uploadedAt && doc.reviewedAt && ' · '}
          {doc.reviewedAt && t('documents.reviewedAt', { date: formatDateTime(doc.reviewedAt, lang) })}
        </p>
      )}

      {rejected && (reasonLabel || doc.rejectionNotes) && (
        <div className="mb-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
          {reasonLabel && <p>{t('rejection.reason', { reason: reasonLabel })}</p>}
          {doc.rejectionNotes && <p>{t('rejection.notes', { notes: doc.rejectionNotes })}</p>}
        </div>
      )}

      {uploaded && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openPreview} disabled={urlMutation.isPending}>
            <EyeIcon className="h-4 w-4" aria-hidden="true" />
            {t('documents.preview')}
          </Button>
          {!rejected && (
            <Button
              type="button"
              variant={replaceMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => (doc.locked && !unlocked && !replaceMode ? setChangeOpen(true) : setReplaceMode((v) => !v))}
              disabled={isSaving}
              aria-pressed={replaceMode}
            >
              {replaceMode ? t('documents.cancel') : doc.locked ? t('documents.requestReplace') : t('documents.replace')}
            </Button>
          )}
          {doc.status === 'pending' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={isSaving || deleteMutation.isPending}
            >
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
              {t('documents.delete')}
            </Button>
          )}
        </div>
      )}

      {showUpload && (
        <FileUpload
          label=""
          name={docKey}
          id={`doc-${docKey}-file`}
          aria-describedby={hintId}
          onChange={handleFile}
          disabled={isSaving || consentBlocked}
          progress={progress}
          hideStatus
          texts={uploadTexts}
          resetKey={resetKey}
        />
      )}
      {consentBlocked && showUpload && (
        <p className="mt-1 text-xs text-muted-foreground">{t('consent.blocked')}</p>
      )}

      <div aria-live="polite" aria-atomic="true">
        {status && (
          <p
            className={
              status.tone === 'error'
                ? 'mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive'
                : 'mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800'
            }
          >
            {status.message}
          </p>
        )}
      </div>

      {/* Solicitar cambio (documento validado) */}
      <RequestChangeDialog
        open={changeOpen}
        onOpenChange={(open) => {
          setChangeOpen(open);
          if (!open) {
            setPendingFile(null);
            setResetKey((k) => k + 1);
          }
        }}
        documents={[docKey]}
        subject={title}
        isPending={isSaving}
        onConfirm={() => {
          setChangeOpen(false);
          setUnlocked(true);
          if (pendingFile) {
            const f = pendingFile;
            setPendingFile(null);
            upload(f, [docKey]);
          } else {
            setReplaceMode(true);
          }
        }}
      />

      {/* Confirmar eliminación */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('documents.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('documents.deleteConfirmBody', { document: title })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>
              {t('documents.cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {t('documents.confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vista previa */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('documents.previewTitle', { document: title })}</DialogTitle>
            <DialogDescription>
              {preview
                ? t('documents.previewExpires', { time: formatDateTime(preview.expiresAt, lang) })
                : t('documents.previewLoading')}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[300px] max-h-[70vh] overflow-auto rounded-md border border-border bg-muted/40">
            {!preview ? (
              <Skeleton className="h-[300px] w-full" />
            ) : isPdfUrl(preview.url, preview.contentType) ? (
              <iframe
                src={preview.url}
                title={title}
                className="h-[70vh] w-full"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={title} className="mx-auto max-h-[70vh] w-auto max-w-full object-contain" />
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {preview && (
              <Button asChild variant="outline">
                <a href={preview.url} target="_blank" rel="noopener noreferrer">
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                  {t('documents.previewOpen')}
                </a>
              </Button>
            )}
            <Button type="button" onClick={() => setPreviewOpen(false)}>
              {t('documents.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
