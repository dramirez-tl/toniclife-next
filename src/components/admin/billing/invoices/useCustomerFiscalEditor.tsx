'use client';

// Abre `CustomerFiscalDialog` (Fase 1) desde cualquier pantalla de facturación
// a partir del cliente de una venta o del receptor de una factura. El diálogo
// necesita la fila de Preparación fiscal: se busca por RFC/código/nombre y se
// elige por `customerId`; si el cliente no aparece (sin RFC capturado) se
// arranca con una fila vacía para capturarlo desde cero.

import { useCallback, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { billingService } from '@/services/billing.service';
import { billingErrorMessage } from '@/lib/billing-error';
import type { ReadinessCustomerRow } from '@/types/billing';
import { CustomerFiscalDialog } from '@/components/admin/billing/CustomerFiscalDialog';

export interface CustomerFiscalHint {
  customerId: string;
  rfc?: string | null;
  code?: string | null;
  name?: string | null;
}

function emptyRow(hint: CustomerFiscalHint): ReadinessCustomerRow {
  return {
    customerId: hint.customerId,
    code: hint.code ?? null,
    name: hint.name ?? '',
    rfc: hint.rfc ?? '',
    legalName: null,
    taxRegime: null,
    taxRegimeDescription: null,
    cfdiUseCode: null,
    fiscalZipCode: null,
    fiscalEmail: null,
    email: null,
    issues: [],
    ready: false,
  };
}

export function useCustomerFiscalEditor(onSaved?: () => void) {
  const [row, setRow] = useState<ReadinessCustomerRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openFor = useCallback(async (hint: CustomerFiscalHint) => {
    setIsLoading(true);
    try {
      const terms = [hint.rfc, hint.code, hint.name].filter(
        (t): t is string => typeof t === 'string' && t.trim().length > 0,
      );
      let found: ReadinessCustomerRow | undefined;
      for (const term of terms) {
        const page = await billingService.listReadinessCustomers({ search: term.trim(), limit: 20 });
        found = page.data.find((c) => c.customerId === hint.customerId);
        if (found) break;
      }
      setRow(found ?? emptyRow(hint));
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudieron cargar los datos fiscales del cliente'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dialog: ReactNode = (
    <CustomerFiscalDialog
      customer={row}
      open={!!row}
      onOpenChange={(open) => {
        if (!open) {
          setRow(null);
          onSaved?.();
        }
      }}
    />
  );

  return { openFor, isLoading, dialog };
}
