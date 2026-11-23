// IMPULSA: la ruta de los primeros 90 días de cada nuevo Distribuidor, en 6 Victorias (V1 … V6).
// Vive en la plataforma donde vive RISE Academy. Tipos de lo que entrega el API (`/impulsa/*`).
// Aquí los niveles se manejan por Victorias (Sistemas, 23-nov-2026).

export type ImpulsaAvailability = 'available' | 'coming_soon';
/** Por calendario: sus días ya pasaron, es la de hoy o todavía no llega. */
export type ImpulsaMoment = 'completed' | 'current' | 'upcoming';
export type ImpulsaDayMoment = 'past' | 'today' | 'upcoming';

export interface ImpulsaVictory {
  number: number;
  /** 'V1' … 'V6'. */
  code: string;
  title: string;
  dayFrom: number;
  dayTo: number;
  availability: ImpulsaAvailability;
  moment: ImpulsaMoment;
  /** Solo para el admin: cómo va su producción ("Producción", "Planeada"…). */
  productionStatus?: string;
}

export interface ImpulsaParticipant {
  customerNumber: string;
  firstName: string;
  /** Día 0 = fecha de inscripción (YYYY-MM-DD). */
  dayZero: string;
  /** 'manual' = Comercial movió su Día 0 (demostraciones o correcciones). */
  dayZeroSource: 'enrollment' | 'manual';
  /** Día de la ruta: 0 el de la inscripción. */
  day: number;
  /** true mientras va en sus primeros 90 días. */
  inRoute: boolean;
  /** Victoria que le toca hoy (1 … 6); null después del Día 90. */
  currentVictory: number | null;
}

export interface ImpulsaSponsor {
  name: string;
  customerNumber: string | null;
  phone: string | null;
  /** Código de marcado del país ('52', '1'…). */
  phoneCountryCode: string | null;
  /** false = su Patrocinador no está activo y no hay línea ascendente activa. */
  isActive: boolean;
  /** true = quien aparece es su línea ascendente (su Patrocinador directo no está activo). */
  isUpline: boolean;
}

export interface ImpulsaCallCenter {
  phones: string[];
  whatsapp: string;
}

export type ImpulsaMessageField =
  | 'Nombre'
  | 'ID'
  | 'Patrocinador'
  | 'enlace del video'
  | 'enlace de la guía'
  | 'hora'
  | 'día';

export type ImpulsaMessagePart = { type: 'text'; text: string } | { type: 'field'; field: ImpulsaMessageField };

export interface ImpulsaCardSummary {
  checksDone: number;
  checksTotal: number;
  percent: number;
  welcomeDone: boolean;
  sessionChecks: number;
  sessionTotal: number;
  sessionDone: boolean;
  reviewDone: boolean;
  activityTotal: number;
  day7Results: [boolean, boolean, boolean, boolean];
  victoryCompleted: boolean;
}

export type ImpulsaCardSection = 'day0' | 'session' | 'day7';
export type ImpulsaActivityMetric = 'tried_or_bought' | 'invitations' | 'presentations' | 'follow_ups';

export interface ImpulsaCardCheck {
  key: string;
  section: ImpulsaCardSection;
  label: string;
  checked: boolean;
  checkedAt: string | null;
}

export interface ImpulsaCardCounter {
  metric: ImpulsaActivityMetric;
  label: string;
  /** Casillas del renglón en la tarjeta impresa (10). */
  boxes: number;
  /** Lo que lleva en total. */
  total: number;
  /** Lo que registró hoy. */
  today: number;
}

export interface ImpulsaCard {
  title: string;
  subtitle: string;
  checks: ImpulsaCardCheck[];
  sessionTitle: string;
  sessionNote: string;
  dailyTitle: string;
  dailyNote: string;
  counters: ImpulsaCardCounter[];
  goalTitle: string;
  goalText: string;
  commitment: { text: string; acceptedAt: string | null };
  nextAction: { date: string | null; note: string | null };
  summary: ImpulsaCardSummary;
  /** "Resultado al Día 7": cada meta con si ya se cumplió. */
  day7Results: { label: string; done: boolean }[];
}

/** Portada de IMPULSA para el Distribuidor (`GET /impulsa/me`). */
export interface ImpulsaOverview {
  /** false = falta aplicar la migración: la ruta se ve, pero el avance no se guarda. */
  ready: boolean;
  today: string;
  participant: ImpulsaParticipant;
  sponsor: ImpulsaSponsor | null;
  victories: ImpulsaVictory[];
  /** Resumen de su Tarjeta de Ruta de la Victoria 1. */
  card: ImpulsaCardSummary | null;
  /** Título del mensaje de hoy ("Día 3 · Sigo invitando"), si su Victoria ya está disponible. */
  todayTitle: string | null;
  /** Nuevos distribuidores que acompaña como Patrocinador. */
  teamCount: number;
  helpText: string;
  callCenter: ImpulsaCallCenter;
}

export interface ImpulsaStage {
  key: string;
  label: string;
  title: string;
  dayFrom: number;
  dayTo: number;
  distributor: string;
  sponsor: string;
  moment: ImpulsaDayMoment;
}

export interface ImpulsaDayVideo {
  courseId: string;
  lessonId: string;
  title: string;
  durationMinutes: number | null;
  hasVideo: boolean;
}

export interface ImpulsaDay {
  day: number;
  /** Clave del mensaje ('D0' … 'D7'). */
  code: string;
  title: string;
  stageKey: string;
  moment: ImpulsaDayMoment;
  /** Mensaje del día con [Nombre], [ID] y [Patrocinador] ya puestos; los enlaces quedan como campos. */
  messageParts: ImpulsaMessagePart[];
  /** Microvideo del día; null mientras Producción no lo entrega. */
  video: ImpulsaDayVideo | null;
}

