import { Suspense } from 'react';
import ConfirmacionContent from './ConfirmacionContent';

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#7AB82E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Cargando confirmación del pedido...</p>
        </div>
      </div>
    }>
      <ConfirmacionContent />
    </Suspense>
  );
}
