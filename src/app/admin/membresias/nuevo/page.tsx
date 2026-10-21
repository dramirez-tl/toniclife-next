'use client';

// Nueva campaña de membresía (mig 168). Crear exige products:update (mismo
// permiso que el API). La campaña nace como se capture: isActive y sucursales
// viajan en el POST.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth';
import { MembershipCampaignForm } from '@/components/admin/membership-campaigns/MembershipCampaignForm';
import { useCreateMembershipCampaign } from '@/hooks/useMembershipCampaigns';
import { EMPTY_MEMBERSHIP_FORM, apiErrorMessage, isMigrationMissingError } from '@/lib/membership-campaigns';
import type { CreateMembershipCampaignDto } from '@/types/membership-campaign';

const BACK_HREF = '/admin/productos?tab=membresias';

export default function NuevaMembresiaPage() {
  const router = useRouter();
  const create = useCreateMembershipCampaign();

  const handleSubmit = async (payload: CreateMembershipCampaignDto) => {
    try {
      const created = await create.mutateAsync(payload);
      toast.success(
        created.branchCount > 0
          ? `Campaña ${created.code} creada y habilitada en ${created.branchCount} sucursal(es)`
          : `Campaña ${created.code} creada (apagada: sin sucursales)`,
      );
      router.push(`/admin/membresias/${created.id}`);
    } catch (err: unknown) {
      toast.error(
        isMigrationMissingError(err)
          ? 'Falta aplicar la migración 168: el API no tiene el módulo de membresías.'
          : apiErrorMessage(err, 'Error al crear la campaña'),
      );
    }
  };

  return (
    <PermissionGuard permissions={['products:update', 'products:*']}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <Link href={BACK_HREF} className="inline-flex items-center text-white/80 hover:text-white mb-3 text-sm">
              <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver a Membresías
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <IdentificationIcon className="h-9 w-9" />
              <h1 className="text-3xl font-bold sm:text-4xl">Nueva campaña de membresía</h1>
            </div>
            <p className="text-base text-white/80">
              “Compra N puntos en producto y tu membresía es gratis”: en una sola compra del POS el
              distribuidor recibe la posición sin pagar kit, regalos a $0 y un cupón de primera recompra.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <MembershipCampaignForm
            mode="create"
            initial={EMPTY_MEMBERSHIP_FORM}
            isSaving={create.isPending}
            onSubmit={handleSubmit}
            submitLabel="Crear campaña"
            cancelHref={BACK_HREF}
          />
        </div>
      </div>
    </PermissionGuard>
  );
}
