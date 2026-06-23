// hooks/useHR.ts - React Query hooks for HR module

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrService as hrApi } from '@/services/hr.service';
import {
  EmployeeQuery,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  AttendanceQuery,
  CheckInOutDto,
  ManualAttendanceDto,
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
  employees: () => [...hrKeys.all, 'employees'] as const,
  employeeList: (query: EmployeeQuery) => [...hrKeys.employees(), 'list', query] as const,
  employee: (id: string) => [...hrKeys.employees(), id] as const,
  myEmployee: () => [...hrKeys.employees(), 'me'] as const,
  attendance: () => [...hrKeys.all, 'attendance'] as const,
  attendanceReport: (query: AttendanceQuery) => [...hrKeys.attendance(), 'report', query] as const,
  vacations: () => [...hrKeys.all, 'vacations'] as const,
  vacationList: (query: VacationQuery) => [...hrKeys.vacations(), 'list', query] as const,
  vacation: (id: string) => [...hrKeys.vacations(), id] as const,
  pendingVacations: () => [...hrKeys.vacations(), 'pending'] as const,
  expenses: () => [...hrKeys.all, 'expenses'] as const,
  expenseList: (query: ExpenseQuery) => [...hrKeys.expenses(), 'list', query] as const,
  expense: (id: string) => [...hrKeys.expenses(), id] as const,
  stats: () => [...hrKeys.all, 'stats'] as const,
  recentActivity: () => [...hrKeys.all, 'activity'] as const,
  pendingApprovals: () => [...hrKeys.all, 'pendingApprovals'] as const,
};

// ================================
// EMPLOYEE HOOKS
// ================================

export function useEmployees(query: EmployeeQuery = {}) {
  return useQuery({
    queryKey: hrKeys.employeeList(query),
    queryFn: () => hrApi.listEmployees(query),
    staleTime: 2 * 60 * 1000,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: hrKeys.employee(id),
    queryFn: () => hrApi.getEmployee(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

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

export function useMyEmployee() {
  return useQuery({
    queryKey: hrKeys.myEmployee(),
    queryFn: () => hrApi.getMyEmployee(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeDto) => hrApi.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeDto }) =>
      hrApi.updateEmployee(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      queryClient.invalidateQueries({ queryKey: hrKeys.employee(id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

// ================================
// ATTENDANCE HOOKS
// ================================

export function useAttendanceReport(query: AttendanceQuery) {
  return useQuery({
    queryKey: hrKeys.attendanceReport(query),
    queryFn: () => hrApi.getAttendanceReport(query),
    enabled: !!query.startDate && !!query.endDate,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCheckInOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckInOutDto) => hrApi.checkInOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.attendance() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ManualAttendanceDto) => hrApi.registerManualAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.attendance() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

// ================================
// VACATION HOOKS
// ================================

export function useVacations(query: VacationQuery = {}) {
  return useQuery({
    queryKey: hrKeys.vacationList(query),
    queryFn: () => hrApi.listVacations(query),
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

export function usePendingVacations() {
  return useQuery({
    queryKey: hrKeys.pendingVacations(),
    queryFn: () => hrApi.getPendingVacations(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVacationDto) => hrApi.createVacation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.vacations() });
      queryClient.invalidateQueries({ queryKey: hrKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

export function useApproveVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReviewVacationDto }) =>
      hrApi.approveVacation(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.vacations() });
      queryClient.invalidateQueries({ queryKey: hrKeys.vacation(id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

export function useRejectVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hrApi.rejectVacation(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.vacations() });
      queryClient.invalidateQueries({ queryKey: hrKeys.vacation(id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

export function useCancelVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => hrApi.cancelVacation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.vacations() });
      queryClient.invalidateQueries({ queryKey: hrKeys.vacation(id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

// ================================
// EXPENSE HOOKS
// ================================

export function useExpenses(query: ExpenseQuery = {}) {
  return useQuery({
    queryKey: hrKeys.expenseList(query),
    queryFn: () => hrApi.listExpenses(query),
    staleTime: 2 * 60 * 1000,
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: hrKeys.expense(id),
    queryFn: () => hrApi.getExpense(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseDto) => hrApi.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseDto }) =>
      hrApi.updateExpense(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: hrKeys.expense(id) });
    },
  });
}

export function useAddExpenseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, data }: { expenseId: string; data: ExpenseItemDto }) =>
      hrApi.addExpenseItem(expenseId, data),
    onSuccess: (_, { expenseId }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expense(expenseId) });
    },
  });
}

export function useRemoveExpenseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, itemId }: { expenseId: string; itemId: string }) =>
      hrApi.removeExpenseItem(expenseId, itemId),
    onSuccess: (_, { expenseId }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expense(expenseId) });
    },
  });
}

export function useSubmitExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => hrApi.submitExpense(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: hrKeys.expense(id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReviewExpenseDto }) =>
      hrApi.approveExpense(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: hrKeys.expense(id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

export function useVerifyExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReviewExpenseDto }) =>
      hrApi.verifyExpense(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: hrKeys.expense(id) });
    },
  });
}

export function useRefundExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, refundReference }: { id: string; refundReference?: string }) =>
      hrApi.refundExpense(id, refundReference),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: hrKeys.expense(id) });
    },
  });
}

export function useRejectExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hrApi.rejectExpense(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: hrKeys.expense(id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: hrKeys.stats() });
    },
  });
}

// ================================
// DASHBOARD HOOKS
// ================================

export function useHRStats() {
  return useQuery({
    queryKey: hrKeys.stats(),
    queryFn: () => hrApi.getHRStats(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useHRRecentActivity() {
  return useQuery({
    queryKey: hrKeys.recentActivity(),
    queryFn: () => hrApi.getRecentActivity(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useHRPendingApprovals() {
  return useQuery({
    queryKey: hrKeys.pendingApprovals(),
    queryFn: () => hrApi.getPendingApprovals(),
    staleTime: 2 * 60 * 1000,
  });
}
