// event-guests.ts - Lista de invitados de un evento privado (por invitación).
// Espejo de los DTOs del API (/events/:id/guests).

export const GUEST_STATUSES = ['invited', 'confirmed', 'declined'] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

/**
 * distributor = el invitado es ese distribuidor (su contacto sale de su ficha) ·
 * companion = acompañante de un distribuidor · external = solo se tiene su nombre.
 */
export const GUEST_KINDS = ['distributor', 'companion', 'external'] as const;
export type GuestKind = (typeof GUEST_KINDS)[number];

/** Avisos de la carga que la responsable debe revisar. */
export const GUEST_FLAGS = [
  'no_id',
  'id_not_found',
  'name_mismatch',
  'inactive',
  'repeated',
  'several_access',
] as const;
export type GuestFlag = (typeof GUEST_FLAGS)[number];

export type GuestContactFilter = 'none' | 'no_email' | 'no_phone' | 'with_email' | 'with_phone';

export const GUEST_STATUS_LABEL: Record<GuestStatus, string> = {
  invited: 'En la lista',
  confirmed: 'Confirmó',
  declined: 'No asistirá',
};

export const GUEST_KIND_LABEL: Record<GuestKind, string> = {
  distributor: 'Distribuidor',
  companion: 'Acompañante',
  external: 'Solo por nombre',
};

export const GUEST_FLAG_LABEL: Record<GuestFlag, string> = {
  no_id: 'Sin ID',
  id_not_found: 'El ID no existe',
  name_mismatch: 'El ID es de otra persona',
  inactive: 'Distribuidor inactivo',
  repeated: 'Venía repetido',
  several_access: 'Más de un tipo de acceso',
};

/** Qué hacer con cada aviso (se muestra al pasar el cursor y en la vista previa). */
export const GUEST_FLAG_HELP: Record<GuestFlag, string> = {
  no_id: 'No traía ID: quedó solo por su nombre. Para invitarlo, captúrale teléfono o correo, o lígalo a su número de distribuidor.',
  id_not_found:
    'Ese número no existe en el sistema (¿un dígito de más o de menos?). Quedó solo por su nombre: corrige el ID o captúrale su contacto.',
  name_mismatch:
    'El ID existe, pero la ficha tiene otro nombre: se tomó como ACOMPAÑANTE de ese distribuidor. Si en realidad es el distribuidor, lígalo a su número.',
  inactive: 'El distribuidor está inactivo o dado de baja en el sistema.',
  repeated:
    'El mismo renglón venía más de una vez: se dejó UNA vez con más lugares. Si fue un error de captura, bájale los lugares.',
  several_access: 'La misma persona viene con más de un tipo de acceso: confirma cuál es el correcto y quita el otro.',
};

export interface EventGuestDto {
  id: string;
  eventId: string;
  kind: GuestKind;
  fullName: string;
  accessType: string | null;
  network: string | null;
  seats: number;
  status: GuestStatus;
  flags: string[];
  notes: string | null;
  /** El ID tal como venía en la lista (exista o no). */
  listedNumber: string | null;
  customerId: string | null;
  customerNumber: string | null;
  /** Nombre en su ficha. */
  customerName: string | null;
  customerActive: boolean | null;
  hostCustomerId: string | null;
  hostCustomerNumber: string | null;
  hostName: string | null;
  /** Contacto propio capturado para este invitado. */
  phone: string | null;
  email: string | null;
  /** A dónde se le mandaría: el propio o, si es distribuidor, el de su ficha. */
  contactPhone: string | null;
  contactPhoneCountryCode: string | null;
  contactEmail: string | null;
  isActive: boolean;
  removedAt: string | null;
  source: string;
  sourceSheet: string | null;
  sourceRow: number | null;
  emailStatus: string;
  emailedAt: string | null;
  emailedTo: string | null;
  emailCount: number;
  whatsappStatus: string;
  whatsappSentAt: string | null;
  whatsappTo: string | null;
  whatsappCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuestAccessCount {
  accessType: string;
  guests: number;
  seats: number;
}

export interface EventGuestsSummary {
  guests: number;
  seats: number;
  /** Aforo del evento; null = abierto. */
  capacity: number | null;
  distributors: number;
  companions: number;
  external: number;
  confirmed: number;
  declined: number;
  /** Con algún aviso por revisar. */
  flagged: number;
  /** Sin teléfono ni correo a dónde invitarlos. */
  withoutContact: number;
  withEmail: number;
  withPhone: number;
  /** Quitados de la lista. */
  removed: number;
  byAccess: GuestAccessCount[];
}

export interface EventGuestsResponse {
  items: EventGuestDto[];
  total: number;
  page: number;
  limit: number;
  summary: EventGuestsSummary;
}

export interface EventGuestsQuery {
  search?: string;
  accessType?: string;
  status?: GuestStatus;
  kind?: GuestKind;
  /** 'any' = con cualquier aviso. */
  flag?: GuestFlag | 'any';
  contact?: GuestContactFilter;
  /** true = los que se quitaron de la lista. */
  removed?: boolean;
  page?: number;
  limit?: number;
}

export interface AddEventGuestInput {
  /** El invitado ES ese distribuidor. */
  customerNumber?: string;
  /** Es acompañante de ese distribuidor. */
  hostCustomerNumber?: string;
  fullName?: string;
  accessType?: string;
  network?: string;
  seats?: number;
  phone?: string;
  email?: string;
  notes?: string;
}

/** Un campo en null se limpia. */
export interface UpdateEventGuestInput {
  fullName?: string;
  customerNumber?: string | null;
  hostCustomerNumber?: string | null;
  accessType?: string | null;
  network?: string | null;
  seats?: number;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  status?: GuestStatus;
  /** true = ya se revisó: se le quitan los avisos. */
  reviewed?: boolean;
}

export interface BulkGuestsResult {
  removed: number;
  summary: EventGuestsSummary;
}

export interface GuestImportRow {
  row: number;
  sheet: string | null;
  fullName: string;
  kind: GuestKind;
  listedNumber: string | null;
  accessType: string | null;
  network: string | null;
  seats: number;
  flags: string[];
  /** Ficha del ID: del invitado (distribuidor) o de su titular. */
  customerNumber: string | null;
  customerName: string | null;
  /** Ya está en la lista: no se vuelve a cargar. */
  alreadyInList: boolean;
}

export interface GuestImportTotals {
  rows: number;
  guests: number;
  seats: number;
  distributors: number;
  companions: number;
  external: number;
  alreadyInList: number;
  toCreate: number;
  byAccess: GuestAccessCount[];
  flags: Record<string, number>;
}

export interface GuestImportResult {
  /** true = se guardó; false = solo vista previa. */
  applied: boolean;
  created: number;
  totals: GuestImportTotals;
  sheets: { name: string; rows: number; skipped: string | null }[];
  guests: GuestImportRow[];
  skipped: { row: number; sheet: string | null; reason: string }[];
  summary: EventGuestsSummary | null;
}

/** Lo que se manda a la carga masiva: el Excel o la lista pegada. */
export interface GuestImportInput {
  file?: File | null;
  text?: string;
  /** Tipo de acceso para los renglones que no traen uno. */
  accessType?: string;
}
