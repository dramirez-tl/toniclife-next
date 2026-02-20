'use client';

import Link from 'next/link';
import { ShieldCheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PermissionGuard } from '@/components/auth';

export default function SeguridadPage() {
  return (
    <PermissionGuard roles={['super_admin']}>
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <ShieldCheckIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Seguridad</h1>
              <p className="text-white/70">Configuracion de seguridad del sistema</p>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al Panel Principal
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Modulo en Desarrollo</h2>
          <p className="text-gray-500 max-w-md">
            El modulo de seguridad (backups, configuracion de seguridad y eventos) se encuentra en desarrollo.
            Los endpoints del backend aun no han sido implementados.
          </p>
        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}
