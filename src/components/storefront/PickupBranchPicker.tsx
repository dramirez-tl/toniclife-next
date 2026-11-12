'use client';

// PickupBranchPicker — Sucursal donde se recoge el pedido, en el paso "Envío" del checkout
// (11-nov-2026). Con decenas de sucursales un desplegable ya no alcanza: buscador (nombre,
// ciudad, estado o código postal) y lista de tarjetas para elegir una, con lo que hace
// falta para decidir: dónde está, su teléfono y si tiene existencias para TODO el carrito.
// Las que no tienen van al final, no se pueden elegir y dicen qué les falta. La elegida se
// detalla abajo: dirección completa, teléfono, mapa y qué llevar para recoger.
// Qué se pinta, en qué orden y qué se puede elegir lo decide `lib/checkout/pickup-branches`.

import { useId, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PhoneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  filterPickupBranches,
  findPickupBranch,
  isPickupBranchSelectable,
  missingItemsSummary,
  noPickupBranchAvailable,
  pickupAddressLine,
  pickupCityState,
  pickupMapUrl,
  pickupPhoneHref,
  pickupPlace,
  sortPickupBranches,
} from '@/lib/checkout/pickup-branches';
import { cn } from '@/lib/utils';
import type { PickupBranch } from '@/types/cart';

type CheckoutT = ReturnType<typeof useTranslations<'checkout'>>;

/** Con pocas sucursales se ven todas de un vistazo: el buscador solo estorbaría. */
const SEARCH_FROM = 6;

const CARD =
  'flex min-h-11 items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#a7c1e2] has-[:focus-visible]:ring-offset-1';
const CARD_ON = 'cursor-pointer border-[#3E667D] bg-[#C8DDF2]/20 ring-1 ring-[#3E667D]';
const CARD_OFF = 'cursor-pointer border-gray-200 bg-white hover:border-[#a7c1e2] hover:bg-[#C8DDF2]/10';
const CARD_DISABLED = 'cursor-not-allowed border-gray-200 bg-gray-50';
const LINK =
  'inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium text-[#3E667D] underline-offset-4 hover:text-[#2f5165] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';

interface PickupBranchPickerProps {
  /** Sucursales que ofrece el API (`usePickupBranches`); `undefined` mientras no llegan. */
  branches: PickupBranch[] | undefined;
  /** Primera carga: va el esqueleto. */
  loading: boolean;
  /** La lista se está volviendo a pedir con la anterior en pantalla. */
  refreshing?: boolean;
  /** La consulta falló y no hay lista que mostrar. */
  failed?: boolean;
  onRetry?: () => void;
  /** Id de la sucursal elegida ('' = ninguna). */
  value: string;
  onChange: (branchId: string) => void;
  /** Cambia a envío a domicilio. Sin él (no hay envío a ese país) no se sugiere. */
  onChooseDelivery?: () => void;
}

