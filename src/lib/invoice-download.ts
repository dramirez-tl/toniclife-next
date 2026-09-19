// invoice-download.ts — Descarga de PDF/XML/acuse de una factura por las rutas
// `/billing/invoices/:id/pdf|xml|acuse` (nunca `/storage/file/*`). Único punto
// del patrón blob + <a download> para facturación; usa `saveBlob`.

import { toast } from 'sonner';
import { billingService } from '@/services/billing.service';
import { billingErrorMessage } from '@/lib/billing-error';
import { saveBlob } from '@/lib/download';

export type InvoiceFileKind = 'pdf' | 'xml' | 'acuse';

const MIME: Record<InvoiceFileKind, string> = {
  pdf: 'application/pdf',
  xml: 'application/xml',
  acuse: 'application/pdf',
};

function fileName(kind: InvoiceFileKind, folio: string | null | undefined, id: string): string {
  const base = (folio || id).replace(/[^\w.-]+/g, '-');
  if (kind === 'acuse') return `acuse-cancelacion-${base}.pdf`;
  return `factura-${base}.${kind}`;
}

type BlobErrorLike = { response?: { status?: number; data?: unknown } };

/**
 * Con `responseType: 'blob'` el cuerpo del ERROR también llega como Blob, así
 * que `billingErrorMessage` no encuentra `code`/`message` y un 503
 * `BILLING_SCHEMA_PENDING` se veía como "(HTTP 503)". Aquí se lee el Blob, se
 * parsea el JSON uniforme y se devuelve un error equivalente ya legible.
 */
async function withParsedBlobBody(err: unknown): Promise<unknown> {
  const data = (err as BlobErrorLike | null | undefined)?.response?.data;
  if (typeof Blob === 'undefined' || !(data instanceof Blob)) return err;
  try {
    const text = (await data.text()).trim();
    if (!text) return err;
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Texto plano (proxy): `billingErrorMessage` lo muestra tal cual.
    }
    const original = err as BlobErrorLike & { message?: unknown };
    return {
      message: original.message,
      response: { status: original.response?.status, data: parsed },
    };
  } catch {
    return err;
  }
}

async function fetchBlob(kind: InvoiceFileKind, id: string): Promise<Blob> {
  if (kind === 'pdf') return billingService.downloadInvoicePdf(id);
  if (kind === 'xml') return billingService.downloadInvoiceXml(id);
  return billingService.downloadInvoiceAcuse(id);
}

/** Guarda el archivo; avisa con toast si falla. Devuelve true si se descargó. */
export async function downloadInvoiceFile(
  kind: InvoiceFileKind,
  id: string,
  folio?: string | null,
): Promise<boolean> {
  try {
    const blob = await fetchBlob(kind, id);
    saveBlob(blob, fileName(kind, folio, id), MIME[kind]);
    return true;
  } catch (err) {
    const readable = await withParsedBlobBody(err);
    const what = kind === 'acuse' ? 'acuse de cancelación' : kind.toUpperCase();
    toast.error(billingErrorMessage(readable, `No se pudo descargar el ${what}`));
    return false;
  }
}

/** Abre el PDF en una pestaña nueva (blob URL). */
export async function openInvoicePdf(id: string): Promise<void> {
  try {
    const blob = await billingService.downloadInvoicePdf(id);
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    toast.error(billingErrorMessage(await withParsedBlobBody(err), 'No se pudo abrir el PDF'));
  }
}
