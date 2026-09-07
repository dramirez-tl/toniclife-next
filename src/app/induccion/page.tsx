// Página pública "Taller de Inducción" (/induccion e induccion.<dominio>).
// Server component delgado: fija título y viewport (viewport-fit=cover para
// que el botón sticky respete la safe-area del iPhone), toma el número de
// distribuidor del asistente de la invitación (?id=NUMERO; ?p= se acepta como
// alias por compatibilidad con enlaces ya compartidos) y renderiza el
// formulario cliente. La lógica del formulario vive en
// components/public-forms/InduccionForm.tsx.

import type { Metadata, Viewport } from 'next';
import { InduccionForm } from '@/components/public-forms/InduccionForm';

export const metadata: Metadata = {
  title: 'Taller de Inducción | Tonic Life',
  description:
    'Registro para el Taller de Inducción de Tonic Life. Completa tus datos y entra a la transmisión en vivo.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Android Chrome: con el teclado abierto se reduce el viewport de layout, así
  // la barra sticky del botón principal se acomoda encima del teclado en vez
  // de quedar tapada o flotar a media pantalla al escribir el número.
  interactiveWidget: 'resizes-content',
  themeColor: '#e0f2fe',
};

type InduccionPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Primer valor de un query param (Next entrega arreglo si viene repetido). */
const firstParam = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export default async function InduccionPage({ searchParams }: InduccionPageProps) {
  const params = await searchParams;
  // ?id= es el parámetro oficial; ?p= se conserva como alias para los enlaces
  // que ya se compartieron antes del cambio. Se usa || (no ??) para que un
  // ?id= vacío no tape un ?p= con valor.
  const raw = firstParam(params.id) || firstParam(params.p);
  // Saneado en el servidor: solo dígitos, máximo 20 (mismo límite que la API).
  const initialMemberNumber = (raw ?? '').replace(/\D/g, '').slice(0, 20);

  return <InduccionForm initialMemberNumber={initialMemberNumber} />;
}
