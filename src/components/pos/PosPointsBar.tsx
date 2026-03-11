// components/pos/PosPointsBar.tsx - Barra de progreso de puntos personales en POS
'use client';

import { useQuery } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { StarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface PosPointsBarProps {
  customerId: string;
  cartPoints: number;
}

const THRESHOLD = 3300;

export function PosPointsBar({ customerId, cartPoints }: PosPointsBarProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-period-stats', customerId],
    queryFn: () => customersService.getCustomerPeriodStats(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="px-3 py-2 bg-purple-50/60 border border-purple-100 rounded-lg">
        <div className="h-2.5 bg-purple-100 rounded-full animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const currentPoints = data.personalPoints;
  const totalWithCart = currentPoints + cartPoints;
  const isAlreadyQualified = currentPoints >= THRESHOLD;
  const willQualifyWithCart = !isAlreadyQualified && totalWithCart >= THRESHOLD;

  // Progress bar values (capped at 100%)
  const currentPct = Math.min((currentPoints / THRESHOLD) * 100, 100);
  const cartPct = isAlreadyQualified ? 0 : Math.min(((Math.min(totalWithCart, THRESHOLD) - currentPoints) / THRESHOLD) * 100, 100 - currentPct);

  const fmt = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

  return (
    <div className={`px-3 py-2.5 rounded-lg border text-xs ${
      isAlreadyQualified
        ? 'bg-green-50 border-green-200'
        : willQualifyWithCart
          ? 'bg-purple-50 border-purple-200'
          : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1 font-medium text-gray-700">
          <StarIcon className="h-3.5 w-3.5 text-purple-500" />
          <span>Puntos personales</span>
          {data.periodName && (
            <span className="text-gray-400 font-normal">· {data.periodName}</span>
          )}
        </div>
        {isAlreadyQualified ? (
          <span className="flex items-center gap-1 text-green-600 font-semibold">
            <CheckCircleIcon className="h-3.5 w-3.5" />
            Calificado
          </span>
        ) : willQualifyWithCart ? (
          <span className="text-purple-600 font-semibold">¡Califica con esta compra!</span>
        ) : (
          <span className="text-gray-500">
            Faltan <span className="font-semibold text-gray-700">{fmt(THRESHOLD - totalWithCart)}</span> pts
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 bg-gray-200 rounded-full overflow-hidden">
        {/* Current points (solid) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            isAlreadyQualified ? 'bg-green-500' : 'bg-purple-500'
          }`}
          style={{ width: `${currentPct}%` }}
        />
        {/* Cart points (stripe pattern overlay) */}
        {cartPct > 0 && (
          <div
            className="absolute inset-y-0 rounded-full bg-purple-300"
            style={{ left: `${currentPct}%`, width: `${cartPct}%` }}
          />
        )}
        {/* Threshold marker at 100% */}
        <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-400/60" />
      </div>

      {/* Points row */}
      <div className="flex items-center justify-between mt-1.5 text-gray-500">
        <span>
          <span className={`font-semibold ${isAlreadyQualified ? 'text-green-600' : 'text-purple-600'}`}>
            {fmt(currentPoints)}
          </span>
          {cartPoints > 0 && !isAlreadyQualified && (
            <span className="text-purple-400"> + {fmt(cartPoints)} del carrito</span>
          )}
        </span>
        <span className="font-medium">{fmt(THRESHOLD)} meta</span>
      </div>
    </div>
  );
}
