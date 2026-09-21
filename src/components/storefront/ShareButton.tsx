'use client';

// Compartir el producto: Web Share API si existe; si no, WhatsApp + copiar enlace.
// Con sesión de DISTRIBUIDOR el enlace lleva `?ref=<código>` (lo captura
// `ReferralCodeCapture` en el visitante y llega al checkout).

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChatBubbleLeftEllipsisIcon, ClipboardDocumentIcon, ShareIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDistributorProfile } from '@/hooks/useDistributor';
import { localizedPath } from '@/lib/storefront/seo';
import { productPath } from '@/lib/storefront/slug';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUserRoles } from '@/store/slices/authSlice';

interface ShareButtonProps {
  slug: string;
  name: string;
}

export function ShareButton({ slug, name }: ShareButtonProps) {
  const t = useTranslations('storefront.product.share');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const roles = useAppSelector(selectUserRoles);
  const isDistributor = isAuthenticated && roles.includes('distributor');
  const { data: profile } = useDistributorProfile(isDistributor);
  const referralCode = isDistributor ? (profile?.referralCode || profile?.code || null) : null;

  const buildUrl = () => {
    const url = new URL(localizedPath(locale, productPath(slug)), window.location.origin);
    if (referralCode) url.searchParams.set('ref', referralCode);
    return url.toString();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildUrl());
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyError'));
    }
    setOpen(false);
  };

  const onTriggerClick = async () => {
    if (typeof navigator.share !== 'function') {
      setOpen((value) => !value);
      return;
    }
    try {
      await navigator.share({ title: name, text: t('shareText', { name }), url: buildUrl() });
    } catch (error) {
      // Cancelar el diálogo nativo no es un error; cualquier otro fallo abre el respaldo.
      if ((error as DOMException)?.name !== 'AbortError') setOpen(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          onClick={(event) => {
            event.preventDefault();
            void onTriggerClick();
          }}
          className="min-h-11 cursor-pointer px-3 text-[#2f5165]"
        >
          <ShareIcon aria-hidden="true" className="size-5" />
          {t('button')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <p className="px-2 pb-1 pt-1 text-xs text-gray-700">{referralCode ? t('withReferral') : t('title')}</p>
        <button
          type="button"
          onClick={() => {
            const text = `${t('shareText', { name })} ${buildUrl()}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
            setOpen(false);
          }}
          className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm text-gray-900 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#3E667D]"
        >
          <ChatBubbleLeftEllipsisIcon aria-hidden="true" className="size-5 text-emerald-700" />
          {t('whatsapp')}
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm text-gray-900 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#3E667D]"
        >
          <ClipboardDocumentIcon aria-hidden="true" className="size-5 text-gray-700" />
          {t('copy')}
        </button>
      </PopoverContent>
    </Popover>
  );
}
