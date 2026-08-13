'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  ArrowPathIcon,
  ShieldCheckIcon,
  ClipboardDocumentIcon,
  UserIcon,
  BuildingStorefrontIcon,
  BriefcaseIcon,
  ChartBarIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { usersService } from '@/services/users.service';
import { DistribuidoresTab } from '@/components/admin/users/DistribuidoresTab';
import { getMlmTypeConfig } from '@/lib/mlmType';
import { getUserTypeConfig, SELECTABLE_USER_TYPES } from '@/lib/userType';
import type { Role } from '@/types/role';
import { PermissionGuard } from '@/components/auth';
import { useAppSelector } from '@/store/hooks';
import { selectUserRoles, selectUserPermissions } from '@/store/slices/authSlice';
import { useRoles } from '@/hooks/useRoles';
import { useDepartments } from '@/hooks/useHR';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveCountries } from '@/hooks/useConfig';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { parsePhone, isValidLocalNumber } from '@/lib/phone';
import { useQueryFilters } from '@/hooks/useQueryFilters';

type TabKey = 'users' | 'colaboradores' | 'verification' | 'distribuidores';

// Forma mínima para el modal de "Ver contraseña" (compatible con User y VerifiedUser).
type PasswordTarget = { id: string; firstName: string; lastName: string; email: string | null };

type MonthlyVerificationRow = { month: string; verified: number; registered: number };

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

export default function UsuariosPage() {
  return <Suspense><UsuariosContent /></Suspense>;
}

