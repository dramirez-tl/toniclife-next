// guests.ts - Lista de invitados de un evento privado: formulario de un
// invitado (alta y edición), textos de la vista previa de la carga masiva y
// del aforo. Lógica pura, sin React.

import {
  GUEST_FLAG_LABEL,
  type AddEventGuestInput,
  type EventGuestDto,
  type EventGuestsSummary,
  type GuestFlag,
  type GuestImportResult,
  type GuestKind,
  type GuestStatus,
  type UpdateEventGuestInput,
} from '@/types/event-guests';

export const GUEST_SEATS_MAX = 20;

/** Formulario de un invitado: todo en texto, como lo teclea la responsable. */
export interface GuestFormValues {
  kind: GuestKind;
  /** kind = distributor: su número de distribuidor. */
  customerNumber: string;
  /** kind = companion: el número del distribuidor que lo invita. */
  hostCustomerNumber: string;
  fullName: string;
  accessType: string;
  network: string;
  seats: string;
  phone: string;
  email: string;
  notes: string;
  status: GuestStatus;
}

export const EMPTY_GUEST_FORM: GuestFormValues = {
  kind: 'distributor',
  customerNumber: '',
  hostCustomerNumber: '',
  fullName: '',
  accessType: '',
  network: '',
  seats: '1',
  phone: '',
  email: '',
  notes: '',
  status: 'invited',
};

export function guestToForm(g: EventGuestDto): GuestFormValues {
  return {
    kind: g.kind,
    customerNumber: g.customerNumber ?? '',
    hostCustomerNumber: g.hostCustomerNumber ?? '',
    fullName: g.fullName,
    accessType: g.accessType ?? '',
    network: g.network ?? '',
    seats: String(g.seats),
    phone: g.phone ?? '',
    email: g.email ?? '',
    notes: g.notes ?? '',
    status: g.status,
  };
}

const NUMBER_RE = /^\d{1,12}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const digits = (s: string) => s.replace(/\D/g, '');

/** Primer error del formulario (texto para el toast) o null si está completo. */
export function validateGuestForm(v: GuestFormValues): string | null {
  if (v.kind === 'distributor') {
    if (!NUMBER_RE.test(v.customerNumber.trim()))
      return 'Escribe el número de distribuidor del invitado (solo dígitos).';
  } else {
    if (v.kind === 'companion' && !NUMBER_RE.test(v.hostCustomerNumber.trim()))
      return 'Escribe el número del distribuidor que lo invita (solo dígitos).';
    if (v.fullName.trim().length < 2) return 'Escribe el nombre del invitado.';
  }
  if (v.fullName.trim().length > 200) return 'El nombre es demasiado largo (máximo 200).';
  const seats = Number(v.seats);
  if (!Number.isInteger(seats) || seats < 1 || seats > GUEST_SEATS_MAX)
    return `Los lugares deben ser un entero entre 1 y ${GUEST_SEATS_MAX}.`;
  if (v.phone.trim() && digits(v.phone).length < 10) return 'El teléfono debe tener al menos 10 dígitos.';
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) return 'El correo no es válido.';
  if (v.notes.length > 500) return 'Las notas son demasiado largas (máximo 500).';
  return null;
}

const text = (s: string): string | undefined => (s.trim() === '' ? undefined : s.trim());

/** Formulario → POST /events/:id/guests. Los vacíos no se mandan. */
export function toAddGuestInput(v: GuestFormValues): AddEventGuestInput {
  return {
    customerNumber: v.kind === 'distributor' ? v.customerNumber.trim() : undefined,
    hostCustomerNumber: v.kind === 'companion' ? v.hostCustomerNumber.trim() : undefined,
    // Del distribuidor se toma el nombre de su ficha si no se escribe otro.
    fullName: text(v.fullName),
    accessType: text(v.accessType),
    network: text(v.network),
    seats: Number(v.seats),
    phone: text(v.phone),
    email: text(v.email),
    notes: text(v.notes),
  };
}

/**
 * Formulario → PATCH /events/:id/guests/:guestId. Solo lo que cambió; un campo
 * que quedó vacío va en null para que el API lo limpie.
 */
