// Products Service - Frontend API client for products module
// Connects to: toniclife-api/src/modules/products/

import api from '@/lib/axios';
import {
  ProductType,
  type Product,
  type ProductListResponse,
  type ProductQueryParams,
  type ProductPrice,
  type ProductTax,
  type ProductComponent,
  type ProductImage,
  type ProductDocument,
  type UpdateProductImageDto,
  type ProductPriceSchedule,
  type CreatePriceScheduleDto,
  type Category,
  type CategoryTree,
  type CategoryQueryParams,
  type PriceType,
  type Currency,
  type CreateProductDto,
  type UpdateProductDto,
  type CreateProductPriceDto,
  type CreateCategoryDto,
  type UpdateCategoryDto,
} from '@/types/product';

/** Sucursal por defecto para e-commerce público: Irapuato Call Center/Almacen General TL (código 164, tipo E-commerce). */
export const ECOMMERCE_BRANCH_ID = '02402316-4d60-4f3e-b3c1-9138e1db27ca';

class ProductsService {
  // ================================
  // PRODUCTS
  // ================================

  /**
   * Get paginated list of products
   */
  async getProducts(params?: ProductQueryParams): Promise<ProductListResponse> {
    const response = await api.get<ProductListResponse>('/products', { params });
    return response.data;
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product> {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  }

  /**
   * Get product by code
   */
  async getProductByCode(code: string): Promise<Product> {
    const response = await api.get<Product>(`/products/code/${code}`);
    return response.data;
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string): Promise<Product> {
    const response = await api.get<Product>(`/products/slug/${slug}`);
    return response.data;
  }

  /**
   * Search products
   */
  async searchProducts(
    query: string,
    options?: Omit<ProductQueryParams, 'search'>
  ): Promise<ProductListResponse> {
    return this.getProducts({ search: query, ...options });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 10): Promise<ProductListResponse> {
    return this.getProducts({ isFeatured: true, isVisibleEcommerce: true, isActive: true, branchId: ECOMMERCE_BRANCH_ID, inStock: true, limit });
  }

  /**
   * Get new products
   */
  async getNewProducts(limit = 10): Promise<Product[]> {
    const response = await this.getProducts({
      isVisibleEcommerce: true,
      isActive: true,
      sortBy: 'createdAt',
      sortDir: 'desc',
      limit,
    });
    return response.data;
  }

  /**
   * Get best sellers
   */
  async getBestSellers(limit = 10): Promise<Product[]> {
    const response = await this.getProducts({
      isVisibleEcommerce: true,
      isActive: true,
      isFeatured: true,
      limit,
    });
    return response.data;
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: string,
    options?: Omit<ProductQueryParams, 'categoryId'>
  ): Promise<ProductListResponse> {
    return this.getProducts({ categoryId, isVisibleEcommerce: true, isActive: true, ...options });
  }

  /**
   * Get kit products
   */
  async getKitProducts(): Promise<ProductListResponse> {
    return this.getProducts({ productType: ProductType.KIT, isVisibleEcommerce: true, isActive: true });
  }

  // ================================
  // ADMIN: PRODUCT CRUD
  // ================================

  /**
   * Create a new product (admin only)
   */
  async createProduct(dto: CreateProductDto): Promise<Product> {
    const response = await api.post<Product>('/products', dto);
    return response.data;
  }

  /**
   * Update a product (admin only)
   */
  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const response = await api.patch<Product>(`/products/${id}`, dto);
    return response.data;
  }

