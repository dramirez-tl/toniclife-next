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
import { confirmAction } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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

// Módulos disponibles para el selector de módulo por defecto
const MODULE_OPTIONS = [
  { value: '', label: 'Ninguno (Panel principal)' },
  { value: 'dashboard', label: 'Panel Principal' },
  { value: 'sucursales', label: 'Sucursales' },
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'distribuidores', label: 'Distribuidores' },
  { value: 'productos', label: 'Productos' },
  { value: 'pedidos', label: 'Pedidos' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'pos', label: 'Punto de Venta' },
  { value: 'mlm', label: 'MLM' },
  { value: 'facturacion', label: 'Facturacion' },
  { value: 'reportes', label: 'Reportes' },
  { value: 'tesoreria', label: 'Tesoreria' },
  { value: 'rrhh', label: 'Recursos Humanos' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'cupones', label: 'Cupones' },
  { value: 'banners', label: 'Banners' },
  { value: 'contenido', label: 'Contenido' },
  { value: 'auditoria', label: 'Auditoria' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'configuracion', label: 'Configuracion' },
];

// Categoría del rol: a qué tipo de cuenta pertenece (alinea con users.user_type).
const CATEGORY_OPTIONS = [
  { value: 'colaborador', label: 'Colaborador (departamento interno)' },
  { value: 'cliente', label: 'Cliente (distribuidor / preferente)' },
];

