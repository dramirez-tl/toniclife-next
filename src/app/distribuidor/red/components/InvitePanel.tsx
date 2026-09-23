'use client';

// InvitePanel — Panel lateral "Enlace de invitación" (contrato
// /distribuidor/red §5.1: misma función que el panel anterior de page.tsx,
// ahora como Sheet: foco atrapado, Escape cierra, aria por radix). Copia o
// comparte el enlace de registro del distribuidor (hooks y toasts de siempre).

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ClipboardDocumentIcon, ShareIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCopyReferralLink, useShareReferralLink } from '@/hooks/useDistributor';

interface InvitePanelProps {
  open: boolean;
  onClose: () => void;
  /** Enlace de registro (vacío mientras carga el perfil). */
  link: string;
}

export function InvitePanel({ open, onClose, link }: InvitePanelProps) {
  const t = useTranslations('distributor.network');
  const copyLinkMutation = useCopyReferralLink();
  const shareLinkMutation = useShareReferralLink();

  const handleCopy = async () => {
    if (!link) return;
    try {
      await copyLinkMutation.mutateAsync(link);
      toast.success(t('toasts.inviteLinkCopied'));
    } catch {
      toast.error(t('toasts.copyError'));
    }
  };

  const handleShare = async () => {
    if (!link) return;
    try {
      const result = await shareLinkMutation.mutateAsync({
        link,
        title: t('toasts.shareTitle'),
        text: t('toasts.shareText'),
      });
      toast.success(result.method === 'clipboard' ? t('toasts.linkCopiedClipboard') : t('toasts.linkShared'));
    } catch {
      toast.error(t('toasts.shareError'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md" aria-label={t('invitePanel.ariaLabel')}>
        <SheetHeader className="border-b border-gray-100">
          <SheetTitle className="text-lg font-bold text-gray-900">{t('invitePanel.title')}</SheetTitle>
          <SheetDescription className="sr-only">{t('invitePanel.howToBody')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="rounded-xl border border-[#a7c1e2]/25 bg-[#C8DDF2]/10 p-4">
            <p className="text-sm font-semibold text-[#3E667D]">{t('invitePanel.howToTitle')}</p>
            <p className="mt-1 text-sm text-gray-600">{t('invitePanel.howToBody')}</p>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('invitePanel.registrationLink')}</p>
            <p className="mt-2 break-all font-mono text-sm text-[#3E667D]">{link || t('invitePanel.loadingLink')}</p>
          </div>

          <div className="mt-4 flex gap-2">
            <Button className="flex-1" onClick={() => void handleCopy()} disabled={!link || copyLinkMutation.isPending}>
              <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
              {t('invitePanel.copy')}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => void handleShare()}
              disabled={!link || shareLinkMutation.isPending}
            >
              <ShareIcon className="h-4 w-4" aria-hidden="true" />
              {t('invitePanel.share')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
