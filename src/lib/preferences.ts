// preferences.ts - Preferencias del admin por usuario (tamaño de letra).
//
// Se guardan en el navegador (localStorage) bajo el id del usuario: cada quien
// ve el admin como lo configuró en su equipo y el valor por defecto es el
// tamaño actual. La escala se aplica como `font-size` de <html>: Tailwind v4
// mide texto y espaciado en rem, así que todo el admin crece proporcional
// (igual que el zoom del navegador, pero persistente y por usuario) y nada se
// desborda dentro de sus cajas.

export const FONT_SCALES = [1, 1.1, 1.2, 1.3] as const;
export type FontScale = (typeof FONT_SCALES)[number];

export const FONT_SCALE_OPTIONS: { value: FontScale; label: string; hint: string }[] = [
  { value: 1, label: 'Normal', hint: 'Como está hoy' },
  { value: 1.1, label: 'Grande', hint: '+10 %' },
  { value: 1.2, label: 'Muy grande', hint: '+20 %' },
  { value: 1.3, label: 'Extra grande', hint: '+30 %' },
];

export interface AdminPreferences {
  fontScale: FontScale;
}

export const DEFAULT_PREFERENCES: AdminPreferences = { fontScale: 1 };

const KEY_PREFIX = 'tl.admin.prefs.v1:';
const CSS_VAR = '--tl-font-scale';

function isFontScale(value: unknown): value is FontScale {
  return typeof value === 'number' && (FONT_SCALES as readonly number[]).includes(value);
}

function storageKey(userId: string | null | undefined): string {
  return `${KEY_PREFIX}${userId ?? 'anon'}`;
}

/** Preferencias guardadas del usuario (o las de fábrica si no hay o el navegador bloquea storage). */
export function loadPreferences(userId: string | null | undefined): AdminPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AdminPreferences> | null;
    return {
      fontScale: isFontScale(parsed?.fontScale) ? parsed.fontScale : DEFAULT_PREFERENCES.fontScale,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(userId: string | null | undefined, prefs: AdminPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch {
    // Modo privado o storage bloqueado: la preferencia dura la sesión.
  }
}

/** Aplica la escala a <html>; con 1 se quita la variable y queda el tamaño de fábrica. */
export function applyPreferences(prefs: AdminPreferences): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (prefs.fontScale === 1) root.style.removeProperty(CSS_VAR);
  else root.style.setProperty(CSS_VAR, String(prefs.fontScale));
}
