'use client';

// Gating del panel del distribuidor (dos puertas, en orden):
//  1) needsKit: un miembro nace 'pending' y DEBE comprar su kit de inscripción.
//     Mientras needsKit=true lo mandamos a /distribuidor/inscripcion.
//  2) needsTerms: tras pagar el kit, DEBE aceptar los términos antes de usar el
//     panel → /distribuidor/terminos.
// Para distribuidores activos (kit pagado + términos aceptados / migrados) y para
// staff/admin (sin perfil de cliente, la consulta falla) NO se bloquea nada.

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/useMyOrders';

const INSCRIPCION_PATH = '/distribuidor/inscripcion';
const TERMINOS_PATH = '/distribuidor/terminos';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, isError } = useOnboardingStatus();

  const needsKit = data?.needsKit === true;
  const needsTerms = data?.needsTerms === true;
  const onInscripcion = pathname === INSCRIPCION_PATH;
  const onTerminos = pathname === TERMINOS_PATH;

  useEffect(() => {
    if (!data) return;
    // 1) Pendiente de kit fuera de la inscripción → mandarlo a inscribirse.
    if (needsKit && !onInscripcion) {
      router.replace(INSCRIPCION_PATH);
      return;
    }
    // 2) Kit pagado pero faltan términos → a la pantalla de términos.
    //    Excluimos /inscripcion: si vuelve de Stripe (orderId), su pantalla de
    //    "confirmando pago" hace el hand-off a /terminos; no interferimos.
    if (!needsKit && needsTerms && !onTerminos && !onInscripcion) {
      router.replace(TERMINOS_PATH);
      return;
    }
    // Ya activo + términos OK pero en una pantalla de onboarding (visita manual) →
    // de vuelta al panel. En /inscripcion respetamos la confirmación post-pago.
    if (!needsKit && !needsTerms) {
      if (onTerminos) {
        router.replace('/distribuidor');
        return;
      }
      if (onInscripcion) {
        const hasOrderParam =
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).has('orderId');
        if (!hasOrderParam) router.replace('/distribuidor');
      }
    }
  }, [data, needsKit, needsTerms, onInscripcion, onTerminos, router]);

  // Primera carga (sin dato ni error): evitar el flash del panel a un pendiente.
  if (isLoading && !data && !isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#3E667D]" />
      </div>
    );
  }

  // En proceso de redirección (kit/términos): no pintamos el panel mientras tanto.
  const redirectingForKit = needsKit && !onInscripcion;
  const redirectingForTerms =
    !needsKit && needsTerms && !onTerminos && !onInscripcion;
  if (redirectingForKit || redirectingForTerms) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#3E667D]" />
      </div>
    );
  }

  return <>{children}</>;
}
