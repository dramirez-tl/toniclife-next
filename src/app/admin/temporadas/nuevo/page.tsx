'use client';

// Nueva temporada de promociones (mig 186). Crear exige
// products:seasonal_promos (mismo permiso que el API). Las promociones se
// agregan después, desde el detalle.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth';
import { SeasonForm } from '@/components/admin/seasonal-promotions/SeasonForm';
import { useCreatePromoSeason } from '@/hooks/useSeasonalPromotions';
import { EMPTY_SEASON_FORM, apiErrorMessage, isMigrationMissingError } from '@/lib/seasonal-promotions';
import type { CreatePromoSeasonDto } from '@/types/seasonal-promotion';

const BACK_HREF = '/admin/productos?tab=temporadas';

export default function NuevaTemporadaPage() {
  const router = useRouter();
  const create = useCreatePromoSeason();

  const handleSubmit = async (payload: CreatePromoSeasonDto) => {
    try {
      const created = await create.mutateAsync(payload);
      toast.success(`Temporada ${created.code} creada. Ahora agrega sus promociones.`);
      router.push(`/admin/temporadas/${created.id}`);
    } catch (err: unknown) {
      toast.error(
        isMigrationMissingError(err)
          ? 'Falta aplicar la migración 186: el API no tiene el módulo de temporadas.'
          : apiErrorMessage(err, 'Error al crear la temporada'),
      );
    }
  };

  return (
    <PermissionGuard permissions={['products:seasonal_promos', 'products:*']}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <Link
              href={BACK_HREF}
              className="mb-3 inline-flex items-center text-sm text-white/80 hover:text-white"
            >
              <ArrowLeftIcon className="mr-1 h-4 w-4" /> Volver a Temporadas
            </Link>
            <div className="mb-2 flex items-center gap-3">
              <CalendarDaysIcon className="h-9 w-9" />
              <h1 className="text-3xl font-bold sm:text-4xl">Nueva temporada</h1>
            </div>
            <p className="text-base text-white/80">
              Define nombre, fechas con hora local y países. Después, dentro de la temporada, agrega cada
              promoción (3x2, precio especial, % o regalo) con sus productos y su propio día si lo necesita.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <SeasonForm
            mode="create"
            initial={EMPTY_SEASON_FORM}
            isSaving={create.isPending}
            onSubmit={handleSubmit}
            submitLabel="Crear temporada"
            cancelHref={BACK_HREF}
          />
        </div>
      </div>
    </PermissionGuard>
  );
}
