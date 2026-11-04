'use client';

// Detalle/edición de una temporada de promociones (mig 186). Ver con
// products:read; guardar y agregar promociones con products:seasonal_promos
// (sin él, todo es de solo lectura). Abajo: sus promociones (con el diálogo
// de alta/edición) y las ventas que las usaron.

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  PencilIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PermissionGuard } from '@/components/auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useProductPermissions } from '@/components/admin/products/lib/permissions';
import { SeasonForm } from '@/components/admin/seasonal-promotions/SeasonForm';
import { PromotionDialog } from '@/components/admin/seasonal-promotions/PromotionDialog';
import { SeasonUsagesSection } from '@/components/admin/seasonal-promotions/SeasonUsagesSection';
import { CountryChips } from '@/app/admin/productos/_tabs/TemporadasTab';
import { useDeletePromoSeason, usePromoSeason, useUpdatePromoSeason } from '@/hooks/useSeasonalPromotions';
import {
  apiErrorMessage,
  channelsLabel,
  formFromSeason,
  formatLocalStamp,
  isMigrationMissingError,
  promotionSummary,
  windowLabel,
} from '@/lib/seasonal-promotions';
import type { CreatePromoSeasonDto, SeasonPromotion } from '@/types/seasonal-promotion';

const BACK_HREF = '/admin/productos?tab=temporadas';

