'use client';

// Detalle/edición de una campaña de membresía (mig 168). Ver con
// products:read; guardar con products:update (sin él, el formulario es de
// solo lectura). Abajo, los canjes: quién la usó y qué recibió.

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  IdentificationIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PermissionGuard } from '@/components/auth';
import { useProductPermissions } from '@/components/admin/products/lib/permissions';
import { MembershipCampaignForm } from '@/components/admin/membership-campaigns/MembershipCampaignForm';
import { MembershipRedemptionsSection } from '@/components/admin/membership-campaigns/MembershipRedemptionsSection';
import { useMembershipCampaign, useUpdateMembershipCampaign } from '@/hooks/useMembershipCampaigns';
import {
  apiErrorMessage,
  branchesLabel,
  formFromCampaign,
  isMigrationMissingError,
  validityLabel,
} from '@/lib/membership-campaigns';
import type { CreateMembershipCampaignDto } from '@/types/membership-campaign';

const BACK_HREF = '/admin/productos?tab=membresias';

export default function EditarMembresiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: campaign, isLoading, isError, error, refetch } = useMembershipCampaign(id);
  const update = useUpdateMembershipCampaign();
  const { canUpdate } = useProductPermissions();

  const handleSubmit = async (payload: CreateMembershipCampaignDto) => {
    try {
      // PATCH con todo: gifts y branchIds REEMPLAZAN la lista.
      const saved = await update.mutateAsync({ id, dto: payload });
      toast.success(
        saved.branchCount > 0
          ? `Campaña ${saved.code} guardada · ${branchesLabel(saved.branchCount)}`
          : `Campaña ${saved.code} guardada (apagada: sin sucursales)`,
      );
    } catch (err: unknown) {
      toast.error(
        isMigrationMissingError(err)
          ? 'Falta aplicar la migración 168: el API no tiene el módulo de membresías.'
          : apiErrorMessage(err, 'Error al guardar la campaña'),
      );
    }
  };

  let content: React.ReactNode;
  if (isLoading && !campaign) {
    content = (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  } else if (isError || !campaign) {
    const migrationMissing = isMigrationMissingError(error);
    content = (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={BACK_HREF} className="inline-flex items-center text-sm text-[#3E667D] hover:underline mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver a Membresías
        </Link>
        <Card className={migrationMissing ? 'border-amber-300 bg-amber-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-6">
            {migrationMissing ? (
              <div className="flex items-start gap-3 text-amber-900">
                <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold">Falta aplicar la migración 168</p>
                  <p className="mt-1 text-sm">
                    El API respondió 503: el módulo de campañas de membresía aún no está disponible.
                  </p>
                  <p className="mt-1 text-xs text-amber-800/80">{apiErrorMessage(error, 'Sin detalle del API.')}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-red-700">
                <XCircleIcon className="h-6 w-6" />
                <p>{apiErrorMessage(error, 'No se pudo cargar la campaña.')}</p>
              </div>
            )}
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  } else {
    content = (
      <>
        <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <Link href={BACK_HREF} className="inline-flex items-center text-white/80 hover:text-white mb-3 text-sm">
              <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver a Membresías
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <IdentificationIcon className="h-9 w-9" />
              <h1 className="text-3xl font-bold sm:text-4xl">{campaign.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="bg-white/15 px-3 py-1 rounded text-sm font-mono">{campaign.code}</span>
              <span className="bg-white/15 px-3 py-1 rounded text-sm">
                {campaign.countryCode} · {campaign.countryName}
              </span>
              <span
                className={`px-3 py-1 rounded text-sm ${
                  campaign.isActive ? 'bg-emerald-400/30' : 'bg-white/15'
                }`}
              >
                {campaign.isActive ? 'Activa' : 'Inactiva'}
              </span>
              <span
                className={`px-3 py-1 rounded text-sm ${
                  campaign.branchCount > 0 ? 'bg-emerald-400/30' : 'bg-amber-300/30'
                }`}
              >
                {branchesLabel(campaign.branchCount)}
              </span>
              <span className="bg-white/15 px-3 py-1 rounded text-sm">
                {campaign.redemptionCount} canje{campaign.redemptionCount === 1 ? '' : 's'}
              </span>
              <span className="bg-white/15 px-3 py-1 rounded text-sm">
                Vigencia: {validityLabel(campaign.validFrom, campaign.validTo)}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          {/* `key`: al guardar cambia updatedAt y el formulario se vuelve a
              montar con lo que quedó en el servidor (sucursales con quién y
              cuándo, regalos con su estado). */}
          <MembershipCampaignForm
            key={campaign.updatedAt}
            mode="edit"
            initial={formFromCampaign(campaign)}
            savedBranches={campaign.branches}
            readOnly={!canUpdate}
            isSaving={update.isPending}
            onSubmit={handleSubmit}
            submitLabel="Guardar cambios"
            cancelHref={BACK_HREF}
          />

          <MembershipRedemptionsSection campaignId={id} />
        </div>
      </>
    );
  }

  return (
    <PermissionGuard permissions={['products:read', 'products:*']}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">{content}</div>
    </PermissionGuard>
  );
}
