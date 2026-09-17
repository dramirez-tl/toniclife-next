// hr.ts - Tipos del módulo de Recursos Humanos (expediente, checador,
// horarios, vacaciones y viáticos).
//
// Convención: el API de RRHH responde en camelCase (el service ya no traduce
// snake_case salvo en vacaciones, que sigue devolviendo la fila cruda) y los
// enums viajan en MINÚSCULAS, igual que los CHECK de la base.

import type { BadgeVariant } from './asset';

// ================================
// ENUMS
// ================================

export const EMPLOYEE_STATUSES = [
  'active',
  'inactive',
  'on_leave',
  'terminated',
] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  on_leave: 'En vacaciones',
  terminated: 'Baja',
};

export const EMPLOYEE_STATUS_VARIANTS: Record<EmployeeStatus, BadgeVariant> = {
  active: 'success',
  inactive: 'secondary',
  on_leave: 'warning',
  terminated: 'destructive',
};

/**
 * Tipo de colaborador. Decisión del cliente (17-sep-2026): habrá expedientes
 * dados de alta SOLO para control de RRHH (sin cuenta de acceso), y no todos
 * están en la nómina de Aspel NOI.
 */
export const EMPLOYMENT_TYPES = [
  'nomina',
  'externo',
  'honorarios',
  'practicante',
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  nomina: 'Nómina',
  externo: 'Externo',
  honorarios: 'Honorarios',
  practicante: 'Practicante',
};

export const EMPLOYMENT_TYPE_VARIANTS: Record<EmploymentType, BadgeVariant> = {
  nomina: 'default',
  externo: 'info',
  honorarios: 'warning',
  practicante: 'secondary',
};

/** De dónde salió/actualizó el expediente. */
export type SyncSource = 'manual' | 'csv' | 'noi';

export const SYNC_SOURCE_LABELS: Record<SyncSource, string> = {
  manual: 'Captura manual',
  csv: 'Carga CSV',
  noi: 'Aspel NOI',
};

export type VacationStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export const VACATION_STATUS_LABELS: Record<VacationStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

export const VACATION_STATUS_VARIANTS: Record<VacationStatus, BadgeVariant> = {
  draft: 'secondary',
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'secondary',
};

export type ExpenseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'VERIFIED'
  | 'REFUNDED';

export type ExpenseCategory =
  | 'TRANSPORTATION'
  | 'LODGING'
  | 'MEALS'
  | 'SUPPLIES'
  | 'OTHER';

// ================================
// HORARIOS (4 tiempos)
// ================================
//
// Cada empleado tiene un horario de CUATRO tiempos: entrada, salida a comer,
// regreso de comer y salida, con tolerancias. Con eso el resumen del día del
// checador calcula retardos, comida excedida, salida anticipada y faltas.

/** Días laborables en ISO: 1 = lunes … 7 = domingo. */
export const WORK_DAYS: { value: number; short: string; abbr: string; label: string }[] = [
  { value: 1, short: 'L', abbr: 'Lun', label: 'Lunes' },
  { value: 2, short: 'M', abbr: 'Mar', label: 'Martes' },
  { value: 3, short: 'M', abbr: 'Mié', label: 'Miércoles' },
  { value: 4, short: 'J', abbr: 'Jue', label: 'Jueves' },
  { value: 5, short: 'V', abbr: 'Vie', label: 'Viernes' },
  { value: 6, short: 'S', abbr: 'Sáb', label: 'Sábado' },
  { value: 7, short: 'D', abbr: 'Dom', label: 'Domingo' },
];

/**
 * Cómo se toma la comida (decisión del cliente, 17-sep-2026):
 * - 'flexible': cada quien la toma cuando quiera, con una duración máxima.
 * - 'fixed': hora fija de salida y regreso.
 */
export type WorkScheduleBreakMode = 'flexible' | 'fixed';

export const WORK_SCHEDULE_BREAK_MODE_LABELS: Record<WorkScheduleBreakMode, string> = {
  flexible: 'Libre',
  fixed: 'Fija',
};

