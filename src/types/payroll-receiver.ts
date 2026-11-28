// payroll-receiver.ts - Datos del recibo de nómina de un distribuidor.
// Espejo del API (/billing/payroll-receivers/:customerId).

/** De dónde sale el RFC del recibo. */
export type PayrollRfcSource = 'payroll' | 'billing_own' | 'billing_unverified';

/** Así saldría el recibo con lo que hay guardado hoy. */
export interface PayrollReceiptIdentity {
  rfc: string;
  curp: string | null;
  name: string;
  zipCode: string | null;
  /** A dónde se manda el PDF (null = no se envía). */
  email: string | null;
  rfcSource: PayrollRfcSource;
}

export interface PayrollReceiver {
  customerId: string;
  customerNumber: string | null;
  /** Nombre y apellidos de la cuenta. */
  fullName: string;
  countryCode: string | null;
  /** Régimen de comisión asignado (ASIMILADOS, RESICO…) o null. */
  commissionRegime: string | null;
  /** Para contactarlo y pedirle sus datos (ausente si el servidor aún no lo manda). */
  contact?: { phone: string | null; email: string | null };
  /** Lo que se captura: RFC, CURP y C.P. propios del distribuidor. */
  payroll: {
    rfc: string | null;
    curp: string | null;
    zipCode: string | null;
    taxRegimeCode: string | null;
  };
  /** CURP general de la cuenta (la del alta). */
  generalCurp: string | null;
  /** Perfil de facturación de sus compras: solo de consulta. */
  billing: {
    rfc: string | null;
    legalName: string | null;
    zipCode: string | null;
    /** ¿Ese RFC es del propio distribuidor? null = no se puede comprobar. */
    isOwn: boolean | null;
  };
  /** Cómo saldría hoy el recibo; null si todavía no hay con qué armarlo. */
  receipt: PayrollReceiptIdentity | null;
  ready: boolean;
  /** Lo que falta o está mal, en frases. */
  issues: string[];
  /** Otras cuentas con el mismo RFC de nómina. */
  sharedRfcWith: string[];
}

export interface PayrollReceiverUpdateResult extends PayrollReceiver {
  /** Qué se cambió ("RFC y código postal"); vacío si no había nada que cambiar. */
  changedLabel: string;
}

export interface PayrollReceiverInput {
  rfc?: string;
  curp?: string;
  zipCode?: string;
  /** Guardar aunque el RFC y la CURP no parezcan de la misma persona. */
  confirmMismatch?: boolean;
}

export type PayrollReceiverField = 'rfc' | 'curp' | 'zipCode';

export interface PayrollReceiverFieldError {
  field: PayrollReceiverField;
  message: string;
  needsConfirm?: boolean;
}
