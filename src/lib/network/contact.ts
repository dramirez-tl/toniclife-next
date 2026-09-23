// contact.ts — Acciones de contacto de la ficha del socio (contrato
// /distribuidor/red §5.7): enlace de WhatsApp solo si hay teléfono y con el
// número en dígitos (E.164 sin '+'). No se inventa la lada: si el teléfono
// guardado no la trae, se manda tal cual (wa.me lo rechaza y el usuario lo ve;
// es mejor que asumir México para un socio de EE. UU. o Colombia). Lógica pura.

/** Mínimo de dígitos para considerar un teléfono marcable (E.164 permite 8..15). */
export const PHONE_MIN_DIGITS = 8;
export const PHONE_MAX_DIGITS = 15;

/** Solo dígitos del teléfono ('+52 (33) 1234-5678' ⇒ '523312345678'); '' si no hay. */
export function phoneDigits(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D+/g, '');
  // '00' internacional al inicio ('0052…') ⇒ se quita; un solo '0' inicial se conserva.
  return digits.startsWith('00') ? digits.slice(2) : digits;
}

/** `https://wa.me/<dígitos>` o null si el teléfono no es marcable. */
export function whatsAppUrl(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) return null;
  return `https://wa.me/${digits}`;
}
