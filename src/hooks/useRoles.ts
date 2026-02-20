import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesService, permissionsService } from '@/services/roles.service';
import type {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from '@/types/role';

// ─── Query hooks ───

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.getAll(),
  });
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => rolesService.getById(id!),
    enabled: !!id,
  });
}

export function useRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: ['roles', roleId, 'permissions'],
    queryFn: () => rolesService.getPermissions(roleId!),
    enabled: !!roleId,
  });
}

export function useAllPermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsService.getAllGrouped(),
  });
}

// ─── Mutation hooks ───

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateRoleDto) => rolesService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRoleDto }) =>
      rolesService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rolesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, dto }: { roleId: string; dto: UpdateRolePermissionsDto }) =>
      rolesService.updatePermissions(roleId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId, 'permissions'] });
    },
  });
}
