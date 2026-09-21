// confirm-text.ts — Comparación del texto que el usuario teclea para confirmar.
//
// `exact` (por defecto en ConfirmDialog): idéntico salvo espacios a los lados
// (p. ej. `CANCELAR`). `loose`: ignora mayúsculas, acentos y espacios repetidos,
// para confirmar con el NOMBRE de algo ("México" = "mexico"); en el teléfono el
// teclado cambia mayúsculas por su cuenta y un acento no debe bloquear a nadie.

export type ConfirmTextMatch = 'exact' | 'loose';

function loosen(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

export function matchesConfirmText(typed: string, expected: string, mode: ConfirmTextMatch = 'exact'): boolean {
  if (mode === 'loose') return loosen(typed) !== '' && loosen(typed) === loosen(expected);
  return typed.trim() === expected;
}