/**
 * Excepción de UN día de la semana (decisión del cliente, 17-sep-2026: en
 * corporativo los sábados son de 9:00 a 14:00, sin comida).
 *
 * Lo que no venga aquí hereda del horario base; en un día con excepción la
 * comida SIEMPRE es libre con esa duración (0 = ese día no hay comida) y las
 * tolerancias son las del horario base.
 */
export interface WorkScheduleDayOverride {
  /** 'HH:MM' */
  checkInTime?: string;
  /** 'HH:MM' */
  checkOutTime?: string;
  /** Duración MÁXIMA de la comida ese día (0 = sin comida). */
  breakMinutes?: number;
}

/**
 * Excepciones por día ISO: la llave es '1'..'7' (1 = lunes … 7 = domingo) y
 * solo puede ser un día laborable del propio horario.
 */
export type WorkScheduleDayOverrides = Record<string, WorkScheduleDayOverride>;

export interface WorkSchedule {
  id: string;
  code: string;
  name: string;
  /** 'HH:MM' */
  checkInTime: string;
  /** null cuando la comida es libre (solo aplica con breakMode = 'fixed'). */
  breakOutTime: string | null;
  breakInTime: string | null;
  checkOutTime: string;
  breakMode: WorkScheduleBreakMode;
  /** Duración MÁXIMA de la comida en minutos (base del excedente). */
  breakMinutes: number;
  lateToleranceMinutes: number;
  breakToleranceMinutes: number;
  /** ISO: 1 = lunes … 7 = domingo. */
  workDays: number[];
  /** Excepciones por día (objeto vacío si el horario es igual todos los días). */
  dayOverrides: WorkScheduleDayOverrides;
  /** null = horario global (sirve para cualquier sucursal). */
  branchId: string | null;
  branchName?: string | null;
  isActive: boolean;
  /** Empleados activos con este horario asignado. */
  employeesCount?: number;
}

/** El horario asignado, como viene en el expediente. */
export interface WorkScheduleSummary {
  id: string;
  code: string;
  name: string;
  checkInTime: string;
  breakOutTime: string | null;
  breakInTime: string | null;
  checkOutTime: string;
  breakMode: WorkScheduleBreakMode;
  breakMinutes: number;
  lateToleranceMinutes: number;
  breakToleranceMinutes: number;
  workDays: number[];
  dayOverrides: WorkScheduleDayOverrides;
}

export interface CreateWorkScheduleDto {
  code: string;
  name: string;
  checkInTime: string;
  /** Solo con breakMode = 'fixed'; null/omitido cuando la comida es libre. */
  breakOutTime?: string | null;
  breakInTime?: string | null;
  checkOutTime: string;
  breakMode?: WorkScheduleBreakMode;
  breakMinutes?: number;
  lateToleranceMinutes?: number;
  breakToleranceMinutes?: number;
  workDays?: number[];
  /** Reemplaza TODAS las excepciones: mandar {} las borra. */
  dayOverrides?: WorkScheduleDayOverrides;
  branchId?: string | null;
}

export type UpdateWorkScheduleDto = Partial<CreateWorkScheduleDto> & {
  isActive?: boolean;
};

// ================================
// EMPLEADOS
// ================================

/** Renglón del listado de empleados (GET /hr/employees). */
export interface Employee {
  id: string;
  employeeNumber: string;
  /** Número de nómina en Aspel NOI. null si no está en NOI. */
  noiNumber: string | null;
  /** Código del GAFETE (distinto del número de checador). */
  badgeCode: string | null;
  employmentType: EmploymentType;
  /** true si el expediente tiene cuenta de usuario ligada. */
  hasSystemAccess: boolean;
  /**
   * users.id de la cuenta ligada (null en un expediente solo de RRHH).
   * Lo consume la asignación de activos/insumos, que se hace a un USUARIO.
   */
  userId?: string | null;
  firstName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  status: EmployeeStatus;
  isActive: boolean;
  hireDate: string | null;
  terminationDate: string | null;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  jobPositionId: string | null;
  jobPositionName: string | null;
  workScheduleId: string | null;
  workScheduleName: string | null;
  /** URL firmada (15 min) de la foto del gafete; null si no tiene. */
  photoUrl: string | null;
  photoConsentAt: string | null;
  syncSource: SyncSource | null;
  lastSyncedAt: string | null;
}

