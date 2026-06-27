'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

function SuccessContent() {
  const t = useTranslations('checkout');
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // Redirigir a la confirmacion con el orderId (Stripe lo incluye en el
    // success_url) y el session_id. La confirmación usa el orderId para mostrar
    // el pedido; el pago se confirma server-side vía webhook de Stripe.
    const params = new URLSearchParams();
    if (orderId) {
      params.set('orderId', orderId);
    }
    if (sessionId) {
      params.set('stripe_session', sessionId);
    }
    const query = params.toString();
    router.replace(`/confirmacion${query ? `?${query}` : ''}`);
  }, [router, sessionId, orderId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-lg">{t('successProcessing')}</p>
        <p className="text-gray-400 text-sm mt-2">{t('successRedirecting')}</p>
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
