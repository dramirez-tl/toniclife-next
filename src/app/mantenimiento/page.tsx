// /mantenimiento - Mensaje de producción mientras llega el lanzamiento del
// sitio nuevo (lunes 2 de noviembre de 2026, 6:00 a. m. CDMX). Es el mismo
// mensaje "Estamos trabajando para ti" que tenía la rama main (28-oct-2026),
// con los botones al sitio anterior y un contador; al llegar la hora el
// candado del middleware (LAUNCH_DATE) se apaga solo y la página redirige al
// inicio. Metadata aquí (servidor); el contador es cliente (CountdownContent).

import type { Metadata } from 'next';
import { resolveLaunchAt } from '@/lib/launch-countdown';
import { CountdownContent } from './CountdownContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Muy pronto · Tonic Life',
  description: 'Estamos trabajando para ti. Muy pronto tendrás una mejor experiencia.',
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  // NEXT_PUBLIC_LAUNCH_DATE manda; sin ella, la fecha de código (2-nov-2026).
  const launchAt = resolveLaunchAt(process.env.NEXT_PUBLIC_LAUNCH_DATE);
  return <CountdownContent launchAt={launchAt} />;
}
