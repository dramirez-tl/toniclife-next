// hr.service.ts - Service for Human Resources API
// Ref: TONIC_LIFE_2.0_MASTER.md - Seccion 5.6 Modulo Recursos Humanos

import api from '@/lib/api';
import type {
  Employee,
  EmployeeStatus,
  EmployeeListResponse,
  EmployeeQuery,
  Department,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  AttendanceRecord,
  AttendanceListResponse,
  AttendanceQuery,
  CheckInOutDto,
  ManualAttendanceDto,
  AttendanceReportResponse,
  Vacation,
  VacationListResponse,
  VacationQuery,
  CreateVacationDto,
  ReviewVacationDto,
  Expense,
  ExpenseListResponse,
  ExpenseQuery,
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseItemDto,
  ReviewExpenseDto,
} from '@/types/hr';

// El backend usa status en minúsculas; el front en MAYÚSCULAS.
const STATUS_TO_API: Record<string, string> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  TERMINATED: 'terminated',
};
const STATUS_FROM_API: Record<string, EmployeeStatus> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  on_leave: 'ON_LEAVE',
  terminated: 'TERMINATED',
};

// El backend (mapEmployeeWithRelations) devuelve snake_case + relaciones
// anidadas; aquí lo normalizamos al tipo Employee (camelCase) del front.
function mapEmployee(r: any): Employee {
  return {
    id: r.id,
    userId: r.user_id ?? r.user?.id ?? '',
    employeeNumber: r.employee_number ?? '',
    firstName: r.first_name ?? r.user?.firstName ?? '',
    lastName: r.last_name ?? r.user?.lastName ?? '',
    email: r.email ?? r.user?.email ?? '',
    phone: r.phone ?? undefined,
    position: r.job_position?.name ?? '',
    department: r.department?.name ?? undefined,
    departmentId: r.department?.id ?? r.department_id ?? undefined,
    branch: r.branch?.name ?? undefined,
    branchId: r.branch?.id ?? r.branch_id ?? undefined,
    supervisorId: r.supervisor_id ?? undefined,
    isManager: !!r.is_manager,
    hireDate: r.hire_date ?? '',
    terminationDate: r.termination_date ?? undefined,
    status: STATUS_FROM_API[r.status as string] ?? 'ACTIVE',
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
    user: r.user
      ? {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          email: r.user.email,
        }
      : undefined,
  };
}

class HrService {
  // ================================
  // EMPLOYEE METHODS
  // ================================

  async createEmployee(data: CreateEmployeeDto): Promise<Employee> {
    const response = await api.post<any>('/hr/employees', data);
    return mapEmployee(response.data);
  }

  async updateEmployee(id: string, data: UpdateEmployeeDto): Promise<Employee> {
    const payload: Record<string, unknown> = { ...data };
    if (data.status) payload.status = STATUS_TO_API[data.status] ?? data.status;
    const response = await api.patch<any>(`/hr/employees/${id}`, payload);
    return mapEmployee(response.data);
  }

  /** Catálogo de departamentos activos. */
  async getDepartments(): Promise<Department[]> {
    const response = await api.get<Department[]>('/hr/departments');
    return response.data;
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const response = await api.get<Employee>(`/hr/employees/${id}`);
    return response.data;
  }

  /** Alias for getEmployeeById for backward compatibility */
  async getEmployee(id: string): Promise<Employee> {
    return this.getEmployeeById(id);
  }

