'use client';

// /admin/sistema/sync - Sincronización legacy→v2 en ruta propia (D12 del
// contrato de sincronización §10). /admin/sistema sigue siendo exclusivo de
// super_admin; esta página la LEE quien el API deje leer (GET /status: hoy
// super_admin y Sistemas; a los demás les responde 403) sin copiar aquí la
// lista de roles. El interruptor y las decisiones de retenciones solo se
// habilitan para super_admin (PATCH/PUT del API).

import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/store/hooks';
import { selectUserRoles } from '@/store/slices/authSlice';
import { useLegacySyncReadProbe } from '@/hooks/useMaintenance';
import { legacySyncErrorInfo } from '@/lib/legacy-sync/format';
import { canManageLegacySync, legacySyncReadAccess } from '@/lib/legacy-sync/access';
import { LegacySyncTab } from '../LegacySyncTab';

export default function LegacySyncPage() {
  const roles = useAppSelector(selectUserRoles);
  const canManage = canManageLegacySync(roles);
  // Guarda propia: sonda sin polling (el panel ya consulta cada 60 s).
  const probe = useLegacySyncReadProbe({ enabled: true });
  const access = legacySyncReadAccess({
    isSuperAdmin: canManage,
    hasData: !!probe.data,
    error: probe.error,
    loading: probe.isLoading,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <ArrowPathIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Sincronización legacy</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            {canManage
              ? 'Sincronización automática legacy → v2: estado, corridas, retenciones y "WhatsApp listo".'
              : 'Sincronización automática legacy → v2 en solo lectura: el interruptor y las decisiones de retenciones son del Super Administrador.'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {access === 'checking' ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : access === 'denied' ? (
          <Card>
            <CardContent className="flex items-start gap-3 p-6 text-sm">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">Acceso denegado</p>
                <p className="text-muted-foreground">
                  {legacySyncErrorInfo(probe.error, 'Sin acceso').message}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <LegacySyncTab canManage={canManage} />
        )}
      </div>
    </div>
  );
}