export function toUpdateGuestInput(original: EventGuestDto, v: GuestFormValues): UpdateEventGuestInput {
  const out: UpdateEventGuestInput = {};
  if (v.kind === 'distributor') {
    if (v.customerNumber.trim() !== (original.customerNumber ?? '')) out.customerNumber = v.customerNumber.trim();
  } else if (v.kind === 'companion') {
    if (original.kind !== 'companion' || v.hostCustomerNumber.trim() !== (original.hostCustomerNumber ?? ''))
      out.hostCustomerNumber = v.hostCustomerNumber.trim();
  } else if (original.kind === 'distributor') {
    out.customerNumber = null;
  } else if (original.kind === 'companion') {
    out.hostCustomerNumber = null;
  }
  const name = v.fullName.trim();
  if (name && name !== original.fullName) out.fullName = name;
  const nullable = (field: 'accessType' | 'network' | 'phone' | 'email' | 'notes') => {
    const next = text(v[field]) ?? null;
    if (next !== (original[field] ?? null)) out[field] = next;
  };
  nullable('accessType');
  nullable('network');
  nullable('phone');
  nullable('email');
  nullable('notes');
  const seats = Number(v.seats);
  if (seats !== original.seats) out.seats = seats;
  if (v.status !== original.status) out.status = v.status;
  return out;
}

export function guestFlagLabel(flag: string): string {
  return GUEST_FLAG_LABEL[flag as GuestFlag] ?? flag;
}

/** "462 555 0102" para leerlo; lo que no son 10 dígitos se deja igual. */
export function formatGuestPhone(phone: string | null | undefined): string {
  const d = digits(phone ?? '');
  if (d.length !== 10) return phone ?? '';
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es-MX')} ${n === 1 ? one : many}`;

/** Lugares contra el aforo: "619 lugares · aforo abierto", "520 de 700 lugares"… */
export function capacityNote(summary: Pick<EventGuestsSummary, 'seats' | 'capacity'>): {
  text: string;
  over: boolean;
} {
  const seats = plural(summary.seats, 'lugar', 'lugares');
  if (summary.capacity === null) return { text: `${seats} · aforo abierto`, over: false };
  const cap = summary.capacity.toLocaleString('es-MX');
  if (summary.seats > summary.capacity) {
    return {
      text: `${seats} para un aforo de ${cap}: sobran ${(summary.seats - summary.capacity).toLocaleString('es-MX')}`,
      over: true,
    };
  }
  return {
    text: `${summary.seats.toLocaleString('es-MX')} de ${cap} lugares · quedan ${(summary.capacity - summary.seats).toLocaleString('es-MX')}`,
    over: false,
  };
}

/** Lo que dice la vista previa de la carga masiva, en renglones. */
export function importPreviewLines(result: GuestImportResult): string[] {
  const t = result.totals;
  const lines = [
    `${plural(t.rows, 'renglón leído', 'renglones leídos')} → ${plural(t.guests, 'invitado', 'invitados')} y ${plural(t.seats, 'lugar', 'lugares')}.`,
    `${plural(t.distributors, 'distribuidor', 'distribuidores')}, ${plural(t.companions, 'acompañante', 'acompañantes')} y ${t.external.toLocaleString('es-MX')} solo por nombre.`,
  ];
  if (t.alreadyInList > 0) {
    lines.push(
      `${plural(t.alreadyInList, 'ya está', 'ya están')} en la lista y no se ${t.alreadyInList === 1 ? 'duplica' : 'duplican'}; se ${t.toCreate === 1 ? 'carga' : 'cargan'} ${plural(t.toCreate, 'nuevo', 'nuevos')}.`,
    );
  }
  const unread = result.sheets.filter((s) => s.skipped);
  for (const s of unread) lines.push(`La hoja "${s.name}" no se leyó: ${s.skipped}.`);
  if (result.skipped.length > 0) {
    lines.push(`${plural(result.skipped.length, 'renglón no se pudo leer', 'renglones no se pudieron leer')} (sin nombre).`);
  }
  return lines;
}

/** Avisos de la vista previa, de más a menos, con su etiqueta. */
export function importFlagCounts(result: GuestImportResult): { flag: string; label: string; count: number }[] {
  return Object.entries(result.totals.flags)
    .filter(([, count]) => count > 0)
    .map(([flag, count]) => ({ flag, label: guestFlagLabel(flag), count }))
    .sort((a, b) => b.count - a.count);
}
