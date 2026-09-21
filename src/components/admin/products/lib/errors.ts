// errors.ts — mensajes en español para los errores del catálogo admin.
//
// El API responde `{ code, message (es), field?, details? }` con prefijo PRD_
// (contrato §1.16). Se DECIDE por `code` y se muestra `message`; si el cuerpo
// no trae nada útil se usa el `fallback` específico de la acción (nunca un
// toast genérico tipo "Request failed with status code 409").

type AxiosLikeError = {
  message?: unknown;
  response?: { status?: number; data?: unknown };
};

export interface ProductAdminErrorBody {
  code: string | null;
  message: string | null;
  field: string | null;
  details: Record<string, unknown> | null;
  status: number | null;
}

const GENERIC = ['internal server error', 'request failed', 'network error', 'bad request'];

const CODE_MESSAGES: Record<string, string> = {
  PRD_STALE:
    'Otra persona modificó este producto mientras lo editabas. Ya cargamos su versión: revisa tus cambios y vuelve a guardar.',
  PRD_SLUG_TAKEN: 'Esa URL ya la usa otro producto.',
  PRD_SLUG_INVALID: 'La URL solo admite minúsculas, números y guiones.',
  PRD_CODE_TAKEN: 'Esa clave ya existe en otro producto.',
  PRD_CODE_CHANGE_UNCONFIRMED: 'Cambiar la clave requiere confirmación.',
  PRD_ENROLLMENT_KIT_TYPE_LOCKED: 'El tipo de un kit de inscripción no se puede cambiar desde esta ficha.',
  PRD_ENROLLMENT_KIT_NOT_DUPLICABLE: 'Los kits de inscripción no se duplican desde aquí.',
  PRD_REASON_REQUIRED: 'Escribe el motivo del cambio fiscal (mínimo 5 caracteres).',
  PRD_LANGUAGE_INVALID: 'Idioma de contenido no válido.',
  PRD_IMAGE_SET_MISMATCH: 'Las imágenes cambiaron mientras las ordenabas. Se recargó la galería; vuelve a intentarlo.',
  PRD_COUNT_MISMATCH: 'La selección cambió antes de aplicar la acción. No se modificó nada; vuelve a seleccionar.',
  PRD_PRICE_INVALID: 'El precio debe ser mayor a cero (solo los promocionales admiten 0).',
  PRD_CONFLICT: 'Ya existe un registro con esos datos.',
  PRD_INVALID_ID: 'Identificador no válido.',
  PRD_CONSTRAINT: 'El cambio viola una regla de integridad del catálogo.',
};

export function parseProductAdminError(err: unknown): ProductAdminErrorBody {
  const e = (err ?? {}) as AxiosLikeError;
  const data = e.response?.data;
  const body = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  const rawMessage = body.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.filter((m): m is string => typeof m === 'string').join('. ')
    : typeof rawMessage === 'string'
      ? rawMessage
      : null;
  return {
    code: typeof body.code === 'string' ? body.code : null,
    message: message && message.length > 0 ? message : null,
    field: typeof body.field === 'string' ? body.field : null,
    details:
      typeof body.details === 'object' && body.details !== null
        ? (body.details as Record<string, unknown>)
        : null,
    status: typeof e.response?.status === 'number' ? e.response.status : null,
  };
}

export function productAdminErrorCode(err: unknown): string | null {
  return parseProductAdminError(err).code;
}

export function productAdminErrorMessage(err: unknown, fallback: string): string {
  const body = parseProductAdminError(err);
  if (body.status === 403) return 'No tienes permiso para realizar esta acción.';
  if (body.code && CODE_MESSAGES[body.code]) {
    const suggestion = body.details?.suggestion;
    if (body.code === 'PRD_SLUG_TAKEN' && typeof suggestion === 'string') {
      return `${CODE_MESSAGES[body.code]} Sugerencia: ${suggestion}`;
    }
    return CODE_MESSAGES[body.code];
  }
  if (body.message && !GENERIC.some((g) => body.message!.toLowerCase().includes(g))) {
    return body.message;
  }
  return fallback;
}
