'use client';

// useSectionSave.ts — guardado de UNA sección/documento con la mutación común:
// resuelve el error TRS_* al idioma de la cuenta, lo anuncia (toast + estado
// aria-live de la tarjeta) y lleva el foco al campo señalado por `field`.

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useUpdateDistributorPaymentData } from '@/hooks/useDistributorPayment';
import type { UpdatePaymentDataInput, UpdatePaymentDataResult } from '@/types/distributor-payment';
import { usePaymentErrors, type ResolvedPaymentError } from './usePaymentErrors';
import { scrollToAnchor } from './paymentUtils';

export interface SectionStatus {
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface SaveOptions {
  successMessage?: string;
  /** Se llama con la respuesta (ya escrita en caché por el hook). */
  onSuccess?: (result: UpdatePaymentDataResult) => void;
  onError?: (error: ResolvedPaymentError) => void;
  /** No mostrar toast de éxito (p. ej. la tarjeta ya lo dice). */
  silent?: boolean;
}

export function useSectionSave() {
  const t = useTranslations('distributor.payments');
  const mutation = useUpdateDistributorPaymentData();
  const { resolve } = usePaymentErrors();
  const [status, setStatus] = useState<SectionStatus | null>(null);

  const save = useCallback(
    async (input: UpdatePaymentDataInput, opts: SaveOptions = {}): Promise<UpdatePaymentDataResult | null> => {
      setStatus(null);
      try {
        const result = await mutation.mutateAsync(input);
        const message = opts.successMessage ?? t('toast.saved');
        setStatus({ message, tone: 'success' });
        if (!opts.silent) toast.success(message);
        for (const w of result?.warnings ?? []) toast.warning(w);
        opts.onSuccess?.(result);
        return result;
      } catch (err) {
        const resolved = resolve(err);
        setStatus({ message: resolved.message, tone: 'error' });
        toast.error(resolved.message);
        if (resolved.code === 'TRS_CONSENT_REQUIRED') {
          scrollToAnchor('consent');
        } else if (resolved.anchor) {
          scrollToAnchor(resolved.anchor);
        }
        opts.onError?.(resolved);
        return null;
      }
    },
    [mutation, resolve, t],
  );

  return { save, isSaving: mutation.isPending, status, setStatus };
}
