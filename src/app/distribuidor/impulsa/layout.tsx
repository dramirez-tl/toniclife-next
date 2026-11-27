import type { ReactNode } from 'react';

// IMPULSA es una sección aparte del panel del distribuidor, separada de RISE Academy y con su propia
// marca. Todo lo que se pinta aquí adentro toma sus colores (ver `.impulsa` en globals.css).
export default function ImpulsaLayout({ children }: { children: ReactNode }) {
  return <div className="impulsa">{children}</div>;
}