export default function EditarTemporadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: season, isLoading, isError, error, refetch } = usePromoSeason(id);
  const update = useUpdatePromoSeason();
  const remove = useDeletePromoSeason();
  const { canManageSeasons } = useProductPermissions();
  const [dialog, setDialog] = useState<{ open: boolean; promotion: SeasonPromotion | null; key: number }>({
    open: false,
    promotion: null,
    key: 0,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const openDialog = (promotion: SeasonPromotion | null) =>
    setDialog((d) => ({ open: true, promotion, key: d.key + 1 }));

  const handleSubmit = async (payload: CreatePromoSeasonDto & { imageUrl?: string | null }) => {
    try {
      const saved = await update.mutateAsync({ id, dto: payload });
      toast.success(`Temporada ${saved.code} guardada`);
    } catch (err: unknown) {
      toast.error(
        isMigrationMissingError(err)
          ? 'Falta aplicar la migración 186: el API no tiene el módulo de temporadas.'
          : apiErrorMessage(err, 'Error al guardar la temporada'),
      );
    }
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(id);
      toast.success('Temporada borrada');
      router.push(BACK_HREF);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'No se pudo borrar la temporada'));
      setConfirmDelete(false);
    }
  };

  let content: React.ReactNode;
  if (isLoading && !season) {
    content = (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  } else if (isError || !season) {
    const migrationMissing = isMigrationMissingError(error);
    content = (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={BACK_HREF}
          className="mb-4 inline-flex items-center text-sm text-[#3E667D] hover:underline"
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" /> Volver a Temporadas
        </Link>
        <Card className={migrationMissing ? 'border-amber-300 bg-amber-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-6">
            {migrationMissing ? (
              <div className="flex items-start gap-3 text-amber-900">
                <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold">Falta aplicar la migración 186</p>
                  <p className="mt-1 text-sm">
                    El API respondió 503: el módulo de temporadas aún no está disponible.
                  </p>
                  <p className="mt-1 text-xs text-amber-800/80">
                    {apiErrorMessage(error, 'Sin detalle del API.')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-red-700">
                <XCircleIcon className="h-6 w-6" />
                <p>{apiErrorMessage(error, 'No se pudo cargar la temporada.')}</p>
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
    const promotions = season.promotions ?? [];
    content = (
      <>
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
              <h1 className="text-3xl font-bold sm:text-4xl">{season.name}</h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-white/15 px-3 py-1 font-mono text-sm">{season.code}</span>
              <span className="rounded bg-white/15 px-3 py-1 text-sm">
                {windowLabel(season.startsAt, season.endsAt)}
              </span>
              <span className="rounded bg-white/15 px-3 py-1 text-sm">
                {season.countries.map((c) => c.code).join(', ') || 'Sin países'}
              </span>
              <span
                className={`rounded px-3 py-1 text-sm ${season.status === 'active' ? 'bg-emerald-400/30' : 'bg-white/15'}`}
              >
                {season.status === 'active'
                  ? 'En curso'
                  : season.status === 'upcoming'
                    ? 'Programada'
                    : season.status === 'ended'
                      ? 'Terminada'
                      : 'Inactiva'}
              </span>
              <span className="rounded bg-white/15 px-3 py-1 text-sm">
                {promotions.length} promoción{promotions.length === 1 ? '' : 'es'} · {season.usageCount} venta
                {season.usageCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <SeasonForm
            key={season.updatedAt}
            mode="edit"
            seasonId={season.id}
            imageThumbnailUrl={season.imageThumbnailUrl ?? null}
            initial={formFromSeason(season)}
            readOnly={!canManageSeasons}
            isSaving={update.isPending}
            onSubmit={handleSubmit}
            submitLabel="Guardar cambios"
            cancelHref={BACK_HREF}
          />

          <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <SparklesIcon className="h-5 w-5 text-[#3E667D]" />
                    Promociones de la temporada ({promotions.length})
                  </h2>
                  <p className="text-xs text-gray-500">
                    Cada una con su tipo, productos, canales y, si lo necesita, su propio día u horario dentro
                    de la temporada. El POS y la tienda las aplican solos cuando llega la hora.
                  </p>
                </div>
                {canManageSeasons && (
                  <Button type="button" onClick={() => openDialog(null)}>
                    <PlusIcon className="h-4 w-4" />
                    Agregar promoción
                  </Button>
                )}
              </div>

              {promotions.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                  Todavía no hay promociones. Agrega la primera: p. ej. “Kit Premium a $2,000 (viernes 13)” o
                  “3x2 en tés (sábado 14)”.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {promotions.map((p) => (
                    <li
                      key={p.id}
                      className={`flex flex-wrap items-center gap-4 p-4 ${p.isActive ? '' : 'bg-gray-50/70'}`}
                    >
                      {p.imageUrl ? (
                        <div className="h-12 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.imageThumbnailUrl ?? p.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-20 flex-shrink-0 items-center justify-center rounded-md bg-[#C8DDF2]/40">
                          <SparklesIcon className="h-5 w-5 text-[#2f5165]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">{p.name}</p>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600">
                            {p.code}
                          </span>
                          <span className="rounded-full bg-[#C8DDF2]/50 px-2 py-0.5 text-[11px] font-semibold text-[#2f5165]">
                            {p.typeLabel}
                          </span>
                          {!p.isActive && (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                              Inactiva
                            </span>
                          )}
                          {p.excludesKitBonus && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              Sin bono
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600">{promotionSummary(p)}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {p.startsAt && p.endsAt
                            ? `${formatLocalStamp(p.startsAt, { weekday: true })} → ${formatLocalStamp(p.endsAt, { weekday: true })}`
                            : 'Toda la temporada'}
                          {' · '}
                          {channelsLabel(p.channels)}
                          {p.usageCount > 0 ? ` · ${p.usageCount} venta${p.usageCount === 1 ? '' : 's'}` : ''}
                        </p>
                        <div className="mt-1">
                          <CountryChips countries={p.countries} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDialog(p)}
                        className="rounded-lg p-2 transition-colors hover:bg-green-50"
                        title={canManageSeasons ? 'Editar promoción' : 'Ver promoción'}
                      >
                        <PencilIcon className="h-4 w-4 text-green-600" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <SeasonUsagesSection season={season} />

          {canManageSeasons && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="text-red-700 hover:text-red-800"
                onClick={() => setConfirmDelete(true)}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Borrar temporada
              </Button>
            </div>
          )}
        </div>

        {dialog.open && (
          <PromotionDialog
            key={`${dialog.key}-${dialog.promotion?.id ?? 'new'}`}
            open={dialog.open}
            onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
            season={season}
            promotion={dialog.promotion}
            readOnly={!canManageSeasons}
          />
        )}

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Borrar la temporada ${season.code}`}
          description="Se borran también sus promociones. Solo se permite si ninguna venta las usó; si ya se usaron, desactívala para conservar el historial."
          confirmLabel="Borrar temporada"
          destructive
          isPending={remove.isPending}
          onConfirm={handleDelete}
        />
      </>
    );
  }

  return (
    <PermissionGuard permissions={['products:read', 'products:*']}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">{content}</div>
    </PermissionGuard>
  );
}
