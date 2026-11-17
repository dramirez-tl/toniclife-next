// useSelfInvoicingAvailable.ts - ¿Se ofrece "Mis facturas" en el portal del distribuidor?
// Solo con la función encendida (Admin › Sistema › Piloto) y a cuentas de México: el CFDI
// es de México. Mientras no llega el estado, o si el API aún no conoce la función, no se
// ofrece (igual que los demás interruptores del piloto).
import { usePilotPublicState } from '@/hooks/usePilot';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';

export function useSelfInvoicingAvailable(): boolean {
  const { data } = usePilotPublicState();
  const user = useAppSelector(selectUser);
  const country = (user?.countryCode ?? 'MX').toUpperCase();
  return data?.selfInvoicing?.enabled === true && country === 'MX';
}
