// Boleto público de un invitado a un evento privado (liga de la invitación / QR).
// Sin sesión: el middleware no protege /invitacion y la página consulta el API
// público. Título fijo de la pestaña; no se indexa.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Mi boleto — Tonic Life' },
  robots: { index: false, follow: false },
};

export default function InvitacionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
