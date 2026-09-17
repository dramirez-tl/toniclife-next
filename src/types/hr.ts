// hr.ts - TypeScript types for Human Resources module
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.6 Módulo Recursos Humanos

import type { BadgeVariant } from './asset';

// ================================
// ENUMS
// ================================

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export type VacationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

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
// EMPLOYEE TYPES
// ================================

export interface Employee {
  id: string;
  userId: string;
  employeeNumber: string;
  /** Número de empleado en Aspel NOI (nómina). null si no está en NOI. */
  noiNumber?: string | null;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  email: string;
  phone?: string;
  position: string;
  department?: string;
  departmentId?: string;
  branch?: string;
  branchId?: string;
  supervisorId?: string;
  isManager: boolean;
  hireDate: string;
  terminationDate?: string;
  vacationDaysPerYear?: number;
  vacationDaysUsed?: number;
  vacationDaysAvailable?: number;
  salary?: number;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  branchInfo?: {
    id: string;
    name: string;
    code: string;
  };
  supervisor?: {
    id: string;
    employeeNumber: string;
    firstName?: string;
    lastName?: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  };
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

// Catálogo de departamentos (tabla departments en el backend).
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

export interface EmployeeQuery {
  branchId?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateEmployeeDto {
  userId: string;
  employeeNumber: string;
  position: string;
  department?: string;
  branchId: string;
  supervisorId?: string;
  isManager?: boolean;
  hireDate: string;
  vacationDaysPerYear?: number;
  salary?: number;
}

export interface UpdateEmployeeDto {
  firstName?: string;
  lastName?: string;
  secondLastName?: string;
  noiNumber?: string;
  phone?: string;
  departmentId?: string;
  branchId?: string;
  supervisorId?: string;
  hireDate?: string;
  isManager?: boolean;
  status?: EmployeeStatus;
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
}

export interface AttendanceDaySummary {
  date: string;
  rows: AttendanceDaySummaryRow[];
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
// VACATION TYPES
// ================================

export interface Vacation {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string;
  status: VacationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  employee?: Employee;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface VacationListResponse {
  data: Vacation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VacationQuery {
  employeeId?: string;
  status?: VacationStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateVacationDto {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ReviewVacationDto {
  reviewNotes?: string;
  rejectionReason?: string;
}

// ================================
// EXPENSE (VIÁTICOS) TYPES
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
  employee?: Employee;
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
