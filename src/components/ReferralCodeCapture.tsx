/**
 * Componente para capturar el código de referido de la URL
 *
 * Este componente debe incluirse en el layout principal para que
 * capture el código de referido cuando un visitante llega a cualquier
 * página de la tienda con un enlace como:
 * - https://toniclife.com?ref=TL-MX-00234
 * - https://toniclife.com/productos?ref=TL-MX-00234
 *
 * El código se guarda en localStorage y se usa automáticamente en checkout
 */

'use client';

import { Suspense } from 'react';
import { useReferralCode } from '@/hooks/useReferralCode';

function ReferralCodeCaptureInner() {
  // Este hook captura y guarda el código automáticamente
  useReferralCode();

  // No renderiza nada visible
  return null;
}

export function ReferralCodeCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCodeCaptureInner />
    </Suspense>
  );
}
