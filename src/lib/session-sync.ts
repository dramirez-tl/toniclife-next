'use client';

/**
 * Hidratación de sesión entre pestañas (solo modo "Recordarme" OFF).
 *
 * Con "Recordarme" apagado los tokens viven en `sessionStorage`, que es **por
 * pestaña**: al abrir un módulo en una pestaña nueva, esa pestaña nace sin
 * tokens. El rescate previsto (refresh silencioso vía la cookie httpOnly del
 * API) no funciona cuando el front y el API están en dominios distintos —
 * la cookie es de tercero y Chrome la bloquea (siempre en Incógnito).
 *
 * Solución: la pestaña nueva PIDE la sesión a las demás usando el evento
 * `storage` de localStorage, que sí es compartido y notifica a las OTRAS
 * pestañas (nunca a la que escribe). Una pestaña con sesión publica el payload
 * por unos milisegundos y lo borra enseguida; la nueva lo copia a su
 * `sessionStorage`.
 *
 * El payload solo transita por localStorage un instante y se borra siempre
 * (incluido en el camino de error), así que nada queda en disco al cerrar el
 * navegador: se conserva la semántica de "Recordarme" OFF.
 */

const REQUEST_KEY = 'tl_session_request';
const OFFER_PREFIX = 'tl_session_offer:';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

type SessionPayload = {
  accessToken: string;
  refreshToken: string | null;
  /** JSON crudo tal como lo guarda authService (no se re-serializa). */
  user: string;
};

/** Sesión de ESTA pestaña, solo si está completa (token + usuario). */
function readTabSession(): SessionPayload | null {
  try {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const user = sessionStorage.getItem(USER_KEY);
    if (!accessToken || !user) return null;
    return {
      accessToken,
      refreshToken: sessionStorage.getItem(REFRESH_TOKEN_KEY),
      user,
    };
  } catch {
    return null;
  }
}

/**
 * Escucha peticiones de otras pestañas y responde con la sesión de ésta.
 * Se monta una vez por pestaña (ver `components/SessionSync.tsx`).
 * Devuelve la función de limpieza.
 */
export function startSessionSyncResponder(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key !== REQUEST_KEY || !event.newValue) return;

    // Solo responde una pestaña que realmente tenga sesión en sessionStorage.
    // En modo "Recordarme" ON los tokens están en localStorage (ya compartido),
    // así que readTabSession() devuelve null y este canal ni se usa.
    const payload = readTabSession();
    if (!payload) return;

    const offerKey = `${OFFER_PREFIX}${event.newValue}`;
    try {
      localStorage.setItem(offerKey, JSON.stringify(payload));
    } catch {
      return;
    }
    // Borrar en el siguiente tick: el evento `storage` ya se despachó a la otra
    // pestaña con el valor, así que el payload no necesita seguir en disco.
    setTimeout(() => {
      try {
        localStorage.removeItem(offerKey);
      } catch {
        /* storage no disponible — nada que limpiar */
      }
    }, 0);
  };

  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/**
 * Pide la sesión a las otras pestañas y, si alguna responde, la copia al
 * `sessionStorage` de ésta. Resuelve `true` si se hidrató.
 *
 * Es best-effort y con timeout corto: si no hay otra pestaña con sesión,
 * resuelve `false` rápido y el llamador sigue con su flujo normal.
 */
export function requestSessionFromOtherTabs(timeoutMs = 600): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const offerKey = `${OFFER_PREFIX}${nonce}`;
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('storage', onStorage);
      clearTimeout(timer);
      try {
        localStorage.removeItem(REQUEST_KEY);
        localStorage.removeItem(offerKey);
      } catch {
        /* storage no disponible — nada que limpiar */
      }
    };

    const finish = (hydrated: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(hydrated);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== offerKey || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue) as SessionPayload;
        if (!payload?.accessToken || !payload?.user) {
          finish(false);
          return;
        }
        sessionStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
        sessionStorage.setItem(USER_KEY, payload.user);
        if (payload.refreshToken) {
          sessionStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
        }
        finish(true);
      } catch {
        finish(false);
      }
    };

    const timer = setTimeout(() => finish(false), timeoutMs);
    window.addEventListener('storage', onStorage);

    try {
      localStorage.setItem(REQUEST_KEY, nonce);
    } catch {
      finish(false);
    }
  });
}
