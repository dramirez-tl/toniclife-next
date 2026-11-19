// lib/legacy-checker-code.ts - "Código checador sistema legacy" del expediente (mig 213).
//
// Es el número con el que el colaborador checaba en el sistema anterior. El
// checador también lo acepta: busca primero el número de empleado y, si no
// hay, el número de nómina (NOI) o este código.
//
// Números repetidos NO se permiten (Sistemas, 19-nov-2026): el API rechaza un
// código que ya tenga otro expediente o que sea el número de nómina o de
// empleado de otra persona (y al revés), con un mensaje que dice con quién
// choca. Aquí solo va lo que el formulario valida antes de mandar: el formato.
// Funciones puras: sin React ni red.

/** Lo mismo que acepta el API: letras, dígitos, punto y guiones, sin espacios. */
export const LEGACY_CHECKER_CODE_PATTERN = /^[A-Za-z0-9._-]+$/;
export const LEGACY_CHECKER_CODE_MAX = 30;

/** Como lo guarda el API: recortado y en mayúsculas ('' = sin código). */
export function normalizeLegacyCheckerCode(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

export function isValidLegacyCheckerCode(code: string): boolean {
  return code.length <= LEGACY_CHECKER_CODE_MAX && LEGACY_CHECKER_CODE_PATTERN.test(code);
}
