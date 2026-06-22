// user.ts - TypeScript types for Users module
// Aligned with backend DTOs: toniclife-api/src/modules/users/dto/

// ================================
// BASE TYPES
// ================================

export interface RoleDto {
  id: string;
  name: string;
  code: string;
}

export interface User {
  id: string;
  email: string;
  username: string | null;
  status: string;
  mustChangePassword: boolean;
  firstName: string;
  lastName: string;
  phone: string | null;
  customerNumber: string | null;
  /** ID del registro de cliente MLM enlazado (users.customer_id), si existe. */
  customerId?: string | null;
  /** Tipo en el MLM del cliente enlazado: 'distributor' | 'preferred_customer' | 'final_customer'. */
  customerType?: string | null;
  /** Tipo de cuenta: 'colaborador' | 'distribuidor' | 'cliente' | 'sistema' (derivado por vínculo si no se asignó). */
  userType?: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  role: RoleDto;
  permissions: string[];
  createdAt: string;
  updatedAt: string | null;
}

// ================================
// QUERY PARAMS
// ================================

export interface UserQueryParams {
  search?: string;
  customerNumber?: string;
  role?: string;
  userType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'firstName' | 'lastName' | 'email';
  sortOrder?: 'asc' | 'desc';
}

// ================================
// RESPONSE TYPES
// ================================

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ================================
// DTO TYPES
// ================================

export type UserType = 'colaborador' | 'distribuidor' | 'cliente' | 'sistema';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  username?: string;
  roleId: string;
  userType?: UserType;
  branchId?: string;
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  username?: string;
  roleId?: string;
  userType?: UserType;
  branchId?: string;
  isActive?: boolean;
}

// ================================
// STATS TYPES
// ================================

export interface EmailVerificationStats {
  total: number;
  verified: number;
  notVerified: number;
  verifiedPercent: number;
  recentVerifications: { month: string; verified: number; registered: number }[];
}

export interface VerifiedUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: { name: string; code: string };
  emailVerifiedAt: string;
  createdAt: string;
}

export interface VerifiedUsersResponse {
  data: VerifiedUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Legacy alias for backward compatibility
export type Role = RoleDto;
