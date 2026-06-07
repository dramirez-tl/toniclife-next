// Normaliza el `customer_type` del MLM a una etiqueta + variante de Badge.
// La BD usa: 'distributor' | 'preferred_customer' | 'final_customer'.
// El front de customers a veces usó alias 'retail' | 'preferred' — se toleran.

export type MlmTypeVariant = 'info' | 'warning' | 'secondary' | 'outline';

export interface MlmTypeConfig {
  label: string;
  variant: MlmTypeVariant;
}

/**
 * Devuelve { label, variant } para un tipo MLM, o `null` si no hay tipo
 * (p. ej. una cuenta de sistema sin registro de cliente enlazado).
 */
export function getMlmTypeConfig(type?: string | null): MlmTypeConfig | null {
  if (!type) return null;
  switch (type) {
    case 'distributor':
      return { label: 'Distribuidor', variant: 'info' };
    case 'preferred_customer':
    case 'preferred':
      return { label: 'Preferente', variant: 'warning' };
    case 'final_customer':
    case 'retail':
      return { label: 'Cliente', variant: 'secondary' };
    default:
      return { label: type, variant: 'outline' };
  }
}
