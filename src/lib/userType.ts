// Normaliza el `userType` de una cuenta a etiqueta + variante de Badge.
// Solo 2 tipos: 'colaborador' (personal interno) y 'cliente' (consumidor).
// Cuando el backend no tiene un valor explícito lo deriva por vínculo
// (ligado a cliente → cliente; en otro caso → colaborador).

export type UserTypeVariant = 'default' | 'info' | 'success' | 'secondary' | 'outline';

export interface UserTypeConfig {
  value: string;
  label: string;
  variant: UserTypeVariant;
}

const CONFIG: Record<string, UserTypeConfig> = {
  colaborador: { value: 'colaborador', label: 'Colaborador', variant: 'default' },
  cliente: { value: 'cliente', label: 'Cliente', variant: 'success' },
};

/** Config de un tipo de cuenta, o null si no hay tipo. */
export function getUserTypeConfig(type?: string | null): UserTypeConfig | null {
  if (!type) return null;
  return CONFIG[type] ?? { value: type, label: type, variant: 'outline' };
}

/**
 * Tipos seleccionables al crear/editar una cuenta desde el panel de usuarios:
 * colaborador (personal interno) y cliente (consumidor).
 */
export const SELECTABLE_USER_TYPES: UserTypeConfig[] = [
  CONFIG.colaborador,
  CONFIG.cliente,
];
