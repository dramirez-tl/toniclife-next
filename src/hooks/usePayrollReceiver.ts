// usePayrollReceiver.ts - Datos del recibo de nómina de un distribuidor
// (consultar y completar desde Tesorería).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollReceiverService } from '@/services/payroll-receiver.service';
import type { PayrollReceiverInput } from '@/types/payroll-receiver';

export const payrollReceiverKeys = {
  all: ['payroll-receiver'] as const,
  detail: (customerId: string) => [...payrollReceiverKeys.all, customerId] as const,
};

export function usePayrollReceiver(customerId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: payrollReceiverKeys.detail(customerId ?? ''),
    queryFn: () => payrollReceiverService.get(customerId!),
    enabled: !!customerId && enabled,
    // Datos fiscales: siempre lo último, nunca lo que quedó en memoria.
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * Guardar. Refresca lo que depende de esos datos: el reporte de bonos (la
 * columna "Comprobante" deja de decir "Faltan datos") y los recibos de comisiones.
 */
export function useUpdatePayrollReceiver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, input }: { customerId: string; input: PayrollReceiverInput }) =>
      payrollReceiverService.update(customerId, input),
    onSuccess: (data, { customerId }) => {
      queryClient.setQueryData(payrollReceiverKeys.detail(customerId), data);
      void queryClient.invalidateQueries({ queryKey: ['reports', 'kit-bonuses'] });
      void queryClient.invalidateQueries({ queryKey: ['commission-receipts'] });
    },
  });
}
