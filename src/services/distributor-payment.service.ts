// distributor-payment.service.ts — "Datos para Comisiones" del distribuidor.
// Contrato Tesorería v2 §4.6. Todo error del API llega como
// { code: 'TRS_*', message, field?, details? }; aquí se extrae de forma
// uniforme para que la pantalla lo traduzca por `code` (nunca toast genérico).

import api from '@/lib/axios';
import type {
  CommissionPaymentFilters,
  CommissionPaymentsResponse,
  CommissionReceiptModel,
  DistributorWithholdingsResponse,
  PaymentCatalogs,
  PaymentDataResponse,
  PaymentDocumentKey,
  SignedDocumentUrl,
  TreasuryErrorBody,
  UpdatePaymentDataInput,
  UpdatePaymentDataResult,
} from '@/types/distributor-payment';

const BASE = '/distributor/payment-data';

/**
 * Nombre del campo multipart por documento. Los 3 primeros son los que ya
 * usaba el `FileFieldsInterceptor` del controller; los de US siguen la misma
 * convención `<clave>Document`. Un solo lugar para ajustar si el API difiere.
 */
export const DOCUMENT_FILE_FIELDS: Record<PaymentDocumentKey, string> = {
  ine: 'ineDocument',
  taxId: 'taxIdDocument',
  bankStatement: 'bankStatement',
  foreignId: 'foreignIdDocument',
  w9: 'w9Document',
};

type AxiosLikeError = {
  response?: { status?: number; data?: unknown };
  message?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function flattenMessage(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map(flattenMessage).filter(Boolean).join(', ');
  }
  return '';
}

/** Cuerpo uniforme `{ code: 'TRS_*', … }` o null si la respuesta no lo trae. */
export function treasuryErrorBody(err: unknown): TreasuryErrorBody | null {
  const error = err as AxiosLikeError | null | undefined;
  const body = asRecord(error?.response?.data);
  if (!body || typeof body.code !== 'string') return null;
  return {
    statusCode:
      typeof body.statusCode === 'number' ? body.statusCode : (error?.response?.status ?? 0),
    code: body.code,
    message: flattenMessage(body.message),
    field: typeof body.field === 'string' ? body.field : undefined,
    details: body.details,
  };
}

export function treasuryErrorCode(err: unknown): string | null {
  return treasuryErrorBody(err)?.code ?? null;
}

export function treasuryErrorStatus(err: unknown): number | null {
  const error = err as AxiosLikeError | null | undefined;
  return error?.response?.status ?? null;
}

/**
 * Mensaje del API (o `fallback`). Sin traducir: la pantalla prefiere el texto
 * i18n por `code` y usa esto solo cuando no conoce el código.
 */
export function treasuryErrorMessage(err: unknown, fallback: string): string {
  const uniform = treasuryErrorBody(err);
  if (uniform?.message) return uniform.message;
  const error = err as AxiosLikeError | null | undefined;
  const body = asRecord(error?.response?.data);
  const raw = body ? flattenMessage(body.message) : '';
  if (raw) return raw;
  const status = error?.response?.status;
  return status ? `${fallback} (HTTP ${status})` : fallback;
}

/** Construye el multipart del POST. Solo campos presentes (guardado parcial por sección). */
export function buildPaymentDataFormData(input: UpdatePaymentDataInput): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(input.fields ?? {})) {
    if (value === undefined || value === null) continue;
    fd.append(key, String(value));
  }
  if (input.privacyConsent) fd.append('privacyConsent', 'true');
  for (const doc of input.requestChange ?? []) fd.append('requestChange', doc);
  for (const [doc, file] of Object.entries(input.files ?? {})) {
    if (file) fd.append(DOCUMENT_FILE_FIELDS[doc as PaymentDocumentKey], file, file.name);
  }
  return fd;
}

export const distributorPaymentService = {
  async getPaymentData(): Promise<PaymentDataResponse> {
    const { data } = await api.get<PaymentDataResponse>(BASE);
    return data;
  },

  async getCatalogs(): Promise<PaymentCatalogs> {
    const { data } = await api.get<PaymentCatalogs>(`${BASE}/catalogs`);
    return data;
  },

  async updatePaymentData(input: UpdatePaymentDataInput): Promise<UpdatePaymentDataResult> {
    const formData = buildPaymentDataFormData(input);
    const { data } = await api.post<UpdatePaymentDataResult>(BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: input.onUploadProgress
        ? (evt) => {
            const total = evt.total ?? 0;
            if (total > 0) input.onUploadProgress?.(Math.round((evt.loaded / total) * 100));
          }
        : undefined,
    });
    return data;
  },

  /** URL firmada (15 min) del documento propio. */
  async getDocumentUrl(document: PaymentDocumentKey): Promise<SignedDocumentUrl> {
    const { data } = await api.get<SignedDocumentUrl>(`${BASE}/documents/${document}/url`);
    return data;
  },

  /** Solo documentos `pending` (TRS_DOC_NOT_PENDING si no). */
  async deleteDocument(document: PaymentDocumentKey): Promise<void> {
    await api.delete(`${BASE}/documents/${document}`);
  },

  async getCommissionPayments(
    filters?: CommissionPaymentFilters,
  ): Promise<CommissionPaymentsResponse> {
    const { data } = await api.get<CommissionPaymentsResponse>(
      '/distributor/commission-payments',
      { params: filters },
    );
    return data;
  },

  /** Modelo del recibo (solo `paid|reconciled`); el PDF se genera en el cliente. */
  async getCommissionReceipt(commissionId: string): Promise<CommissionReceiptModel> {
    const { data } = await api.get<CommissionReceiptModel>(
      `/distributor/commissions/${commissionId}/receipt`,
    );
    return data;
  },

  /**
   * Convenios con la empresa. 404 = el ajuste `distributor_sees_agreements`
   * está apagado: se devuelve null y la sección no se muestra.
   */
  async getWithholdings(): Promise<DistributorWithholdingsResponse | null> {
    try {
      const { data } = await api.get<DistributorWithholdingsResponse>(
        '/distributor/withholdings',
      );
      return data;
    } catch (err) {
      if (treasuryErrorStatus(err) === 404) return null;
      throw err;
    }
  },
};
