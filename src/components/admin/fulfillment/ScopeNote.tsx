// ScopeNote — "Qué controla esta pantalla" (contrato §7.3-6). Texto fijo: el usuario
// debe saber qué flujos obedecen esta configuración y cuáles no.

import { Check, Info, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ScopeNote() {
  return (
    <Alert role="note">
      <Info aria-hidden />
      <AlertTitle>Qué controla esta pantalla</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-1.5">
          <li className="flex gap-2">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>
              <strong>Sí:</strong> la tienda en línea con envío a domicilio (lo que se ve en el catálogo, el carrito y de
              dónde sale el pedido).
            </span>
          </li>
          <li className="flex gap-2">
            <X aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <strong>No:</strong> recoger en sucursal, el kit de inscripción y el carrito compartido. Esos salen de la
              sucursal que elige el cliente o de la sucursal del distribuidor.
            </span>
          </li>
          <li className="flex gap-2">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              Por ahora un almacén solo surte pedidos de su mismo país (México y Frontera cuentan como el mismo). Puedes
              dejar configurado un envío a otro país, pero todavía no surtirá pedidos.
            </span>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
