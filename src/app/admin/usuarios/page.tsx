'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useActivateUser,
  useDeactivateUser,
  useHardDeleteUser,
  useResetEmailVerification,
  useEmailVerificationStats,
  useVerifiedUsers,
} from '@/hooks/useUsers';
import type { UserQueryParams, User, CreateUserDto, UpdateUserDto, VerifiedUser } from '@/types/user';
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
  ArrowPathIcon,
  ShieldCheckIcon,
  UserIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth';
import { useAppSelector } from '@/store/hooks';
import { selectUserRoles } from '@/store/slices/authSlice';

type TabKey = 'users' | 'verification';

export default function UsuariosPage() {
  const userRoles = useAppSelector(selectUserRoles);
  const isSuperAdmin = userRoles.includes('super_admin');

  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [resetEmailTarget, setResetEmailTarget] = useState<User | null>(null);

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
  }, [searchQuery, filterRole, filterStatus, currentPage, pageSize]);

  // API Hooks
  const { data: usersData, isLoading, isFetching, error, refetch } = useUsers(queryParams);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const hardDeleteUser = useHardDeleteUser();
  const resetEmailVerification = useResetEmailVerification();

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

  const confirmDeactivateUser = (user: User) => {
    toast.warning(`¿Desactivar a ${user.firstName} ${user.lastName}?`, {
      description: 'El usuario no podrá iniciar sesión mientras esté desactivado.',
      duration: 10000,
      action: {
        label: 'Desactivar',
        onClick: async () => {
          try {
            await deactivateUser.mutateAsync(user.id);
            toast.success('Usuario desactivado correctamente');
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al desactivar el usuario');
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    });
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await hardDeleteUser.mutateAsync(deleteTarget.id);
      toast.success('Usuario eliminado permanentemente');
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar el usuario');
    }
  };

  const handleResetEmail = async () => {
    if (!resetEmailTarget) return;
    try {
      await resetEmailVerification.mutateAsync(resetEmailTarget.id);
      toast.success('Verificación de email restablecida correctamente');
      setResetEmailTarget(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al restablecer la verificación de email');
    }
  };

  const handleExport = () => {
    toast.info('Función de exportación próximamente disponible');
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setCurrentPage(1);
  };

  const handleFilterRole = (value: string) => {
    setFilterRole(value);
    setCurrentPage(1);
  };

  const handleFilterStatus = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setFilterRole('all');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery || filterRole !== 'all' || filterStatus !== 'all');

  const backendTotalPages = usersData?.totalPages;
  useEffect(() => {
    if (backendTotalPages && currentPage > backendTotalPages) {
      setCurrentPage(backendTotalPages);
    }
  }, [backendTotalPages, currentPage]);

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
  const getRoleBadge = (user: User) => {
    const code = user.role?.code;
    const name = user.role?.name || 'Usuario';

    if (code === 'administrador' || code === 'super_admin' || code === 'subadmin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
          <ShieldCheckIcon className="h-3 w-3" />
          {name}
        </span>
      );
    }
    if (code === 'customer') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
          <UserIcon className="h-3 w-3" />
          {name}
        </span>
      );
    }
    if (code === 'distributor') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          <BuildingStorefrontIcon className="h-3 w-3" />
          {name}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
        <UserIcon className="h-3 w-3" />
        {name}
      </span>
    );
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

  const users = usersData?.data ?? [];
  const totalUsers = usersData?.total ?? 0;
  const initialLoad = isLoading && !usersData;

  // Table columns definition
  const userTableColumns: DataTableColumn<User>[] = [
    {
      key: 'name',
      header: 'Usuario',
      sortable: true,
      sortValue: (user) => `${user.firstName} ${user.lastName}`,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[#3E667D]/10 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-[#3E667D]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      sortable: true,
      sortValue: (user) => user.role?.name || '',
      render: (user) => getRoleBadge(user),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (user) => (user.isActive ? 1 : 0),
      render: (user) => getStatusBadge(user.isActive),
    },
    {
      key: 'createdAt',
      header: 'Registro',
      sortable: true,
      sortValue: (user) => user.createdAt,
      render: (user) => (
        <span className="text-sm text-gray-600">{formatDate(user.createdAt)}</span>
      ),
    },
    {
      key: 'verified',
      header: 'Verificado',
      sortable: true,
      sortValue: (user) => (user.emailVerifiedAt ? 1 : 0),
      render: (user) =>
        user.emailVerifiedAt ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Sí
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            No
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (user) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openEditModal(user)}
            className="rounded-lg p-2 transition-colors hover:bg-blue-50"
            title="Editar usuario"
            aria-label={`Editar ${user.firstName} ${user.lastName}`}
          >
            <PencilIcon className="h-4 w-4 text-blue-600" />
          </button>
          {user.isActive ? (
            <button
              onClick={() => confirmDeactivateUser(user)}
              className="rounded-lg p-2 transition-colors hover:bg-yellow-50"
              title="Desactivar usuario"
              disabled={deactivateUser.isPending}
              aria-label={`Desactivar ${user.firstName}`}
            >
              <XCircleIcon className="h-4 w-4 text-yellow-600" />
            </button>
          ) : (
            <button
              onClick={() => handleActivateUser(user.id)}
              className="rounded-lg p-2 transition-colors hover:bg-green-50"
              title="Activar usuario"
              disabled={activateUser.isPending}
              aria-label={`Activar ${user.firstName}`}
            >
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setResetEmailTarget(user)}
              className="rounded-lg p-2 transition-colors hover:bg-amber-50"
              title="Restablecer verificación de email"
              aria-label={`Restablecer email de ${user.firstName}`}
            >
              <EnvelopeIcon className="h-4 w-4 text-amber-600" />
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setDeleteTarget(user)}
              className="rounded-lg p-2 transition-colors hover:bg-red-50"
              title="Eliminar permanentemente"
              aria-label={`Eliminar ${user.firstName}`}
            >
              <TrashIcon className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard permissions={['users:read', 'users:*']}>
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <UserGroupIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Usuarios</h1>
              </div>
              <p className="text-base text-white/80 sm:text-lg">
                Administra usuarios, roles y permisos del sistema
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Usuarios', value: stats.total, color: 'text-gray-900', bgColor: 'bg-blue-100', icon: <UserGroupIcon className="h-6 w-6 text-blue-600" /> },
            { label: 'Usuarios Activos', value: stats.active, color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircleIcon className="h-6 w-6 text-green-600" /> },
            { label: 'Distribuidores', value: stats.distributors, color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" /> },
            { label: 'Clientes', value: stats.customers, color: 'text-gray-900', bgColor: 'bg-gray-100', icon: <UserIcon className="h-6 w-6 text-gray-600" /> },
          ].map((stat) => (
            <Card key={stat.label} className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    {initialLoad ? (
                      <div className="h-9 w-16 animate-pulse rounded bg-gray-200" />
                    ) : (
                      <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    )}
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-[#3E667D] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UserGroupIcon className="h-4 w-4" />
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'verification'
                ? 'bg-[#3E667D] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <EnvelopeIcon className="h-4 w-4" />
            Verificación Email
          </button>
        </div>

        {/* Tab: Users */}
        {activeTab === 'users' && (
          <>
            {/* Filters and Search */}
            <Card className="mb-6 border-gray-100 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-gray-700">Búsqueda y filtros</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-gray-600"
                      onClick={() => refetch()}
                      disabled={isFetching}
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                      {isFetching ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                      onClick={handleExport}
                    >
                      Exportar
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
                  {/* Search */}
                  <div className="lg:col-span-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre o email..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearch();
                            }
                          }}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="h-10 px-4 sm:min-w-[96px]"
                        onClick={handleSearch}
                      >
                        Buscar
                      </Button>
                    </div>
                  </div>

                  {/* Role Filter */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
                      <FunnelIcon className="h-4 w-4 text-gray-400" />
                      <select
                        value={filterRole}
                        onChange={(e) => handleFilterRole(e.target.value)}
                        className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                      >
                        <option value="all">Todos los Roles</option>
                        <option value="administrador">Administrador</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="customer">Cliente</option>
                        <option value="distributor">Distribuidor</option>
                        <option value="operaciones">Operaciones</option>
                        <option value="sucursales">Sucursales</option>
                        <option value="call_center">Call Center</option>
                        <option value="contabilidad">Contabilidad</option>
                        <option value="soporte">Sistemas</option>
                      </select>
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="lg:col-span-3">
                    <div className="rounded-lg border border-gray-200 bg-white px-3">
                      <select
                        value={filterStatus}
                        onChange={(e) => handleFilterStatus(e.target.value)}
                        className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                      >
                        <option value="all">Todos los Estados</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                      </select>
                    </div>
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                      Filtros activos
                    </span>
                    {searchQuery && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                        Búsqueda: {searchQuery}
                      </span>
                    )}
                    {filterRole !== 'all' && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                        Rol: {filterRole}
                      </span>
                    )}
                    {filterStatus !== 'all' && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                        Estado: {filterStatus}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-6">
                {error && !usersData ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <ExclamationTriangleIcon className="h-10 w-10 text-red-400" />
                    <p className="text-red-700">Error al cargar los usuarios. Por favor, intenta de nuevo.</p>
                    <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-base font-semibold text-gray-900">Listado de usuarios</h2>
                      <p className="text-sm text-gray-600">
                        Mostrando {users.length} de {totalUsers}
                      </p>
                    </div>
                    {isFetching && !initialLoad && (
                      <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                        Actualizando resultados...
                      </div>
                    )}
                    <DataTable<User>
                      columns={userTableColumns}
                      data={users}
                      isLoading={initialLoad}
                      getRowKey={(user) => user.id}
                      minWidthClassName="min-w-[920px]"
                      emptyState={
                        <div className="py-2 text-center">
                          <UserGroupIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                          <h3 className="mb-2 text-xl font-bold text-gray-900">
                            No se encontraron usuarios
                          </h3>
                          <p className="text-gray-600">Intenta ajustar los filtros de búsqueda o crear un nuevo usuario.</p>
                          <div className="mt-4 flex justify-center gap-2">
                            {hasActiveFilters && (
                              <Button variant="outline" onClick={resetFilters}>
                                Limpiar filtros
                              </Button>
                            )}
                            <Button
                              variant="primary"
                              leftIcon={<PlusIcon className="h-4 w-4" />}
                              onClick={openCreateModal}
                            >
                              Nuevo Usuario
                            </Button>
                          </div>
                        </div>
                      }
                    />

                    {/* Pagination */}
                    {users.length > 0 && (
                      <DataTablePagination
                        currentPage={currentPage}
                        pageSize={pageSize}
                        totalItems={totalUsers}
                        isLoading={isLoading || isFetching}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                        pageSizeOptions={[10, 20, 50, 100]}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Tab: Email Verification */}
        {activeTab === 'verification' && (
          <EmailVerificationTab />
        )}
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

      {/* Hard Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmationModal
          user={deleteTarget}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={hardDeleteUser.isPending}
        />
      )}

      {/* Reset Email Confirmation Modal */}
      {resetEmailTarget && (
        <ResetEmailConfirmationModal
          user={resetEmailTarget}
          onConfirm={handleResetEmail}
          onCancel={() => setResetEmailTarget(null)}
          isResetting={resetEmailVerification.isPending}
        />
      )}
    </div>
    </PermissionGuard>
  );
}

// ================================
// EMAIL VERIFICATION TAB COMPONENT
// ================================

function EmailVerificationTab() {
  const { data: emailStats, isLoading } = useEmailVerificationStats();
  const [verifiedPage, setVerifiedPage] = useState(1);
  const [verifiedLimit, setVerifiedLimit] = useState(10);
  const { data: verifiedData, isLoading: verifiedLoading } = useVerifiedUsers({
    page: verifiedPage,
    limit: verifiedLimit,
  });

  const verifiedColumns: DataTableColumn<VerifiedUser>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      sortValue: (u) => `${u.firstName} ${u.lastName}`,
      render: (u) => (
        <div>
          <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
          {u.username && <p className="text-xs text-gray-500">@{u.username}</p>}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      sortValue: (u) => u.email,
      render: (u) => <span className="text-sm text-gray-700">{u.email}</span>,
    },
    {
      key: 'role',
      header: 'Rol',
      render: (u) => (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {u.role.name}
        </span>
      ),
    },
    {
      key: 'emailVerifiedAt',
      header: 'Fecha Verificación',
      sortable: true,
      sortValue: (u) => u.emailVerifiedAt,
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
          <span className="text-sm text-gray-700">
            {new Date(u.emailVerifiedAt).toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ),
    },
  ], []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 w-40 bg-gray-200 rounded" />
                  <div className="h-40 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!emailStats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No se pudieron cargar las estadísticas.
        </CardContent>
      </Card>
    );
  }

  const { total, verified, notVerified, verifiedPercent } = emailStats;

  // Donut chart values — use a minimum visible angle for very small percentages
  const displayPercent = verifiedPercent > 0 && verifiedPercent < 1 ? 1 : verifiedPercent;
  const donutStyle = {
    background: `conic-gradient(#10b981 0% ${displayPercent}%, #e5e7eb ${displayPercent}% 100%)`,
  };

  const formatMonth = (month: string) => {
    const [y, m] = month.split('-');
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-[#3E667D]" />
              Verificación de Email
            </h3>

            <div className="flex items-center gap-8">
              {/* Donut */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-40 h-40 rounded-full"
                  style={donutStyle}
                />
                {/* Inner circle (donut hole) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-2xl font-bold text-[#3E667D]">
                      {verifiedPercent}%
                    </span>
                    <span className="text-[10px] text-gray-500">verificados</span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Usuarios</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {total.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm text-gray-600">Verificados</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {verified.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div>
                    <p className="text-sm text-gray-600">Sin verificar</p>
                    <p className="text-lg font-bold text-gray-700">
                      {notVerified.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Breakdown Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-[#3E667D]" />
              Actividad por Mes
            </h3>

            {emailStats.recentVerifications.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos en los últimos 6 meses.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-sm font-semibold text-gray-700">Mes</th>
                      <th className="text-right py-2 text-sm font-semibold text-gray-700">Registros</th>
                      <th className="text-right py-2 text-sm font-semibold text-gray-700">Verificados</th>
                      <th className="text-right py-2 text-sm font-semibold text-gray-700">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailStats.recentVerifications.map((row) => {
                      const pct = row.registered > 0
                        ? Math.round((row.verified / row.registered) * 10000) / 100
                        : 0;
                      return (
                        <tr key={row.month} className="border-b border-gray-100">
                          <td className="py-3 text-sm text-gray-700 font-medium">
                            {formatMonth(row.month)}
                          </td>
                          <td className="py-3 text-sm text-gray-600 text-right">
                            {row.registered.toLocaleString('es-MX')}
                          </td>
                          <td className="py-3 text-sm text-right">
                            <span className={row.verified > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                              {row.verified.toLocaleString('es-MX')}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-12 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verified Users Detail Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
            Detalle de Usuarios Verificados
          </h3>

          <DataTable<VerifiedUser>
            columns={verifiedColumns}
            data={verifiedData?.data ?? []}
            getRowKey={(u) => u.id}
            isLoading={verifiedLoading}
            loadingRows={5}
            emptyMessage="No hay usuarios con email verificado."
            initialSort={{ key: 'emailVerifiedAt', direction: 'desc' }}
          />

          {verifiedData && verifiedData.total > 0 && (
            <DataTablePagination
              currentPage={verifiedPage}
              pageSize={verifiedLimit}
              totalItems={verifiedData.total}
              onPageChange={setVerifiedPage}
              onPageSizeChange={(size) => { setVerifiedLimit(size); setVerifiedPage(1); }}
              isLoading={verifiedLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
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

// ================================
// DELETE CONFIRMATION MODAL
// ================================

interface DeleteConfirmationModalProps {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmationModal({
  user,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === 'CONFIRMAR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-red-100 bg-red-50 rounded-t-2xl">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-900">Eliminar usuario permanentemente</h2>
            <p className="text-sm text-red-700">Esta acción no se puede deshacer</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Estás a punto de eliminar permanentemente al usuario:
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1">ID: {user.id}</p>
          </div>
          <p className="text-sm text-gray-700">
            Todos sus datos serán eliminados de forma irreversible. Para confirmar, escribe{' '}
            <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">CONFIRMAR</span>{' '}
            en el campo de abajo:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Escribe CONFIRMAR"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-center font-mono tracking-wider"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <button
            onClick={onConfirm}
            disabled={!isConfirmed || isDeleting}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isConfirmed && !isDeleting
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <TrashIcon className="h-4 w-4" />
            {isDeleting ? 'Eliminando...' : 'Eliminar permanentemente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================
// RESET EMAIL CONFIRMATION MODAL
// ================================

interface ResetEmailConfirmationModalProps {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  isResetting: boolean;
}

function ResetEmailConfirmationModal({
  user,
  onConfirm,
  onCancel,
  isResetting,
}: ResetEmailConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === 'RESTABLECER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-amber-100 bg-amber-50 rounded-t-2xl">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <EnvelopeIcon className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-900">Restablecer verificación de email</h2>
            <p className="text-sm text-amber-700">El usuario deberá vincular un nuevo correo</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Estás a punto de restablecer la verificación de email del usuario:
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-gray-500">{user.email || 'Sin email registrado'}</p>
            <p className="text-xs text-gray-400 mt-1">ID: {user.id}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium mb-1">Esto hará lo siguiente:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>Se eliminará el email actual del usuario</li>
              <li>Se borrará el estado de verificación</li>
              <li>El usuario deberá vincular y verificar un nuevo correo</li>
            </ul>
          </div>
          <p className="text-sm text-gray-700">
            Para confirmar, escribe{' '}
            <span className="font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">RESTABLECER</span>{' '}
            en el campo de abajo:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Escribe RESTABLECER"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center font-mono tracking-wider"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onCancel} disabled={isResetting}>
            Cancelar
          </Button>
          <button
            onClick={onConfirm}
            disabled={!isConfirmed || isResetting}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isConfirmed && !isResetting
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <EnvelopeIcon className="h-4 w-4" />
            {isResetting ? 'Restableciendo...' : 'Restablecer email'}
          </button>
        </div>
      </div>
    </div>
  );
}
