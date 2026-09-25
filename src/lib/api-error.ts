// api-error.ts - Lectura genérica de errores de axios para pantallas del admin.
//
// Mismo criterio que apiErrorInfo() de
// app/admin/comercial/formularios/components/induccion-utils.ts (que se deja
// igual porque sus textos son del Taller de Inducción), pero con los textos de
// 403/503/404 configurables por pantalla.

export const CDMX_TZ = 'America/Mexico_City';

export interface ApiErrorInfo {
  status?: number;
  message: string;
}

export interface ApiErrorMessages {
  /** Rol sin permiso. */
  forbidden?: string;
  /** Función aún no habilitada en el servidor (migración pendiente, canal apagado). */
  unavailable?: string;
  /** Ruta inexistente (API sin desplegar). Un 404 con mensaje del backend gana. */
  notFound?: string;
}

/** Status HTTP de un error de axios (undefined si no hubo respuesta). */
export function apiErrorStatus(err: unknown): number | undefined {
  const e = err as { response?: { status?: number } } | null;
  return e?.response?.status;
}

/** Mensaje del backend (string o el primero del arreglo de class-validator). */
function backendMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: unknown } } } | null;
  const raw = e?.response?.data?.message;
  if (Array.isArray(raw)) return String(raw[0] ?? '');
  return typeof raw === 'string' ? raw : '';
}

export function apiErrorInfo(
  err: unknown,
  fallback: string,
  messages: ApiErrorMessages = {},
): ApiErrorInfo {
  const status = apiErrorStatus(err);
  const backendMsg = backendMessage(err);
  const plain = (err as { message?: string } | null)?.message;
  if (status === 403) {
    return {
      status,
      message:
        messages.forbidden ??
        'Tu rol no tiene acceso a esta sección. Pide a Sistemas que habilite el permiso.',
    };
  }
  if (status === 429) {
    return { status, message: 'Demasiadas consultas seguidas; espera un minuto e intenta de nuevo.' };
  }
  if (status === 503) {
    return {
      status,
      message:
        backendMsg ||
        messages.unavailable ||
        'Esta función aún no está habilitada en el servidor.',
    };
  }
  if (status === 404) {
    return {
      status,
      message:
        backendMsg || messages.notFound || 'El API aún no expone esta función (despliegue pendiente).',
    };
  }
  return { status, message: backendMsg || plain || fallback };
}

export const apiErrorMessage = (
  err: unknown,
  fallback: string,
  messages?: ApiErrorMessages,
) => apiErrorInfo(err, fallback, messages).message;
