'use client';

// SavedAddressPicker — Direcciones guardadas del comprador en el paso "Envío" del
// checkout (10-nov-2026). Tarjetas para elegir una (la predeterminada o más reciente
// llega elegida), "Usar otra dirección" para capturar una distinta y eliminar con
// confirmación. Una guardada a la que le faltan datos se ofrece para COMPLETARLA: al
// elegirla la pantalla abre el formulario prellenado (nunca viaja tal cual).
// Qué se ofrece y qué queda elegido lo decide `lib/checkout/shipping-address`.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  cityWithState,
  formatAddressLine,
  interiorNeedsPrefix,
  streetWithNumber,
  type AddressChoice,
  type SavedAddressOption,
} from '@/lib/checkout/shipping-address';
import { formatPhoneDisplay } from '@/lib/phone';
import type { SavedAddress } from '@/types/cart';

/** Tarjetas visibles antes de "Ver más" (quien ya tenía muchas copias de la misma dirección). */
const VISIBLE_AT_FIRST = 4;

const CARD = 'flex items-start gap-2 rounded-lg border-2 p-4 transition-all';
const CARD_ON = 'border-[#a7c1e2] bg-[#C8DDF2]/5';
const CARD_OFF = 'border-gray-200 hover:border-gray-300';
const RADIO = 'mt-1 h-4 w-4 flex-shrink-0 text-[#3E667D] focus:ring-[#a7c1e2]';

interface SavedAddressPickerProps {
  /** Guardadas que se ofrecen en la tienda de este país (`savedAddressOptions`). */
  options: SavedAddressOption[];
  /** Elección vigente (`resolveAddressChoice`). */
  choice: AddressChoice;
  onChoose: (choice: AddressChoice) => void;
  /** Eliminar ya confirmado por el cliente. */
  onDelete: (address: SavedAddress) => void;
  /** Dirección que se está eliminando (su tarjeta se apaga). */
  deletingId?: string | null;
}

export function SavedAddressPicker({ options, choice, onChoose, onDelete, deletingId }: SavedAddressPickerProps) {
  const t = useTranslations('checkout.addressBook');
  const [showAll, setShowAll] = useState(false);
  // La dirección se conserva mientras el diálogo se cierra para que su texto no parpadee.
  const [confirm, setConfirm] = useState<{ address: SavedAddress; open: boolean } | null>(null);

  const chosenIndex = choice.kind === 'new' ? -1 : options.findIndex((o) => o.address.id === choice.id);
  const expanded = showAll || chosenIndex >= VISIBLE_AT_FIRST;
  const visible = expanded ? options : options.slice(0, VISIBLE_AT_FIRST);
  const hidden = options.length - visible.length;

  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 block text-sm font-medium text-gray-700">{t('title')}</legend>

      {visible.map(({ address, status, issue }) => {
        const selected = choice.kind !== 'new' && choice.id === address.id;
        const incomplete = status === 'incomplete';
        // Le faltan datos, o los tiene pero hay que revisarlos (formato del C. P., estado, rechazo del API).
        const review = issue === 'review';
        const deleting = deletingId === address.id;
        const street = streetWithNumber(address);
        const place = cityWithState(address);
        const interior = address.intNumber
          ? interiorNeedsPrefix(address.intNumber)
            ? t('interior', { value: address.intNumber })
            : address.intNumber
          : '';
        return (
          <div
            key={address.id}
            className={`${CARD} ${selected ? CARD_ON : CARD_OFF} ${deleting ? 'opacity-60' : ''}`}
          >
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="checkout-shipping-address"
                value={address.id}
                checked={selected}
                disabled={deleting}
                onChange={() => onChoose({ kind: incomplete ? 'complete' : 'saved', id: address.id })}
                className={RADIO}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="break-words font-medium text-gray-900">
                    {[street || t('noStreet'), interior].filter(Boolean).join(', ')}
                  </span>
                  {address.isDefault && (
                    <span className="rounded-full bg-[#C8DDF2]/50 px-2 py-0.5 text-[11px] font-semibold text-[#3E667D]">
                      {t('default')}
                    </span>
                  )}
                  {incomplete && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {t(review ? 'review' : 'incomplete')}
                    </span>
                  )}
                </span>
                {address.neighborhood && (
                  <span className="block break-words text-sm text-gray-500">{address.neighborhood}</span>
                )}
                {(place || address.postalCode) && (
                  <span className="block break-words text-sm text-gray-500">
                    {[place, address.postalCode ? t('postalCode', { code: address.postalCode }) : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
                {address.phone && (
                  <span className="block text-xs text-gray-400">
                    {t('phone', { phone: formatPhoneDisplay(address.phone) })}
                  </span>
                )}
                {incomplete && (
                  <span className="mt-1 block text-xs text-amber-700">
                    {t(review ? 'reviewHint' : 'incompleteHint')}
                  </span>
                )}
              </span>
            </label>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirm({ address, open: true })}
              aria-label={t('deleteAria', { address: street || t('noStreet') })}
              title={t('delete')}
              className="-mr-1 -mt-1 flex-shrink-0 rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a7c1e2] disabled:pointer-events-none"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#3E667D] underline-offset-4 hover:underline"
        >
          <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
          {t('showMore', { count: hidden })}
        </button>
      )}

      <label className={`${CARD} cursor-pointer ${choice.kind === 'new' ? CARD_ON : CARD_OFF}`}>
        <input
          type="radio"
          name="checkout-shipping-address"
          value="new"
          checked={choice.kind === 'new'}
          onChange={() => onChoose({ kind: 'new' })}
          className={RADIO}
        />
        <span className="ml-1 flex min-w-0 flex-1 items-center gap-2">
          <PlusIcon className="h-4 w-4 flex-shrink-0 text-[#3E667D]" />
          <span className="font-medium text-gray-900">{t('useOther')}</span>
        </span>
      </label>

      <AlertDialog
        open={confirm?.open ?? false}
        onOpenChange={(open) => {
          if (!open) setConfirm((current) => (current ? { ...current, open: false } : current));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirm && (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              {formatAddressLine(confirm.address) || t('noStreet')}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteCancel')}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={() => {
                if (confirm) onDelete(confirm.address);
              }}
            >
              {t('deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </fieldset>
  );
}

/** Mientras cargan las direcciones guardadas: aún no se sabe cuál queda elegida. */
export function SavedAddressPickerSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>
  );
}
