'use client';

import { useState, useMemo, Suspense } from 'react';
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { useQueryFilters } from '@/hooks/useQueryFilters';
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
              placeholder="ej: Ventas Regional"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
              placeholder="ej: ventas"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresCashClose"
              checked={formData.requiresCashClose || false}
              onChange={(e) => setFormData({ ...formData, requiresCashClose: e.target.checked })}
              className="h-4 w-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
              className="px-4 py-2 text-sm text-white bg-[#3E667D] rounded-lg hover:bg-[#3E667D]/90 disabled:opacity-50"
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D]" />
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
                            ? 'bg-[#3E667D] border-[#3E667D] text-white'
                            : partiallySelected
                            ? 'bg-[#3E667D]/30 border-[#3E667D] text-white'
                            : 'border-gray-300 hover:border-[#3E667D]'
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
                        className="text-xs text-[#3E667D] hover:underline"
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
                          className="mt-0.5 h-4 w-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
            className="px-4 py-2 text-sm text-white bg-[#3E667D] rounded-lg hover:bg-[#3E667D]/90 disabled:opacity-50"
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
  return <Suspense><RolesContent /></Suspense>;
}

function RolesContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    page: '1',
    limit: '20',
    type: 'all',
  });

  const searchQuery = get('search');
  const typeFilter = get('type');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const { data, isLoading, isError, isFetching, refetch } = useRoles();
  const deleteMutation = useDeleteRole();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionsRoleId, setPermissionsRoleId] = useState<string | null>(null);
  const [permissionsRoleName, setPermissionsRoleName] = useState('');
  const [searchInput, setSearchInput] = useState(searchQuery);

  const roles = data?.data || [];

  // Client-side filtering
  const filteredRoles = useMemo(() => {
    let result = roles;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.code.toLowerCase().includes(lower) ||
          r.description?.toLowerCase().includes(lower),
      );
    }
    if (typeFilter === 'system') result = result.filter((r) => r.isSystemRole);
    if (typeFilter === 'custom') result = result.filter((r) => !r.isSystemRole);
    return result;
  }, [roles, searchQuery, typeFilter]);

  // Client-side pagination
  const totalItems = filteredRoles.length;
  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, currentPage, pageSize]);

  const hasActiveFilters = !!searchQuery || typeFilter !== 'all';

  const resetFilters = () => {
    setParams({ search: null, type: 'all', page: '1' });
    setSearchInput('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ search: searchInput || null, page: '1' });
  };

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

  const roleColumns: DataTableColumn<Role>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Rol',
      sortable: true,
      sortValue: (r) => r.name,
      render: (role) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${role.isSystemRole ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <ShieldCheckIcon className={`h-4 w-4 ${role.isSystemRole ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{role.name}</p>
            {role.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{role.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      sortValue: (r) => r.code,
      render: (role) => (
        <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">{role.code}</code>
      ),
    },
    {
      key: 'userCount',
      header: 'Usuarios',
      sortable: true,
      sortValue: (r) => r.userCount,
      render: (role) => (
        <span className={`inline-flex items-center justify-center min-w-[2rem] rounded-full px-2 py-0.5 text-xs font-medium ${
          role.userCount > 0 ? 'bg-[#3E667D]/10 text-[#3E667D]' : 'text-gray-400'
        }`}>
          {role.userCount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (role) => (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
          role.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${role.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {role.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (role) => (
        <div className="flex items-center gap-1">
          {role.isSystemRole ? (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Sistema</span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500">Custom</span>
          )}
          {role.requiresCashClose && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Corte</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (role) => (
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={() => { setPermissionsRoleId(role.id); setPermissionsRoleName(role.name); }}
            title="Gestionar permisos"
            className="p-1.5 text-gray-400 hover:text-[#3E667D] hover:bg-[#3E667D]/5 rounded-lg transition-colors"
          >
            <KeyIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setEditingRole(role)}
            title="Editar rol"
            disabled={role.isSystemRole}
            className="p-1.5 text-gray-400 hover:text-[#3E667D] hover:bg-[#3E667D]/5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(role)}
            title="Eliminar rol"
            disabled={role.isSystemRole || role.userCount > 0}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <PermissionGuard roles={['administrador', 'super_admin']}>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <ShieldCheckIcon className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Roles y Permisos</h1>
              </div>
              <p className="text-sm text-white/70 mt-1">
                Gestiona los roles del sistema y sus permisos de acceso
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/25 transition-all"
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo Rol
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button type="button" onClick={() => setParams({ type: 'all', page: '1' })} className={`rounded-xl border p-5 text-left transition-colors ${typeFilter === 'all' ? 'border-[#3E667D]/40 bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <p className="text-xs text-gray-500 mb-1">Total de Roles</p>
            <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
          </button>
          <button type="button" onClick={() => setParams({ type: 'system', page: '1' })} className={`rounded-xl border p-5 text-left transition-colors ${typeFilter === 'system' ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
            <p className="text-xs text-blue-600 font-medium mb-1">Roles de Sistema</p>
            <p className="text-2xl font-bold text-blue-700">{roles.filter((r) => r.isSystemRole).length}</p>
          </button>
          <button type="button" onClick={() => setParams({ type: 'custom', page: '1' })} className={`rounded-xl border p-5 text-left transition-colors ${typeFilter === 'custom' ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200' : 'border-gray-200 bg-white hover:border-emerald-200'}`}>
            <p className="text-xs text-emerald-600 font-medium mb-1">Roles Custom</p>
            <p className="text-2xl font-bold text-emerald-700">{roles.filter((r) => !r.isSystemRole).length}</p>
          </button>
        </div>

        {/* Table Card */}
        <Card>
          <CardContent className="p-0">
            {/* Search + Filters */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Buscar por nombre, código o descripción..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] text-sm outline-none"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="sm">Buscar</Button>
                </form>
                <div className="flex gap-2">
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Actualizar"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <FunnelIcon className="h-3 w-3" />
                  Mostrando {filteredRoles.length} de {roles.length} roles
                  {searchQuery && <span className="bg-gray-100 px-2 py-0.5 rounded">Búsqueda: {searchQuery}</span>}
                  {typeFilter !== 'all' && <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">Tipo: {typeFilter === 'system' ? 'Sistema' : 'Custom'}</span>}
                </div>
              )}
            </div>

            {/* Fetching indicator */}
            {isFetching && !isLoading && (
              <div className="mx-4 mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                Actualizando resultados...
              </div>
            )}

            {/* DataTable */}
            <DataTable<Role>
              columns={roleColumns}
              data={paginatedRoles}
              isLoading={isLoading && !data}
              getRowKey={(role) => role.id}
              minWidthClassName="min-w-[800px]"
              emptyState={
                <div className="py-8 text-center">
                  <ShieldCheckIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    {hasActiveFilters ? 'No se encontraron roles' : 'No hay roles registrados'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {hasActiveFilters ? 'Intenta ajustar los filtros de búsqueda.' : 'Crea tu primer rol para empezar.'}
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={resetFilters}>Limpiar filtros</Button>
                    )}
                    <Button variant="primary" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
                      Nuevo Rol
                    </Button>
                  </div>
                </div>
              }
            />

            {/* Pagination */}
            {paginatedRoles.length > 0 && (
              <DataTablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                isLoading={isLoading || isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: '1' })}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </CardContent>
        </Card>
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
