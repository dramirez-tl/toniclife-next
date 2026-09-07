// Página pública "Taller de Inducción" (/induccion e induccion.<dominio>).
// Server component delgado: fija título y viewport (viewport-fit=cover para
// que el botón sticky respete la safe-area del iPhone), toma el número de
// patrocinador de la invitación (?p=NUMERO) y renderiza el formulario cliente.
// La lógica del formulario vive en components/public-forms/InduccionForm.tsx.

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

export default async function InduccionPage({ searchParams }: InduccionPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.p) ? params.p[0] : params.p;
  // Saneado en el servidor: solo dígitos, máximo 20 (mismo límite que la API).
  const initialSponsorNumber = (raw ?? '').replace(/\D/g, '').slice(0, 20);

  return <InduccionForm initialSponsorNumber={initialSponsorNumber} />;
}
