'use client';

// usePaymentErrors.ts — traduce errores del API ({ code: 'TRS_*', field }) al
// idioma de la cuenta. Conoce los códigos del contrato §4; para el resto usa
// el `message` del API o el fallback. Devuelve también el ancla del campo
// para llevar el foco al error.

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  treasuryErrorBody,
  treasuryErrorMessage,
  treasuryErrorStatus,
} from '@/services/distributor-payment.service';
import { KNOWN_ERROR_CODES, errorFieldAnchor } from './paymentUtils';

export interface ResolvedPaymentError {
  code: string | null;
  message: string;
  field: string | null;
  anchor: string | null;
  status: number | null;
}

export function usePaymentErrors() {
  const t = useTranslations('distributor.payments');

  const resolve = useCallback(
    (err: unknown, fallbackKey: string = 'toast.saveError'): ResolvedPaymentError => {
      const body = treasuryErrorBody(err);
      const status = treasuryErrorStatus(err);
      const fallback = t(fallbackKey);
      const code = body?.code ?? null;
      let message: string;
      if (code && KNOWN_ERROR_CODES.has(code)) {
        message = t(`errors.${code}`);
      } else if (status === 401 || status === 403) {
        message = t('errors.forbidden');
      } else if (status === 413) {
        message = t('errors.tooLarge');
      } else if (status && status >= 500) {
        message = t('errors.server');
      } else if (!status) {
        message = t('errors.network');
      } else {
        message = treasuryErrorMessage(err, fallback);
      }
      const field = body?.field ?? null;
      return { code, message, field, anchor: errorFieldAnchor(field), status };
    },
    [t],
  );

  return { resolve };
}