export function PickupBranchPicker({
  branches,
  loading,
  refreshing = false,
  failed = false,
  onRetry,
  value,
  onChange,
  onChooseDelivery,
}: PickupBranchPickerProps) {
  const t = useTranslations('checkout');
  const [query, setQuery] = useState('');
  const legendId = useId();
  const searchId = useId();
  const hintId = useId();
  const groupName = useId();

  const sorted = sortPickupBranches(branches);
  const showSearch = sorted.length >= SEARCH_FROM;
  // Sin buscador a la vista (quedaron pocas sucursales) lo escrito antes ya no filtra.
  const searching = showSearch && query.trim().length > 0;
  const visible = searching ? filterPickupBranches(sorted, query) : sorted;
  const selected = findPickupBranch(branches, value);

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend id={legendId} className="mb-2 block text-sm font-medium text-gray-700">
        {t('pickupBranch')}
      </legend>

      {loading ? (
        <PickupBranchPickerSkeleton label={t('pickup.loading')} />
      ) : !branches ? (
        failed ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>{t('pickup.loadError')}</p>
            {onRetry && (
              <Button type="button" variant="outline" onClick={onRetry} className="mt-3 min-h-11 text-gray-900">
                <ArrowPathIcon aria-hidden="true" />
                {t('pickup.retry')}
              </Button>
            )}
          </div>
        ) : null
      ) : sorted.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">{t('pickup.empty')}</p>
      ) : (
        <>
          {noPickupBranchAvailable(sorted) && (
            <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">{t('pickup.allUnavailableTitle')}</p>
              <p className="mt-1">
                {t('pickup.allUnavailableBody')}{' '}
                {onChooseDelivery ? t('pickup.allUnavailableSuggestion') : t('pickup.allUnavailableSuggestionCartOnly')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onChooseDelivery && (
                  <Button type="button" variant="outline" onClick={onChooseDelivery} className="min-h-11 text-gray-900">
                    {t('pickup.chooseDelivery')}
                  </Button>
                )}
                <Button asChild variant="outline" className="min-h-11 text-gray-900">
                  <Link href="/carrito">{t('pickup.editCart')}</Link>
                </Button>
              </div>
            </div>
          )}

          {showSearch && (
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                {t('pickup.searchLabel')}
              </label>
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              />
              <Input
                id={searchId}
                type="text"
                role="searchbox"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-describedby={hintId}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                // El buscador vive dentro del formulario de "Envío": Enter no debe mandarlo.
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                placeholder={t('pickup.searchPlaceholder')}
                className={cn('h-11 bg-white pl-10', searching ? 'pr-11' : 'pr-3')}
              />
              {searching && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t('pickup.clearSearch')}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3E667D]"
                >
                  <XMarkIcon aria-hidden="true" className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Un solo renglón bajo el buscador: con qué datos se puede buscar o cuántas sucursales
              coinciden y, a la derecha, si la lista se está volviendo a pedir. */}
          {(showSearch || refreshing) && (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
              {showSearch && (
                <p id={hintId} aria-live="polite">
                  {!searching
                    ? t('pickup.searchHint')
                    : visible.length > 0
                      ? t('pickup.resultsCount', { shown: visible.length, total: sorted.length })
                      : ''}
                </p>
              )}
              {refreshing && (
                <p role="status" className="ml-auto inline-flex items-center gap-1.5">
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                  {t('pickup.refreshing')}
                </p>
              )}
            </div>
          )}

          {visible.length === 0 ? (
            <div role="status" className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
              <p>{t('pickup.noResults', { query: query.trim() })}</p>
              <button type="button" onClick={() => setQuery('')} className={LINK}>
                {t('pickup.showAll')}
              </button>
            </div>
          ) : (
            // El margen negativo (arriba y a los lados) y el relleno dejan sitio al anillo de foco dentro
            // del área con scroll. Abajo NO va margen negativo: le ganaría a la separación del
            // formulario y la lista quedaría pegada a la sucursal elegida. En escritorio caben más tarjetas.
            <div
              role="radiogroup"
              aria-labelledby={legendId}
              className="-mx-1 -mt-1 max-h-[22rem] space-y-2 overflow-y-auto p-1 sm:max-h-[28rem]"
            >
              {visible.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  groupName={groupName}
                  checked={branch.id === value}
                  onSelect={onChange}
                  t={t}
                />
              ))}
            </div>
          )}

          {selected && <SelectedBranch branch={selected} t={t} />}
        </>
      )}
    </fieldset>
  );
}

// ===== tarjeta de una sucursal =====

