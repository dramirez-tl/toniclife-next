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

/**
 * Códigos que el API lanza por VARIOS motivos con un `message` distinto cada vez
 * (PRD_PRICE_INVALID: precio en 0, promocional distinto de 0, fecha de vigencia
 * futura, país sin moneda; PRD_FORBIDDEN: qué permiso falta). Aquí manda el
 * mensaje del API; el texto fijo solo cubre el caso de que no venga.
 */
const PREFER_API_MESSAGE = new Set(['PRD_PRICE_INVALID', 'PRD_FORBIDDEN']);

const FORBIDDEN_MESSAGE = 'No tienes permiso para realizar esta acción.';

const isUseful = (message: string | null): message is string =>
  !!message && !GENERIC.some((g) => message.toLowerCase().includes(g));

export function productAdminErrorMessage(err: unknown, fallback: string): string {
  const body = parseProductAdminError(err);
  if (body.code && PREFER_API_MESSAGE.has(body.code) && isUseful(body.message)) return body.message;
  if (body.status === 403) return FORBIDDEN_MESSAGE;
  if (body.code && CODE_MESSAGES[body.code]) {
    const suggestion = body.details?.suggestion;
    if (body.code === 'PRD_SLUG_TAKEN' && typeof suggestion === 'string') {
      return `${CODE_MESSAGES[body.code]} Sugerencia: ${suggestion}`;
    }
    return CODE_MESSAGES[body.code];
  }
  if (isUseful(body.message)) return body.message;
  return fallback;
}

/**
 * Con `responseType: 'blob'` axios entrega TAMBIÉN el cuerpo del error como Blob
 * y `parseProductAdminError` no lo puede leer. Esto lo convierte en el JSON que
 * mandó el API (mutando `err.response.data`) para que el mensaje llegue al
 * usuario. Nunca lanza: si el cuerpo no es JSON, el error queda como estaba.
 */
export async function hydrateBlobErrorBody(err: unknown): Promise<void> {
  const response = (err as AxiosLikeError | null | undefined)?.response;
  const data = response?.data;
  if (!response || typeof Blob === 'undefined' || !(data instanceof Blob)) return;
  try {
    const parsed: unknown = JSON.parse(await data.text());
    if (typeof parsed === 'object' && parsed !== null) response.data = parsed;
  } catch {
    // Cuerpo vacío o no-JSON (p. ej. HTML de un proxy): se usa el texto de respaldo.
  }
}
