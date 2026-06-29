'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  XMarkIcon,
  ShoppingCartIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useAppDispatch } from '@/store/hooks';
import { logoutAsync } from '@/store/slices/authSlice';
import { toast } from 'sonner';
import { MORE_GROUPS, COMING_SOON } from './distributorNav';

interface DistributorMoreMenuProps {
  onNavigate?: () => void;
}

export function DistributorMoreMenu({ onNavigate }: DistributorMoreMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations('distributor');

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      toast.success(t('footer.loggedOut'));
      router.push('/login');
    } catch {
      toast.error(t('footer.logoutError'));
    }
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
        <h2 className="font-bold text-[#3E667D]">{t('moremenu.title')}</h2>
        <button
          onClick={onNavigate}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={t('moremenu.close')}
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Grupos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {MORE_GROUPS.map((group) => (
          <div key={group.key}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t(`groups.${group.key}`)}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-[#3E667D] text-white'
                          : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{t(`nav.${item.key}`)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Próximamente */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t('groups.comingSoon')}
          </p>
          <ul className="space-y-1">
            {COMING_SOON.map((item) => (
              <li key={item.key}>
                <div
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed select-none"
                  title={t('groups.soon')}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{t(`comingSoonItems.${item.key}`)}</span>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                    {t('moremenu.soon')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Acciones */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <Link
          href="/productos"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ShoppingCartIcon className="h-5 w-5" />
          <span>{t('footer.goToStore')}</span>
        </Link>
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          <span>{t('footer.backToSite')}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span>{t('footer.logout')}</span>
        </button>
      </div>
    </div>
  );
}
