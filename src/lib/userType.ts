// Normaliza el `userType` de una cuenta a etiqueta + variante de Badge.
// BD: 'colaborador' | 'distribuidor' | 'cliente' | 'sistema'. Cuando el backend
// no tiene un valor explícito lo deriva por vínculo (worker_id/customer_id).

export type UserTypeVariant = 'default' | 'info' | 'success' | 'secondary' | 'outline';

export interface UserTypeConfig {
  value: string;
  label: string;
  variant: UserTypeVariant;
}

const CONFIG: Record<string, UserTypeConfig> = {
  colaborador: { value: 'colaborador', label: 'Colaborador', variant: 'default' },
  distribuidor: { value: 'distribuidor', label: 'Distribuidor', variant: 'info' },
  cliente: { value: 'cliente', label: 'Cliente', variant: 'success' },
  sistema: { value: 'sistema', label: 'Sistema', variant: 'secondary' },
};

/** Config de un tipo de cuenta, o null si no hay tipo. */
export function getUserTypeConfig(type?: string | null): UserTypeConfig | null {
  if (!type) return null;
  return CONFIG[type] ?? { value: type, label: type, variant: 'outline' };
}

/**
 * Tipos seleccionables al crear/editar una cuenta desde el panel de usuarios.
 * Solo cuentas internas: colaborador (personal) y sistema (cuenta técnica).
 * Distribuidor/cliente se gestionan en el dominio de clientes.
 */
export const SELECTABLE_USER_TYPES: UserTypeConfig[] = [
  CONFIG.colaborador,
  CONFIG.sistema,
];
