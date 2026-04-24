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
}

export interface UpdateMaterialDto extends Partial<CreateMaterialDto> {}

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
