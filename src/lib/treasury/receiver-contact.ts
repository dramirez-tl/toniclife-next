// receiver-contact.ts - Enlaces para contactar al distribuidor desde el panel
// "Datos del recibo" (Tesorería, 28-nov-2026): el equipo le llama o le escribe
// para pedirle su RFC, CURP o código postal y volver a timbrar. Lógica pura.
//
// Los teléfonos de las cuentas se guardan SIN lada de país (10 dígitos en
// México, Frontera, EE. UU. y Colombia; 8 en Guatemala), así que la lada se
// pone según el país de la cuenta. Si el número no tiene el largo esperado no
// se adivina: se enseña tal cual y no se ofrece WhatsApp.

import { phoneDigits } from '@/lib/network/contact';

/** Lada y largo del número nacional por país de la cuenta. */
const DIAL: Record<string, { prefix: string; digits: number }> = {
  MX: { prefix: '52', digits: 10 },
  FN: { prefix: '52', digits: 10 },
  US: { prefix: '1', digits: 10 },
  CO: { prefix: '57', digits: 10 },
  GT: { prefix: '502', digits: 8 },
};

export interface ReceiverContactLinks {
  /** Como está guardado (sin espacios a los lados) o null. */
  phone: string | null;
  /** `tel:` para marcar; null si no es marcable. */
  phoneHref: string | null;
  /** `https://wa.me/<lada + número>`; null si no se puede armar con certeza. */
  whatsappHref: string | null;
  email: string | null;
  emailHref: string | null;
}

/** Número completo con lada (solo dígitos) o null si no se puede saber. */
function internationalDigits(digits: string, countryCode: string | null | undefined): string | null {
  const dial = DIAL[(countryCode ?? '').trim().toUpperCase()];
  if (!dial) return null;
  if (digits.length === dial.digits) return `${dial.prefix}${digits}`;
  if (digits.length === dial.prefix.length + dial.digits && digits.startsWith(dial.prefix)) return digits;
  return null;
}

export function receiverContactLinks(
  contact: { phone: string | null; email: string | null } | null | undefined,
  countryCode: string | null | undefined,
): ReceiverContactLinks {
  const phone = contact?.phone?.trim() || null;
  const email = contact?.email?.trim() || null;
  const digits = phoneDigits(phone);
  const full = digits ? internationalDigits(digits, countryCode) : null;
  return {
    phone,
    phoneHref: full ? `tel:+${full}` : digits.length >= 8 ? `tel:${digits}` : null,
    whatsappHref: full ? `https://wa.me/${full}` : null,
    email,
    emailHref: email && /^[^\s@]+@[^\s@]+$/.test(email) ? `mailto:${email}` : null,
  };
}

/** ¿Hay por dónde contactarlo? */
export const hasContact = (links: ReceiverContactLinks): boolean => !!links.phone || !!links.email;
