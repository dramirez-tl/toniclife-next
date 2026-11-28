// external-settlement.ts - Asentar como pagadas las comisiones ya depositadas
// fuera de los lotes de dispersión. Espejo del API
// (POST /mlm/commissions/external-settlement, permiso mlm:pay).

/** Por qué una comisión con pago registrado NO se asienta. */
export type ExternalSettlementCode =
  | 'ok'
  | 'already_paid'
  | 'cancelled'
  | 'in_dispersion'
  | 'currency'
  | 'amount_mismatch'
  | 'not_positive';

export interface ExternalSettlementSkipped {
  commissionId: string;
  customerNumber: string | null;
  code: ExternalSettlementCode;
  message: string;
}

export interface ExternalSettlementResult {
  /** false = vista previa (no se escribió nada). */
  applied: boolean;
  period: { id: string; code: string; name: string };
  /** Pagos registrados fuera de lote en el periodo. */
  registered: number;
  /** Los que se asientan (vista previa) o se asentaron (aplicado). */
  eligible: number;
  /** Neto en pesos de los que se asientan. */
  amount: number;
  /** Ya estaban pagadas (asentadas antes o por el flujo de dispersión). */
  alreadyPaid: number;
  /** Con pago registrado que NO se asientan, por motivo. */
  skippedByCode: Partial<Record<ExternalSettlementCode, number>>;
  skipped: ExternalSettlementSkipped[];
  /** Los que se asientan, por día de depósito (YYYY-MM-DD). */
  byPaymentDate: Array<{ date: string; count: number; amount: number }>;
  /** Escritas en esta llamada. */
  settled: number;
  /** true = con esto ya no queda nada por pagar en el periodo. */
  periodFullyPaid: boolean | null;
}
