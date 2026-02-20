import api from '@/lib/axios';
import type {
  Role,
  RoleWithPermissions,
  RoleListResponse,
  Permission,
  PermissionsByModule,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from '@/types/role';

class RolesService {
  private readonly basePath = '/roles';

  async getAll(): Promise<RoleListResponse> {
    const { data } = await api.get<RoleListResponse>(this.basePath);
    return data;
  }

  async getById(id: string): Promise<RoleWithPermissions> {
    const { data } = await api.get<RoleWithPermissions>(`${this.basePath}/${id}`);
    return data;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const { data } = await api.post<Role>(this.basePath, dto);
    return data;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const { data } = await api.put<Role>(`${this.basePath}/${id}`, dto);
    return data;
  }

  async remove(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  async getPermissions(roleId: string): Promise<Permission[]> {
    const { data } = await api.get<Permission[]>(`${this.basePath}/${roleId}/permissions`);
    return data;
  }

  async updatePermissions(roleId: string, dto: UpdateRolePermissionsDto): Promise<Permission[]> {
    const { data } = await api.put<Permission[]>(`${this.basePath}/${roleId}/permissions`, dto);
    return data;
  }
}

class PermissionsService {
  async getAllGrouped(): Promise<PermissionsByModule> {
    const { data } = await api.get<PermissionsByModule>('/permissions');
    return data;
  }
}

export const rolesService = new RolesService();
export const permissionsService = new PermissionsService();
