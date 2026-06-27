// app/checkout/page.tsx - Checkout page with Suspense boundary for useSearchParams
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce
import { Suspense } from 'react';
import CheckoutContent from './CheckoutContent';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D]"></div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
