// ─── BASE TYPES ───

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  defaultModule: string | null;
  requiresCashClose: boolean;
  isSystemRole: boolean;
  isActive: boolean;
  /** 'colaborador' (departamento interno) | 'cliente'. */
  category?: string;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  permissionType: string;
  parentId?: string | null;
  icon?: string | null;
  route?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

// ─── RESPONSE TYPES ───

export interface RoleListResponse {
  data: Role[];
  total: number;
}

export interface PermissionsByModule {
  [module: string]: Permission[];
}

// ─── DTO TYPES ───

export type RoleCategory = 'colaborador' | 'cliente';

export interface CreateRoleDto {
  code: string;
  name: string;
  description?: string;
  defaultModule?: string;
  requiresCashClose?: boolean;
  category?: RoleCategory;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  defaultModule?: string;
  requiresCashClose?: boolean;
  category?: RoleCategory;
  isActive?: boolean;
}

export interface UpdateRolePermissionsDto {
  permissionIds: string[];
}
