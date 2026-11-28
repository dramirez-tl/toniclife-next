// payroll-receiver.service.ts - Datos del recibo de nómina de un distribuidor.
// Backend: /billing/payroll-receivers/:customerId (permiso commissions:validate
// o billing:manage, los mismos de timbrar el recibo).
import api from '@/lib/api';
import type { PayrollReceiver, PayrollReceiverInput, PayrollReceiverUpdateResult } from '@/types/payroll-receiver';

class PayrollReceiverService {
  /** Con qué RFC, CURP, C.P. y nombre saldría su recibo, y qué le falta. */
  async get(customerId: string): Promise<PayrollReceiver> {
    const { data } = await api.get<PayrollReceiver>(`/billing/payroll-receivers/${customerId}`);
    return data;
  }

  /** Completa o corrige su RFC, CURP y C.P. de nómina. Un campo vacío no cambia nada. */
  async update(customerId: string, input: PayrollReceiverInput): Promise<PayrollReceiverUpdateResult> {
    const { data } = await api.put<PayrollReceiverUpdateResult>(`/billing/payroll-receivers/${customerId}`, input);
    return data;
  }
}

export const payrollReceiverService = new PayrollReceiverService();
