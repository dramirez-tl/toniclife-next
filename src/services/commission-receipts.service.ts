// commission-receipts.service.ts - Pagos de comisiones registrados fuera de los
// lotes de dispersión y su recibo de nómina.
// Backend: /billing/commission-receipts (permiso commissions:validate).
import api from '@/lib/api';
import { saveBlob } from '@/lib/download';
import type { CommissionReceiptStampResult, CommissionReceiptsList } from '@/types/commission-receipts';

class CommissionReceiptsService {
  /** Comisiones ASIMILADOS del periodo con su pago registrado y su recibo. */
  async list(periodNumber: number): Promise<CommissionReceiptsList> {
    const { data } = await api.get<CommissionReceiptsList>('/billing/commission-receipts', {
      params: { periodNumber },
    });
    return data;
  }

  /** Emite el recibo de nómina de UN pago registrado. El PDF solo se manda por correo con sendEmail. */
  async stamp(paymentId: string, sendEmail = false): Promise<CommissionReceiptStampResult> {
    const { data } = await api.post<CommissionReceiptStampResult>('/billing/commission-receipts/stamp', {
      paymentId,
      ...(sendEmail ? { sendEmail: true } : {}),
    });
    return data;
  }

  async download(invoiceId: string, ext: 'pdf' | 'xml', filename: string): Promise<void> {
    const response = await api.get(`/billing/commission-receipts/${invoiceId}/${ext}`, { responseType: 'blob' });
    saveBlob(response.data as BlobPart, filename, ext === 'pdf' ? 'application/pdf' : 'application/xml');
  }
}

export const commissionReceiptsService = new CommissionReceiptsService();
