'use client';

// StoreAccountMenu — "Mi cuenta" en el encabezado de la tienda para la cuenta del público
// (cliente final). El distribuidor y el colaborador tienen su panel (botón "Ir a Panel");
// esta cuenta no: lo único suyo es ver sus pedidos y cerrar sesión, y eso es lo que se
// le ofrece. Nada aquí lleva al panel del distribuidor (ver lib/auth-area.ts).

import Link from 'next/link';
import { ArrowRightOnRectangleIcon, ChevronDownIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { STORE_HOME, STORE_ORDERS_PATH } from '@/lib/auth-area';
import type { UserResponse } from '@/services/auth.service';
import { useAppDispatch } from '@/store/hooks';
import { logoutAsync } from '@/store/slices/authSlice';

/**
 * Cierra la sesión y vuelve al inicio de la tienda con carga completa: carrito y
 * catálogo se piden de nuevo como visitante (nada de la cuenta queda en pantalla).
 */
function useStoreLogout() {
  const dispatch = useAppDispatch();
  return async () => {
    // `logoutAsync` limpia la sesión de este navegador aunque el API no responda.
    await dispatch(logoutAsync());
    window.location.assign(STORE_HOME);
  };
}

function initialsOf(user: Pick<UserResponse, 'firstName' | 'lastName'>): string {
  return `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase();
}

/** Escritorio: píldora "Mi cuenta" con su menú (mis pedidos, cerrar sesión). */
export function StoreAccountMenu({ user }: { user: UserResponse }) {
  const t = useTranslations('nav');
  const logout = useStoreLogout();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('accountMenu')}
          className="flex cursor-pointer items-center gap-2 rounded-full bg-[#3E667D] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5165] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
            {initialsOf(user)}
          </span>
          {t('account')}
          <ChevronDownIcon aria-hidden className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          {fullName && <span className="block truncate font-semibold text-gray-900">{fullName}</span>}
          <span className="block truncate text-xs text-gray-500">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer py-2">
          <Link href={STORE_ORDERS_PATH}>
            <ClipboardDocumentListIcon aria-hidden />
            {t('myOrders')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer py-2" onSelect={() => void logout()}>
          <ArrowRightOnRectangleIcon aria-hidden />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Teléfono: las mismas dos acciones, como botones del menú desplegado. */
export function StoreAccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations('nav');
  const logout = useStoreLogout();

  return (
    <div className="space-y-2">
      <Button asChild size="lg" variant="default" className="w-full">
        <Link href={STORE_ORDERS_PATH} onClick={onNavigate}>
          <ClipboardDocumentListIcon aria-hidden className="h-5 w-5" />
          {t('myOrders')}
        </Link>
      </Button>
      <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => void logout()}>
        <ArrowRightOnRectangleIcon aria-hidden className="h-5 w-5" />
        {t('logout')}
      </Button>
    </div>
  );
}
