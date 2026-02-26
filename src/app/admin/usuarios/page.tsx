'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useActivateUser,
  useDeactivateUser,
  useHardDeleteUser,
} from '@/hooks/useUsers';
import type { UserQueryParams, User, CreateUserDto, UpdateUserDto } from '@/types/user';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  UserIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth';

export default function UsuariosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const pageSize = 20;

  // Build query params
  const queryParams: UserQueryParams = useMemo(() => {
    const params: UserQueryParams = {
      page: currentPage,
      limit: pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    if (searchQuery) params.search = searchQuery;
    if (filterRole !== 'all') params.role = filterRole;
    if (filterStatus !== 'all') {
      params.isActive = filterStatus === 'active';
    }

    return params;
  }, [searchQuery, filterRole, filterStatus, currentPage]);

  // API Hooks
  const { data: usersData, isLoading, error, refetch } = useUsers(queryParams);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const hardDeleteUser = useHardDeleteUser();

  // Computed stats
  const stats = useMemo(() => {
    if (!usersData) {
      return { total: 0, active: 0, distributors: 0, customers: 0 };
    }
    return {
      total: usersData.total,
      active: usersData.data.filter((u) => u.isActive).length,
      distributors: usersData.data.filter((u) =>
        u.role?.code === 'distributor'
      ).length,
      customers: usersData.data.filter((u) =>
        u.role?.code === 'customer'
      ).length,
    };
  }, [usersData]);

  // Handlers
  const handleActivateUser = async (userId: string) => {
    try {
      await activateUser.mutateAsync(userId);
      toast.success('Usuario activado correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al activar el usuario');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await deactivateUser.mutateAsync(userId);
      toast.success('Usuario desactivado correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al desactivar el usuario');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar permanentemente este usuario?')) {
      return;
    }
    try {
      await hardDeleteUser.mutateAsync(userId);
      toast.success('Usuario eliminado correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar el usuario');
    }
  };

  const handleExport = () => {
    toast.info('Función de exportación próximamente disponible');
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleFilterRole = (value: string) => {
    setFilterRole(value);
    setCurrentPage(1);
  };

  const handleFilterStatus = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      roleId: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      roleId: user.role?.code ?? '',
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const dto: UpdateUserDto = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          roleId: formData.roleId || undefined,
          isActive: formData.isActive,
        };
        await updateUser.mutateAsync({ id: editingUser.id, dto });
        toast.success('Usuario actualizado correctamente');
      } else {
        const dto: CreateUserDto = {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          roleId: formData.roleId,
          isActive: formData.isActive,
        };
        await createUser.mutateAsync(dto);
        toast.success('Usuario creado correctamente');
      }
      closeModal();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          (editingUser ? 'Error al actualizar el usuario' : 'Error al crear el usuario')
      );
    }
  };

  // Helper functions
  const getUserRole = (user: User) => {
    const code = user.role?.code;
    if (code === 'administrador' || code === 'super_admin' || code === 'subadmin') return 'admin';
    if (code === 'distributor') return 'distributor';
    if (code === 'customer') return 'customer';
    return 'user';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <ShieldCheckIcon className="h-3 w-3" />
            Admin
          </span>
        );
      case 'distributor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <BuildingStorefrontIcon className="h-3 w-3" />
            Distribuidor
          </span>
        );
      case 'customer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <UserIcon className="h-3 w-3" />
            Cliente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <UserIcon className="h-3 w-3" />
            Usuario
          </span>
        );
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircleIcon className="h-3 w-3" />
          Activo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
        <XCircleIcon className="h-3 w-3" />
        Inactivo
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAvatarUrl = (user: User) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${user.firstName} ${user.lastName}`
    )}&background=random`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <UserGroupIcon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">Gestión de Usuarios</h1>
            </div>
            <p className="text-white/80 text-lg">Cargando usuarios...</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <UserGroupIcon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">Gestión de Usuarios</h1>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-700">
                <ExclamationTriangleIcon className="h-6 w-6" />
                <p>Error al cargar los usuarios. Por favor, intenta de nuevo.</p>
              </div>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const users = usersData?.data ?? [];
  const totalPages = usersData?.totalPages ?? 1;

  return (
    <PermissionGuard permissions={['users:read', 'users:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserGroupIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Usuarios</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra usuarios, roles y permisos del sistema
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={openCreateModal}
              >
                Nuevo Usuario
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Usuarios</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Distribuidores</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.distributors}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.customers}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterRole}
                  onChange={(e) => handleFilterRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                >
                  <option value="all">Todos los Roles</option>
                  <option value="admin">Admin</option>
                  <option value="distributor">Distribuidor</option>
                  <option value="customer">Cliente</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => handleFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>

              {/* Export Button */}
              <Button
                variant="outline"
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                onClick={handleExport}
              >
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Usuario
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Rol
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Registro
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Verificado
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const role = getUserRole(user);
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getAvatarUrl(user)}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">{getRoleBadge(role)}</td>
                        <td className="py-4 px-4">{getStatusBadge(user.isActive)}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {user.emailVerifiedAt ? (
                            <span className="text-green-600">Sí</span>
                          ) : (
                            <span className="text-yellow-600">No</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar usuario"
                            >
                              <PencilIcon className="h-4 w-4 text-blue-600" />
                            </button>
                            {user.isActive ? (
                              <button
                                onClick={() => handleDeactivateUser(user.id)}
                                className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Desactivar usuario"
                                disabled={deactivateUser.isPending}
                              >
                                <XCircleIcon className="h-4 w-4 text-yellow-600" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateUser(user.id)}
                                className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                                title="Activar usuario"
                                disabled={activateUser.isPending}
                              >
                                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar usuario"
                              disabled={hardDeleteUser.isPending}
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron usuarios
                </h3>
                <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
              </div>
            )}

            {/* Pagination */}
            {users.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {users.length} de {usersData?.total ?? 0} usuarios
                  {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Create/Edit Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editingUser={editingUser}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={createUser.isPending || updateUser.isPending}
      />
    </div>
    </PermissionGuard>
  );
}

// ================================
// USER FORM MODAL COMPONENT
// ================================

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: User | null;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const ROLE_OPTIONS = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'subadmin', label: 'Sub-Administrador' },
  { value: 'almacen', label: 'Almacen' },
  { value: 'ventas_mostrador', label: 'Ventas Mostrador' },
  { value: 'customer', label: 'Cliente' },
];

function UserFormModal({
  isOpen,
  onClose,
  editingUser,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
}: UserFormModalProps) {
  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const inputClassName =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={formData.firstName ?? ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="Nombre"
              className={inputClassName}
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido
            </label>
            <input
              type="text"
              value={formData.lastName ?? ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Apellido"
              className={inputClassName}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={formData.email ?? ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className={inputClassName}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone ?? ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+52 123 456 7890"
              className={inputClassName}
            />
          </div>

          {/* Password - only for create */}
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={formData.password ?? ''}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={inputClassName}
              />
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={formData.roleId ?? ''}
              onChange={(e) => handleChange('roleId', e.target.value)}
              className={inputClassName}
            >
              <option value="">Seleccionar rol...</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive ?? true}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#3E667D] focus:ring-[#3E667D]"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Usuario activo
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : editingUser
                ? 'Guardar Cambios'
                : 'Crear Usuario'}
          </Button>
        </div>
      </div>
    </div>
  );
}
