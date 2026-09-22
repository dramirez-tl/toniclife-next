'use client';

// ProductFormContext — contrato entre el cascarón de la ficha y sus secciones.
//
// Cada sección se REGISTRA con `save` / `discard` (y `collectCreate` en el alta)
// y avisa cuándo tiene cambios. El cascarón pinta el punto ámbar, la barra de
// "cambios sin guardar", el "Guardar todo" secuencial y el guard de salida.

import { createContext, useContext } from 'react';
import type { CreateProductDto } from '@/types/product';
import type { AdminProduct, AdminUpdateProductDto } from '@/services/products-admin.service';
import type { ProductSectionId } from '../lib/labels';

export interface SectionHandle {
  /** Guarda la sección. `true` = guardada (o sin cambios); `false` = inválida, cancelada o con error. */
  save: () => Promise<boolean>;
  discard: () => void;
  /** Solo alta: valida y devuelve su parte del POST /products (null = inválida). */
  collectCreate?: () => Promise<Partial<CreateProductDto> | null>;
}

export interface ProductFormContextValue {
  mode: 'create' | 'edit';
  /** Vacío en el alta. */
  productId: string;
  product: AdminProduct | null;
  /** Sin `products:update` (o `products:create` en el alta) la ficha es de solo lectura. */
  readOnly: boolean;
  /**
   * La sección Kit está en la ficha (kit/paquete, o alta con `?tipo=kit`): la
   * posición, cómo se surte y los canales del kit se editan AHÍ, no en
   * Información básica ni en Clasificación y tienda.
   */
  hasKitSection: boolean;
  /** Alta: tipo preseleccionado por `?tipo=` (p. ej. `kit`); null si no viene. */
  createType: string | null;
  /** Abre el diálogo Desactivar / Reactivar del encabezado (solo ficha). */
  requestToggleActive?: () => void;
  /** PATCH /products/:id con `expectedUpdatedAt`; actualiza caché, derivados y tienda. */
  patchProduct: (dto: AdminUpdateProductDto) => Promise<AdminProduct>;
  /** Para escrituras que NO pasan por `patchProduct` (precios, imágenes, contenido…). */
  notifyWrite: () => void;
  registerSection: (id: ProductSectionId, handle: SectionHandle) => () => void;
  setSectionDirty: (id: ProductSectionId, dirty: boolean) => void;
  goToSection: (id: ProductSectionId) => void;
}

export const ProductFormContext = createContext<ProductFormContextValue | null>(null);

export function useProductForm(): ProductFormContextValue {
  const ctx = useContext(ProductFormContext);
  if (!ctx) throw new Error('useProductForm debe usarse dentro de <ProductFormShell>');
  return ctx;
}