function UsuariosContent() {
  const userRoles = useAppSelector(selectUserRoles);
  const isSuperAdmin = userRoles.includes('super_admin');
  // Matriz por departamento (mig 120): con users:* se ven las pestañas de
  // CUENTAS; con customers:read solo "Distribuidores y clientes" (lectura).
  const userPermissions = useAppSelector(selectUserPermissions);
  const hasPerm = (p: string) =>
    isSuperAdmin ||
    userPermissions.includes(p) ||
    userPermissions.includes(`${p.split(':')[0]}:*`) ||
    userPermissions.includes('*');
  const canSeeAccounts = hasPerm('users:read');
  const canManageUsers = hasPerm('users:update');
  const canInvite = hasPerm('users:create');

  const { get, getNumber, setParams } = useQueryFilters({
    role: 'all',
    status: 'all',
    tab: 'users',
    page: '1',
    limit: '20',
  });

  let activeTab = get('tab') as TabKey;
  // Sin users:read, la única pestaña disponible es Distribuidores y clientes.
  if (!canSeeAccounts) activeTab = 'distribuidores';
  // La pestaña "Colaboradores" es la misma vista de usuarios filtrada por tipo.
  const isColabTab = activeTab === 'colaboradores';
  const forcedUserType = isColabTab ? 'colaborador' : undefined;
  const searchQuery = get('search');
  const customerNumberQuery = get('customerNumber');
  const filterRole = get('role');
  const filterStatus = get('status');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [customerNumberInput, setCustomerNumberInput] = useState(customerNumberQuery);

  // Sync input fields when URL params change (e.g. navigating from verification tab)
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);
  useEffect(() => {
    setCustomerNumberInput(customerNumberQuery);
  }, [customerNumberQuery]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [resetEmailTarget, setResetEmailTarget] = useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<PasswordTarget | null>(null);
  const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  // Build query params
  const queryParams: UserQueryParams = useMemo(() => {
    const params: UserQueryParams = {
      page: currentPage,
      limit: pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    if (searchQuery) params.search = searchQuery;
    if (customerNumberQuery) params.customerNumber = customerNumberQuery;
    if (filterRole !== 'all') params.role = filterRole;
    if (forcedUserType) params.userType = forcedUserType;
    if (filterStatus !== 'all') {
      params.isActive = filterStatus === 'active';
    }

    return params;
  }, [searchQuery, customerNumberQuery, filterRole, forcedUserType, filterStatus, currentPage, pageSize]);

  // Lightweight stats queries (limit:1 → server returns accurate .total)
  const baseStatsQuery: UserQueryParams = useMemo(() => {
    const p: UserQueryParams = { limit: 1, page: 1, sortBy: 'createdAt', sortOrder: 'desc' };
    if (searchQuery) p.search = searchQuery;
    if (customerNumberQuery) p.customerNumber = customerNumberQuery;
    if (forcedUserType) p.userType = forcedUserType;
    return p;
  }, [searchQuery, customerNumberQuery, forcedUserType]);

  const activeStatsQuery: UserQueryParams = useMemo(() => {
    const p: UserQueryParams = { limit: 1, page: 1, sortBy: 'createdAt', sortOrder: 'desc', isActive: true };
    if (searchQuery) p.search = searchQuery;
    if (customerNumberQuery) p.customerNumber = customerNumberQuery;
    if (forcedUserType) p.userType = forcedUserType;
    return p;
  }, [searchQuery, customerNumberQuery, forcedUserType]);

  const customerStatsQuery: UserQueryParams = useMemo(() => {
    const p: UserQueryParams = { limit: 1, page: 1, sortBy: 'createdAt', sortOrder: 'desc', role: 'customer' };
    if (searchQuery) p.search = searchQuery;
    if (customerNumberQuery) p.customerNumber = customerNumberQuery;
    return p;
  }, [searchQuery, customerNumberQuery]);

  // API Hooks — solo dominio `users` (las métricas de customers viven en su tab)
  const { data: usersData, isLoading, isFetching, error, refetch } = useUsers(queryParams);
  const { data: baseStatsData } = useUsers(baseStatsQuery);
  const { data: activeStatsData } = useUsers(activeStatsQuery);
  const { data: customerStatsData } = useUsers(customerStatsQuery);
  const { data: rolesData } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const hardDeleteUser = useHardDeleteUser();
  const resetEmailVerification = useResetEmailVerification();

  // Computed stats (solo dominio users)
  const stats = useMemo(() => {
    const total = baseStatsData?.total ?? 0;
    const active = activeStatsData?.total ?? 0;
    return {
      total,
      active,
      inactive: Math.max(total - active, 0),
      customers: customerStatsData?.total ?? 0,
    };
  }, [baseStatsData, activeStatsData, customerStatsData]);

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

  const handleViewPassword = async (user: PasswordTarget) => {
    setPasswordTarget(user);
    setDecryptedPassword(null);
    setIsLoadingPassword(true);
    try {
      const result = await usersService.getDecryptedPassword(user.id);
      setDecryptedPassword(result.password);
    } catch {
      setDecryptedPassword(null);
      toast.error('Error al obtener la contraseña');
      setPasswordTarget(null);
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleSearch = () => {
    setParams({ search: searchInput.trim(), customerNumber: customerNumberInput.trim(), page: null });
  };

  const handleFilterRole = (value: string) => {
    setParams({ role: value, page: null });
  };

  const handleFilterStatus = (value: string) => {
    setParams({ status: value, page: null });
  };

  // Opciones de rol para el filtro — fuente única: roles del API.
  const roleFilterOptions = useMemo(
    () => (rolesData?.data ?? []).map((r) => ({ value: r.code, label: r.name })),
    [rolesData],
  );

  const handlePageSizeChange = (size: number) => {
    setParams({ limit: String(size), page: null });
  };

  const resetFilters = () => {
    setSearchInput('');
    setCustomerNumberInput('');
    setParams({ search: null, customerNumber: null, role: 'all', status: 'all', page: null });
  };

  const hasActiveFilters = Boolean(searchQuery || customerNumberQuery || filterRole !== 'all' || filterStatus !== 'all');

  const backendTotalPages = usersData?.totalPages;
  useEffect(() => {
    if (backendTotalPages && currentPage > backendTotalPages) {
      setParams({ page: String(backendTotalPages) });
    }
  }, [backendTotalPages, currentPage, setParams]);

  // Cerrar cualquier modal abierto con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (passwordTarget) setPasswordTarget(null);
      else if (deleteTarget) setDeleteTarget(null);
      else if (resetEmailTarget) setResetEmailTarget(null);
      else if (isModalOpen) closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [passwordTarget, deleteTarget, resetEmailTarget, isModalOpen]);

  // Modal handlers
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      secondLastName: '',
      phone: '',
      roleId: '',
      userType: 'colaborador',
      departmentId: '',
      countryId: '',
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
      secondLastName: user.secondLastName ?? '',
      phone: user.phone ?? '',
      roleId: user.role?.id ?? '',
      userType: user.userType ?? 'colaborador',
      departmentId: user.departmentId ?? '',
      countryId: user.countryId ?? '',
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
    // Validación client-side de campos obligatorios
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      toast.error('Nombre y apellido son obligatorios');
      return;
    }
    if ((formData.userType ?? 'colaborador') === 'colaborador' && !formData.departmentId) {
      toast.error('El departamento es obligatorio para un colaborador');
      return;
    }
    if (formData.phone) {
      const p = parsePhone(formData.phone);
      if (!isValidLocalNumber(p.country, p.number)) {
        toast.error(`Teléfono incompleto: ${p.country.name} requiere ${p.country.digits} dígitos`);
        return;
      }
    }
    if (!editingUser) {
      if (!formData.email?.trim()) {
        toast.error('El correo electrónico es obligatorio');
        return;
      }
      if (!formData.roleId) {
        toast.error('Selecciona un rol para el usuario');
        return;
      }
    }
    try {
      if (editingUser) {
        const dto: UpdateUserDto = {
          email: formData.email || undefined,
          firstName: formData.firstName,
          lastName: formData.lastName,
          secondLastName: formData.secondLastName || undefined,
          phone: formData.phone || undefined,
          roleId: formData.roleId || undefined,
          userType: formData.userType || undefined,
          departmentId: formData.userType === 'cliente' ? null : (formData.departmentId || null),
          countryId: formData.countryId || null,
          isActive: formData.isActive,
        };
        await updateUser.mutateAsync({ id: editingUser.id, dto });
        toast.success('Usuario actualizado correctamente');
      } else {
        const dto: CreateUserDto = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          secondLastName: formData.secondLastName || undefined,
          phone: formData.phone || undefined,
          roleId: formData.roleId,
          userType: formData.userType || 'colaborador',
          departmentId: formData.departmentId || null,
          countryId: formData.countryId || null,
          isActive: formData.isActive,
        };
        await createUser.mutateAsync(dto);
        toast.success(`Usuario creado. Invitación enviada a ${formData.email}`);
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
        <Badge variant="default">
          <ShieldCheckIcon className="h-3 w-3" />
          {name}
        </Badge>
      );
    }
    if (code === 'customer') {
      return (
        <Badge variant="success">
          <UserIcon className="h-3 w-3" />
          {name}
        </Badge>
      );
    }
    if (code === 'distributor') {
      return (
        <Badge variant="info">
          <BuildingStorefrontIcon className="h-3 w-3" />
          {name}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <UserIcon className="h-3 w-3" />
        {name}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) =>
    isActive ? (
      <Badge variant="success">
        <CheckCircleIcon className="h-3 w-3" />
        Activo
      </Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">
        <XCircleIcon className="h-3 w-3" />
        Inactivo
      </Badge>
    );

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
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Link
              href={`/admin/usuarios/${user.id}`}
              className="font-semibold text-foreground hover:text-primary hover:underline"
            >
              {user.firstName} {user.lastName} {user.secondLastName ?? ''}
            </Link>
            {user.customerNumber && (
              <p className="text-xs font-medium text-primary">#{user.customerNumber}</p>
            )}
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol / Tipo MLM',
      sortable: true,
      sortValue: (user) => user.role?.name || '',
      render: (user) => {
        const mlm = getMlmTypeConfig(user.customerType);
        // Tipo de cuenta interno (colaborador/sistema): se muestra cuando no hay
        // badge MLM, para no duplicar con distribuidor/cliente.
        const tipo = !mlm ? getUserTypeConfig(user.userType) : null;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {getRoleBadge(user)}
            {mlm && (
              <Badge variant={mlm.variant} title="Tipo en el MLM (cliente enlazado)">
                {mlm.label}
              </Badge>
            )}
            {tipo && (
              <Badge variant={tipo.variant} title="Tipo de cuenta">
                {tipo.label}
              </Badge>
            )}
            {user.departmentName && (
              <Badge variant="outline" className="text-muted-foreground" title="Departamento (área)">
                {user.departmentName}
              </Badge>
            )}
          </div>
        );
      },
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
        <span className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</span>
      ),
    },
    {
      key: 'verified',
      header: 'Verificado',
      sortable: true,
      sortValue: (user) => (user.emailVerifiedAt ? 1 : 0),
      render: (user) =>
        user.emailVerifiedAt ? (
          <Badge variant="success">
            <CheckCircleIcon className="h-3 w-3" />
            Sí
          </Badge>
        ) : (
          <Badge variant="warning">
            <XCircleIcon className="h-3 w-3" />
            No
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (user) => (
        <div className="flex items-center justify-end gap-2">
          {/* Acciones gateadas por permiso (matriz mig 120): editar y
              activar/desactivar → users:update; reenviar → users:create. */}
          {canManageUsers && (
            <button
              onClick={() => openEditModal(user)}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
              title="Editar usuario"
              aria-label={`Editar ${user.firstName} ${user.lastName}`}
            >
              <PencilIcon className="h-4 w-4 text-blue-600" />
            </button>
          )}
          {canInvite && (
            <button
              onClick={async () => {
                try {
                  const r = await usersService.resendInvitation(user.id);
                  toast.success(r.message);
                } catch (e: any) {
                  toast.error(
                    e.response?.data?.message || 'Error al reenviar la invitación',
                  );
                }
              }}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
              title="Reenviar invitación para definir contraseña"
              aria-label={`Reenviar invitación a ${user.firstName}`}
            >
              <EnvelopeIcon className="h-4 w-4 text-primary" />
            </button>
          )}
          {canManageUsers && (user.isActive ? (
            <button
              onClick={() => confirmDeactivateUser(user)}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
              title="Desactivar usuario"
              disabled={deactivateUser.isPending}
              aria-label={`Desactivar ${user.firstName}`}
            >
              <XCircleIcon className="h-4 w-4 text-yellow-600" />
            </button>
          ) : (
            <button
              onClick={() => handleActivateUser(user.id)}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
              title="Activar usuario"
              disabled={activateUser.isPending}
              aria-label={`Activar ${user.firstName}`}
            >
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </button>
          ))}
          {isSuperAdmin && (
            <button
              onClick={() => handleViewPassword(user)}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
              title="Ver contraseña"
              aria-label={`Ver contraseña de ${user.firstName}`}
            >
              <EyeIcon className="h-4 w-4 text-indigo-600" />
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setResetEmailTarget(user)}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
              title="Restablecer verificación de email"
              aria-label={`Restablecer email de ${user.firstName}`}
            >
              <EnvelopeIcon className="h-4 w-4 text-amber-600" />
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setDeleteTarget(user)}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
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
    // customers:read (matriz mig 120): acceso SOLO a la pestaña de
    // Distribuidores y clientes en modo lectura.
    <PermissionGuard permissions={['users:read', 'users:*', 'customers:read']}>
    <div className="min-h-screen">
      {/* Header (banda de marca, slim) */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2.5">
                <UserGroupIcon className="h-7 w-7" />
                <h1 className="text-2xl font-bold sm:text-3xl">Gestión de Usuarios</h1>
              </div>
              <p className="text-sm text-white/80 sm:text-base">
                Administra usuarios, roles y permisos del sistema
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="ghost"
                className="border border-white/25 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/admin">Volver al Panel</Link>
              </Button>
              {canInvite && (
                <Button onClick={openCreateModal} className="bg-card text-primary hover:bg-card/90">
                  <PlusIcon className="h-5 w-5" />
                  Nuevo Usuario
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs — las pestañas de CUENTAS requieren users:read; con solo
            customers:read (matriz por departamento) queda únicamente
            "Distribuidores y clientes" en modo lectura. */}
        <div className="mb-6 flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
          {canSeeAccounts && (
            <>
              <button
                onClick={() => setParams({ tab: 'users' })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <UserGroupIcon className="h-4 w-4" />
                Cuentas de sistema
              </button>
              <button
                onClick={() => setParams({ tab: 'colaboradores' })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'colaboradores'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <BriefcaseIcon className="h-4 w-4" />
                Colaboradores
              </button>
            </>
          )}
          <button
            onClick={() => setParams({ tab: 'distribuidores' })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'distribuidores'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <BuildingStorefrontIcon className="h-4 w-4" />
            Distribuidores y clientes
          </button>
          {canSeeAccounts && (
            <button
              onClick={() => setParams({ tab: 'verification' })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'verification'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <EnvelopeIcon className="h-4 w-4" />
              Verificación Email
            </button>
          )}
        </div>

        {/* Tab: Distribuidores y clientes (dominio customers) */}
        {activeTab === 'distribuidores' && <DistribuidoresTab />}

        {/* Tab: Cuentas de sistema / Colaboradores (dominio users) */}
        {(activeTab === 'users' || activeTab === 'colaboradores') && (
          <>
            {/* Stats Cards — solo dominio users */}
            <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[
                { label: 'Total Usuarios', value: stats.total, icon: UserGroupIcon },
                { label: 'Usuarios Activos', value: stats.active, icon: CheckCircleIcon },
                { label: 'Inactivos', value: stats.inactive, icon: XCircleIcon },
                { label: 'Clientes', value: stats.customers, icon: UserIcon },
              ].map((stat) => (
                <Card key={stat.label} className="gap-0 p-5 transition-shadow duration-200 hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1 truncate text-sm text-muted-foreground">{stat.label}</p>
                      {initialLoad ? (
                        <div className="h-9 w-16 animate-pulse rounded bg-muted" />
                      ) : (
                        <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                          {formatNumber(stat.value)}
                        </p>
                      )}
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <stat.icon className="h-5 w-5" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            {/* Filters and Search */}
            <Card className="mb-6 border-border shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-foreground">Búsqueda y filtros</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground"
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
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
                  {/* Search */}
                  <div className="lg:col-span-4">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                        className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    </div>
                  </div>

                  {/* Customer Number Exact Search */}
                  <div className="lg:col-span-2">
                    <input
                      type="text"
                      placeholder="No. Distribuidor"
                      value={customerNumberInput}
                      onChange={(e) => setCustomerNumberInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  </div>

                  {/* Search Button */}
                  <div className="lg:col-span-1 flex items-center">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-10 w-full"
                      onClick={handleSearch}
                    >
                      Buscar
                    </Button>
                  </div>

                  {/* Role Filter (fuente única: roles del API) */}
                  <div className="lg:col-span-2">
                    <SearchableSelect
                      options={roleFilterOptions}
                      value={filterRole}
                      onChange={handleFilterRole}
                      allLabel="Todos los Roles"
                      allValue="all"
                      className="w-full"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="lg:col-span-3">
                    <SearchableSelect
                      options={[
                        { value: 'active', label: 'Activos' },
                        { value: 'inactive', label: 'Inactivos' },
                      ]}
                      value={filterStatus}
                      onChange={handleFilterStatus}
                      allLabel="Todos los Estados"
                      allValue="all"
                      className="w-full"
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                      Filtros activos
                    </span>
                    {searchQuery && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                        Búsqueda: {searchQuery}
                      </span>
                    )}
                    {customerNumberQuery && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                        No. Distribuidor: {customerNumberQuery}
                      </span>
                    )}
                    {filterRole !== 'all' && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                        Rol: {roleFilterOptions.find((r) => r.value === filterRole)?.label ?? filterRole}
                      </span>
                    )}
                    {filterStatus !== 'all' && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                        Estado: {filterStatus}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-border shadow-sm">
              <CardContent className="p-6">
                {error && !usersData ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <ExclamationTriangleIcon className="h-10 w-10 text-red-400" />
                    <p className="text-destructive">Error al cargar los usuarios. Por favor, intenta de nuevo.</p>
                    <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">
                          {isColabTab ? 'Colaboradores' : 'Listado de usuarios'}
                        </h2>
                        {isColabTab && (
                          <p className="text-xs text-muted-foreground">
                            Cuentas de tipo colaborador (personal interno).
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mostrando {users.length} de {totalUsers}
                      </p>
                    </div>
                    {isFetching && !initialLoad && (
                      <div className="mb-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
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
                          <UserGroupIcon className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                          <h3 className="mb-2 text-xl font-bold text-foreground">
                            No se encontraron usuarios
                          </h3>
                          <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda o crear un nuevo usuario.</p>
                          <div className="mt-4 flex justify-center gap-2">
                            {hasActiveFilters && (
                              <Button variant="outline" onClick={resetFilters}>
                                Limpiar filtros
                              </Button>
                            )}
                            <Button
                              variant="default"
                              onClick={openCreateModal}
                            >
                              <PlusIcon className="h-4 w-4" />
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
                        onPageChange={(p) => setParams({ page: String(p) })}
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
          <EmailVerificationTab isSuperAdmin={isSuperAdmin} onViewPassword={handleViewPassword} />
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
        roles={rolesData?.data ?? []}
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

      {/* Password View Modal */}
      {passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPasswordTarget(null)} />
          <div className="relative bg-card rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center gap-3 rounded-t-2xl border-b border-border bg-primary/5 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <EyeIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Contraseña del usuario</h2>
                <p className="text-sm text-muted-foreground">{passwordTarget.firstName} {passwordTarget.lastName}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                {passwordTarget.email ? (
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{passwordTarget.email}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(passwordTarget.email!);
                        toast.success('Email copiado al portapapeles');
                      }}
                      className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                      title="Copiar email"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    El usuario aún no ha vinculado un correo electrónico a su cuenta.
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground mb-1">Contraseña</p>
                {isLoadingPassword ? (
                  <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                ) : decryptedPassword ? (
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-lg font-bold text-foreground">{decryptedPassword}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(decryptedPassword);
                        toast.success('Contraseña copiada al portapapeles');
                      }}
                      className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                      title="Copiar contraseña"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    No disponible — la contraseña se encriptará cuando el usuario la cambie o se cree un nuevo usuario.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <Button variant="default" onClick={() => setPasswordTarget(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PermissionGuard>
  );
}

// ================================
// EMAIL VERIFICATION TAB COMPONENT
// ================================

function EmailVerificationTab({
  isSuperAdmin,
  onViewPassword,
}: {
  isSuperAdmin: boolean;
  onViewPassword: (u: PasswordTarget) => void;
}) {
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
          <p className="font-medium text-foreground">{u.firstName} {u.lastName}</p>
          {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      sortValue: (u) => u.email,
      render: (u) => <span className="text-sm text-foreground">{u.email}</span>,
    },
    {
      key: 'role',
      header: 'Rol',
      render: (u) => (
        <Badge variant="info">{u.role.name}</Badge>
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
          <span className="text-sm text-foreground">
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
    {
      key: 'actions',
      header: 'Acciones',
      render: (u) => (
        isSuperAdmin ? (
          <button
            onClick={() => onViewPassword({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email })}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:bg-muted/50 hover:text-primary"
            title="Ver contraseña del usuario"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            Ver contraseña
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
      ),
    },
  ], [isSuperAdmin, onViewPassword]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 w-40 bg-muted rounded" />
                  <div className="h-40 bg-muted rounded" />
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
        <CardContent className="p-6 text-center text-muted-foreground">
          No se pudieron cargar las estadísticas.
        </CardContent>
      </Card>
    );
  }

  const { total, verified, notVerified, verifiedPercent } = emailStats;

  // Donut chart values — use a minimum visible angle for very small percentages
  const displayPercent = verifiedPercent > 0 && verifiedPercent < 1 ? 1 : verifiedPercent;
  const donutStyle = {
    background: `conic-gradient(#10b981 0% ${displayPercent}%, var(--muted) ${displayPercent}% 100%)`,
  };

  const formatMonth = (month: string) => {
    const [y, m] = month.split('-');
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
  };

  const monthlyColumns: DataTableColumn<MonthlyVerificationRow>[] = [
    {
      key: 'month',
      header: 'Mes',
      cellClassName: 'text-sm text-foreground font-medium',
      render: (row) => formatMonth(row.month),
    },
    {
      key: 'registered',
      header: 'Registros',
      headerClassName: 'text-right',
      cellClassName: 'text-sm text-muted-foreground text-right',
      render: (row) => row.registered.toLocaleString('es-MX'),
    },
    {
      key: 'verified',
      header: 'Verificados',
      headerClassName: 'text-right',
      cellClassName: 'text-sm text-right',
      render: (row) => (
        <span className={row.verified > 0 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
          {row.verified.toLocaleString('es-MX')}
        </span>
      ),
    },
    {
      key: 'percent',
      header: '%',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (row) => {
        const pct = row.registered > 0
          ? Math.round((row.verified / row.registered) * 10000) / 100
          : 0;
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-12 text-right">
              {pct}%
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-primary" />
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
                  <div className="w-24 h-24 bg-card rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-2xl font-bold text-primary">
                      {verifiedPercent}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">verificados</span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Usuarios</p>
                  <p className="text-2xl font-bold text-foreground">
                    {total.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Verificados</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {verified.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted-foreground/40" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sin verificar</p>
                    <p className="text-lg font-bold text-foreground">
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
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-primary" />
              Actividad por Mes
            </h3>

            <DataTable<MonthlyVerificationRow>
              columns={monthlyColumns}
              data={emailStats.recentVerifications}
              getRowKey={(row) => row.month}
              emptyMessage="Sin datos en los últimos 6 meses."
            />
          </CardContent>
        </Card>
      </div>

      {/* Verified Users Detail Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
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
  roles: Role[];
}

// Subtipos de cliente (customer_type) que se muestran cuando el tipo es Cliente.
// El alta real de clientes/distribuidores NO se hace aquí (ver nota en el form).
const CLIENT_SUBTYPES = [
  { value: 'distributor', label: 'Distribuidor' },
  { value: 'preferred_customer', label: 'Preferente' },
];

function UserFormModal({
  isOpen,
  onClose,
  editingUser,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  roles,
}: UserFormModalProps) {
  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const isCliente = (formData.userType ?? 'colaborador') === 'cliente';
  const { data: departmentsCatalog } = useDepartments();
  const { data: activeCountries } = useActiveCountries();
  // FUSIÓN rol↔departamento (mig 120): los roles vinculados a un departamento
  // SÍ se asignan como rol — al elegirlos, el departamento se fija solo.
  const colaboradorRoles = roles.filter(
    (r) =>
      (r.category ?? 'colaborador') === 'colaborador' && r.isActive !== false,
  );
  // Rol seleccionado con departamento vinculado → campo Departamento fijo.
  const selectedRole = roles.find((r) => r.id === formData.roleId);
  const roleDepartmentId = selectedRole?.departmentId ?? null;
  // Sincroniza el form: sin esto, la validación "departamento obligatorio"
  // fallaría aunque el rol ya lo traiga (el API lo fuerza de cualquier modo).
  useEffect(() => {
    if (roleDepartmentId && formData.departmentId !== roleDepartmentId) {
      handleChange('departmentId', roleDepartmentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleDepartmentId]);

  const inputClassName =
    'w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-card rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Nombre(s) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nombre(s)
            </label>
            <input
              type="text"
              value={formData.firstName ?? ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="Nombre(s)"
              className={inputClassName}
            />
          </div>

          {/* Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Apellido Paterno
              </label>
              <input
                type="text"
                value={formData.lastName ?? ''}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Apellido Paterno"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Apellido Materno
              </label>
              <input
                type="text"
                value={formData.secondLastName ?? ''}
                onChange={(e) => handleChange('secondLastName', e.target.value)}
                placeholder="Apellido Materno"
                className={inputClassName}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Teléfono
            </label>
            <PhoneInput
              value={formData.phone ?? ''}
              onChange={(v) => handleChange('phone', v)}
            />
          </div>

          {/* País de residencia */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              País de residencia
            </label>
            <SearchableSelect
              options={(activeCountries ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={formData.countryId ?? ''}
              onChange={(val) => handleChange('countryId', val)}
              showAllOption={false}
              placeholder="Seleccionar país..."
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Define la moneda y el catálogo de productos del usuario.
            </p>
          </div>

          {/* Sin campo de contraseña: al crear se envía una invitación por correo
              para que el usuario defina su propia contraseña (seguridad). */}
          {!editingUser && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <EnvelopeIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Se enviará una invitación a su correo para que defina su contraseña.
              </span>
            </div>
          )}

          {/* Tipo de cuenta */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tipo de cuenta
            </label>
            <SearchableSelect
              options={SELECTABLE_USER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={formData.userType ?? 'colaborador'}
              onChange={(val) => handleChange('userType', val)}
              showAllOption={false}
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Colaborador = personal interno. Cliente = consumidor. Luego asigna su rol.
            </p>
          </div>

          {/* Rol (colaborador) / Subtipo (cliente) */}
          {isCliente ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tipo de cliente
              </label>
              <SearchableSelect
                options={CLIENT_SUBTYPES}
                value={formData.customerSubtype ?? ''}
                onChange={(val) => handleChange('customerSubtype', val)}
                showAllOption={false}
                placeholder="Distribuidor / Preferente"
                className="w-full"
              />
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  El alta de clientes y distribuidores no se hace aquí (requiere
                  patrocinador, número y kit). Usa el módulo de Distribuidores y clientes.
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Rol
              </label>
              <SearchableSelect
                options={colaboradorRoles.map((role) => ({ value: role.id, label: role.name }))}
                value={formData.roleId ?? ''}
                onChange={(val) => handleChange('roleId', val)}
                showAllOption={true}
                allLabel="Seleccionar rol..."
                className="w-full"
              />
              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Departamento <span className="text-destructive">*</span>
                </label>
                <SearchableSelect
                  options={(departmentsCatalog ?? []).map((d) => ({ value: d.id, label: d.name }))}
                  value={roleDepartmentId ?? formData.departmentId ?? ''}
                  onChange={(val) => handleChange('departmentId', val)}
                  showAllOption={false}
                  placeholder="Seleccionar departamento..."
                  className="w-full"
                  disabled={!!roleDepartmentId}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {roleDepartmentId
                    ? 'Fijado por el rol seleccionado (rol y departamento están fusionados).'
                    : 'Área del colaborador (para roles sin departamento vinculado).'}
                </p>
              </div>
            </div>
          )}

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive ?? true}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary accent-primary focus:ring-ring"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-foreground">
              Usuario activo
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          {isCliente ? (
            <Button asChild variant="default">
              <Link href="/admin/usuarios?tab=distribuidores" onClick={onClose}>
                Ir a Distribuidores y clientes
              </Link>
            </Button>
          ) : (
            <Button variant="default" onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? 'Guardando...'
                : editingUser
                  ? 'Guardar Cambios'
                  : 'Crear Usuario'}
            </Button>
          )}
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
      <div className="relative bg-card rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl border-b border-destructive/20 bg-destructive/10 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
            <ExclamationTriangleIcon className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-destructive">Eliminar usuario permanentemente</h2>
            <p className="text-sm text-destructive/80">Esta acción no se puede deshacer</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground">
            Estás a punto de eliminar permanentemente al usuario:
          </p>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="font-semibold text-foreground">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {user.id}</p>
          </div>
          <p className="text-sm text-foreground">
            Todos sus datos serán eliminados de forma irreversible. Para confirmar, escribe{' '}
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono font-bold text-destructive">CONFIRMAR</span>{' '}
            en el campo de abajo:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Escribe CONFIRMAR"
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-center font-mono tracking-wider text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <button
            onClick={onConfirm}
            disabled={!isConfirmed || isDeleting}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isConfirmed && !isDeleting
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
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
      <div className="relative bg-card rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl border-b border-amber-500/20 bg-amber-500/10 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
            <EnvelopeIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-700 dark:text-amber-300">Restablecer verificación de email</h2>
            <p className="text-sm text-amber-700/80 dark:text-amber-300/80">El usuario deberá vincular un nuevo correo</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground">
            Estás a punto de restablecer la verificación de email del usuario:
          </p>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="font-semibold text-foreground">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-muted-foreground">{user.email || 'Sin email registrado'}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {user.id}</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Esto hará lo siguiente:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700/90 dark:text-amber-300/90">
              <li>Se eliminará el email actual del usuario</li>
              <li>Se borrará el estado de verificación</li>
              <li>El usuario deberá vincular y verificar un nuevo correo</li>
            </ul>
          </div>
          <p className="text-sm text-foreground">
            Para confirmar, escribe{' '}
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono font-bold text-amber-600 dark:text-amber-400">RESTABLECER</span>{' '}
            en el campo de abajo:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Escribe RESTABLECER"
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-center font-mono tracking-wider text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onCancel} disabled={isResetting}>
            Cancelar
          </Button>
          <button
            onClick={onConfirm}
            disabled={!isConfirmed || isResetting}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isConfirmed && !isResetting
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
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
