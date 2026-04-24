export type MaterialType = 'pdf' | 'image' | 'video' | 'document' | 'presentation';
export type MaterialCategory =
  | 'catalogos'
  | 'redes_sociales'
  | 'testimonios'
  | 'presentaciones'
  | 'guias'
  | 'branding'
  | 'capacitacion'
  | 'otros';
export type MaterialStatus = 'draft' | 'published' | 'archived';

export type MaterialAccessType = 'public' | 'restricted';

export interface MaterialCountry {
  id: string;
  code: string | null;
  name: string | null;
}

export interface MarketingMaterial {
  id: string;
  title: string;
  description: string | null;
  type: MaterialType;
  category: MaterialCategory;
  filePath: string | null;
  fileSize: number | null;
  mimeType: string | null;
  thumbnailUrl: string | null;
  hasFile: boolean;
  status: MaterialStatus;
  sortOrder: number;
  downloadCount: number;
  accessType: MaterialAccessType;
  countryIds: string[];
  countries: MaterialCountry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialDto {
  title: string;
  description?: string;
  type?: MaterialType;
  category?: MaterialCategory;
  status?: MaterialStatus;
  sortOrder?: number;
  accessType?: MaterialAccessType;
  countryIds?: string[];
}

export interface UpdateMaterialDto extends Partial<CreateMaterialDto> {}

export interface MaterialEnrollment {
  id: string;
  materialId: string;
  customerId: string;
  customerNumber: string | null;
  customerName: string | null;
  customerEmail: string | null;
  grantedBy: string | null;
  notes: string | null;
  enrolledAt: string;
}

export interface CreateMaterialEnrollmentsDto {
  customerIds: string[];
  notes?: string;
}

export interface MaterialAccessResult {
  canAccess: boolean;
  reason: 'admin' | 'public' | 'enrolled' | 'not_enrolled' | 'wrong_country' | 'not_found';
}

export interface MaterialQueryParams {
  status?: string;
  category?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MaterialsListResponse {
  data: MarketingMaterial[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    totalDownloads: number;
    categories: number;
  };
}
