// hr.ts - TypeScript types for Human Resources module
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.6 Módulo Recursos Humanos

// ================================
// ENUMS
// ================================

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export type AttendanceType = 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';

export type AttendanceStatus = 'PRESENT' | 'WORKING' | 'ABSENT' | 'VACATION' | 'LATE';

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
  firstName: string;
  lastName: string;
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
  departmentId?: string;
  branchId?: string;
  supervisorId?: string;
  isManager?: boolean;
  status?: EmployeeStatus;
}

// ================================
// ATTENDANCE TYPES
// ================================

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  type: AttendanceType;
  timestamp: string;
  branchId?: string;
  method: 'biometric' | 'manual' | 'qr' | 'gps';
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  deviceInfo?: string;
  notes?: string;
  registeredBy?: string;
  createdAt: string;
  // Relations
  employee?: Employee;
  branch?: {
    id: string;
    name: string;
  };
}

export interface AttendanceListResponse {
  data: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface AttendanceReportResponse {
  data: AttendanceRecord[];
  summary: {
    totalPresent: number;
    totalAbsent: number;
    totalOnVacation: number;
    averageHoursWorked: number;
  };
  total: number;
  page: number;
  limit: number;
}

export interface AttendanceQuery {
  employeeId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  type?: AttendanceType;
  page?: number;
  limit?: number;
}

export interface CheckInOutDto {
  type: AttendanceType;
  branchId?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ManualAttendanceDto {
  employeeId: string;
  type: AttendanceType;
  timestamp: string;
  branchId?: string;
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
