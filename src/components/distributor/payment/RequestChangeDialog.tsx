'use client';

// RequestChangeDialog.tsx — confirmación para editar un dato cuyo documento ya
// fue validado. Explica que el documento vuelve a "pendiente" y la validación
// se revoca (contrato §1.8: `requestChange` reinicia ese documento). El DTO no
// lleva motivo: solo se confirma.

import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PaymentDocumentKey } from '@/types/distributor-payment';

interface RequestChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Documentos que se reinician a pendiente al confirmar. */
  documents: PaymentDocumentKey[];
  /** Qué se va a cambiar (nombre de la sección o del documento). */
  subject: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function RequestChangeDialog({
  open,
  onOpenChange,
  documents,
  subject,
  onConfirm,
  isPending = false,
}: RequestChangeDialogProps) {
  const t = useTranslations('distributor.payments');
  const docNames = documents.map((d) => t(`documents.${d}.title`)).join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" aria-hidden="true" />
            {t('requestChange.title')}
          </DialogTitle>
          <DialogDescription className="text-left">
            {t('requestChange.body', { subject, documents: docNames })}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t('requestChange.warning')}
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('requestChange.cancel')}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {t('requestChange.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
