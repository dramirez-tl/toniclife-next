'use client';

import { useState, useEffect } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  GiftIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  useCartIncentive,
  INCENTIVE_TIERS,
} from '@/hooks/useCartIncentive';
import { cartService } from '@/services/cart.service';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CartIncentiveBarProps {
  variant?: 'floating' | 'inline';
  className?: string;
}

const MAX_THRESHOLD = INCENTIVE_TIERS[INCENTIVE_TIERS.length - 1].threshold;

// Position of each tier marker as a percentage of the full bar
function tierPosition(threshold: number): number {
  return (threshold / MAX_THRESHOLD) * 100;
}

export function CartIncentiveBar({ variant = 'inline', className }: CartIncentiveBarProps) {
  const {
    currentTotal,
    activeTier,
    globalProgressPercent,
    amountRemaining,
    tiers,
    justReachedTier,
    isVisible,
    motivationalMessage,
  } = useCartIncentive();

  const [isExpanded, setIsExpanded] = useState(false);
  const [celebrated, setCelebrated] = useState<string | null>(null);

  // Fire toast when a tier is reached
  useEffect(() => {
    if (justReachedTier && justReachedTier.id !== celebrated) {
      setCelebrated(justReachedTier.id);
      toast.success(`${justReachedTier.emoji} ${justReachedTier.reachedMessage}`);
    }
  }, [justReachedTier, celebrated]);

  if (!isVisible) return null;

  // Shared progress bar content
  const progressBarContent = (
    <div className="space-y-3">
      {/* Current amount */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#3E667D]">
          {cartService.formatCurrency(currentTotal)}
        </span>
        {activeTier && (
          <span className="text-gray-500">
            de {cartService.formatCurrency(activeTier.threshold)}
          </span>
        )}
      </div>

      {/* Progress bar track */}
      <div className="relative">
        <div
          className={cn(
            'h-3 bg-gray-200 rounded-full overflow-hidden',
            justReachedTier && 'animate-celebrate-glow',
          )}
          role="progressbar"
          aria-valuenow={currentTotal}
          aria-valuemin={0}
          aria-valuemax={MAX_THRESHOLD}
          aria-label="Progreso de compra"
        >
          {/* Fill */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#C8DDF2] via-[#abc9ba] to-[#3E667D] transition-all duration-700 ease-out"
            style={{ width: `${globalProgressPercent}%` }}
          />
        </div>

        {/* Milestone markers — barras verticales tipo "hito" (los círculos
            grandes se leían como perillas de un slider deshabilitado) */}
        {tiers.map((tier) => {
          const pos = tierPosition(tier.threshold);
          return (
            <div
              key={tier.id}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${pos}%` }}
            >
              <div
                className={cn(
                  'w-1.5 h-5 rounded-full ring-2 ring-white transition-all duration-300',
                  tier.reached ? 'bg-[#3E667D]' : 'bg-gray-300',
                  justReachedTier?.id === tier.id && 'animate-bounce',
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Tier labels — los hitos cercanos a los bordes se anclan al borde en
          vez de centrarse en su % (la última etiqueta caía en 100% y se
          cortaba fuera de la tarjeta: "Kit Prosp…") */}
      <div className="relative h-5">
        {tiers.map((tier) => {
          const pos = tierPosition(tier.threshold);
          const nearRight = pos > 82;
          const nearLeft = pos < 18;
          return (
            <div
              key={tier.id}
              className={cn(
                'absolute',
                nearRight
                  ? 'right-0 text-right'
                  : nearLeft
                    ? 'left-0 text-left'
                    : '-translate-x-1/2 text-center',
              )}
              style={nearRight || nearLeft ? undefined : { left: `${pos}%` }}
            >
              <span
                className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  tier.reached ? 'text-[#3E667D]' : 'text-gray-400',
                )}
              >
                {tier.emoji} {tier.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Motivational message */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {motivationalMessage}
      </p>
    </div>
  );

  // ============================================
  // FLOATING variant (mobile bottom bar)
  // ============================================
  if (variant === 'floating') {
    return (
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]',
          'transition-all duration-300',
          className,
        )}
      >
        {/* Collapsed bar */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          aria-expanded={isExpanded}
          aria-controls="incentive-expanded"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base flex-shrink-0">
              {activeTier?.emoji || '🎉'}
            </span>
            <span className="text-sm font-medium text-[#3E667D] truncate">
              {activeTier
                ? `Te faltan ${cartService.formatCurrency(amountRemaining)} para ${activeTier.label}`
                : '¡Todos los niveles alcanzados!'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mini progress indicator */}
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#abc9ba] to-[#3E667D] transition-all duration-500"
                style={{ width: `${globalProgressPercent}%` }}
              />
            </div>
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronUpIcon className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        <div
          id="incentive-expanded"
          className={cn(
            'overflow-hidden transition-all duration-300',
            isExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="px-4 pb-4">
            {progressBarContent}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // INLINE variant (desktop sticky sidebar)
  // ============================================
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden',
        justReachedTier && 'animate-celebrate-glow',
        className,
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#3E667D] to-[#3E667D]/85 text-white">
        <div className="flex items-center gap-2">
          <GiftIcon className="h-5 w-5" />
          <h3 className="font-semibold text-sm">Tu Progreso de Compra</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {progressBarContent}

        {/* Tier reached cards */}
        {tiers.map(
          (tier) =>
            tier.reached && (
              <div
                key={tier.id}
                className="mt-3 flex items-center gap-2 p-2.5 bg-[#C8DDF2]/10 rounded-lg"
              >
                <CheckCircleIcon className="h-4 w-4 text-[#3E667D] flex-shrink-0" />
                <span className="text-xs text-[#3E667D] font-medium">
                  {tier.emoji} {tier.label} alcanzado
                </span>
              </div>
            ),
        )}

        {/* Next level teaser */}
        {activeTier && activeTier.id === 'prosperity' && (
          <div className="mt-4 p-3 bg-gradient-to-r from-[#f5f7e7] to-[#e1eabc] rounded-lg">
            <div className="flex items-start gap-2">
              <RocketLaunchIcon className="h-4 w-4 text-[#3E667D] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#2f5165] leading-relaxed">
                Con una compra de{' '}
                <strong>{cartService.formatCurrency(5000)}</strong> promueves
                más tu negocio y creces más rápido como distribuidor.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
