'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Redirigir a la pagina de confirmacion con el session_id de Stripe
    const params = new URLSearchParams();
    if (sessionId) {
      params.set('stripe_session', sessionId);
    }
    const query = params.toString();
    router.replace(`/confirmacion${query ? `?${query}` : ''}`);
  }, [router, sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Procesando pago exitoso...</p>
        <p className="text-gray-400 text-sm mt-2">Redirigiendo a la confirmacion de tu pedido</p>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