  /**
   * Delete a product (soft delete, admin only)
   */
  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  }

  // ================================
  // PRODUCT PRICES
  // ================================

  /**
   * Get product prices
   */
  async getProductPrices(productId: string): Promise<ProductPrice[]> {
    const response = await api.get<ProductPrice[]>(`/products/${productId}/prices`);
    return response.data;
  }

  /**
   * Get product price for specific price type and currency
   */
  async getProductPriceForType(
    productId: string,
    priceTypeId: string,
    currencyId: string
  ): Promise<ProductPrice | undefined> {
    const prices = await this.getProductPrices(productId);
    return prices.find(
      (p) => p.priceTypeId === priceTypeId && p.currencyCode === currencyId
    );
  }

  // ================================
  // PRODUCT COMPONENTS (KITS)
  // ================================

  /**
   * Get components of a kit/pack product
   */
  async getProductComponents(productId: string): Promise<ProductComponent[]> {
    const response = await api.get<ProductComponent[]>(`/products/${productId}/components`);
    return response.data;
  }

  // ================================
  // ADMIN: PRODUCT PRICE CRUD
  // ================================

  /**
   * Create a new price for a product (admin only)
   */
  async createProductPrice(
    productId: string,
    dto: CreateProductPriceDto
  ): Promise<ProductPrice> {
    const response = await api.post<ProductPrice>(`/products/${productId}/prices`, dto);
    return response.data;
  }

  /**
   * Delete a product price (admin only)
   */
  async deleteProductPrice(productId: string, priceId: string): Promise<void> {
    await api.delete(`/products/${productId}/prices/${priceId}`);
  }

  /**
   * Deactivate all prices for a product in a specific country (soft-delete with reason)
   */
  async deactivateCountryPrices(
    productId: string,
    countryId: string,
    reason: string,
  ): Promise<{ deactivatedCount: number }> {
    const response = await api.post<{ deactivatedCount: number }>(
      `/products/${productId}/prices/deactivate-country`,
      { countryId, reason },
    );
    return response.data;
  }

  // ================================
  // PRODUCT TAXES (Reglas fiscales)
  // ================================

  async getProductTaxes(productId: string): Promise<ProductTax[]> {
    const response = await api.get<ProductTax[]>(`/products/${productId}/taxes`);
    return response.data;
  }

  async assignProductTax(productId: string, taxRuleId: string, isIncludedInPrice = false): Promise<ProductTax> {
    const response = await api.post<ProductTax>(`/products/${productId}/taxes`, { taxRuleId, isIncludedInPrice });
    return response.data;
  }

  async updateProductTax(productId: string, taxRuleId: string, isIncludedInPrice: boolean): Promise<void> {
    await api.patch(`/products/${productId}/taxes/${taxRuleId}`, { isIncludedInPrice });
  }

  async removeProductTax(productId: string, taxRuleId: string): Promise<void> {
    await api.delete(`/products/${productId}/taxes/${taxRuleId}`);
  }

  // ================================
  // ADMIN: PRODUCT COMPONENT CRUD
  // ================================

  /**
   * Add a component to a kit/pack product (admin only)
   */
  async createProductComponent(
    productId: string,
    dto: { componentProductId: string; quantity: number }
  ): Promise<ProductComponent> {
    const response = await api.post<ProductComponent>(`/products/${productId}/components`, dto);
    return response.data;
  }

  /**
   * Update a component of a kit/pack product (admin only)
   */
  async updateProductComponent(
    productId: string,
    componentId: string,
    dto: { quantity: number }
  ): Promise<ProductComponent> {
    const response = await api.patch<ProductComponent>(
      `/products/${productId}/components/${componentId}`,
      dto
    );
    return response.data;
  }

  /**
   * Remove a component from a kit/pack product (admin only)
   */
  async deleteProductComponent(productId: string, componentId: string): Promise<void> {
    await api.delete(`/products/${productId}/components/${componentId}`);
  }

  // ================================
  // PRODUCT IMAGES (galería del catálogo)
  // ================================

  /** Lista las imágenes de un producto (principal primero) */
  async getProductImages(productId: string): Promise<ProductImage[]> {
    const response = await api.get<ProductImage[]>(`/products/${productId}/images`);
    return response.data;
  }

  /** Sube una imagen a la galería (multipart, campo "image") */
  async uploadProductImage(productId: string, file: File): Promise<ProductImage> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<ProductImage>(
      `/products/${productId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  }

  /** Actualiza una imagen (principal / orden / alt) */
  async updateProductImage(
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
  ): Promise<ProductImage> {
    const response = await api.patch<ProductImage>(
      `/products/${productId}/images/${imageId}`,
      dto,
    );
    return response.data;
  }

  /** Elimina (soft) una imagen */
  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    await api.delete(`/products/${productId}/images/${imageId}`);
  }

  // ================================
  // PRODUCT DOCUMENTS (ficha técnica PDF, uso interno)
  // ================================

  /** Lista los documentos internos de un producto */
  async getProductDocuments(productId: string): Promise<ProductDocument[]> {
    const response = await api.get<ProductDocument[]>(`/products/${productId}/documents`);
    return response.data;
  }

  /** Sube un PDF (multipart, campo "document") */
  async uploadProductDocument(
    productId: string,
    file: File,
    documentType = 'tech_sheet',
  ): Promise<ProductDocument> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    const response = await api.post<ProductDocument>(
      `/products/${productId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  }

  /** Obtiene un enlace temporal (signed URL) para ver/descargar el documento */
  async getProductDocumentDownloadUrl(
    productId: string,
    documentId: string,
  ): Promise<{ url: string; fileName: string; expires?: string }> {
    const response = await api.get<{ url: string; fileName: string; expires?: string }>(
      `/products/${productId}/documents/${documentId}/download`,
    );
    return response.data;
  }

  /** Elimina un documento */
  async deleteProductDocument(productId: string, documentId: string): Promise<void> {
    await api.delete(`/products/${productId}/documents/${documentId}`);
  }

  // ================================
  // PRICE SCHEDULES (cambios de precio programados)
  // ================================

  /** Lista los cambios de precio programados del producto */
  async getPriceSchedules(productId: string): Promise<ProductPriceSchedule[]> {
    const response = await api.get<ProductPriceSchedule[]>(`/products/${productId}/price-schedules`);
    return response.data;
  }

  /** Programa un cambio de precio futuro */
  async createPriceSchedule(
    productId: string,
    dto: CreatePriceScheduleDto,
  ): Promise<ProductPriceSchedule> {
    const response = await api.post<ProductPriceSchedule>(
      `/products/${productId}/price-schedules`,
      dto,
    );
    return response.data;
  }

  /** Cancela un cambio de precio programado (pendiente) */
  async cancelPriceSchedule(productId: string, scheduleId: string): Promise<void> {
    await api.delete(`/products/${productId}/price-schedules/${scheduleId}`);
  }

  // ================================
  // CATEGORIES
  // ================================

  /**
   * Get all categories
   */
  async getCategories(params?: CategoryQueryParams): Promise<Category[]> {
    const response = await api.get<Category[]>('/categories', { params });
    return response.data;
  }

  /**
   * Get categories as tree structure
   */
  async getCategoryTree(): Promise<CategoryTree[]> {
    const response = await api.get<CategoryTree[]>('/categories/tree');
    return response.data;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category> {
    const response = await api.get<Category>(`/categories/slug/${slug}`);
    return response.data;
  }

  /**
   * Get subcategories
   */
  async getSubcategories(parentId: string): Promise<Category[]> {
    const response = await api.get<Category[]>(`/categories/${parentId}/children`);
    return response.data;
  }

  /**
   * Get category breadcrumb
   */
  async getCategoryBreadcrumb(categoryId: string): Promise<Category[]> {
    const response = await api.get<Category[]>(`/categories/${categoryId}/breadcrumb`);
    return response.data;
  }

  // ================================
  // ADMIN: CATEGORY CRUD
  // ================================

  /**
   * Create a new category (admin only)
   */
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const response = await api.post<Category>('/categories', dto);
    return response.data;
  }

  /**
   * Update a category (admin only)
   */
  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const response = await api.patch<Category>(`/categories/${id}`, dto);
    return response.data;
  }

  /**
   * Delete a category (admin only)
   */
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  }

  // ================================
  // PRICE TYPES
  // ================================

  /**
   * Get all price types
   */
  async getPriceTypes(): Promise<PriceType[]> {
    const response = await api.get<PriceType[]>('/price-types');
    return response.data;
  }

  // ================================
  // CURRENCIES
  // ================================

  /**
   * Get all currencies
   */
  async getCurrencies(): Promise<Currency[]> {
    const response = await api.get<Currency[]>('/currencies');
    return response.data;
  }

  // ================================
  // HELPERS
  // ================================

  /**
   * Format price for display
   */
  formatPrice(price: string | number, currencySymbol = '$'): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `${currencySymbol}${numPrice.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Get discount percentage between two prices
   */
  getDiscountPercentage(originalPrice: string | number, salePrice: string | number): number {
    const original = typeof originalPrice === 'string' ? parseFloat(originalPrice) : originalPrice;
    const sale = typeof salePrice === 'string' ? parseFloat(salePrice) : salePrice;
    if (original <= 0) return 0;
    return Math.round(((original - sale) / original) * 100);
  }

  /**
   * Check if product is on sale (has compareAtPrice)
   */
  isOnSale(product: Product, prices?: ProductPrice[]): boolean {
    if (!prices || prices.length === 0) return false;
    // compareAtPrice was removed - check if cost < price as indicator
    return false;
  }
}

export const productsService = new ProductsService();
export default productsService;
