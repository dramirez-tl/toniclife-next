// hooks/useProducts.ts - Hooks con React Query para productos
'use client';

import { useQuery, useQueryClient, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { productsService } from '@/services/products.service';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import {
  ProductType,
  type Product,
  type ProductListResponse,
  type ProductQueryParams,
  type ProductPrice,
  type ProductComponent,
  type Category,
  type CategoryTree,
  type CreateProductDto,
  type UpdateProductDto,
  type CreateProductPriceDto,
  type CreateCategoryDto,
  type UpdateCategoryDto,
} from '@/types/product';

// Keys para React Query
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductQueryParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  bySlug: (slug: string) => [...productKeys.all, 'slug', slug] as const,
  byCode: (code: string) => [...productKeys.all, 'code', code] as const,
  prices: (id: string) => [...productKeys.all, 'prices', id] as const,
  components: (id: string) => [...productKeys.all, 'components', id] as const,
  taxes: (id: string) => [...productKeys.all, 'taxes', id] as const,
  featured: () => [...productKeys.all, 'featured'] as const,
  newArrivals: () => [...productKeys.all, 'new'] as const,
  bestSellers: () => [...productKeys.all, 'bestsellers'] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
  tree: () => [...categoryKeys.all, 'tree'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
  bySlug: (slug: string) => [...categoryKeys.all, 'slug', slug] as const,
  children: (id: string) => [...categoryKeys.all, 'children', id] as const,
  breadcrumb: (id: string) => [...categoryKeys.all, 'breadcrumb', id] as const,
};

// ================================
// PRODUCT HOOKS
// ================================

/**
 * Hook para obtener lista de productos con filtros
 */
export const useProducts = (params: ProductQueryParams = {}) => {
  // El precio que devuelve la API es rol-aware (precio distribuidor si el JWT
  // corresponde a un distribuidor activo con kit). Incluimos el customerId en la
  // key para que React Query refresque los precios al iniciar/cerrar sesión.
  const viewerId = useAppSelector(selectUser)?.customerId ?? 'guest';
  return useQuery({
    queryKey: [...productKeys.list(params), 'v', viewerId],
    queryFn: () => productsService.getProducts(params),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para paginación infinita de productos
 */
export const useInfiniteProducts = (params: Omit<ProductQueryParams, 'page'>) => {
  const viewerId = useAppSelector(selectUser)?.customerId ?? 'guest';
  return useInfiniteQuery({
    queryKey: [
      ...productKeys.list({ ...params, infinite: true } as ProductQueryParams),
      'v',
      viewerId,
    ],
    queryFn: ({ pageParam = 1 }) =>
      productsService.getProducts({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook para obtener producto por ID
 */
export const useProduct = (id: string, enabled = true) => {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsService.getProductById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para obtener producto por slug
 */
export const useProductBySlug = (slug: string, enabled = true) => {
  const viewerId = useAppSelector(selectUser)?.customerId ?? 'guest';
  return useQuery({
    queryKey: [...productKeys.bySlug(slug), 'v', viewerId],
    queryFn: () => productsService.getProductBySlug(slug),
    enabled: enabled && !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para obtener producto por code
 */
export const useProductByCode = (code: string, enabled = true) => {
  return useQuery({
    queryKey: productKeys.byCode(code),
    queryFn: () => productsService.getProductByCode(code),
    enabled: enabled && !!code,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para buscar productos
 */
export const useProductSearch = (query: string, options?: Omit<ProductQueryParams, 'search'>) => {
  return useQuery({
    queryKey: productKeys.list({ search: query, ...options }),
    queryFn: () => productsService.searchProducts(query, options),
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 segundos
  });
};

/**
 * Hook para productos destacados
 */
export const useFeaturedProducts = (limit = 10) => {
  return useQuery({
    queryKey: productKeys.featured(),
    queryFn: () => productsService.getFeaturedProducts(limit),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para nuevos productos
 */
export const useNewProducts = (limit = 10) => {
  return useQuery({
    queryKey: productKeys.newArrivals(),
    queryFn: () => productsService.getNewProducts(limit),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para más vendidos
 */
export const useBestSellers = (limit = 10) => {
  return useQuery({
    queryKey: productKeys.bestSellers(),
    queryFn: () => productsService.getBestSellers(limit),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para productos por categoría
 */
export const useProductsByCategory = (
  categoryId: string,
  options?: Omit<ProductQueryParams, 'categoryId'>
) => {
  return useQuery({
    queryKey: productKeys.list({ categoryId, ...options }),
    queryFn: () => productsService.getProductsByCategory(categoryId, options),
    enabled: !!categoryId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook para productos tipo kit
 */
export const useKitProducts = () => {
  return useQuery({
    queryKey: productKeys.list({ productType: ProductType.KIT }),
    queryFn: () => productsService.getKitProducts(),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para obtener precios del producto
 */
export const useProductPrices = (productId: string, enabled = true) => {
  return useQuery({
    queryKey: productKeys.prices(productId),
    queryFn: () => productsService.getProductPrices(productId),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para obtener componentes de un kit
 */
export const useProductComponents = (productId: string, enabled = true) => {
  return useQuery({
    queryKey: productKeys.components(productId),
    queryFn: () => productsService.getProductComponents(productId),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
  });
};

// ================================
// CATEGORY HOOKS
// ================================

/**
 * Hook para obtener todas las categorías
 */
export const useCategories = (params?: { isActive?: boolean }) => {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => productsService.getCategories(params),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
};

/**
 * Hook para obtener árbol de categorías
 */
export const useCategoryTree = () => {
  return useQuery({
    queryKey: categoryKeys.tree(),
    queryFn: () => productsService.getCategoryTree(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

/**
 * Hook para obtener categoría por ID
 */
export const useCategory = (id: string, enabled = true) => {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => productsService.getCategoryById(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para obtener categoría por slug
 */
export const useCategoryBySlug = (slug: string, enabled = true) => {
  return useQuery({
    queryKey: categoryKeys.bySlug(slug),
    queryFn: () => productsService.getCategoryBySlug(slug),
    enabled: enabled && !!slug,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para obtener subcategorías
 */
export const useSubcategories = (parentId: string, enabled = true) => {
  return useQuery({
    queryKey: categoryKeys.children(parentId),
    queryFn: () => productsService.getSubcategories(parentId),
    enabled: enabled && !!parentId,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para obtener breadcrumb de categoría
 */
export const useCategoryBreadcrumb = (categoryId: string, enabled = true) => {
  return useQuery({
    queryKey: categoryKeys.breadcrumb(categoryId),
    queryFn: () => productsService.getCategoryBreadcrumb(categoryId),
    enabled: enabled && !!categoryId,
    staleTime: 10 * 60 * 1000,
  });
};

// ================================
// ADMIN MUTATION HOOKS
// ================================

/**
 * Hook para crear un nuevo producto (admin)
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateProductDto) => productsService.createProduct(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

/**
 * Hook para actualizar un producto (admin)
 */
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductDto }) =>
      productsService.updateProduct(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
};

/**
 * Hook para eliminar un producto (admin, soft delete)
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

// ================================
// ADMIN PRICE MUTATION HOOKS
// ================================

/**
 * Hook para crear un precio de producto (admin)
 */
export const useCreateProductPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      dto,
    }: {
      productId: string;
      dto: CreateProductPriceDto;
    }) => productsService.createProductPrice(productId, dto),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.prices(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
};

/**
 * Hook para eliminar un precio de producto (admin)
 */
export const useDeleteProductPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, priceId }: { productId: string; priceId: string }) =>
      productsService.deleteProductPrice(productId, priceId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.prices(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
};

export const useDeactivateCountryPrices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, countryId, reason }: { productId: string; countryId: string; reason: string }) =>
      productsService.deactivateCountryPrices(productId, countryId, reason),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.prices(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
};

// ================================
// PRODUCT TAX HOOKS (Reglas fiscales)
// ================================

export const useProductTaxes = (productId: string, enabled = true) => {
  return useQuery({
    queryKey: productKeys.taxes(productId),
    queryFn: () => productsService.getProductTaxes(productId),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAssignProductTax = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, taxRuleId, isIncludedInPrice }: { productId: string; taxRuleId: string; isIncludedInPrice?: boolean }) =>
      productsService.assignProductTax(productId, taxRuleId, isIncludedInPrice),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.taxes(productId) });
    },
  });
};

export const useUpdateProductTax = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, taxRuleId, isIncludedInPrice }: { productId: string; taxRuleId: string; isIncludedInPrice: boolean }) =>
      productsService.updateProductTax(productId, taxRuleId, isIncludedInPrice),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.taxes(productId) });
    },
  });
};

export const useRemoveProductTax = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, taxRuleId }: { productId: string; taxRuleId: string }) =>
      productsService.removeProductTax(productId, taxRuleId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.taxes(productId) });
    },
  });
};

// ================================
// ADMIN COMPONENT MUTATION HOOKS
// ================================

/**
 * Hook para agregar un componente a un kit (admin)
 */
export const useCreateProductComponent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      dto,
    }: {
      productId: string;
      dto: { componentProductId: string; quantity: number };
    }) => productsService.createProductComponent(productId, dto),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.components(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
};

/**
 * Hook para actualizar un componente de un kit (admin)
 */
export const useUpdateProductComponent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      componentId,
      dto,
    }: {
      productId: string;
      componentId: string;
      dto: { quantity: number };
    }) => productsService.updateProductComponent(productId, componentId, dto),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.components(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
};

/**
 * Hook para eliminar un componente de un kit (admin)
 */
export const useDeleteProductComponent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, componentId }: { productId: string; componentId: string }) =>
      productsService.deleteProductComponent(productId, componentId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.components(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
};

// ================================
// ADMIN CATEGORY MUTATION HOOKS
// ================================

/**
 * Hook para crear una nueva categoría (admin)
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCategoryDto) => productsService.createCategory(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
};

/**
 * Hook para actualizar una categoría (admin)
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCategoryDto }) =>
      productsService.updateCategory(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(id) });
    },
  });
};

/**
 * Hook para eliminar una categoría (admin)
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
};

// ================================
// UTILITY HOOKS
// ================================

/**
 * Hook para invalidar cache y refrescar datos
 */
export const useRefreshProducts = () => {
  const queryClient = useQueryClient();

  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    refreshList: (params?: ProductQueryParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: productKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      }
    },
    refreshProduct: (id: string) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
    refreshCategories: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  };
};

/**
 * Hook para prefetch de productos
 */
export const usePrefetchProducts = () => {
  const queryClient = useQueryClient();

  return {
    prefetchProduct: async (id: string) => {
      await queryClient.prefetchQuery({
        queryKey: productKeys.detail(id),
        queryFn: () => productsService.getProductById(id),
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchProductBySlug: async (slug: string) => {
      await queryClient.prefetchQuery({
        queryKey: productKeys.bySlug(slug),
        queryFn: () => productsService.getProductBySlug(slug),
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchCategory: async (id: string) => {
      await queryClient.prefetchQuery({
        queryKey: categoryKeys.detail(id),
        queryFn: () => productsService.getCategoryById(id),
        staleTime: 10 * 60 * 1000,
      });
    },
  };
};