function BranchCard({
  branch,
  groupName,
  checked,
  onSelect,
  t,
}: {
  branch: PickupBranch;
  groupName: string;
  checked: boolean;
  onSelect: (branchId: string) => void;
  t: CheckoutT;
}) {
  const place = pickupPlace(branch);
  const selectable = isPickupBranchSelectable(branch);
  const cityState = pickupCityState(place);
  const street = [place.street, place.zip ? t('pickup.zip', { code: place.zip }) : ''].filter(Boolean).join(' · ');
  const missing = selectable ? null : missingItemsSummary(branch.missingItems);

  return (
    <label className={cn(CARD, !selectable ? CARD_DISABLED : checked ? CARD_ON : CARD_OFF)}>
      <input
        type="radio"
        name={groupName}
        value={branch.id}
        checked={checked && selectable}
        disabled={!selectable}
        onChange={() => onSelect(branch.id)}
        className="mt-1 h-4 w-4 flex-shrink-0 accent-[#3E667D] disabled:cursor-not-allowed"
      />
      {/* En celular: nombre, etiqueta y datos, uno bajo otro. Desde `sm` la etiqueta va a la derecha. */}
      <span className="grid min-w-0 flex-1 gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto]">
        <span className={cn('break-words font-medium sm:col-start-1', selectable ? 'text-gray-900' : 'text-gray-600')}>
          {place.name}
        </span>
        {branch.availability && (
          <span className="flex min-w-0 flex-col gap-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:max-w-[15rem] sm:items-end sm:text-right">
            <span
              className={cn(
                'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                selectable ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-200 text-gray-700',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('size-1.5 rounded-full', selectable ? 'bg-emerald-600' : 'bg-gray-500')}
              />
              {selectable ? t('pickup.available') : t('pickup.unavailable')}
            </span>
            {missing && (
              <span className="break-words text-xs text-gray-600">
                {missing.more > 0
                  ? t('pickup.missingMore', { items: missing.names.join(', '), count: missing.more })
                  : t('pickup.missing', { items: missing.names.join(', ') })}
              </span>
            )}
          </span>
        )}
        {(cityState || street || place.phone) && (
          <span className="min-w-0 text-sm text-gray-600 sm:col-start-1">
            {cityState && <span className="block break-words">{cityState}</span>}
            {street && <span className="block break-words text-gray-500">{street}</span>}
            {place.phone && <span className="block text-gray-500">{t('pickup.phone', { phone: place.phone })}</span>}
          </span>
        )}
      </span>
    </label>
  );
}

// ===== detalle de la sucursal elegida =====

function SelectedBranch({ branch, t }: { branch: PickupBranch; t: CheckoutT }) {
  const place = pickupPlace(branch);
  const address = pickupAddressLine(place, (code) => t('pickup.zip', { code }));
  const phoneHref = pickupPhoneHref(place.phone);
  const mapUrl = pickupMapUrl(place);

  return (
    <div className="rounded-lg border border-[#a7c1e2] bg-[#C8DDF2]/15 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5165]">{t('pickup.selectedTitle')}</p>
      <p className="mt-1 flex items-start gap-2 font-semibold text-gray-900">
        <BuildingStorefrontIcon aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#3E667D]" />
        <span className="min-w-0 break-words">{place.name}</span>
      </p>
      {address && (
        <p className="mt-1 flex items-start gap-2 text-sm text-gray-700">
          <MapPinIcon aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#3E667D]" />
          <span className="min-w-0 break-words">{address}</span>
        </p>
      )}
      {(place.phone || mapUrl) && (
        <div className="mt-1 flex flex-wrap gap-x-6">
          {place.phone &&
            (phoneHref ? (
              <a href={phoneHref} className={LINK} aria-label={t('pickup.callBranch', { phone: place.phone })}>
                <PhoneIcon aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
                {place.phone}
              </a>
            ) : (
              <span className="inline-flex min-h-11 items-center gap-1.5 text-sm text-gray-700">
                <PhoneIcon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-[#3E667D]" />
                {place.phone}
              </span>
            ))}
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
              <MapPinIcon aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
              {t('pickup.viewMap')}
              <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="sr-only">{t('pickup.opensNewTab')}</span>
            </a>
          )}
        </div>
      )}
      <p className="mt-2 border-t border-[#a7c1e2]/60 pt-3 text-sm text-gray-700">{t('pickup.note')}</p>
    </div>
  );
}

/** Mientras llegan las sucursales: aún no se sabe cuáles hay ni en cuáles alcanza el pedido. */
function PickupBranchPickerSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-2">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="h-[4.5rem] w-full rounded-lg" />
      <Skeleton className="h-[4.5rem] w-full rounded-lg" />
      <Skeleton className="h-[4.5rem] w-full rounded-lg" />
    </div>
  );
}
