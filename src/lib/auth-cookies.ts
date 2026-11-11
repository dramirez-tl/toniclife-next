// Small cookies the Next.js middleware reads for auth/role routing. The full
// JWT stays in web storage (it can exceed the 4 KB cookie limit when it embeds
// many permissions) — these are just lightweight routing flags.
//
// Centralised here so both the auth service (login) and the axios interceptor
// (token refresh) write/clear them identically, and so the cookie lifetime
// always matches where the real token lives:
//   • "Recordarme" ON  → tokens in localStorage  → persistent cookie (7 days)
//   • "Recordarme" OFF → tokens in sessionStorage → session cookie (clears on
//     browser close), so the middleware never believes you're logged in after
//     the token itself is already gone.
import { portalCookieValue, sessionArea } from './auth-area';

const AUTH_COOKIE = 'accessToken';
const ROLE_COOKIE = 'authRole';
// Área de la sesión ('admin' | 'distributor' | 'store'), derivada de la CATEGORÍA
// del rol que viene en el JWT (roleCategory) y del tipo de cuenta del usuario
// ('store' = cuenta del público, cliente final: vive en la tienda, sin panel; ver
// lib/auth-area.ts). Es lo que el middleware usa para rutear; authRole se conserva
// solo como fallback para sesiones viejas.
const PORTAL_COOKIE = 'authPortal';
const REMEMBER_KEY = 'rememberMe';

// Matches the backend refresh-token lifetime (JWT_REFRESH_EXPIRES_IN = 7d).
const AUTH_MAX_AGE = 60 * 60 * 24 * 7;

const isRemembered = (): boolean =>
  typeof window !== 'undefined' && localStorage.getItem(REMEMBER_KEY) === '1';

/**
 * Write the auth + role routing cookies, decoding the role from the JWT.
 * `customerType` (user.customerType de la respuesta del API) no viaja en el JWT: con
 * él la cuenta del público queda como 'store' y el middleware no la manda al panel del
 * distribuidor. Sin él (colaboradores, API anterior) todo queda como siempre.
 */
export function writeAuthCookies(accessToken: string, customerType?: string | null): void {
  if (typeof window === 'undefined') return;

  // Persistent (max-age) when "remember me" is on; otherwise a session cookie.
  const maxAge = isRemembered() ? `; max-age=${AUTH_MAX_AGE}` : '';
  document.cookie = `${AUTH_COOKIE}=1; path=/${maxAge}; SameSite=Lax`;

  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const role: string = Array.isArray(payload.roles)
      ? payload.roles[0]
      : payload.role || '';
    document.cookie = `${ROLE_COOKIE}=${role}; path=/${maxAge}; SameSite=Lax`;
    // Área por CATEGORÍA del rol (colaborador→admin, cliente→distributor, y la
    // cuenta del público→store); si el token aún no trae roleCategory, cae a la
    // clasificación legacy por código. 'unknown' no se escribe: el middleware
    // mandará a re-loguear con limpieza de cookies (nunca más el ciclo que
    // obligaba a borrar caché).
    const portal = portalCookieValue(
      sessionArea({ roleCategory: payload.roleCategory, roles: role ? [role] : [], customerType }),
    );
    if (portal) {
      document.cookie = `${PORTAL_COOKIE}=${portal}; path=/${maxAge}; SameSite=Lax`;
    } else {
      document.cookie = `${PORTAL_COOKIE}=; path=/; max-age=0`;
    }
  } catch {
    // Token not decodable — leave the flag cookie; middleware will allow through.
  }
}

/** Expire the auth + role cookies (logout / failed refresh). */
export function clearAuthCookies(): void {
  if (typeof window === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${PORTAL_COOKIE}=; path=/; max-age=0`;
}
