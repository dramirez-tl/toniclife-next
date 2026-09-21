// Marco de la tienda (/productos y /productos/[slug]): header fijo, espaciador y
// footer. Vive en el LAYOUT (y no en cada página) para quedar FUERA del Suspense
// de `loading.tsx`: el Header depende del estado de sesión del cliente y, si se
// hidrata tarde dentro de un boundary en streaming, React detecta un desajuste de
// hidratación. Aquí se hidrata con el cascarón, igual que en el home.

import { Header, Footer } from '@/components/layout';

export default function StorefrontProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {/* Espaciador para el header fijo (barra superior + nav) */}
      <div className="h-28 lg:h-32" />
      <main>{children}</main>
      <Footer />
    </>
  );
}