  /** Get current user's employee record */
  async getMyEmployee(): Promise<Employee> {
    const response = await api.get<Employee>('/hr/employees/me');
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async getEmployeeByUserId(userId: string): Promise<Employee> {
    const response = await api.get<Employee>(`/hr/employees/user/${userId}`);
    return response.data;
  }

  async listEmployees(query: EmployeeQuery = {}): Promise<EmployeeListResponse> {
    const params = new URLSearchParams();
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const offset = (page - 1) * limit;

    if (query.branchId) params.append('branchId', query.branchId);
    if (query.departmentId) params.append('departmentId', query.departmentId);
    if (query.status) params.append('status', STATUS_TO_API[query.status] ?? query.status);
    if (query.search) params.append('search', query.search);
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    const response = await api.get<{ data: any[]; pagination?: EmployeeListResponse['pagination'] }>(
      `/hr/employees?${params.toString()}`
    );
    const raw = response.data;
    return {
      data: (raw.data ?? []).map(mapEmployee),
      pagination: raw.pagination ?? { total: 0, page, limit, pages: 1 },
    };
  }

  // ================================
  // ATTENDANCE METHODS
  // ================================

  // TODO: Endpoint not implemented in backend
  async checkInOut(data: CheckInOutDto): Promise<AttendanceRecord> {
    const response = await api.post<AttendanceRecord>('/hr/attendance/check-in', data);
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async registerManualAttendance(data: ManualAttendanceDto): Promise<AttendanceRecord> {
    const response = await api.post<AttendanceRecord>('/hr/attendance/manual', data);
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async getAttendanceReport(query: AttendanceQuery): Promise<AttendanceReportResponse> {
    const params = new URLSearchParams();

    if (query.employeeId) params.append('employeeId', query.employeeId);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
    if (query.type) params.append('type', query.type);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await api.get<AttendanceReportResponse>(
      `/hr/attendance/report?${params.toString()}`
    );
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async getMyAttendance(startDate: string, endDate: string): Promise<AttendanceListResponse> {
    const response = await api.get<AttendanceListResponse>(
      `/hr/attendance/my?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }

  // ================================
  // VACATION METHODS
  // ================================

  async createVacationRequest(data: CreateVacationDto): Promise<Vacation> {
    const response = await api.post<Vacation>('/hr/vacations', data);
    return response.data;
  }

  /** Alias for createVacationRequest */
  async createVacation(data: CreateVacationDto): Promise<Vacation> {
    return this.createVacationRequest(data);
  }

  async approveVacation(vacationId: string, data?: ReviewVacationDto): Promise<Vacation> {
    const response = await api.patch<Vacation>(
      `/hr/vacations/${vacationId}/approve`,
      data || {}
    );
    return response.data;
  }

  async rejectVacation(vacationId: string, reason: string): Promise<Vacation> {
    const response = await api.patch<Vacation>(
      `/hr/vacations/${vacationId}/reject`,
      { rejectionReason: reason }
    );
    return response.data;
  }

  async cancelVacation(vacationId: string): Promise<Vacation> {
    const response = await api.patch<Vacation>(
      `/hr/vacations/${vacationId}/cancel`,
      {}
    );
    return response.data;
  }

  async getVacation(id: string): Promise<Vacation> {
    const response = await api.get<Vacation>(`/hr/vacations/${id}`);
    return response.data;
  }

  /** Get pending vacations for review */
  async getPendingVacations(): Promise<Vacation[]> {
    const response = await api.get<Vacation[]>('/hr/vacations/pending-review');
    return response.data;
  }

  async listVacations(query: VacationQuery = {}): Promise<VacationListResponse> {
    const params = new URLSearchParams();

    if (query.employeeId) params.append('employeeId', query.employeeId);
    if (query.status) params.append('status', query.status);
    if (query.startDate) params.append('fromDate', query.startDate);
    if (query.endDate) params.append('toDate', query.endDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await api.get<VacationListResponse>(
      `/hr/vacations?${params.toString()}`
    );
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async getMyVacations(): Promise<VacationListResponse> {
    const response = await api.get<VacationListResponse>('/hr/vacations/my');
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async getPendingVacationsForReview(): Promise<VacationListResponse> {
    const response = await api.get<VacationListResponse>('/hr/vacations/pending');
    return response.data;
  }

  // ================================
  // EXPENSE (VIATICOS) METHODS
  // ================================

  // TODO: Endpoint not implemented in backend
  async createExpense(data: CreateExpenseDto): Promise<Expense> {
    const response = await api.post<Expense>('/hr/expenses', data);
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async updateExpense(id: string, data: UpdateExpenseDto): Promise<Expense> {
    const response = await api.patch<Expense>(`/hr/expenses/${id}`, data);
    return response.data;
  }

  async getExpense(id: string): Promise<Expense> {
    const response = await api.get<Expense>(`/hr/expenses/${id}`);
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async addExpenseItem(expenseId: string, data: ExpenseItemDto): Promise<Expense> {
    const response = await api.post<Expense>(`/hr/expenses/${expenseId}/items`, data);
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async removeExpenseItem(expenseId: string, itemId: string): Promise<void> {
    await api.delete(`/hr/expenses/${expenseId}/items/${itemId}`);
  }

  // TODO: Endpoint not implemented in backend
  async submitExpense(id: string): Promise<Expense> {
    const response = await api.patch<Expense>(`/hr/expenses/${id}/submit`, {});
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async approveExpense(id: string, data?: ReviewExpenseDto): Promise<Expense> {
    const response = await api.patch<Expense>(
      `/hr/expenses/${id}/approve`,
      data || {}
    );
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async verifyExpense(id: string, data?: ReviewExpenseDto): Promise<Expense> {
    const response = await api.patch<Expense>(
      `/hr/expenses/${id}/verify`,
      data || {}
    );
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async refundExpense(id: string, refundReference?: string): Promise<Expense> {
    const response = await api.patch<Expense>(`/hr/expenses/${id}/refund`, {
      refundReference,
    });
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async rejectExpense(id: string, reason: string): Promise<Expense> {
    const response = await api.patch<Expense>(
      `/hr/expenses/${id}/reject`,
      { rejectionReason: reason }
    );
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async listExpenses(query: ExpenseQuery = {}): Promise<ExpenseListResponse> {
    const params = new URLSearchParams();

    if (query.employeeId) params.append('employeeId', query.employeeId);
    if (query.status) params.append('status', query.status);
    if (query.startDate) params.append('fromDate', query.startDate);
    if (query.endDate) params.append('toDate', query.endDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await api.get<ExpenseListResponse>(
      `/hr/expenses?${params.toString()}`
    );
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async getMyExpenses(): Promise<ExpenseListResponse> {
    const response = await api.get<ExpenseListResponse>('/hr/expenses/my');
    return response.data;
  }

  // TODO: Endpoint not implemented in backend
  async getPendingExpensesForApproval(): Promise<ExpenseListResponse> {
    const response = await api.get<ExpenseListResponse>('/hr/expenses/pending');
    return response.data;
  }

  // ================================
  // DASHBOARD / STATS
  // ================================

  /** Get HR stats for dashboard */
  async getHRStats(): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    onLeave: number;
    pendingVacations: number;
    pendingExpenses: number;
    todayAttendance: number;
  }> {
    // Aggregate data from multiple endpoints
    const [employees, pendingVacations, pendingExpenses] = await Promise.all([
      this.listEmployees({ limit: 1 }),
      this.listVacations({ status: 'PENDING', limit: 1 }),
      this.listExpenses({ status: 'PENDING', limit: 1 }),
    ]);

    return {
      totalEmployees: employees.pagination.total,
      activeEmployees: employees.data.filter(e => e.status === 'ACTIVE').length,
      onLeave: employees.data.filter(e => e.status === 'ON_LEAVE').length,
      pendingVacations: pendingVacations.total,
      pendingExpenses: pendingExpenses.total,
      todayAttendance: 0, // Will be calculated from attendance report
    };
  }

  /** Get recent activity */
  async getRecentActivity(): Promise<Array<{
    id: string;
    type: 'attendance' | 'vacation' | 'expense';
    message: string;
    timestamp: string;
  }>> {
    const [vacations, expenses] = await Promise.all([
      this.listVacations({ limit: 5 }),
      this.listExpenses({ limit: 5 }),
    ]);

    const activities: Array<{
      id: string;
      type: 'attendance' | 'vacation' | 'expense';
      message: string;
      timestamp: string;
    }> = [];

    vacations.data.forEach(v => {
      const employeeName = v.employee?.user
        ? `${v.employee.user.firstName} ${v.employee.user.lastName}`
        : 'Empleado';
      activities.push({
        id: v.id,
        type: 'vacation',
        message: `${employeeName} - Solicitud de vacaciones (${v.status})`,
        timestamp: v.createdAt,
      });
    });

    expenses.data.forEach(e => {
      const employeeName = e.employee?.user
        ? `${e.employee.user.firstName} ${e.employee.user.lastName}`
        : 'Empleado';
      activities.push({
        id: e.id,
        type: 'expense',
        message: `${employeeName} - ${e.title} ($${e.totalAmount})`,
        timestamp: e.createdAt,
      });
    });

    return activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 10);
  }

  /** Get pending approvals */
  async getPendingApprovals(): Promise<Array<{
    id: string;
    type: 'vacation' | 'expense';
    employeeName: string;
    description: string;
    date: string;
    amount?: number;
  }>> {
    const [vacations, expenses] = await Promise.all([
      this.listVacations({ status: 'PENDING' }),
      this.listExpenses({ status: 'PENDING' }),
    ]);

    const approvals: Array<{
      id: string;
      type: 'vacation' | 'expense';
      employeeName: string;
      description: string;
      date: string;
      amount?: number;
    }> = [];

    vacations.data.forEach(v => {
      const employeeName = v.employee?.user
        ? `${v.employee.user.firstName} ${v.employee.user.lastName}`
        : 'Empleado';
      approvals.push({
        id: v.id,
        type: 'vacation',
        employeeName,
        description: `${v.daysRequested} dias - ${v.startDate} al ${v.endDate}`,
        date: v.createdAt,
      });
    });

    expenses.data.forEach(e => {
      const employeeName = e.employee?.user
        ? `${e.employee.user.firstName} ${e.employee.user.lastName}`
        : 'Empleado';
      approvals.push({
        id: e.id,
        type: 'expense',
        employeeName,
        description: e.title,
        date: e.createdAt,
        amount: e.totalAmount,
      });
    });

    return approvals;
  }
}

export const hrService = new HrService();
export default hrService;