/** Expediente completo (GET /hr/employees/:id). */
export interface EmployeeDetail extends Employee {
  rfc: string | null;
  curp: string | null;
  imssNumber: string | null;
  birthDate: string | null;
  gender: string | null;
  maritalStatus: string | null;
  address: string | null;
  zipCode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  salaryType: string | null;
  /** Postgres numeric llega como string. */
  dailySalary: number | string | null;
  integratedDailySalary: number | string | null;
  employerRegistration: string | null;
  contractType: string | null;
  workSchedule: WorkScheduleSummary | null;
  supervisor: { id: string; employeeNumber: string; fullName: string | null } | null;
  notes: string | null;
  personalEmail: string | null;
  noiCompany: string | null;
  badgeIssuedAt: string | null;
  badgePrintedCount: number;
  user: { id: string; email: string; isActive: boolean; roleCode: string | null } | null;
  attendanceToday: { lastEventType: string | null; lastEventAt: string | null } | null;
}

export interface EmployeeListResponse {
  data: Employee[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface EmployeeQuery {
  /** Número de empleado, número NOI, gafete o nombre (también "nombre apellido"). */
  search?: string;
  branchId?: string;
  departmentId?: string;
  employmentType?: EmploymentType;
  status?: EmployeeStatus;
  /** true = solo con cuenta de usuario; false = solo expedientes sin acceso. */
  hasSystemAccess?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Alta de expediente. `userId` es OPCIONAL: sin él se crea un expediente SOLO
 * para control de RRHH (sin correo ni rol). El correo de contacto va en
 * `personalEmail`: `employees.email` NUNCA se escribe desde aquí porque un
 * trigger (mig 077) lo propaga al correo de acceso.
 */
export interface CreateEmployeeDto {
  userId?: string;
  /** Si falta y el tipo no es nómina, el API genera un EXT-NNNN. */
  employeeNumber?: string;
  noiNumber?: string;
  noiCompany?: string;
  employmentType?: EmploymentType;
  firstName?: string;
  lastName?: string;
  secondLastName?: string;
  phone?: string;
  personalEmail?: string;
  branchId?: string;
  departmentId?: string;
  jobPositionId?: string;
  workScheduleId?: string;
  hireDate?: string;
  status?: EmployeeStatus;
  rfc?: string;
  curp?: string;
  imssNumber?: string;
  birthDate?: string;
  notes?: string;
}

export interface UpdateEmployeeDto {
  employeeNumber?: string;
  noiNumber?: string | null;
  noiCompany?: string | null;
  employmentType?: EmploymentType;
  firstName?: string;
  lastName?: string;
  secondLastName?: string;
  phone?: string;
  personalEmail?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  jobPositionId?: string | null;
  workScheduleId?: string | null;
  supervisorId?: string | null;
  hireDate?: string;
  status?: EmployeeStatus;
  terminationDate?: string;
  photoConsentAt?: string | null;
  rfc?: string;
  curp?: string;
  imssNumber?: string;
  birthDate?: string;
  notes?: string;
}

/** Nombre a mostrar: el API arma fullName con COALESCE(workers, employees). */
export function employeeDisplayName(
  e: Pick<Employee, 'fullName' | 'firstName' | 'lastName' | 'secondLastName'>,
): string {
  const armed = [e.firstName, e.lastName, e.secondLastName]
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(' ')
    .trim();
  return e.fullName?.trim() || armed || 'Sin nombre';
}

/** Iniciales para el avatar local (el módulo ya no usa ui-avatars.com). */
export function employeeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? (parts[1][0] ?? '') : '';
  return (first + second).toUpperCase();
}

// ================================
// IMPORTACIÓN CSV DE EXPEDIENTES
// ================================

/** Columnas del CSV (todas por nombre, el orden es libre). */
export const EMPLOYEE_IMPORT_COLUMNS = [
  'employee_number',
  'noi_number',
  'noi_company',
  'employment_type',
  'first_name',
  'last_name',
  'second_last_name',
  'phone',
  'personal_email',
  'branch_code',
  'department_code',
  'job_position_code',
  'work_schedule_code',
  'hire_date',
  'status',
  'rfc',
  'curp',
  'imss_number',
  'notes',
] as const;

export interface EmployeeImportError {
  row: number;
  message: string;
}

export interface EmployeeImportSampleRow {
  row: number;
  action?: string;
  employeeNumber?: string | null;
  noiNumber?: string | null;
  /** Nombre resuelto por el API (COALESCE workers/employees o el del CSV). */
  fullName?: string | null;
}

export interface EmployeeImportResult {
  dryRun: boolean;
  total: number;
  toCreate: number;
  toUpdate: number;
  unchanged: number;
  errors: EmployeeImportError[];
  sample: EmployeeImportSampleRow[];
}

// ================================
// PANEL DE RRHH
// ================================

export interface HrDashboard {
  employees: {
    total: number;
    active: number;
    nomina: number;
    externos: number;
    withoutSchedule: number;
    withoutPhoto: number;
    withoutBadge: number;
    withoutNoi: number;
  };
  attendanceToday: {
    date: string;
    present: number;
    absent: number;
    openShifts: number;
    late: number;
  };
  vacations: {
    pending: number;
  };
}

// ================================
// CATÁLOGO DE DEPARTAMENTOS
// ================================

export interface Department {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  userCount?: number;
  employeeCount?: number;
  headUserId?: string | null;
  headName?: string | null;
  subheadUserId?: string | null;
  subheadName?: string | null;
  /** País al que pertenece el departamento (organigrama agrupa por país). */
  countryId?: string | null;
  countryName?: string | null;
}

export interface CreateDepartmentDto {
  code: string;
  name: string;
  countryId?: string | null;
}

export interface UpdateDepartmentDto {
  code?: string;
  name?: string;
  isActive?: boolean;
  headUserId?: string | null;
  subheadUserId?: string | null;
  countryId?: string | null;
}

// Director General de un país (countries.director_general_user_id).
export interface OrgDirector {
  countryId: string;
  countryCode: string;
  countryName: string;
  directorUserId: string | null;
  directorName: string | null;
}

// ================================
// ORGANIGRAMA (GET /hr/org/chart)
// ================================
//
// Una sola consulta arma TODO el organigrama: países con su Director General,
// departamentos con jefe/subjefe, sucursales con personal y el padrón de
// expedientes activos. El árbol (quién cuelga de quién) se construye en el
// front con estas piezas — ver components/admin/hr/org/org-utils.ts.
//
// La jerarquía real vive en tres lugares distintos de la base y por eso el
// organigrama tiene que tolerar huecos: countries.director_general_user_id
// (usuario), departments.head_user_id / subhead_user_id (usuario) y
// employees.supervisor_id (expediente). Hay departamentos sin país, sin jefe y
// expedientes sin jefe directo ni puesto: la pantalla los agrupa aparte en vez
// de esconderlos.

export interface OrgChartCountry {
  id: string;
  code: string;
  name: string;
  /** users.id del Director General (countries.director_general_user_id). */
  directorUserId: string | null;
  directorName: string | null;
  /** employees.id del director, si además tiene expediente (para la foto). */
  directorEmployeeId: string | null;
  departmentsCount: number;
  employeesCount: number;
}

export interface OrgChartDepartment {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  countryId: string | null;
  countryName: string | null;
  /** Jefe y subjefe son USUARIOS (departments.head_user_id / subhead_user_id). */
  headUserId: string | null;
  headName: string | null;
  headEmployeeId: string | null;
  subheadUserId: string | null;
  subheadName: string | null;
  subheadEmployeeId: string | null;
  employeesCount: number;
}

export interface OrgChartBranch {
  id: string;
  code: string;
  name: string;
  countryId: string | null;
  employeesCount: number;
}

/** Persona del organigrama (expediente, tenga o no cuenta de acceso). */
export interface OrgChartEmployee {
  id: string;
  employeeNumber: string;
  /** COALESCE(workers, employees) ya resuelto por el API. */
  fullName: string;
  initials: string;
  jobPositionId: string | null;
  jobPositionName: string | null;
  jobPositionLevel: number | null;
  /** Departamento EFECTIVO: COALESCE(users.department_id, employees.department_id). */
  departmentId: string | null;
  branchId: string | null;
  branchName: string | null;
  /** employees.supervisor_id (otro EXPEDIENTE, no un usuario). */
  supervisorId: string | null;
  userId: string | null;
  hasSystemAccess: boolean;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  isActive: boolean;
  /** URL firmada (15 min); null si no hay foto o el proveedor es local. */
  photoUrl: string | null;
  isDepartmentHead: boolean;
  isCountryDirector: boolean;
}

/** Huecos por llenar: cada número es una invitación a completar el padrón. */
export interface OrgChartStats {
  employees: number;
  withoutSupervisor: number;
  withoutDepartment: number;
  withoutPosition: number;
  departmentsWithoutHead: number;
  departmentsWithoutCountry: number;
}

export interface OrgChart {
  generatedAt: string;
  countries: OrgChartCountry[];
  departments: OrgChartDepartment[];
  branches: OrgChartBranch[];
  employees: OrgChartEmployee[];
  stats: OrgChartStats;
}

// ================================
// ASISTENCIA (CHECADOR)
// ================================
//
// El empleado teclea su número en el checador del POS Electron, la webcam toma
// la foto y el API guarda el evento. Aquí solo se CONSULTA (RRHH) y se captura
// a mano lo que el checador no alcanzó a registrar.
//
// Ojo: la asistencia es por DÍA CALENDARIO LOCAL de la sucursal; NO usa los
// periodos de negocio 26→25.

/**
 * Los cuatro toques del día, igual que el checador legacy (v1):
 * INGRESO / SALIDA_REFRIGERIO / RETORNO_REFRIGERIO / SALIDA.
 */
export const ATTENDANCE_EVENT_TYPES = [
  'check_in',
  'break_out',
  'break_in',
  'check_out',
] as const;

export type AttendanceEventType = (typeof ATTENDANCE_EVENT_TYPES)[number];

/**
 * Cómo se registró el evento: checador del POS, captura manual de RRHH o
 * migración del checador viejo.
 */
export type AttendanceMethod = 'pos_kiosk' | 'manual' | 'legacy';

export const EVENT_TYPE_LABELS: Record<AttendanceEventType, string> = {
  check_in: 'Entrada',
  break_out: 'Salida a comer',
  break_in: 'Regreso de comer',
  check_out: 'Salida',
};

export const EVENT_TYPE_VARIANTS: Record<AttendanceEventType, BadgeVariant> = {
  check_in: 'success',
  break_out: 'warning',
  break_in: 'info',
  check_out: 'secondary',
};

export const ATTENDANCE_METHOD_LABELS: Record<AttendanceMethod, string> = {
  pos_kiosk: 'Checador POS',
  manual: 'Captura manual',
  legacy: 'Checador anterior',
};

/** Un toque del checador (o una captura manual de RRHH). */
export interface AttendanceEvent {
  id: string;
  employeeId: string;
  /** Número tecleado/resuelto, guardado como snapshot al momento del evento. */
  employeeNumber: string;
  employeeName: string | null;
  /** Sucursal de la TERMINAL donde se checó (la resuelve el servidor). */
  branchId: string;
  branchName: string | null;
  /** Sucursal del expediente del empleado; puede diferir de la anterior. */
  employeeBranchId: string | null;
  employeeBranchName: string | null;
  posLicenseId: string | null;
  posLicenseLabel: string | null;
  eventType: AttendanceEventType;
  /** ISO con zona (TIMESTAMPTZ). */
  occurredAt: string;
  /** 'YYYY-MM-DD' ya materializado con la zona de la sucursal. */
  localDate: string;
  /** 'HH:MM:SS' local de la sucursal. */
  localTime: string;
  timezone: string;
  method: AttendanceMethod;
  /** URL firmada (15 min). null si no hubo foto o no hay GCS configurado. */
  photoUrl: string | null;
  /** Motivo por el que no se pudo subir la foto (el evento se guarda igual). */
  photoError: string | null;
  registeredBy: { id: string; name: string } | null;
  notes: string | null;
  createdAt: string;
}

export interface AttendanceQuery {
  /** 'YYYY-MM-DD'; el API usa el día de hoy (CDMX) si no se mandan. */
  from?: string;
  to?: string;
  branchId?: string;
  employeeId?: string;
  /** Número de empleado, número NOI o nombre. */
  search?: string;
  eventType?: AttendanceEventType;
  page?: number;
  limit?: number;
}

export interface AttendanceListResponse {
  data: AttendanceEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Estado del día de un empleado contra su horario:
 * - on_time / late: checó entrada dentro o fuera de la tolerancia.
 * - absent: tiene horario, el día es laborable y NO hay ningún evento.
 * - no_schedule: checó pero no tiene horario asignado (no se puede evaluar).
 * - incomplete: checó pero el día quedó sin cerrar (falta la salida).
 */
export type AttendanceDayStatus =
  | 'on_time'
  | 'late'
  | 'absent'
  | 'no_schedule'
  | 'incomplete';

export const ATTENDANCE_DAY_STATUS_LABELS: Record<AttendanceDayStatus, string> = {
  on_time: 'A tiempo',
  late: 'Retardo',
  absent: 'Falta',
  no_schedule: 'Sin horario',
  incomplete: 'Incompleto',
};

export const ATTENDANCE_DAY_STATUS_VARIANTS: Record<AttendanceDayStatus, BadgeVariant> = {
  on_time: 'success',
  late: 'warning',
  absent: 'destructive',
  no_schedule: 'secondary',
  incomplete: 'info',
};

/** Un empleado en el resumen de un día: sus cuatro toques, comida y horas. */
export interface AttendanceDaySummaryRow {
  employeeId: string;
  employeeNumber: string;
  employeeName: string | null;
  branchId: string;
  branchName: string | null;
  /** ISO: primer check_in, primer break_out, último break_in, último check_out. */
  checkInAt: string | null;
  breakOutAt: string | null;
  breakInAt: string | null;
  checkOutAt: string | null;
  /** 'HH:MM' local, ya listo para mostrar. */
  checkInTime: string | null;
  breakOutTime: string | null;
  breakInTime: string | null;
  checkOutTime: string | null;
  /** Minutos de comida (break_out → break_in); null si no comió o quedó abierto. */
  breakMinutes: number | null;
  /** Horas de los tramos cerrados; null si ningún tramo cerró. */
  hoursWorked: number | null;
  eventsCount: number;
  /** true si el último evento del día no fue una salida. */
  openShift: boolean;
  firstPhotoUrl: string | null;
  lastPhotoUrl: string | null;
  // --- Horario esperado y desviaciones (null sin horario asignado) ---
  scheduleCode: string | null;
  /** 'HH:MM' del horario asignado. */
  expectedCheckIn: string | null;
  /** null cuando la comida es libre: no hay hora esperada que comparar. */
  expectedBreakOut: string | null;
  expectedBreakIn: string | null;
  expectedCheckOut: string | null;
  /** Cómo se toma la comida en el horario del empleado (null sin horario). */
  scheduleBreakMode: WorkScheduleBreakMode | null;
  /** Minutos de comida permitidos por el horario (null sin horario). */
  scheduleBreakMinutes: number | null;
  /** true si ese día de la semana tenía excepción (los expected* ya la aplican). */
  scheduleDayOverride: boolean;
  /** Minutos de retardo ya descontada la tolerancia (0 si llegó a tiempo). */
  lateMinutes: number | null;
  /** Minutos de comida por encima de lo permitido + tolerancia. */
  breakExcessMinutes: number | null;
  /** Minutos que se fue antes de la hora de salida. */
  earlyLeaveMinutes: number | null;
  status: AttendanceDayStatus;
}

export interface AttendanceDaySummaryTotals {
  present: number;
  absent: number;
  late: number;
  onTime: number;
  noSchedule: number;
}

export interface AttendanceDaySummary {
  date: string;
  rows: AttendanceDaySummaryRow[];
  summary: AttendanceDaySummaryTotals;
}

export interface AttendanceDayQuery {
  /** 'YYYY-MM-DD'. */
  date?: string;
  branchId?: string;
  search?: string;
}

/** Captura manual de RRHH (requiere permiso hr:manage). */
export interface ManualAttendanceInput {
  employeeId: string;
  eventType: AttendanceEventType;
  /** ISO; el API materializa la fecha/hora local con la zona de branchId. */
  occurredAt: string;
  branchId: string;
  notes?: string;
}

// ================================
// VACACIONES
// ================================
//
// El API responde la fila cruda de vacation_requests (snake_case); el service
// la normaliza a este tipo.

export interface Vacation {
  id: string;
  requestNumber: string | null;
  employeeId: string;
  employeeNumber: string | null;
  employeeName: string | null;
  startDate: string;
  endDate: string;
  totalCalendarDays: number | null;
  /** Días hábiles solicitados (es el dato que descuenta el saldo). */
  totalBusinessDays: number | null;
  status: VacationStatus;
  requestComments: string | null;
  requestedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export interface VacationListResponse {
  data: Vacation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface VacationQuery {
  employeeId?: string;
  status?: VacationStatus;
  /** 'YYYY-MM-DD' (se mandan como fromDate/toDate). */
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateVacationDto {
  startDate: string;
  endDate: string;
  /** El API lo llama `comments` (no `reason`). */
  comments?: string;
}

export interface ReviewVacationDto {
  notes?: string;
}

// ================================
// VIÁTICOS (pantalla sin backend — ver AdminSidebar)
// ================================

export interface ExpenseItem {
  id: string;
  expenseId: string;
  category: ExpenseCategory;
  description: string;
  expenseDate: string;
  amount: number;
  hasReceipt: boolean;
  receiptUrl?: string;
  receiptNumber?: string;
  vendorRfc?: string;
  vendorName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  employeeId: string;
  expenseNumber: string;
  title: string;
  description?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  destination?: string;
  totalAmount: number;
  currency: string;
  status: ExpenseStatus;
  sentAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  refundedBy?: string;
  refundedAt?: string;
  refundReference?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  employee?: {
    id: string;
    employeeNumber?: string;
    department?: string;
    firstName?: string;
    lastName?: string;
    user?: { firstName: string; lastName: string };
  };
  items?: ExpenseItem[];
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  verifier?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface ExpenseListResponse {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExpenseQuery {
  employeeId?: string;
  status?: ExpenseStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateExpenseDto {
  title: string;
  description?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  destination?: string;
  currency?: string;
}

export interface UpdateExpenseDto {
  title?: string;
  description?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  destination?: string;
}

export interface ExpenseItemDto {
  category: ExpenseCategory;
  description: string;
  expenseDate: string;
  amount: number;
  hasReceipt?: boolean;
  receiptUrl?: string;
  receiptNumber?: string;
  vendorRfc?: string;
  vendorName?: string;
  notes?: string;
}

export interface ReviewExpenseDto {
  notes?: string;
  rejectionReason?: string;
}
