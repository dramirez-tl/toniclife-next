'use client';

// Gating del panel del distribuidor: un miembro recién dado de alta nace
// 'pending' y DEBE comprar su kit de inscripción antes de usar el panel. Mientras
// needsKit=true lo mandamos a /distribuidor/inscripcion. Para distribuidores
// activos (kit ya pagado / migrados) y para staff/admin (sin perfil de cliente,
// la consulta falla) NO se bloquea nada.

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/useMyOrders';

const INSCRIPCION_PATH = '/distribuidor/inscripcion';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, isError } = useOnboardingStatus();

  const needsKit = data?.needsKit === true;
  const onInscripcion = pathname === INSCRIPCION_PATH;

  useEffect(() => {
    if (!data) return;
    // Pendiente de kit fuera de la inscripción → mandarlo a inscribirse.
    if (needsKit && !onInscripcion) {
      router.replace(INSCRIPCION_PATH);
      return;
    }
    // Ya activo pero en la inscripción (visita manual, sin volver de Stripe) →
    // de vuelta al panel. La confirmación post-pago (orderId en la URL) la
    // maneja la propia página de inscripción, así que no interferimos ahí.
    if (!needsKit && onInscripcion) {
      const hasOrderParam =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('orderId');
      if (!hasOrderParam) router.replace('/distribuidor');
    }
  }, [data, needsKit, onInscripcion, router]);

  // Primera carga (sin dato ni error): evitar el flash del panel a un pendiente.
  if (isLoading && !data && !isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#3E667D]" />
      </div>
    );
  }

  // Pendiente fuera de inscripción: no pintamos el panel mientras redirige.
  if (needsKit && !onInscripcion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#3E667D]" />
      </div>
    );
  }

  return <>{children}</>;
}
