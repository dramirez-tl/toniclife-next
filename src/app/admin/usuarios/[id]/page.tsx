'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  PencilIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuard } from '@/components/auth';
import { usersService } from '@/services/users.service';
import { useActivateUser, useDeactivateUser } from '@/hooks/useUsers';
import { getMlmTypeConfig } from '@/lib/mlmType';
import type { User } from '@/types/user';

// ================================
// HELPERS
// ================================

const formatDateTime = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (user: User) =>
  `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'US';

const copy = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado al portapapeles`);
};

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
  if (code === 'distributor') {
    return (
      <Badge variant="info">
        <BuildingStorefrontIcon className="h-3 w-3" />
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
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <UserIcon className="h-3 w-3" />
      {name}
    </Badge>
  );
};

// ================================
// INFO ROW
// ================================

function InfoRow({
  icon: Icon,
  label,
  value,
  onCopy,
  copyLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  onCopy?: string;
  copyLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <div className="min-w-0 break-words text-sm text-foreground">{value}</div>
          {onCopy && (
            <button
              onClick={() => copy(onCopy, copyLabel ?? label)}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={`Copiar ${copyLabel ?? label}`}
            >
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================
// PAGE
// ================================

export default function UsuarioDetallePage() {
  return (
    <PermissionGuard permissions={['users:read', 'users:*']}>
      <UsuarioDetalleContent />
    </PermissionGuard>
  );
}

function UsuarioDetalleContent() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: () => usersService.findById(id!),
    enabled: !!id,
  });

  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();

  const toggleActive = async () => {
    if (!user) return;
    try {
      if (user.isActive) {
        await deactivateUser.mutateAsync(user.id);
        toast.success('Usuario desactivado correctamente');
      } else {
        await activateUser.mutateAsync(user.id);
        toast.success('Usuario activado correctamente');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al cambiar el estado del usuario');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header (banda de marca, slim) */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-3 gap-2 border border-white/25 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/admin/usuarios">
              <ArrowLeftIcon className="h-4 w-4" />
              Volver a Usuarios
            </Link>
          </Button>
          <div className="flex items-center gap-2.5">
            <UserIcon className="h-7 w-7" />
            <h1 className="text-2xl font-bold sm:text-3xl">Detalle de Usuario</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <DetailSkeleton />
        ) : error || !user ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <ExclamationTriangleIcon className="h-10 w-10 text-destructive" />
              <p className="text-destructive">
                No se pudo cargar el usuario. Puede que no exista o que haya un error de conexión.
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/usuarios">Volver a Usuarios</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Identity card */}
            <Card className="overflow-hidden p-0">
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                    {getInitials(user)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-foreground">
                      {user.firstName} {user.lastName}
                    </h2>
                    {user.customerNumber && (
                      <p className="text-sm font-medium text-primary">#{user.customerNumber}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {getRoleBadge(user)}
                      {(() => {
                        const mlm = getMlmTypeConfig(user.customerType);
                        return mlm ? (
                          <Badge variant={mlm.variant} title="Tipo en el MLM (cliente enlazado)">
                            {mlm.label}
                          </Badge>
                        ) : null;
                      })()}
                      {user.isActive ? (
                        <Badge variant="success">
                          <CheckCircleIcon className="h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircleIcon className="h-3 w-3" />
                          Inactivo
                        </Badge>
                      )}
                      {user.emailVerifiedAt ? (
                        <Badge variant="success">
                          <CheckCircleIcon className="h-3 w-3" />
                          Email verificado
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <XCircleIcon className="h-3 w-3" />
                          Sin verificar
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant={user.isActive ? 'outline' : 'default'}
                    size="sm"
                    onClick={toggleActive}
                    disabled={activateUser.isPending || deactivateUser.isPending}
                  >
                    {user.isActive ? (
                      <>
                        <XCircleIcon className="h-4 w-4" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        Activar
                      </>
                    )}
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/usuarios?search=${encodeURIComponent(user.email ?? '')}`}>
                      <PencilIcon className="h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                  {user.customerId && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/distribuidores/${user.customerId}`}>
                        <BuildingStorefrontIcon className="h-4 w-4" />
                        Ver perfil MLM
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Contact & account */}
              <Card className="p-0">
                <div className="border-b border-border px-6 py-4">
                  <h3 className="font-semibold text-foreground">Cuenta y contacto</h3>
                </div>
                <div className="divide-y divide-border px-6">
                  <InfoRow
                    icon={EnvelopeIcon}
                    label="Correo electrónico"
                    value={user.email || <span className="text-muted-foreground">Sin email vinculado</span>}
                    onCopy={user.email || undefined}
                    copyLabel="Email"
                  />
                  <InfoRow
                    icon={PhoneIcon}
                    label="Teléfono"
                    value={user.phone || <span className="text-muted-foreground">-</span>}
                    onCopy={user.phone || undefined}
                    copyLabel="Teléfono"
                  />
                  <InfoRow
                    icon={UserIcon}
                    label="Usuario"
                    value={user.username || <span className="text-muted-foreground">-</span>}
                  />
                  <InfoRow
                    icon={KeyIcon}
                    label="Estado de contraseña"
                    value={
                      user.mustChangePassword ? (
                        <span className="text-amber-600 dark:text-amber-400">Debe cambiarla en el próximo acceso</span>
                      ) : (
                        'Establecida'
                      )
                    }
                  />
                </div>
              </Card>

              {/* Role & meta */}
              <Card className="p-0">
                <div className="border-b border-border px-6 py-4">
                  <h3 className="font-semibold text-foreground">Rol y registro</h3>
                </div>
                <div className="divide-y divide-border px-6">
                  <InfoRow icon={ShieldCheckIcon} label="Rol" value={getRoleBadge(user)} />
                  <InfoRow
                    icon={EnvelopeIcon}
                    label="Email verificado el"
                    value={
                      user.emailVerifiedAt
                        ? formatDateTime(user.emailVerifiedAt)
                        : <span className="text-muted-foreground">No verificado</span>
                    }
                  />
                  <InfoRow icon={CalendarIcon} label="Registrado" value={formatDateTime(user.createdAt)} />
                  <InfoRow icon={CalendarIcon} label="Última actualización" value={formatDateTime(user.updatedAt)} />
                </div>
              </Card>
            </div>

            {/* Permissions */}
            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h3 className="font-semibold text-foreground">Permisos efectivos</h3>
                <span className="text-sm text-muted-foreground">
                  {user.permissions?.length ?? 0} permiso{(user.permissions?.length ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
              <div className="p-6">
                {user.permissions && user.permissions.length > 0 ? (
                  <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                    {user.permissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="font-mono text-[11px] text-muted-foreground">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Este usuario no tiene permisos asignados directamente.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ================================
// SKELETON
// ================================

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-3">
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
