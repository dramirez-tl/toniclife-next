// product-families.service.ts - cliente del API de familias de producto,
// variantes y guías de tallas (mig 178, 30-oct-2026).
//
// Lectura con products:read, escritura con products:update. Sin la migración
// 178 el API responde 503 PRD_MIGRATION_PENDING (details.migration) en todo el
// módulo; la clave de familia y de guía se guarda en MAYÚSCULAS.
//
// Ref backend (toniclife-api):
//   src/modules/products/families/product-families.controller.ts
//     GET/POST /product-families, GET/PATCH /product-families/:id, GET /product-families/:id/variants
//     GET/POST /size-guides, GET/PATCH /size-guides/:id
//   src/modules/products/families/product-families.dto.ts

import api from '@/lib/axios';
import type {
  CreateProductFamilyDto,
  CreateSizeGuideDto,
  FamilyVariant,
  ProductFamily,
  ProductFamilyListParams,
  SizeGuide,
  SizeGuideListParams,
  UpdateProductFamilyDto,
  UpdateSizeGuideDto,
} from '@/types/product-family';

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : [];

/** ARRAY_AGG sin filas llega como null: las listas salen SIEMPRE como arreglo. */
function normalizeFamily(raw: ProductFamily): ProductFamily {
  return { ...raw, genders: strList(raw.genders), colors: strList(raw.colors), sizes: strList(raw.sizes) };
}

function normalizeGuide(raw: SizeGuide): SizeGuide {
  return {
    ...raw,
    columns: Array.isArray(raw.columns) ? raw.columns : [],
    rows: Array.isArray(raw.rows) ? raw.rows : [],
  };
}

/** Sin vacíos ni `false` (el API asume includeInactive=false). */
function cleanParams(params: Record<string, string | boolean | undefined>): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === false) continue;
    out[key] = value;
  }
  return out;
}

class ProductFamiliesService {
  // ---------- Familias ----------

  /** Familias activas (o todas con `includeInactive`), en orden de `sortOrder` y nombre. */
  async listFamilies(params: ProductFamilyListParams = {}): Promise<ProductFamily[]> {
    const response = await api.get<ProductFamily[]>('/product-families', {
      params: cleanParams({ search: params.search?.trim(), includeInactive: params.includeInactive }),
    });
    return (Array.isArray(response.data) ? response.data : []).map(normalizeFamily);
  }

  async getFamily(id: string): Promise<ProductFamily> {
    const response = await api.get<ProductFamily>(`/product-families/${id}`);
    return normalizeFamily(response.data);
  }

  /** 409 PRD_FAMILY_CODE_TAKEN si la clave ya existe. */
  async createFamily(dto: CreateProductFamilyDto): Promise<ProductFamily> {
    const response = await api.post<ProductFamily>('/product-families', dto);
    return normalizeFamily(response.data);
  }

  async updateFamily(id: string, dto: UpdateProductFamilyDto): Promise<ProductFamily> {
    const response = await api.patch<ProductFamily>(`/product-families/${id}`, dto);
    return normalizeFamily(response.data);
  }

  /** Variantes (productos) de la familia en orden de género, color y talla. */
  async listFamilyVariants(id: string): Promise<FamilyVariant[]> {
    const response = await api.get<FamilyVariant[]>(`/product-families/${id}/variants`);
    return Array.isArray(response.data) ? response.data : [];
  }

  // ---------- Guías de tallas ----------

  async listSizeGuides(params: SizeGuideListParams = {}): Promise<SizeGuide[]> {
    const response = await api.get<SizeGuide[]>('/size-guides', {
      params: cleanParams({ includeInactive: params.includeInactive }),
    });
    return (Array.isArray(response.data) ? response.data : []).map(normalizeGuide);
  }

  async getSizeGuide(id: string): Promise<SizeGuide> {
    const response = await api.get<SizeGuide>(`/size-guides/${id}`);
    return normalizeGuide(response.data);
  }

  /** 400 PRD_SIZE_GUIDE_INVALID (columna/talla repetida, valor > 20); 409 PRD_SIZE_GUIDE_CODE_TAKEN. */
  async createSizeGuide(dto: CreateSizeGuideDto): Promise<SizeGuide> {
    const response = await api.post<SizeGuide>('/size-guides', dto);
    return normalizeGuide(response.data);
  }

  async updateSizeGuide(id: string, dto: UpdateSizeGuideDto): Promise<SizeGuide> {
    const response = await api.patch<SizeGuide>(`/size-guides/${id}`, dto);
    return normalizeGuide(response.data);
  }
}

export const productFamiliesService = new ProductFamiliesService();
