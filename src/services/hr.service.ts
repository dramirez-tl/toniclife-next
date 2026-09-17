// hr.service.ts - Servicio del módulo de Recursos Humanos.
//
// El API de RRHH ya responde en camelCase para empleados, horarios, panel y
// checador; lo único que sigue llegando crudo (snake_case) es la fila de
// vacation_requests, por eso ahí hay un mapper.

import api from '@/lib/api';
import type {
  EmployeeDetail,
  EmployeeListResponse,
  EmployeeQuery,
  EmployeeImportResult,
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  OrgDirector,
  OrgChart,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  HrDashboard,
  WorkSchedule,
  CreateWorkScheduleDto,
  UpdateWorkScheduleDto,
  AttendanceEvent,
  AttendanceListResponse,
  AttendanceQuery,
  AttendanceDayQuery,
  AttendanceDaySummary,
  ManualAttendanceInput,
  Vacation,
  VacationStatus,
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

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

/** Tope del API para `limit` en los listados de RRHH (EmployeeQueryDto). */
const EMPLOYEE_PAGE_MAX = 200;

/** Convierte { data, pagination } paginado por offset a los params del API. */
function pageParams(page?: number, limit?: number) {
  const safeLimit = Math.min(limit ?? 20, EMPLOYEE_PAGE_MAX);
  const safePage = page && page > 0 ? page : 1;
  return { limit: safeLimit, offset: (safePage - 1) * safeLimit, page: safePage };
}

// El API de vacaciones devuelve la fila cruda de vacation_requests.
type RawVacation = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapVacation(r: RawVacation): Vacation {
  const first = str(r.employee_first_name);
  const last = str(r.employee_last_name);
  const name = [first, last].filter(Boolean).join(' ').trim();
  return {
    id: String(r.id ?? ''),
    requestNumber: str(r.request_number),
    employeeId: String(r.employee_id ?? ''),
    employeeNumber: str(r.employee_number),
    employeeName: name || null,
    startDate: str(r.start_date) ?? '',
    endDate: str(r.end_date) ?? '',
    totalCalendarDays: num(r.total_calendar_days),
    totalBusinessDays: num(r.total_business_days),
    status: (str(r.status) ?? 'pending') as VacationStatus,
    requestComments: str(r.request_comments),
    requestedAt: str(r.requested_at),
    approvedBy: str(r.approved_by),
    approvedAt: str(r.approved_at),
    rejectionReason: str(r.rejection_reason),
    rejectedAt: str(r.rejected_at),
    cancelledAt: str(r.cancelled_at),
    cancellationReason: str(r.cancellation_reason),
    createdAt: str(r.created_at) ?? '',
  };
}

class HrService {
  // ================================
  // PANEL DE RRHH
  // ================================

  /** Tarjetas del panel principal, calculadas en SQL por el API. */
  async getDashboard(): Promise<HrDashboard> {
    const { data } = await api.get<HrDashboard>('/hr/dashboard');
    return data;
  }

  // ================================
  // EMPLEADOS
  // ================================

  async listEmployees(query: EmployeeQuery = {}): Promise<EmployeeListResponse> {
    const { limit, offset, page } = pageParams(query.page, query.limit);
    const { data } = await api.get<EmployeeListResponse>('/hr/employees', {
      params: {
        search: query.search || undefined,
        branchId: query.branchId || undefined,
        departmentId: query.departmentId || undefined,
        employmentType: query.employmentType || undefined,
        status: query.status || undefined,
        hasSystemAccess: query.hasSystemAccess,
        limit,
        offset,
      },
    });
    return {
      data: data?.data ?? [],
      pagination: data?.pagination ?? { total: 0, page, limit, pages: 1 },
    };
  }

  async getEmployeeById(id: string): Promise<EmployeeDetail> {
    const { data } = await api.get<EmployeeDetail>(`/hr/employees/${id}`);
    return data;
  }

  /** Expediente del usuario autenticado (cualquier sesión puede verlo). */
  async getMyEmployee(): Promise<EmployeeDetail> {
    const { data } = await api.get<EmployeeDetail>('/hr/employees/me');
    return data;
  }

  async createEmployee(dto: CreateEmployeeDto): Promise<EmployeeDetail> {
    const { data } = await api.post<EmployeeDetail>('/hr/employees', dto);
    return data;
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto): Promise<EmployeeDetail> {
    const { data } = await api.patch<EmployeeDetail>(`/hr/employees/${id}`, dto);
    return data;
  }

  /** Checadas de un empleado (mismo listado del checador, ya filtrado). */
  async getEmployeeAttendance(
    id: string,
    query: { from?: string; to?: string; page?: number; limit?: number } = {},
  ): Promise<AttendanceListResponse> {
    const { data } = await api.get<AttendanceListResponse>(
      `/hr/employees/${id}/attendance`,
      {
        params: {
          from: query.from || undefined,
          to: query.to || undefined,
          page: query.page,
          limit: query.limit,
        },
      },
    );
    return data;
  }

  // --- Foto del gafete (GCS privado, URL firmada de 15 min) ---

  async uploadEmployeePhoto(id: string, file: File): Promise<{ photoUrl: string | null }> {
    const form = new FormData();
    form.append('photo', file);
    const { data } = await api.post<{ photoUrl: string | null }>(
      `/hr/employees/${id}/photo`,
      form,
      MULTIPART,
    );
    return data;
  }

  async deleteEmployeePhoto(id: string): Promise<void> {
    await api.delete(`/hr/employees/${id}/photo`);
  }

  // --- Gafete (badge_code) ---

  /** Genera el código del gafete; `regenerate` repone un gafete extraviado. */
  async generateBadge(id: string, regenerate = false): Promise<EmployeeDetail> {
    const { data } = await api.post<EmployeeDetail>(`/hr/employees/${id}/badge`, {
      regenerate,
    });
    return data;
  }

  /** Marca que el gafete se imprimió (badge_printed_count++). */
  async markBadgePrinted(id: string): Promise<void> {
    await api.post(`/hr/employees/${id}/badge/printed`, {});
  }

  // --- Carga masiva de expedientes (CSV) ---

  /**
   * Sube el CSV. Con `dryRun` solo se valida y se devuelve la vista previa;
   * sin él se aplica todo en UNA transacción (si hay errores no aplica nada).
   */
  async importEmployees(file: File, dryRun: boolean): Promise<EmployeeImportResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<EmployeeImportResult>(
      `/hr/employees/import?dryRun=${dryRun ? 'true' : 'false'}`,
      form,
      MULTIPART,
    );
    return data;
  }

  // ================================
  // HORARIOS (4 tiempos)
  // ================================

  async getWorkSchedules(includeInactive = false): Promise<WorkSchedule[]> {
    const { data } = await api.get<WorkSchedule[] | { data: WorkSchedule[] }>(
      '/hr/work-schedules',
      { params: { includeInactive: includeInactive || undefined } },
    );
    // Tolerante: el catálogo puede venir como arreglo plano (como departamentos)
    // o envuelto en { data }.
    return Array.isArray(data) ? data : (data?.data ?? []);
  }

  async createWorkSchedule(dto: CreateWorkScheduleDto): Promise<WorkSchedule> {
    const { data } = await api.post<WorkSchedule>('/hr/work-schedules', dto);
    return data;
  }

  async updateWorkSchedule(id: string, dto: UpdateWorkScheduleDto): Promise<WorkSchedule> {
    const { data } = await api.patch<WorkSchedule>(`/hr/work-schedules/${id}`, dto);
    return data;
  }

  /** Borrado suave (is_active = false). 409 si tiene empleados asignados. */
  async deleteWorkSchedule(id: string): Promise<void> {
    await api.delete(`/hr/work-schedules/${id}`);
  }

  // ================================
  // DEPARTAMENTOS
  // ================================

  /** Catálogo de departamentos (activos por defecto; includeInactive para todos). */
  async getDepartments(includeInactive = false): Promise<Department[]> {
    const response = await api.get<Department[]>(
      `/hr/departments${includeInactive ? '?includeInactive=true' : ''}`,
    );
    return response.data;
  }

  async createDepartment(data: CreateDepartmentDto): Promise<Department> {
    const response = await api.post<Department>('/hr/departments', data);
    return response.data;
  }

  async updateDepartment(id: string, data: UpdateDepartmentDto): Promise<Department> {
    const response = await api.patch<Department>(`/hr/departments/${id}`, data);
    return response.data;
  }

  async deleteDepartment(id: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/hr/departments/${id}`);
    return response.data;
  }

  // ================================
  // ORGANIGRAMA — DIRECTORES GENERALES POR PAÍS
  // ================================

  /** Países activos con su Director General. */
  async getOrgDirectors(): Promise<OrgDirector[]> {
    const response = await api.get<OrgDirector[]>('/hr/org/directors');
    return response.data;
  }

  /** Asigna (o quita con userId=null) el Director General de un país. */
  async setOrgDirector(countryId: string, userId: string | null): Promise<{ success: boolean }> {
    const response = await api.put<{ success: boolean }>(
      `/hr/org/directors/${countryId}`,
      { userId },
    );
    return response.data;
  }

  /**
   * Organigrama completo en UNA consulta: países + departamentos + sucursales
   * + padrón. El árbol se arma en el front (org-utils) porque la jerarquía
   * sale de tres columnas distintas y hay que tolerar los huecos.
   *
   * Se normaliza la respuesta: si el API devuelve una pieza vacía, la pantalla
   * debe seguir dibujando el resto en vez de tronar.
   */
  async getOrgChart(includeInactive = false): Promise<OrgChart> {
    const { data } = await api.get<Partial<OrgChart>>('/hr/org/chart', {
      params: { includeInactive: includeInactive || undefined },
    });
    return {
      generatedAt: data?.generatedAt ?? new Date().toISOString(),
      countries: data?.countries ?? [],
      departments: data?.departments ?? [],
      branches: data?.branches ?? [],
      employees: data?.employees ?? [],
      stats: data?.stats ?? {
        employees: 0,
        withoutSupervisor: 0,
        withoutDepartment: 0,
        withoutPosition: 0,
        departmentsWithoutHead: 0,
        departmentsWithoutCountry: 0,
      },
    };
  }

  // ================================
  // ASISTENCIA (CHECADOR)
  // ================================
  //
  // Los eventos los genera el checador del POS Electron (número de empleado +
  // foto de la webcam); aquí RRHH solo consulta y captura a mano lo que el
  // checador no alcanzó a registrar. El rango es por DÍA CALENDARIO local de
  // la sucursal, NO por periodo de negocio 26→25.

  /** Bitácora de toques (paginada, del más reciente al más viejo). */
  async getAttendance(query: AttendanceQuery = {}): Promise<AttendanceListResponse> {
    const { data } = await api.get<AttendanceListResponse>('/hr/attendance', {
      params: {
        from: query.from || undefined,
        to: query.to || undefined,
        branchId: query.branchId || undefined,
        employeeId: query.employeeId || undefined,
        search: query.search || undefined,
        eventType: query.eventType || undefined,
        page: query.page,
        limit: query.limit,
      },
    });
    return data;
  }

  /**
   * Resumen de un día: un renglón por empleado con sus cuatro toques, el
   * horario esperado, retardos y las FALTAS (empleados con horario que no
   * checaron ese día).
   */
  async getAttendanceDay(query: AttendanceDayQuery = {}): Promise<AttendanceDaySummary> {
    const { data } = await api.get<AttendanceDaySummary>('/hr/attendance/day', {
      params: {
        date: query.date || undefined,
        branchId: query.branchId || undefined,
        search: query.search || undefined,
      },
    });
    return data;
  }

  /** Captura manual de RRHH (requiere hr:manage); queda marcada como 'manual'. */
  async registerManualAttendance(input: ManualAttendanceInput): Promise<AttendanceEvent> {
    const { data } = await api.post<AttendanceEvent>('/hr/attendance/manual', input);
    return data;
  }

  // ================================
  // VACACIONES
  // ================================

  async listVacations(query: VacationQuery = {}): Promise<VacationListResponse> {
    const { limit, offset, page } = pageParams(query.page, query.limit ?? 50);
    const { data } = await api.get<{
      data?: RawVacation[];
      pagination?: VacationListResponse['pagination'];
    }>('/hr/vacations', {
      params: {
        employeeId: query.employeeId || undefined,
        status: query.status || undefined,
        fromDate: query.startDate || undefined,
        toDate: query.endDate || undefined,
        limit,
        offset,
      },
    });
    const rows = data?.data ?? [];
    return {
      data: rows.map(mapVacation),
      pagination: data?.pagination ?? { total: rows.length, page, limit, pages: 1 },
    };
  }

  async getVacation(id: string): Promise<Vacation> {
    const { data } = await api.get<RawVacation>(`/hr/vacations/${id}`);
    return mapVacation(data);
  }

  async createVacationRequest(dto: CreateVacationDto): Promise<Vacation> {
    const { data } = await api.post<RawVacation>('/hr/vacations', dto);
    return mapVacation(data);
  }

  async approveVacation(id: string, dto?: ReviewVacationDto): Promise<Vacation> {
    const { data } = await api.patch<RawVacation>(`/hr/vacations/${id}/approve`, dto ?? {});
    return mapVacation(data);
  }

  async rejectVacation(id: string, rejectionReason: string): Promise<Vacation> {
    const { data } = await api.patch<RawVacation>(`/hr/vacations/${id}/reject`, {
      rejectionReason,
    });
    return mapVacation(data);
  }

  async cancelVacation(id: string, cancellationReason?: string): Promise<Vacation> {
    const { data } = await api.patch<RawVacation>(`/hr/vacations/${id}/cancel`, {
      cancellationReason: cancellationReason || undefined,
    });
    return mapVacation(data);
  }

  // ================================
  // VIÁTICOS
  // ================================
  //
  // /hr/expenses NO existe en el API: la pantalla de Viáticos está oculta del
  // menú (AdminSidebar) hasta que exista backend. Estos métodos quedan
  // AISLADOS a esa pantalla — el panel de RRHH ya no depende de ellos.

  async createExpense(data: CreateExpenseDto): Promise<Expense> {
    const response = await api.post<Expense>('/hr/expenses', data);
    return response.data;
  }

  async updateExpense(id: string, data: UpdateExpenseDto): Promise<Expense> {
    const response = await api.patch<Expense>(`/hr/expenses/${id}`, data);
    return response.data;
  }

  async getExpense(id: string): Promise<Expense> {
    const response = await api.get<Expense>(`/hr/expenses/${id}`);
    return response.data;
  }

  async addExpenseItem(expenseId: string, data: ExpenseItemDto): Promise<Expense> {
    const response = await api.post<Expense>(`/hr/expenses/${expenseId}/items`, data);
    return response.data;
  }

  async removeExpenseItem(expenseId: string, itemId: string): Promise<void> {
    await api.delete(`/hr/expenses/${expenseId}/items/${itemId}`);
  }

  async submitExpense(id: string): Promise<Expense> {
    const response = await api.patch<Expense>(`/hr/expenses/${id}/submit`, {});
    return response.data;
  }

  async approveExpense(id: string, data?: ReviewExpenseDto): Promise<Expense> {
    const response = await api.patch<Expense>(`/hr/expenses/${id}/approve`, data || {});
    return response.data;
  }

  async verifyExpense(id: string, data?: ReviewExpenseDto): Promise<Expense> {
    const response = await api.patch<Expense>(`/hr/expenses/${id}/verify`, data || {});
    return response.data;
  }

  async refundExpense(id: string, refundReference?: string): Promise<Expense> {
    const response = await api.patch<Expense>(`/hr/expenses/${id}/refund`, {
      refundReference,
    });
    return response.data;
  }

  async rejectExpense(id: string, reason: string): Promise<Expense> {
    const response = await api.patch<Expense>(`/hr/expenses/${id}/reject`, {
      rejectionReason: reason,
    });
    return response.data;
  }

  async listExpenses(query: ExpenseQuery = {}): Promise<ExpenseListResponse> {
    const params = new URLSearchParams();
    if (query.employeeId) params.append('employeeId', query.employeeId);
    if (query.status) params.append('status', query.status);
    if (query.startDate) params.append('fromDate', query.startDate);
    if (query.endDate) params.append('toDate', query.endDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await api.get<ExpenseListResponse>(
      `/hr/expenses?${params.toString()}`,
    );
    return response.data;
  }
}

export const hrService = new HrService();
export default hrService;