export interface ImpulsaGuide {
  id: string;
  title: string;
  description: string | null;
  type: string;
}

export interface ImpulsaVictoryCourse {
  id: string;
  title: string;
  instructor: string | null;
  lessonsCount: number;
}

/** Todo lo de una Victoria (`GET /impulsa/victories/:number`). */
export interface ImpulsaVictoryDetail {
  ready: boolean;
  today: string;
  victory: ImpulsaVictory & { tagline: string | null };
  participant: ImpulsaParticipant;
  sponsor: ImpulsaSponsor | null;
  stages: ImpulsaStage[];
  days: ImpulsaDay[];
  guides: ImpulsaGuide[];
  /** Guías que la Victoria tendrá (nombres), para saber cuáles faltan por subir. */
  expectedGuides: string[];
  courses: ImpulsaVictoryCourse[];
  card: ImpulsaCard | null;
  principle: string | null;
  always: string[];
  values: string[];
  helpText: string;
  callCenter: ImpulsaCallCenter;
}

/** Aviso al Patrocinador con su acción y el mensaje que puede mandarle a su Distribuidor. */
export interface ImpulsaTeamNotice {
  code: string;
  day: number;
  action: string;
  notice: string;
  suggestedMessage: string;
}

export interface ImpulsaTeamMember {
  customerNumber: string;
  name: string;
  firstName: string;
  phone: string | null;
  /** Código de marcado del país ('52', '1'…), para abrir WhatsApp. */
  phoneCountryCode: string | null;
  dayZero: string;
  day: number;
  victory: ImpulsaVictory | null;
  /** true = lo acompaño como línea ascendente porque su Patrocinador no está activo. */
  viaUpline: boolean;
  card: ImpulsaCardSummary | null;
  lastActivityAt: string | null;
  /** Aviso vigente hoy; null si su Victoria aún no tiene avisos. */
  notice: ImpulsaTeamNotice | null;
}

/** Mi equipo en IMPULSA (`GET /impulsa/team`). */
export interface ImpulsaTeam {
  ready: boolean;
  today: string;
  members: ImpulsaTeamMember[];
  /** Las 6 acciones del Patrocinador, en orden. */
  actions: { code: string; day: number; action: string }[];
}

// ----------------------------------------------------------------------------
// Admin (Comercial › Capacitación › IMPULSA)
// ----------------------------------------------------------------------------

export interface ImpulsaAdminSummary {
  ready: boolean;
  today: string;
  /** Inscritos en el rango pedido. */
  from: string;
  to: string;
  /** Lo que se mide (infografía). */
  totals: {
    /** Nuevos distribuidores inscritos en el rango. */
    enrolled: number;
    /** Siguen dentro de sus primeros 90 días. */
    inRoute: number;
    /** Marcaron su Día 0 (vieron la bienvenida y agendaron). */
    dayZeroDone: number;
    /** Sesiones de Arranque hechas (sus 6 casillas). */
    sessionsDone: number;
    /** Ya llegaron a su Día 7 por calendario. */
    reachedDay7: number;
    /** Llegaron al Día 7 con su Victoria 1 completa: pasan a la V2. */
    victoryCompleted: number;
    /** Aceptaron su Compromiso Tonic. */
    commitments: number;
    /** Abrieron su Tarjeta de Ruta (marcaron o registraron algo). */
    withActivity: number;
  };
  byVictory: { number: number; code: string; title: string; count: number }[];
  activity: { metric: ImpulsaActivityMetric; label: string; total: number }[];
}

export interface ImpulsaAdminParticipant {
  customerId: string;
  customerNumber: string;
  name: string;
  sponsorName: string | null;
  sponsorNumber: string | null;
  branchCode: string | null;
  countryCode: string | null;
  dayZero: string;
  dayZeroSource: 'enrollment' | 'manual';
  day: number;
  victoryCode: string | null;
  card: ImpulsaCardSummary;
  commitmentAccepted: boolean;
  nextActionDate: string | null;
  lastActivityAt: string | null;
  activity: Record<ImpulsaActivityMetric, number>;
}

export interface ImpulsaAdminParticipants {
  ready: boolean;
  data: ImpulsaAdminParticipant[];
  total: number;
  page: number;
  limit: number;
}

export interface ImpulsaAdminQuery {
  from?: string;
  to?: string;
  search?: string;
  /** 1 … 6: solo quienes van hoy en esa Victoria. */
  victory?: number;
  page?: number;
  limit?: number;
}

export interface ImpulsaCatalogMessage {
  code: string;
  day: number;
  moment: string;
  title: string;
  message: string;
}

export interface ImpulsaCatalogNotice {
  code: string;
  day: number;
  notice: string;
  action: string;
  suggestedMessage: string;
}

/** Lo aprobado por Dirección General, tal cual (`GET /impulsa/admin/catalog`). */
export interface ImpulsaAdminCatalog {
  ready: boolean;
  routeLastDay: number;
  victories: (Omit<ImpulsaVictory, 'moment'> & {
    productionStatus: string;
    /** Cursos de RISE Academy asignados a la Victoria y videos ya subidos por día. */
    courses: number;
    videos: number;
    guides: number;
  })[];
  v1: {
    tagline: string;
    stages: Omit<ImpulsaStage, 'moment'>[];
    messages: ImpulsaCatalogMessage[];
    notices: ImpulsaCatalogNotice[];
    /** Días que ya tienen su microvideo asignado. */
    videoDays: number[];
    expectedGuides: string[];
    guides: ImpulsaGuide[];
    day7Results: string[];
    always: string[];
  };
  fields: ImpulsaMessageField[];
}
