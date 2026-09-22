// branch-form-payload.ts - Normaliza el formulario de sucursal (admin) antes
// de mandarlo al API: POST /branches (alta) y PATCH /branches/:id (edición).
// Puro: sin React ni DOM, cubierto por vitest.
//
// El ValidationPipe del API (whitelist + forbidNonWhitelisted) valida todo
// campo PRESENTE y @IsOptional solo ignora null/undefined, nunca ''. Por eso
// los opcionales vacíos del formulario no deben viajar:
// - addressEmail ''  → rompe @IsEmail ("addressEmail must be an email").
// - currencyCode ''  → rompe la FK branches.currency_code → currencies(code).
// - stateId ''       → rompe @IsUUID. En el alta se omite (el API guarda NULL);
//                      al editar viaja null para LIMPIAR el estado (p. ej. al
//                      cambiar a un país sin estados).
// - code             → no existe en el UpdateBranchDto del API (la clave no se
//                      edita); mandarlo da "property code should not exist".
// - timezone         → viaja tal cual: el API lo valida contra su lista IANA
//                      (BRANCH_TIMEZONES) y lo persiste en alta y edición.

import type { CreateBranchDto, UpdateBranchDto } from '@/types/branch';

/** Estado del formulario del modal Crear/Editar Sucursal. */
export type BranchFormState = CreateBranchDto;

/** '' (o solo espacios) → undefined; el resto recortado. */
export function blankToUndefined(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Payload de POST /branches. */
export function toCreateBranchPayload(form: BranchFormState): CreateBranchDto {
  return {
    ...form,
    stateId: form.stateId || undefined,
    addressEmail: blankToUndefined(form.addressEmail),
    currencyCode: blankToUndefined(form.currencyCode),
  };
}

/** Payload de PATCH /branches/:id (sin `code`). */
export function toUpdateBranchPayload(form: BranchFormState): UpdateBranchDto {
  const fields: Partial<BranchFormState> = { ...form };
  delete fields.code;
  return {
    ...fields,
    stateId: fields.stateId ? fields.stateId : null,
    addressEmail: blankToUndefined(fields.addressEmail),
    currencyCode: blankToUndefined(fields.currencyCode),
  };
}
