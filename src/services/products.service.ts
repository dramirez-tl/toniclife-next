// Products Service - Frontend API client for products module
// Connects to: toniclife-api/src/modules/products/

import api from '@/lib/axios';
import {
  ProductType,
  type Product,
  type ProductListResponse,
  type ProductQueryParams,
  type ProductPrice,
  type ProductComponent,
  type Category,
  type CategoryTree,
  type CategoryQueryParams,
  type PriceType,
  type Currency,
  type CreateProductDto,
  type UpdateProductDto,
  type CreateCategoryDto,
  type UpdateCategoryDto,
} from '@/types/product';

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
    return this.getProducts({ isFeatured: true, isVisibleEcommerce: true, isActive: true, limit });
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
    dto: { priceTypeId: string; price: number; effectiveFrom?: string }
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