function RoleFormModal({
  role,
  onClose,
}: {
  role: Role | null;
  onClose: () => void;
}) {
  const isEditing = !!role;
  const [formData, setFormData] = useState<CreateRoleDto & UpdateRoleDto & { isActive?: boolean }>({
    code: role?.code || '',
    name: role?.name || '',
    description: role?.description || '',
    defaultModule: role?.defaultModule || '',
    requiresCashClose: role?.requiresCashClose || false,
    category: (role?.category as 'colaborador' | 'cliente') || 'colaborador',
    isDepartmentRole: role?.isDepartmentRole || false,
    isActive: role?.isActive ?? true,
  });

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  // Auto-format code: lowercase, replace spaces with underscore
  const handleCodeChange = (val: string) => {
    setFormData({ ...formData, code: val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') });
  };

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
            category: formData.category,
            isDepartmentRole: formData.isDepartmentRole,
            isActive: formData.isActive,
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
          category: formData.category,
          isDepartmentRole: formData.isDepartmentRole,
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Editar Rol' : 'Crear Nuevo Rol'}
            </h2>
            {isEditing && role.userCount > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {role.userCount} usuario{role.userCount !== 1 ? 's' : ''} con este rol
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Identificacion */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identificacion</legend>
            <div className={`grid gap-4 ${!isEditing ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Codigo <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="font-mono"
                    placeholder="ventas_regional"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Solo letras, numeros y guion bajo</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ventas Regional"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                rows={2}
                placeholder="Breve descripcion de las responsabilidades de este rol..."
              />
            </div>
          </fieldset>

          {/* Configuracion */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Configuracion</legend>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <SearchableSelect
                value={formData.category || 'colaborador'}
                onChange={(v) => setFormData({ ...formData, category: v as 'colaborador' | 'cliente' })}
                options={CATEGORY_OPTIONS}
                showAllOption={false}
                className="w-full"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Define en qué tipo de cuenta aparece este rol al crear usuarios.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modulo por defecto</label>
                <SearchableSelect
                  value={formData.defaultModule || ''}
                  onChange={(v) => setFormData({ ...formData, defaultModule: v })}
                  options={MODULE_OPTIONS.filter((opt) => opt.value !== '')}
                  showAllOption
                  allValue=""
                  allLabel="Ninguno (Panel principal)"
                  className="w-full"
                />
                <p className="text-[11px] text-gray-400 mt-1">Pantalla que se muestra al iniciar sesion</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                {isEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-full justify-between ${
                      formData.isActive
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700'
                        : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <span className="text-sm font-medium">{formData.isActive ? 'Activo' : 'Inactivo'}</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${formData.isActive ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </Button>
                ) : (
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
                    Activo por defecto
                  </div>
                )}
              </div>
            </div>
          </fieldset>

          {/* Opciones */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Opciones</legend>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={formData.requiresCashClose || false}
                  onChange={(e) => setFormData({ ...formData, requiresCashClose: e.target.checked })}
                  className="h-4 w-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Requiere corte de caja</p>
                  <p className="text-[11px] text-gray-400">El usuario debe hacer corte de caja al finalizar su turno</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isDepartmentRole || false}
                  onChange={(e) => setFormData({ ...formData, isDepartmentRole: e.target.checked })}
                  className="h-4 w-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Es departamento (no rol de permisos)</p>
                  <p className="text-[11px] text-gray-400">Se oculta del selector de rol al crear usuarios; el departamento se asigna aparte.</p>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Info: permisos */}
          {isEditing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <KeyIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Para configurar los permisos de este rol, cierra este formulario y usa el boton de llave
                <KeyIcon className="h-3 w-3 inline mx-0.5" />
                en la tabla.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isPending}
            >
              {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Rol'}
            </Button>
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
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar modulo o permiso..."
              className="pl-10"
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
                      <Button
                        variant="ghost"
                        onClick={() => toggleModule(mod, !fullySelected)}
                        className={`h-5 w-5 p-0 rounded border-2 hover:bg-transparent ${
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
                      </Button>
                      <span className="font-medium text-gray-900 capitalize">{mod}</span>
                      <span className="text-xs text-gray-500">
                        ({perms.filter((p) => selectedIds.has(p.id)).length}/{perms.length})
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleModule(mod, true)}
                        className="h-auto p-0 text-xs text-[#3E667D]"
                      >
                        Todos
                      </Button>
                      <span className="text-gray-300">|</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleModule(mod, false)}
                        className="h-auto p-0 text-xs text-gray-500"
                      >
                        Ninguno
                      </Button>
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
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Permisos'}
          </Button>
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
    category: 'all',
  });

  const searchQuery = get('search');
  const typeFilter = get('type');
  const categoryFilter = get('category');
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
    if (categoryFilter !== 'all') {
      result = result.filter((r) => (r.category ?? 'colaborador') === categoryFilter);
    }
    return result;
  }, [roles, searchQuery, typeFilter, categoryFilter]);

  // Client-side pagination
  const totalItems = filteredRoles.length;
  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, currentPage, pageSize]);

  const hasActiveFilters = !!searchQuery || typeFilter !== 'all' || categoryFilter !== 'all';

  const resetFilters = () => {
    setParams({ search: null, type: 'all', category: 'all', page: '1' });
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
    const ok = await confirmAction(`¿Estás seguro de eliminar el rol "${role.name}"?`);
    if (!ok) return;
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
      key: 'category',
      header: 'Categoría',
      sortable: true,
      sortValue: (r) => r.category ?? 'colaborador',
      render: (role) => {
        const isColab = (role.category ?? 'colaborador') === 'colaborador';
        return (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            isColab
              ? 'border-[#3E667D]/30 bg-[#3E667D]/10 text-[#3E667D]'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {isColab ? 'Colaborador' : 'Cliente'}
          </span>
        );
      },
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
          {role.isDepartmentRole && (
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700" title="Es un departamento, no un rol de permisos">Departamento</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (role) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => { setPermissionsRoleId(role.id); setPermissionsRoleName(role.name); }}
            title="Gestionar permisos"
            className="text-gray-400 hover:text-[#3E667D] hover:bg-[#3E667D]/5"
          >
            <KeyIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditingRole(role)}
            title="Editar rol"
            disabled={role.isSystemRole}
            className="text-gray-400 hover:text-[#3E667D] hover:bg-[#3E667D]/5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDelete(role)}
            title="Eliminar rol"
            disabled={role.isSystemRole || role.userCount > 0}
            className="text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
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
            <Button
              variant="ghost"
              onClick={() => setShowCreateModal(true)}
              className="bg-white/15 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 hover:text-white"
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo Rol
            </Button>
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
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <Input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Buscar por nombre, código o descripción..."
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" variant="default" size="sm">Buscar</Button>
                </form>
                <div className="flex gap-2">
                  <SearchableSelect
                    value={categoryFilter}
                    onChange={(v) => setParams({ category: v, page: '1' })}
                    options={[
                      { value: 'colaborador', label: 'Colaborador' },
                      { value: 'cliente', label: 'Cliente' },
                    ]}
                    showAllOption
                    allValue="all"
                    allLabel="Todas las categorías"
                    className="w-52"
                  />
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => refetch()}
                    title="Actualizar"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <FunnelIcon className="h-3 w-3" />
                  Mostrando {filteredRoles.length} de {roles.length} roles
                  {searchQuery && <span className="bg-gray-100 px-2 py-0.5 rounded">Búsqueda: {searchQuery}</span>}
                  {typeFilter !== 'all' && <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">Tipo: {typeFilter === 'system' ? 'Sistema' : 'Custom'}</span>}
                  {categoryFilter !== 'all' && <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">Categoría: {categoryFilter}</span>}
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
              minWidthClassName="min-w-[920px]"
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
                    <Button variant="default" onClick={() => setShowCreateModal(true)}>
                      <PlusIcon className="h-4 w-4" />
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
