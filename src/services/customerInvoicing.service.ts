// customerInvoicing.service.ts - Facturar desde la cuenta del distribuidor
// (/distributor/invoicing, 17-nov-2026). Cada ruta trabaja con la cuenta en sesión.
import api from '@/lib/axios';
import type {
  MyFiscalData,
  MyInvoiceOrder,
  MyInvoicingCatalogs,
  MyInvoicingOverview,
  SaveMyFiscalDataPayload,
} from '@/types/customer-invoicing';

const BASE = '/distributor/invoicing';

class CustomerInvoicingService {
  /** Mis datos fiscales y mis compras en línea pagadas del mes en curso. */
  async getOverview(): Promise<MyInvoicingOverview> {
    const { data } = await api.get<MyInvoicingOverview>(BASE);
    return data;
  }

  /** Regímenes fiscales y, con un régimen, sus usos de CFDI válidos. */
  async getCatalogs(regime?: string): Promise<MyInvoicingCatalogs> {
    const { data } = await api.get<MyInvoicingCatalogs>(`${BASE}/catalogs`, {
      params: regime ? { regime } : undefined,
    });
    return data;
  }

  async saveFiscalData(payload: SaveMyFiscalDataPayload): Promise<MyFiscalData> {
    const { data } = await api.put<MyFiscalData>(`${BASE}/fiscal-data`, payload);
    return data;
  }

  /** Timbra la factura del pedido con los datos fiscales guardados. */
  async invoiceOrder(orderId: string): Promise<MyInvoiceOrder> {
    const { data } = await api.post<MyInvoiceOrder>(
      `${BASE}/orders/${orderId}/invoice`,
    );
    return data;
  }

  async downloadFile(invoiceId: string, kind: 'pdf' | 'xml'): Promise<Blob> {
    const { data } = await api.get<Blob>(`${BASE}/invoices/${invoiceId}/${kind}`, {
      responseType: 'blob',
    });
    return data;
  }
}

export const customerInvoicingService = new CustomerInvoicingService();
