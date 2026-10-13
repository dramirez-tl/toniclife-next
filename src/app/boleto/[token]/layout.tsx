// Boleto público (liga del correo / QR). Sin sesión: el middleware no protege
// /boleto y la página consulta el API público. Título fijo de la pestaña.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Mi boleto — Tonic Life' },
  robots: { index: false, follow: false },
};

export default function BoletoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
