'use client';

import Link from 'next/link';

interface CategoryTile {
  label: string;
  href: string;
  image: string;
  /** clases de posicionamiento dentro del grid en lg */
  area: string;
}

/**
 * Mosaico tipo bento de la sección "Nuestros productos" (propuesta 2026).
 * 4 mosaicos pequeños (2x2) a la izquierda + 1 mosaico alto a la derecha.
 * Las imágenes viven como background para tener fallback de color mientras se suben.
 */
const tiles: CategoryTile[] = [
  {
    label: 'Cuidado Digestivo',
    href: '/productos?categoria=sistema-digestivo',
    image: '/images/landing/cat-digestivo.jpg',
    area: 'lg:col-start-1 lg:row-start-1',
  },
  {
    label: 'Vitaminas y nutrientes',
    href: '/productos?categoria=energia-vitalidad',
    image: '/images/landing/cat-vitaminas.jpg',
    area: 'lg:col-start-2 lg:row-start-1',
  },
  {
    label: 'Belleza y Cuidado personal',
    href: '/productos?categoria=belleza-cuidado',
    image: '/images/landing/cat-belleza.jpg',
    area: 'lg:col-start-3 lg:row-start-1 lg:row-span-2',
  },
  {
    label: 'Cuidado general',
    href: '/productos?categoria=sistema-inmunologico',
    image: '/images/landing/cat-general.jpg',
    area: 'lg:col-start-1 lg:row-start-2',
  },
  {
    label: 'Batidos y malteadas',
    href: '/productos?categoria=control-de-peso',
    image: '/images/landing/cat-batidos.jpg',
    area: 'lg:col-start-2 lg:row-start-2',
  },
];

export function ProductCategoriesBento() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-3xl font-bold text-[#3E667D] sm:text-4xl">
          Nuestros productos
        </h2>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-[1.1fr_1.1fr_1.5fr] lg:auto-rows-[210px]">
          {tiles.map((tile) => {
            const isTall = tile.area.includes('row-span-2');
            return (
              <Link
                key={tile.label}
                href={tile.href}
                className={`group relative overflow-hidden rounded-2xl ${tile.area} ${
                  isTall
                    ? 'col-span-2 min-h-[280px] lg:col-span-1 lg:min-h-0'
                    : 'min-h-[150px] lg:min-h-0'
                }`}
              >
                {/* Imagen (fallback: teal) */}
                <div
                  className="absolute inset-0 bg-[#3E667D] bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${tile.image}')` }}
                />
                {/* Degradado para legibilidad del label */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                {/* Label */}
                <h3 className="absolute bottom-4 left-4 right-4 text-xl font-bold leading-tight text-white drop-shadow">
                  {tile.label}
                </h3>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
