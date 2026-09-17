// hooks/useHR.ts - React Query del módulo de RRHH.
//
// Convención del repo: los toasts se disparan en la página, no aquí.

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { hrService as hrApi } from '@/services/hr.service';
import type {
  EmployeeQuery,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateWorkScheduleDto,
  UpdateWorkScheduleDto,
  AttendanceQuery,
  AttendanceDayQuery,
  ManualAttendanceInput,
  VacationQuery,
  CreateVacationDto,
  ReviewVacationDto,
  ExpenseQuery,
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseItemDto,
  ReviewExpenseDto,
} from '@/types/hr';

// Query keys
export const hrKeys = {
  all: ['hr'] as const,
  dashboard: () => [...hrKeys.all, 'dashboard'] as const,
  employees: () => [...hrKeys.all, 'employees'] as const,
  employeeList: (query: EmployeeQuery) => [...hrKeys.employees(), 'list', query] as const,
  employee: (id: string) => [...hrKeys.employees(), id] as const,
  employeeAttendance: (id: string, query: Record<string, unknown>) =>
    [...hrKeys.employees(), id, 'attendance', query] as const,
  myEmployee: () => [...hrKeys.employees(), 'me'] as const,
  workSchedules: (includeInactive: boolean) =>
    [...hrKeys.all, 'work-schedules', includeInactive] as const,
  attendance: () => [...hrKeys.all, 'attendance'] as const,
  attendanceList: (query: AttendanceQuery) => [...hrKeys.attendance(), 'list', query] as const,
  attendanceDay: (query: AttendanceDayQuery) => [...hrKeys.attendance(), 'day', query] as const,
  vacations: () => [...hrKeys.all, 'vacations'] as const,
  vacationList: (query: VacationQuery) => [...hrKeys.vacations(), 'list', query] as const,
  vacation: (id: string) => [...hrKeys.vacations(), id] as const,
  expenses: () => [...hrKeys.all, 'expenses'] as const,
  expenseList: (query: ExpenseQuery) => [...hrKeys.expenses(), 'list', query] as const,
  expense: (id: string) => [...hrKeys.expenses(), id] as const,
};

// ================================
// PANEL
// ================================

/** Tarjetas del panel principal de RRHH (GET /hr/dashboard). */
export function useHrDashboard() {
  return useQuery({
    queryKey: hrKeys.dashboard(),
    queryFn: () => hrApi.getDashboard(),
    staleTime: 2 * 60 * 1000,
  });
}

// ================================
// EMPLEADOS
// ================================

export function useEmployees(query: EmployeeQuery = {}) {
  return useQuery({
    queryKey: hrKeys.employeeList(query),
    queryFn: () => hrApi.listEmployees(query),
    // Sin esto la página se desmonta con cada tecla de la búsqueda y el input
    // pierde el foco.
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: hrKeys.employee(id),
    queryFn: () => hrApi.getEmployeeById(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useMyEmployee() {
  return useQuery({
    queryKey: hrKeys.myEmployee(),
    queryFn: () => hrApi.getMyEmployee(),
    staleTime: 10 * 60 * 1000,
  });
}

/** Checadas de un empleado (para la pestaña Asistencia del expediente). */
export function useEmployeeAttendance(
  id: string,
  query: { from?: string; to?: string; page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: hrKeys.employeeAttendance(id, query),
    queryFn: () => hrApi.getEmployeeAttendance(id, query),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

function useInvalidateEmployees() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
    void queryClient.invalidateQueries({ queryKey: hrKeys.dashboard() });
    if (id) void queryClient.invalidateQueries({ queryKey: hrKeys.employee(id) });
  };
}

export function useCreateEmployee() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (data: CreateEmployeeDto) => hrApi.createEmployee(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateEmployee() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeDto }) =>
      hrApi.updateEmployee(id, data),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useUploadEmployeePhoto() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      hrApi.uploadEmployeePhoto(id, file),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useDeleteEmployeePhoto() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteEmployeePhoto(id),
    onSuccess: (_, id) => invalidate(id),
  });
}

/** Genera (o repone con regenerate) el código del gafete. */
export function useGenerateBadge() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: ({ id, regenerate }: { id: string; regenerate?: boolean }) =>
      hrApi.generateBadge(id, regenerate ?? false),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useMarkBadgePrinted() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (id: string) => hrApi.markBadgePrinted(id),
    onSuccess: (_, id) => invalidate(id),
  });
}

/** Carga masiva de expedientes (dryRun = vista previa). */
export function useImportEmployees() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      hrApi.importEmployees(file, dryRun),
    onSuccess: (_, { dryRun }) => {
      if (!dryRun) invalidate();
    },
  });
}

// ================================
// HORARIOS (4 tiempos)
// ================================

export function useWorkSchedules(includeInactive = false) {
  return useQuery({
    queryKey: hrKeys.workSchedules(includeInactive),
    queryFn: () => hrApi.getWorkSchedules(includeInactive),
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateWorkSchedules() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [...hrKeys.all, 'work-schedules'] });
    void queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
    void queryClient.invalidateQueries({ queryKey: hrKeys.dashboard() });
  };
}

