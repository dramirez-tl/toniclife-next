'use client';

// MemberSheet — Ficha del socio (contrato /distribuidor/red §5.7): Sheet
// lateral en escritorio e inferior en móvil, con GET network/member/:id (ya
// guardado por pertenencia en el API: 404 NET_NOT_IN_NETWORK fuera de mi red).
// No expone más que hoy: nombre, número, contacto, alta, estado, rango y su
// red (directos, total, niveles hasta 7). Lo del PERIODO (puntos, rango del
// periodo, nivel relativo, colocado bajo) llega como `context` desde la fila
// que abrió la ficha (explorador o lista), que ya lo trae del periodo elegido.
// Sin edición. Escape cierra (radix).

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowRightCircleIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useNetworkStats } from '@/hooks/useNetwork';
import { whatsAppUrl } from '@/lib/network/contact';
import { fmtDate, fmtInt, fmtPoints } from '@/lib/network/format';
import { networkErrorKey } from '@/lib/network/network-error';
import { Avatar, RankChip, StatusChip } from './NetworkBadges';

/** Lo que la fila que abre la ficha ya sabe del periodo elegido. */
export interface MemberSheetContext {
  memberId?: string | null;
  fullName?: string | null;
  customerNumber?: string | null;
  /** Nivel relativo a mí. */
  level?: number | null;
  personalPoints?: number | null;
  groupPoints?: number | null;
  rankName?: string | null;
  rankNumber?: number | null;
  /** Nombre del nodo bajo el que está colocado (parent), si se conoce. */
  placedUnderName?: string | null;
  sponsorName?: string | null;
}

interface MemberSheetProps {
  /** customers.id del socio; null = cerrada. */
  customerId: string | null;
  context: MemberSheetContext | null;
  onClose: () => void;
  onOpenLine: (memberId: string) => void;
  onSeeList: (memberId: string) => void;
}

export function MemberSheet({ customerId, context, onClose, onOpenLine, onSeeList }: MemberSheetProps) {
  const t = useTranslations('distributor.network.member');
  const tNet = useTranslations('distributor.network');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const open = Boolean(customerId);
  const { data, isLoading, error } = useNetworkStats(customerId ?? '', open);

  const fullName = data ? `${data.firstName} ${data.lastName}`.trim() : (context?.fullName ?? '');
  const code = data?.code ?? context?.customerNumber ?? null;
  const sponsorName = data?.sponsorName ?? context?.sponsorName ?? null;
  const placedUnder = context?.placedUnderName ?? null;
  const wa = whatsAppUrl(data?.phone);
  const memberId = context?.memberId ?? null;

  const copyPhone = async () => {
    if (!data?.phone) return;
    try {
      await navigator.clipboard.writeText(data.phone);
      toast.success(t('copyPhone'));
    } catch {
      toast.error(tNet('errors.generic'));
    }
  };

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-right text-sm font-semibold tabular-nums text-gray-900">{value}</dd>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={`overflow-y-auto ${isMobile ? 'max-h-[88vh] rounded-t-2xl' : 'w-full sm:max-w-md'}`}
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('title')}</SheetTitle>
          <div className="flex items-center gap-3">
            <Avatar name={fullName || '?'} className="h-11 w-11 text-sm" />
            <div className="min-w-0">
              <SheetDescription className="truncate text-base font-bold text-gray-900">{fullName || '…'}</SheetDescription>
              {code && <p className="text-xs text-gray-500">{t('code', { code })}</p>}
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('loading')}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {t('error')} {tNet(networkErrorKey(error))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Posición en mi red */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                {typeof context?.level === 'number' && (
                  <span className="rounded-full bg-[#3E667D]/10 px-2 py-0.5 font-medium text-[#3E667D]">
                    {t('level', { level: context.level })}
                  </span>
                )}
                {data && <StatusChip status={data.status} />}
                {data && <RankChip rankName={context?.rankName ?? data.rankLabel} rankNumber={context?.rankNumber} />}
              </div>
              <div className="space-y-0.5 text-sm text-gray-700">
                {placedUnder && <p>{t('placedUnder', { name: placedUnder })}</p>}
                {sponsorName && sponsorName !== placedUnder && <p>{t('sponsor', { name: sponsorName })}</p>}
                {data?.joinDate && <p className="text-gray-500">{t('since', { date: fmtDate(data.joinDate, locale) })}</p>}
              </div>

              {/* Contacto */}
              <section aria-labelledby="member-contact">
                <h4 id="member-contact" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t('contact')}
                </h4>
                <p className="mt-1 break-all text-sm text-gray-800">{data?.email || <span className="text-gray-400">{t('noEmail')}</span>}</p>
                <p className="text-sm text-gray-800">{data?.phone || <span className="text-gray-400">{t('noPhone')}</span>}</p>
              </section>

              {/* Este periodo (del contexto de la fila: periodo elegido) */}
              {context && (context.personalPoints != null || context.groupPoints != null || context.rankName) && (
                <section aria-labelledby="member-period">
                  <h4 id="member-period" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('thisPeriod')}
                  </h4>
                  <dl className="mt-1 divide-y divide-gray-100">
                    {context.personalPoints != null && row(t('personalPoints'), fmtPoints(context.personalPoints, locale))}
                    {context.groupPoints != null && row(t('groupPoints'), fmtPoints(context.groupPoints, locale))}
                    {context.rankName && row(t('rank'), context.rankName)}
                  </dl>
                </section>
              )}

              {/* Su red */}
              {data && (
                <section aria-labelledby="member-network">
                  <h4 id="member-network" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('network')}
                  </h4>
                  <dl className="mt-1 divide-y divide-gray-100">
                    {row(t('directs'), fmtInt(data.stats.directCount, locale))}
                    {row(t('total'), fmtInt(data.stats.networkCount, locale))}
                    {row(t('maxLevel'), fmtInt(data.stats.maxDepth, locale))}
                  </dl>
                  <p className="mt-1 text-xs text-gray-400">{t('networkNote')}</p>
                </section>
              )}

              {/* Acciones */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {memberId && (
                  <Button variant="outline" size="sm" onClick={() => onOpenLine(memberId)}>
                    <ArrowRightCircleIcon className="h-4 w-4" aria-hidden="true" />
                    {t('openLine')}
                  </Button>
                )}
                {memberId && (
                  <Button variant="outline" size="sm" onClick={() => onSeeList(memberId)}>
                    <ListBulletIcon className="h-4 w-4" aria-hidden="true" />
                    {t('seeList')}
                  </Button>
                )}
                {data?.phone && (
                  <Button variant="outline" size="sm" onClick={() => void copyPhone()}>
                    <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                    {t('copyPhone')}
                  </Button>
                )}
                {wa && (
                  <Button asChild size="sm" className="bg-[#3E667D] text-white hover:bg-[#2f5165]">
                    <a href={wa} target="_blank" rel="noopener noreferrer">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden="true" />
                      {t('whatsapp')}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
