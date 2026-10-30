// Types for product families, variants and size guides (mig 178, 30-oct-2026)
// Ref: toniclife-api/src/modules/products/families/product-families.dto.ts
//
// Una FAMILIA agrupa productos hermanos (la playera rosa en CH, M, G…); cada
// producto es UNA variante con género, color y talla (campos en `Product`).
// Una GUÍA DE TALLAS es la tabla de medidas que la tienda muestra junto al
// selector; una guía sin filas no se muestra.

import type { VariantGender } from './product';

export const SIZE_GUIDE_UNITS = ['cm', 'in'] as const;
export type SizeGuideUnit = (typeof SIZE_GUIDE_UNITS)[number];

// ================================
// FAMILIAS
// ================================
export interface ProductFamily {
  id: string;
  /** Clave corta (se guarda en MAYÚSCULAS): PLR, SDN… */
  code: string;
  name: string;
  nameEn: string | null;
  sizeGuideId: string | null;
  sizeGuideName: string | null;
  isActive: boolean;
  sortOrder: number;
  /** Productos de la familia (activos o no). */
  variantCount: number;
  activeVariantCount: number;
  /** Géneros, colores y tallas de las variantes ACTIVAS (tallas en orden de talla). */
  genders: string[];
  colors: string[];
  sizes: string[];
  createdAt: string;
  updatedAt: string;
}

/** Una variante (producto) de la familia, para la tabla del admin. */
export interface FamilyVariant {
  id: string;
  code: string;
  name: string;
  slug: string | null;
  isActive: boolean;
  /** A quién se vende en línea (`none` | `members` | `public`). */
  onlineAudience: string;
  variantGender: VariantGender | null;
  variantColor: string | null;
  variantColorHex: string | null;
  variantSize: string | null;
  /** Existencia disponible sumada en todas las sucursales. */
  stockTotal: number;
  imageUrl: string | null;
}

export interface CreateProductFamilyDto {
  /** `/^[A-Za-z0-9_-]{2,40}$/` */
  code: string;
  name: string;
  nameEn?: string | null;
  sizeGuideId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateProductFamilyDto = Partial<CreateProductFamilyDto>;

export interface ProductFamilyListParams {
  /** Busca en clave y nombre (ES y EN). */
  search?: string;
  includeInactive?: boolean;
}

// ================================
// GUÍAS DE TALLAS
// ================================
export interface SizeGuideColumn {
  /** `/^[a-z0-9_]{1,40}$/`: pecho, largo, manga… */
  key: string;
  label: string;
  labelEn: string | null;
}

export interface SizeGuideRow {
  /** Talla en MAYÚSCULAS y sin espacios (CH, M, 28…). */
  size: string;
  /** Valor (texto, máx. 20) por clave de columna. */
  values: Record<string, string>;
}

export interface SizeGuide {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  gender: VariantGender | null;
  unit: SizeGuideUnit;
  /** Máximo 8. */
  columns: SizeGuideColumn[];
  /** Máximo 30, en orden de talla. */
  rows: SizeGuideRow[];
  notes: string | null;
  notesEn: string | null;
  isActive: boolean;
  /** Familias que usan esta guía. */
  familyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SizeGuideColumnInput {
  key: string;
  label: string;
  labelEn?: string | null;
}

export interface CreateSizeGuideDto {
  code: string;
  name: string;
  nameEn?: string | null;
  gender?: VariantGender | null;
  unit?: SizeGuideUnit;
  columns: SizeGuideColumnInput[];
  rows: SizeGuideRow[];
  notes?: string | null;
  notesEn?: string | null;
  isActive?: boolean;
}

export type UpdateSizeGuideDto = Partial<CreateSizeGuideDto>;

export interface SizeGuideListParams {
  includeInactive?: boolean;
}
