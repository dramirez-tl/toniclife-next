// events.ts - Tipos del módulo Eventos con venta de boletos.
// Espejo de toniclife-api/src/modules/events/dto/events.dto.ts (mig 154).
//
// Un evento vive como PRODUCTO de tipo 'event' (clave como cualquier producto)
// para que el POS lo cobre con su flujo normal; los boletos asignados a cada
// sucursal son la "existencia" de ese producto en esa sucursal. Al cobrar se
// emiten los boletos (uno por asistente, con número y QR) y se envían por correo.

export const EVENT_STATUSES = ['draft', 'active', 'closed', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const TICKET_STATUSES = ['issued', 'checked_in', 'cancelled'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const EVENT_TAX_MODES = ['iva_16', 'exempt'] as const;
export type EventTaxMode = (typeof EVENT_TAX_MODES)[number];

/** Asignación "sin límite" de boletos para una sucursal (mismo valor que el API). */
export const UNLIMITED_ALLOTMENT = 100000;

/** Zona horaria por defecto de los eventos. */
export const EVENT_DEFAULT_TIMEZONE = 'America/Mexico_City';

// ================================
// Etiquetas (español)
// ================================

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Borrador',
  active: 'En venta',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

/** Qué significa cada estado (ayuda en pantalla). */
export const EVENT_STATUS_HELP: Record<EventStatus, string> = {
  draft: 'Todavía no se vende en el POS.',
  active: 'En venta en las sucursales asignadas.',
  closed: 'Ya no se vende; los boletos emitidos siguen vigentes para la entrada.',
  cancelled: 'Cancelado: ya no se vende.',
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  issued: 'Vigente',
  checked_in: 'Ya ingresó',
  cancelled: 'Cancelado',
};

export const EVENT_TAX_MODE_LABEL: Record<EventTaxMode, string> = {
  iva_16: 'IVA 16 %',
  exempt: 'Exento de IVA',
};

// ================================
// ENTRADA (admin)
// ================================

export interface CreateEventInput {
  /**
   * Producto EXISTENTE del catálogo que será el boleto (uuid). Si viene, el
   * API usa ese producto (conserva tipo, precios por tipo de precio y
   * existencias por sucursal), `code` y `ticketPrice` dejan de ser obligatorios
   * y se ignoran `productName`, `satProductCode` y `satUnitCode`.
   */
  productId?: string;
  /** Clave del evento = clave del producto que se teclea en el POS (3-30, letras/números/guiones). Obligatoria sin `productId`. */
  code?: string;
  name: string;
  /** Nombre del producto en el POS/ticket (por defecto el del evento). */
  productName?: string;
  description?: string;
  speaker?: string;
  /** Fecha del evento (YYYY-MM-DD). */
  eventDate: string;
  /** HH:MM */
  startTime?: string;
  /** Hora de registro/apertura HH:MM */
  doorsTime?: string;
  endTime?: string;
  timezone?: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  /** País del evento (countries.id). Por defecto México. Solo sucursales de ese país venden. */
  countryId?: string;
  /** Aforo total (vacío = sin tope). */
  capacity?: number;
  /** Boletos que genera cada unidad vendida (acceso + invitados). 1-20. */
  ticketsPerUnit?: number;
  /** Precio al público con impuestos incluidos. Obligatorio sin `productId`. */
  ticketPrice?: number;
  taxMode?: EventTaxMode;
  /** Clave SAT producto/servicio (8 dígitos). */
  satProductCode?: string;
  /** Clave SAT de unidad. */
  satUnitCode?: string;
  /** Producto que se entrega con el boleto (informativo; se imprime como "Incluye"). */
  includedProductId?: string;
  includedQuantity?: number;
  imageUrl?: string;
  /** Texto que se imprime en el boleto (reglas de acceso). */
  ticketNotes?: string;
  /** Texto adicional del correo. */
  emailNotes?: string;
  /** Inicio de venta (YYYY-MM-DD). */
  saleStartsOn?: string;
  /** Fin de venta (YYYY-MM-DD). */
  saleEndsOn?: string;
}

type Nullable<T> = { [K in keyof T]?: T[K] | null };

/**
 * PATCH /events/:id. Todo opcional; `null` en un campo opcional = limpiarlo
 * (el DTO del API lleva @IsOptional, que acepta null). Ni la clave ni el
 * producto se cambian; con producto vinculado, `ticketPrice` responde 400
 * EVENT_LINKED_PRODUCT (el precio se edita en Productos).
 */
export type UpdateEventInput = Nullable<Omit<CreateEventInput, 'code' | 'productId'>> & {
  status?: EventStatus;
};

export interface EventBranchAllotment {
  branchId: string;
  /** Boletos (unidades vendibles) asignados a la sucursal; UNLIMITED_ALLOTMENT = sin límite. */
  allotment: number;
}

export interface SetEventBranchesInput {
  branches: EventBranchAllotment[];
}

export interface EventQuery {
  status?: EventStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EventTicketsQuery {
  status?: TicketStatus;
  /** Número de boleto, asistente, correo o folio de venta. */
  search?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface CheckInInput {
  /** Número de boleto (FOCADE26-00012). */
  ticketNumber?: string;
  /** Token del QR (o la liga completa del boleto escaneada). */
  token?: string;
  /** true = solo consultar el boleto sin registrar la entrada. */
  dryRun?: boolean;
}

export interface SendTicketEmailInput {
  /** Destinatario; sin él se usa el correo del asistente/cliente. */
  to?: string;
}

// ================================
// SALIDA
// ================================

export interface EventStatsDto {
  branches: number;
  /** Unidades asignadas (suma de sucursales activas). */
  allotted: number;
  /** Unidades que aún se pueden vender. */
  remaining: number;
  /** Unidades vendidas (ventas cobradas). */
  soldUnits: number;
  ticketsIssued: number;
  ticketsCheckedIn: number;
  ticketsCancelled: number;
}

export interface EventDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  speaker: string | null;
  /** YYYY-MM-DD */
  eventDate: string;
  startTime: string | null;
  doorsTime: string | null;
  endTime: string | null;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  state: string | null;
  countryId: string;
  countryCode: string;
  capacity: number | null;
  ticketsPerUnit: number;
  ticketPrice: number;
  currencyCode: string;
  taxMode: EventTaxMode;
  satProductCode: string | null;
  satUnitCode: string | null;
  includedProductId: string | null;
  includedProductCode: string | null;
  includedProductName: string | null;
  includedQuantity: number;
  imageUrl: string | null;
  ticketNotes: string | null;
  emailNotes: string | null;
  saleStartsOn: string | null;
  saleEndsOn: string | null;
  status: EventStatus;
  productId: string;
  productCode: string;
  productName: string;
  /**
   * true = el evento usa un producto existente del catálogo: se vende donde
   * haya existencia del producto (sin asignación por sucursal) y el precio se
   * edita en Productos.
   */
  linkedProduct: boolean;
  stats: EventStatsDto;
  createdAt: string;
  updatedAt: string;
}

export interface EventListResponseDto {
  items: EventDto[];
  total: number;
  page: number;
  limit: number;
}

export interface EventBranchDto {
  branchId: string;
  branchCode: string;
  branchName: string;
  allotment: number;
  /** Unidades que aún puede vender la sucursal. */
  remaining: number;
  /** Unidades vendidas en la sucursal. */
  soldUnits: number;
  ticketsIssued: number;
  isActive: boolean;
}

export interface EventTicketDto {
  id: string;
  eventId: string;
  eventCode: string;
  eventName: string;
  ticketNumber: string;
  /** Token del QR (liga pública). */
  token: string;
  publicUrl: string;
  status: TicketStatus;
  attendeeName: string | null;
  attendeeEmail: string | null;
  attendeePhone: string | null;
  saleId: string;
  saleNumber: string | null;
  branchId: string | null;
  branchName: string | null;
  customerId: string | null;
  customerNumber: string | null;
  issuedAt: string;
  checkedInAt: string | null;
  checkedInByName: string | null;
  cancelledAt: string | null;
  emailStatus: string;
  emailedAt: string | null;
  emailedTo: string | null;
  emailCount: number;
}

export interface EventTicketsResponseDto {
  items: EventTicketDto[];
  total: number;
  page: number;
  limit: number;
}

export type CheckInResultCode =
  | 'ok'
  | 'already_used'
  | 'cancelled'
  | 'other_event'
  | 'not_found'
  | 'dry_run';

export interface CheckInResultDto {
  /** true si la entrada quedó registrada en esta llamada. */
  checkedIn: boolean;
  result: CheckInResultCode;
  message: string | null;
  ticket: EventTicketDto | null;
}

export interface TicketEmailResultDto {
  sentTo: string;
  tickets: number;
  emailedAt: string;
}

/** Vista pública del boleto (liga del correo / QR). Sin datos sensibles. */
export interface PublicTicketDto {
  ticketNumber: string;
  status: TicketStatus;
  attendeeName: string | null;
  /** URL absoluta del PNG del QR. */
  qrUrl: string;
  checkedInAt: string | null;
  event: {
    name: string;
    speaker: string | null;
    eventDate: string;
    startTime: string | null;
    doorsTime: string | null;
    venueName: string | null;
    venueAddress: string | null;
    city: string | null;
    state: string | null;
    imageUrl: string | null;
    ticketNotes: string | null;
    includedProductName: string | null;
    includedQuantity: number;
  };
}
