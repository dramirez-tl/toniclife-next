// useCartIncentive.ts - Hook for cart spending tier incentives
// Used on quiz results page to encourage reaching kit price thresholds
'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useCartSummary } from '@/hooks/useCart';
import { cartService } from '@/services/cart.service';

// ================================
// TIER CONFIGURATION
// ================================

export interface IncentiveTier {
  id: string;
  threshold: number;
  label: string;
  emoji: string;
  message: string;
  halfwayMessage: string;
  reachedMessage: string;
}

export const INCENTIVE_TIERS: IncentiveTier[] = [
  {
    id: 'basico',
    threshold: 1577,
    label: 'Kit Básico',
    emoji: '🌱',
    message: 'Agrega {remaining} más para completar tu paquete básico de bienestar.',
    halfwayMessage: '¡Ya llevas más de la mitad! Solo te faltan {remaining} para tu Kit Básico.',
    reachedMessage: '¡Nivel Kit Básico alcanzado! Sigue para impulsar tu negocio.',
  },
  {
    id: 'prosperity',
    threshold: 5000,
    label: 'Kit Prosperity',
    emoji: '🚀',
    message: 'Con {remaining} más, promueves tu negocio y creces más rápido.',
    halfwayMessage: '¡Vas a la mitad del Kit Prosperity! Con esta inversión creces más rápido.',
    reachedMessage: '¡Increíble! Alcanzaste el nivel Kit Prosperity. Tu negocio va en serio.',
  },
];

// ================================
// HOOK RETURN TYPE
// ================================

export interface CartIncentiveState {
  currentTotal: number;
  activeTier: IncentiveTier | null;
  globalProgressPercent: number;
  amountRemaining: number;
  tiers: (IncentiveTier & { reached: boolean; progressPercent: number })[];
  justReachedTier: IncentiveTier | null;
  isVisible: boolean;
  motivationalMessage: string;
}

// ================================
// HOOK
// ================================

export function useCartIncentive(): CartIncentiveState {
  const { data: summary } = useCartSummary();
  const currentTotal = summary ? parseFloat(summary.subtotal) : 0;

  const prevTotalRef = useRef(0);
  const [justReachedTier, setJustReachedTier] = useState<IncentiveTier | null>(null);

  const maxThreshold = INCENTIVE_TIERS[INCENTIVE_TIERS.length - 1].threshold;

  const tiers = useMemo(() => {
    return INCENTIVE_TIERS.map((tier) => ({
      ...tier,
      reached: currentTotal >= tier.threshold,
      progressPercent: Math.min(100, (currentTotal / tier.threshold) * 100),
    }));
  }, [currentTotal]);

  const activeTier = useMemo(() => {
    return INCENTIVE_TIERS.find((t) => currentTotal < t.threshold) ?? null;
  }, [currentTotal]);

  const amountRemaining = activeTier ? activeTier.threshold - currentTotal : 0;

  const globalProgressPercent = Math.min(100, (currentTotal / maxThreshold) * 100);

  // Motivational message based on progress
  const motivationalMessage = useMemo(() => {
    if (!activeTier) {
      return INCENTIVE_TIERS[INCENTIVE_TIERS.length - 1].reachedMessage;
    }

    if (currentTotal === 0) {
      return 'Agrega productos al carrito para empezar a armar tu kit de bienestar.';
    }

    const remaining = cartService.formatCurrency(activeTier.threshold - currentTotal);
    const progress = currentTotal / activeTier.threshold;

    if (progress >= 0.5) {
      return activeTier.halfwayMessage.replace('{remaining}', remaining);
    }

    return activeTier.message.replace('{remaining}', remaining);
  }, [currentTotal, activeTier]);

  // Detect tier crossing for celebration
  useEffect(() => {
    const prevTotal = prevTotalRef.current;
    prevTotalRef.current = currentTotal;

    if (prevTotal === 0 || prevTotal === currentTotal) return;

    for (const tier of INCENTIVE_TIERS) {
      if (prevTotal < tier.threshold && currentTotal >= tier.threshold) {
        setJustReachedTier(tier);
        const timer = setTimeout(() => setJustReachedTier(null), 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentTotal]);

  // Always visible on quiz results — shows goal even at $0
  const isVisible = true;

  return {
    currentTotal,
    activeTier,
    globalProgressPercent,
    amountRemaining,
    tiers,
    justReachedTier,
    isVisible,
    motivationalMessage,
  };
}
