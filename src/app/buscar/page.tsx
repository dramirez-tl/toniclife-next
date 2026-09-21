import { permanentRedirect } from 'next/navigation';

// /buscar era una pantalla de maqueta con productos ficticios. La búsqueda real
// vive en el catálogo: se redirige de forma permanente conservando el término.
// El destino va SIN prefijo de locale a propósito: el middleware de next-intl lo
// completa con el país/idioma del visitante (cookie NEXT_LOCALE), de modo que el
// 308 cacheable no amarra a nadie a un país.
export default async function BuscarRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? '').trim().slice(0, 80);
  permanentRedirect(q ? `/productos?q=${encodeURIComponent(q)}` : '/productos');
}
