// lib/legacy-checker-code.ts - "Código checador sistema legacy" del expediente (mig 213).
//
// Es el número con el que el colaborador checaba en el sistema anterior. El
// checador también lo acepta: busca primero el número de empleado y, si no
// hay, el número de nómina (NOI) o este código. Si lo tecleado es el NOI de
// una persona y el código anterior de OTRA, el checador no elige a ninguna y
// pide el número de empleado completo; por eso al capturarlo se avisa.
// Funciones puras: sin React ni red.

import type { Employee } from '@/types/hr';

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

type ClashCandidate = Pick<Employee, 'id' | 'employeeNumber' | 'noiNumber' | 'isActive'>;

/**
 * Colaborador ACTIVO distinto del que se edita cuyo número de nómina (NOI) es
 * igual al código que se quiere guardar. null si no hay choque. Los inactivos
 * no cuentan: el checador solo busca entre activos.
 */
export function legacyCodeNoiClash<T extends ClashCandidate>(
  code: string,
  employees: T[],
  currentEmployeeId?: string | null,
): T | null {
  const wanted = normalizeLegacyCheckerCode(code);
  if (!wanted) return null;
  return (
    employees.find(
      (e) =>
        e.id !== currentEmployeeId &&
        e.isActive &&
        normalizeLegacyCheckerCode(e.noiNumber) === wanted,
    ) ?? null
  );
}

/**
 * Aviso bajo el campo cuando el código choca con el NOI de otra persona. No
 * bloquea: un segundo «Guardar» lo confirma.
 */
export function legacyCodeClashNotice(code: string, otherEmployeeNumber: string): string {
  return (
    `El código ${normalizeLegacyCheckerCode(code)} también es el número de nómina de otro colaborador ` +
    `(${otherEmployeeNumber}). En el checador, quien teclee ${normalizeLegacyCheckerCode(code)} ` +
    'tendrá que usar su número de empleado completo, porque no se puede saber cuál de los dos es. ' +
    'Si aun así quieres guardarlo, toca Guardar otra vez.'
  );
}