export function useCreateWorkSchedule() {
  const invalidate = useInvalidateWorkSchedules();
  return useMutation({
    mutationFn: (data: CreateWorkScheduleDto) => hrApi.createWorkSchedule(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateWorkSchedule() {
  const invalidate = useInvalidateWorkSchedules();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkScheduleDto }) =>
      hrApi.updateWorkSchedule(id, data),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteWorkSchedule() {
  const invalidate = useInvalidateWorkSchedules();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteWorkSchedule(id),
    onSuccess: () => invalidate(),
  });
}

// ================================
// DEPARTAMENTOS
// ================================

export function useDepartments() {
  return useQuery({
    queryKey: [...hrKeys.all, 'departments'] as const,
    queryFn: () => hrApi.getDepartments(),
    staleTime: 10 * 60 * 1000,
  });
}

// Lista de gestión (incluye inactivos + conteos de uso).
export function useManageDepartments(includeInactive = true) {
  return useQuery({
    queryKey: [...hrKeys.all, 'departments', 'manage', includeInactive] as const,
    queryFn: () => hrApi.getDepartments(includeInactive),
    staleTime: 2 * 60 * 1000,
  });
}

function useInvalidateDepartments() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: [...hrKeys.all, 'departments'] });
}

export function useCreateDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (data: CreateDepartmentDto) => hrApi.createDepartment(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentDto }) =>
      hrApi.updateDepartment(id, data),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteDepartment(id),
    onSuccess: () => invalidate(),
  });
}

// ================================
// ORGANIGRAMA — DIRECTORES GENERALES POR PAÍS
// ================================

export function useOrgDirectors() {
  return useQuery({
    queryKey: [...hrKeys.all, 'org', 'directors'] as const,
    queryFn: () => hrApi.getOrgDirectors(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSetOrgDirector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ countryId, userId }: { countryId: string; userId: string | null }) =>
      hrApi.setOrgDirector(countryId, userId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...hrKeys.all, 'org', 'directors'] }),
  });
}

// ================================
// ASISTENCIA (CHECADOR)
// ================================

/** Bitácora de toques del checador (paginada). */
export function useAttendance(query: AttendanceQuery = {}) {
  return useQuery({
    queryKey: hrKeys.attendanceList(query),
    queryFn: () => hrApi.getAttendance(query),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** Resumen de un día: un renglón por empleado, con retardos y faltas. */
export function useAttendanceDay(query: AttendanceDayQuery = {}, enabled = true) {
  return useQuery({
    queryKey: hrKeys.attendanceDay(query),
    queryFn: () => hrApi.getAttendanceDay(query),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** Captura manual de RRHH (hr:manage). Los toasts se disparan en la página. */
export function useManualAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ManualAttendanceInput) => hrApi.registerManualAttendance(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.attendance() });
      void queryClient.invalidateQueries({ queryKey: hrKeys.dashboard() });
    },
  });
}

// ================================
// VACACIONES
// ================================

export function useVacations(query: VacationQuery = {}) {
  return useQuery({
    queryKey: hrKeys.vacationList(query),
    queryFn: () => hrApi.listVacations(query),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
}

export function useVacation(id: string) {
  return useQuery({
    queryKey: hrKeys.vacation(id),
    queryFn: () => hrApi.getVacation(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateVacations() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: hrKeys.vacations() });
    void queryClient.invalidateQueries({ queryKey: hrKeys.dashboard() });
    if (id) void queryClient.invalidateQueries({ queryKey: hrKeys.vacation(id) });
  };
}

export function useCreateVacation() {
  const invalidate = useInvalidateVacations();
  return useMutation({
    mutationFn: (data: CreateVacationDto) => hrApi.createVacationRequest(data),
    onSuccess: () => invalidate(),
  });
}

export function useApproveVacation() {
  const invalidate = useInvalidateVacations();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReviewVacationDto }) =>
      hrApi.approveVacation(id, data),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useRejectVacation() {
  const invalidate = useInvalidateVacations();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hrApi.rejectVacation(id, reason),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useCancelVacation() {
  const invalidate = useInvalidateVacations();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      hrApi.cancelVacation(id, reason),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

// ================================
// VIÁTICOS
// ================================
//
// /hr/expenses NO existe en el API: estos hooks solo los usa la pantalla de
// Viáticos, que está oculta del menú hasta que haya backend. El panel de RRHH
// ya NO depende de ellos.

export function useExpenses(query: ExpenseQuery = {}) {
  return useQuery({
    queryKey: hrKeys.expenseList(query),
    queryFn: () => hrApi.listExpenses(query),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: hrKeys.expense(id),
    queryFn: () => hrApi.getExpense(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

function useInvalidateExpenses() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
    if (id) void queryClient.invalidateQueries({ queryKey: hrKeys.expense(id) });
  };
}

export function useCreateExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (data: CreateExpenseDto) => hrApi.createExpense(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseDto }) =>
      hrApi.updateExpense(id, data),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useAddExpenseItem() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ expenseId, data }: { expenseId: string; data: ExpenseItemDto }) =>
      hrApi.addExpenseItem(expenseId, data),
    onSuccess: (_, { expenseId }) => invalidate(expenseId),
  });
}

export function useRemoveExpenseItem() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ expenseId, itemId }: { expenseId: string; itemId: string }) =>
      hrApi.removeExpenseItem(expenseId, itemId),
    onSuccess: (_, { expenseId }) => invalidate(expenseId),
  });
}

export function useSubmitExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (id: string) => hrApi.submitExpense(id),
    onSuccess: (_, id) => invalidate(id),
  });
}

export function useApproveExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReviewExpenseDto }) =>
      hrApi.approveExpense(id, data),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useVerifyExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReviewExpenseDto }) =>
      hrApi.verifyExpense(id, data),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useRefundExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ id, refundReference }: { id: string; refundReference?: string }) =>
      hrApi.refundExpense(id, refundReference),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useRejectExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hrApi.rejectExpense(id, reason),
    onSuccess: (_, { id }) => invalidate(id),
  });
}
