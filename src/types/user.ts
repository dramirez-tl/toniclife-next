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
  role?: string;
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

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  username?: string;
  roleId: string;
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
  branchId?: string;
  isActive?: boolean;
}

// Legacy alias for backward compatibility
export type Role = RoleDto;
