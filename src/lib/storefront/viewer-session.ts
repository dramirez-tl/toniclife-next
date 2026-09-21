// Recuperación del PRECIO POR ROL en la tienda (hallazgo M2 de la revisión).
//
// `/storefront/*` es `@Public` con `OptionalJwtAuthGuard`: un access token VENCIDO
// no da 401, el API responde 200 como visitante anónimo (precio público, sin
// puntos). Sin 401 el interceptor de axios nunca refresca, así que un distribuidor
// con la pestaña abierta pierde "Tu precio" sin aviso.
//
// Aquí NO se toca la política de auth: solo se decide CUÁNDO pedir el refresh que
// ya existe (`authService.refreshToken()`, el mismo `POST /auth/refresh` del
// interceptor) y se evita cualquier bucle:
//  - solo con sesión de CLIENTE (usuario con `customerId`), nunca invitados;
//  - solo si el API contestó `tier: 'public'` Y el access token local está
//    vencido (un token vigente + tier público = es su precio real: no se refresca);
//  - un intento a la vez y, como máximo, uno por minuto para toda la pestaña.
// El módulo es puro salvo por su estado en memoria; el refresh se INYECTA.

import type { StorefrontPriceTier } from './types';

export const RECOVERY_COOLDOWN_MS = 60 * 1000;
/** Margen contra relojes desfasados: a 5 s de vencer ya se considera vencido. */
const EXPIRY_SKEW_MS = 5 * 1000;

function decodeBase64Url(segment: string): string | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary');
  } catch {
    return null;
  }
}

/**
 * `true` si el JWT ya venció (o está por vencer). Sin token, ilegible o sin `exp`
 * = `true`: no se puede afirmar que sirva. Solo LEE el token; no valida la firma.
 */
export function isAccessTokenExpired(token: string | null | undefined, nowMs: number): boolean {
  if (!token) return true;
  const parts = token.split('.');
  if (parts.length !== 3) return true;
  const json = decodeBase64Url(parts[1]);
  if (!json) return true;
  try {
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return true;
    return exp * 1000 - EXPIRY_SKEW_MS <= nowMs;
  } catch {
    return true;
  }
}

export interface RecoveryDecisionInput {
  /** Sesión de cliente (distribuidor/preferente): usuario autenticado con `customerId`. */
  hasCustomerSession: boolean;
  /** Tier con el que el API cotizó la respuesta REAL (no un placeholder). */
  tier: StorefrontPriceTier | null | undefined;
  accessToken: string | null | undefined;
  nowMs: number;
  lastAttemptAt: number | null;
  inFlight: boolean;
}

export function shouldRecoverViewerPrice(input: RecoveryDecisionInput): boolean {
  if (!input.hasCustomerSession || input.tier !== 'public') return false;
  if (input.inFlight) return false;
  if (input.lastAttemptAt !== null && input.nowMs - input.lastAttemptAt < RECOVERY_COOLDOWN_MS) return false;
  return isAccessTokenExpired(input.accessToken, input.nowMs);
}

// ─── Estado de la pestaña (un intento a la vez, uno por minuto) ───────────────

export type ViewerSessionStatus = 'idle' | 'recovering' | 'recovered' | 'expired';

let status: ViewerSessionStatus = 'idle';
let lastAttemptAt: number | null = null;
let inFlight = false;
const listeners = new Set<() => void>();

function setStatus(next: ViewerSessionStatus): void {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener());
}

export function subscribeViewerSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getViewerSessionStatus(): ViewerSessionStatus {
  return status;
}

export function getServerViewerSessionStatus(): ViewerSessionStatus {
  return 'idle';
}

export interface RecoveryAttemptInput {
  hasCustomerSession: boolean;
  tier: StorefrontPriceTier | null | undefined;
  getAccessToken: () => string | null;
  /** El refresh EXISTENTE (p. ej. `() => authService.refreshToken()`). */
  refresh: () => Promise<unknown>;
  now?: () => number;
}

/**
 * Lanza (si procede) el ÚNICO intento de refresh. Resuelve `true` solo para quien
 * lo inició y solo si el refresh funcionó: ese llamador vuelve a pedir los datos.
 * Cualquier otro caso (`false`) no debe hacer nada.
 */
export async function attemptViewerPriceRecovery(input: RecoveryAttemptInput): Promise<boolean> {
  const now = input.now ?? Date.now;
  const decide = shouldRecoverViewerPrice({
    hasCustomerSession: input.hasCustomerSession,
    tier: input.tier,
    accessToken: input.getAccessToken(),
    nowMs: now(),
    lastAttemptAt,
    inFlight,
  });
  if (!decide) return false;

  inFlight = true;
  lastAttemptAt = now();
  setStatus('recovering');
  try {
    await input.refresh();
    setStatus('recovered');
    return true;
  } catch {
    // Refresh rechazado: la sesión ya no es recuperable en silencio. No se limpian
    // tokens ni se redirige (eso es del flujo de auth): la tienda sigue como visitante
    // y la UI avisa que debe iniciar sesión para ver su precio.
    setStatus('expired');
    return false;
  } finally {
    inFlight = false;
  }
}

/** Solo para pruebas. */
export function resetViewerSessionForTests(): void {
  status = 'idle';
  lastAttemptAt = null;
  inFlight = false;
  listeners.clear();
}
