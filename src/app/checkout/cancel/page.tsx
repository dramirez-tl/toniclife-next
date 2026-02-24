'use client';

import Link from 'next/link';
import { XCircle, ShoppingCart, ArrowLeft } from 'lucide-react';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pago cancelado
        </h1>

        <p className="text-gray-600 mb-8">
          Tu pago no fue procesado. No se ha realizado ningun cargo a tu tarjeta.
          Tu carrito sigue disponible para cuando estes listo.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/carrito"
            className="inline-flex items-center justify-center gap-2 bg-[#7AB82E] hover:bg-[#6aa025] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Volver al carrito
          </Link>

          <Link
            href="/tienda"
            className="inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 font-medium py-3 px-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
