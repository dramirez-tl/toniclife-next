'use client';

import { useState, useMemo } from 'react';
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth';
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAllPermissions,
  useRolePermissions,
  useUpdateRolePermissions,
} from '@/hooks/useRoles';
import type {
  Role,
  Permission,
  CreateRoleDto,
  UpdateRoleDto,
} from '@/types/role';

// ─── Role Form Modal ───

function RoleFormModal({
  role,
  onClose,
}: {
  role: Role | null;
  onClose: () => void;
}) {
  const isEditing = !!role;
  const [formData, setFormData] = useState<CreateRoleDto & UpdateRoleDto>({
    code: role?.code || '',
    name: role?.name || '',
    description: role?.description || '',
    defaultModule: role?.defaultModule || '',
    requiresCashClose: role?.requiresCashClose || false,
  });

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: role.id,
          dto: {
            name: formData.name,
            description: formData.description || undefined,
            defaultModule: formData.defaultModule || undefined,
            requiresCashClose: formData.requiresCashClose,
          },
        });
        toast.success('Rol actualizado correctamente');
      } else {
        if (!formData.code || !formData.name) {
          toast.error('Codigo y nombre son requeridos');
          return;
        }
        await createMutation.mutateAsync({
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          defaultModule: formData.defaultModule || undefined,
          requiresCashClose: formData.requiresCashClose,
        });
        toast.success('Rol creado correctamente');
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar el rol');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar Rol' : 'Crear Nuevo Rol'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codigo</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                placeholder="ej: ventas_regional"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              placeholder="ej: Ventas Regional"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              rows={3}
              placeholder="Descripcion del rol..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modulo por defecto</label>
            <input
              type="text"
              value={formData.defaultModule || ''}
              onChange={(e) => setFormData({ ...formData, defaultModule: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              placeholder="ej: ventas"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresCashClose"
              checked={formData.requiresCashClose || false}
              onChange={(e) => setFormData({ ...formData, requiresCashClose: e.target.checked })}
              className="h-4 w-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
            />
            <label htmlFor="requiresCashClose" className="text-sm text-gray-700">
              Requiere corte de caja
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm text-white bg-[#003B7A] rounded-lg hover:bg-[#003B7A]/90 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Rol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Permissions Modal ───

function PermissionsModal({
  roleId,
  roleName,
  onClose,
}: {
  roleId: string;
  roleName: string;
  onClose: () => void;
}) {
  const { data: allPermissions, isLoading: loadingAll } = useAllPermissions();
  const { data: rolePermissions, isLoading: loadingRole } = useRolePermissions(roleId);
  const updateMutation = useUpdateRolePermissions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [search, setSearch] = useState('');

  // Initialize selected IDs from current role permissions
  if (rolePermissions && !initialized) {
    setSelectedIds(new Set(rolePermissions.map((p) => p.id)));
    setInitialized(true);
  }

  const modules = useMemo(() => {
    if (!allPermissions) return [];
    return Object.keys(allPermissions).sort();
  }, [allPermissions]);

  const filteredModules = useMemo(() => {
    if (!search) return modules;
    const lower = search.toLowerCase();
    return modules.filter((mod) => {
      if (mod.toLowerCase().includes(lower)) return true;
      return allPermissions?.[mod]?.some(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.code.toLowerCase().includes(lower),
      );
    });
  }, [modules, search, allPermissions]);

  const togglePermission = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (mod: string, selectAll: boolean) => {
    if (!allPermissions) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of allPermissions[mod]) {
        if (selectAll) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  };

  const isModuleFullySelected = (mod: string): boolean => {
    if (!allPermissions) return false;
    return allPermissions[mod].every((p) => selectedIds.has(p.id));
  };

  const isModulePartiallySelected = (mod: string): boolean => {
    if (!allPermissions) return false;
    const perms = allPermissions[mod];
    const count = perms.filter((p) => selectedIds.has(p.id)).length;
    return count > 0 && count < perms.length;
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        roleId,
        dto: { permissionIds: Array.from(selectedIds) },
      });
      toast.success(`Permisos del rol "${roleName}" actualizados correctamente`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar permisos');
    }
  };

  const isLoading = loadingAll || loadingRole;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Permisos del Rol: {roleName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedIds.size} permisos seleccionados
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar modulo o permiso..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003B7A]" />
            </div>
          ) : (
            filteredModules.map((mod) => {
              const perms = allPermissions?.[mod] || [];
              const fullySelected = isModuleFullySelected(mod);
              const partiallySelected = isModulePartiallySelected(mod);

              return (
                <div key={mod} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleModule(mod, !fullySelected)}
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          fullySelected
                            ? 'bg-[#003B7A] border-[#003B7A] text-white'
                            : partiallySelected
                            ? 'bg-[#003B7A]/30 border-[#003B7A] text-white'
                            : 'border-gray-300 hover:border-[#003B7A]'
                        }`}
                      >
                        {(fullySelected || partiallySelected) && (
                          <CheckIcon className="h-3 w-3" />
                        )}
                      </button>
                      <span className="font-medium text-gray-900 capitalize">{mod}</span>
                      <span className="text-xs text-gray-500">
                        ({perms.filter((p) => selectedIds.has(p.id)).length}/{perms.length})
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleModule(mod, true)}
                        className="text-xs text-[#003B7A] hover:underline"
                      >
                        Todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => toggleModule(mod, false)}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-3">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-0.5 h-4 w-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-700 truncate">
                            {perm.name}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{perm.code}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm text-white bg-[#003B7A] rounded-lg hover:bg-[#003B7A]/90 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Permisos'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function RolesPage() {
  const { data, isLoading, isError } = useRoles();
  const deleteMutation = useDeleteRole();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionsRoleId, setPermissionsRoleId] = useState<string | null>(null);
  const [permissionsRoleName, setPermissionsRoleName] = useState('');
  const [search, setSearch] = useState('');

  const roles = data?.data || [];

  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const lower = search.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.code.toLowerCase().includes(lower) ||
        r.description?.toLowerCase().includes(lower),
    );
  }, [roles, search]);

  const handleDelete = async (role: Role) => {
    if (role.isSystemRole) {
      toast.error('No se puede eliminar un rol de sistema');
      return;
    }
    if (role.userCount > 0) {
      toast.error(`No se puede eliminar: el rol tiene ${role.userCount} usuario(s) asignado(s)`);
      return;
    }
    if (!confirm(`¿Estas seguro de eliminar el rol "${role.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(role.id);
      toast.success('Rol eliminado correctamente');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar el rol');
    }
  };

  return (
    <PermissionGuard roles={['administrador', 'super_admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <ShieldCheckIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Roles y Permisos</h1>
                <p className="text-white/70">
                  Gestiona los roles del sistema y sus permisos de acceso
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo Rol
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{roles.length}</div>
            <div className="text-sm text-gray-500">Total de Roles</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">
              {roles.filter((r) => r.isSystemRole).length}
            </div>
            <div className="text-sm text-gray-500">Roles de Sistema</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">
              {roles.filter((r) => r.isActive).length}
            </div>
            <div className="text-sm text-gray-500">Roles Activos</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, codigo o descripcion..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003B7A]" />
            </div>
          ) : isError ? (
            <div className="text-center py-16 text-red-500">
              Error al cargar los roles. Intenta de nuevo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuarios</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{role.name}</div>
                        {role.description && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{role.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {role.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{role.userCount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            role.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {role.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {role.isSystemRole ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Sistema
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Custom
                          </span>
                        )}
                        {role.requiresCashClose && (
                          <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Corte Caja
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setPermissionsRoleId(role.id);
                              setPermissionsRoleName(role.name);
                            }}
                            title="Gestionar permisos"
                            className="p-2 text-gray-400 hover:text-[#003B7A] hover:bg-[#003B7A]/5 rounded-lg transition-colors"
                          >
                            <KeyIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingRole(role)}
                            title="Editar rol"
                            disabled={role.isSystemRole}
                            className="p-2 text-gray-400 hover:text-[#003B7A] hover:bg-[#003B7A]/5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(role)}
                            title="Eliminar rol"
                            disabled={role.isSystemRole || role.userCount > 0}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRoles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {search ? 'No se encontraron roles con esa busqueda' : 'No hay roles registrados'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {(showCreateModal || editingRole) && (
        <RoleFormModal
          role={editingRole}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRole(null);
          }}
        />
      )}
      {permissionsRoleId && (
        <PermissionsModal
          roleId={permissionsRoleId}
          roleName={permissionsRoleName}
          onClose={() => setPermissionsRoleId(null)}
        />
      )}
    </PermissionGuard>
  );
}
