// ViaticosCutoffNotice - Aviso del corte semanal de solicitudes de viáticos
// (Omar, Contabilidad, 10-nov-2026): se reciben a más tardar los jueves a las
// 2:00 p. m. Se muestra arriba de la sección y dentro de "Solicitar viáticos".
// Solo informa: el sistema NO bloquea las solicitudes que lleguen después.

import { ClockIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export const VIATICOS_CUTOFF_TEXT =
  'Las solicitudes de viáticos se reciben a más tardar los jueves a las 2:00 p. m. (hora del centro).';

export function ViaticosCutoffNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900',
        className,
      )}
    >
      <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <p className="font-medium">{VIATICOS_CUTOFF_TEXT}</p>
    </div>
  );
}
