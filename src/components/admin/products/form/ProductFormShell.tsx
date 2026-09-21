'use client';

// ProductFormShell — UN solo formulario de producto para /nuevo y /[id]/editar.
//
//  - Secciones con navegación lateral (lg) / Select (móvil) y `?seccion=` en la
//    URL. Una sección visitada queda MONTADA (`hidden`), así que cambiar de
//    sección no pierde ediciones.
//  - Guardado POR SECCIÓN (PATCH parcial con `expectedUpdatedAt`), punto ámbar,
//    barra "Tienes cambios sin guardar", "Guardar todo" secuencial y guard de
//    salida (beforeunload + enlaces internos).
//  - Botones por permiso: products:create / update / delete. Con solo
//    products:read la ficha es de lectura.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { productKeys } from '@/hooks/useProducts';
import { productsService } from '@/services/products.service';
import { productsAdminService, type AdminUpdateProductDto } from '@/services/products-admin.service';
import type { CreateProductDto } from '@/types/product';
import { DuplicateProductDialog } from '../DuplicateProductDialog';
import { ProductActiveDialog } from '../ProductActiveDialog';
import { productAdminErrorCode, productAdminErrorMessage } from '../lib/errors';
import {
  CREATE_SECTIONS,
  PRODUCTS_LIST_RETURN_KEY,
  PRODUCT_SECTIONS,
  SECTION_LABEL,
  isProductSectionId,
  type ProductSectionId,
} from '../lib/labels';
import { useProductPermissions } from '../lib/permissions';
import {
  productsAdminKeys,
  useAdminProduct,
  useInvalidateProductDerived,
  usePatchAdminProduct,
  useProductRowHealth,
  useStorefrontStatus,
} from '../useProductsAdmin';
import { ProductFormContext, type ProductFormContextValue, type SectionHandle } from './ProductFormContext';
import { ProductHeader } from './ProductHeader';
import { ReadOnlyNotice } from './SectionCard';
import { SectionNav } from './SectionNav';
import { UnsavedBar } from './UnsavedBar';
import { useLeaveGuard } from './useLeaveGuard';
import { BasicSection } from './sections/BasicSection';
import { ComponentsSection } from './sections/ComponentsSection';
import { ContentSection } from './sections/ContentSection';
import { FiscalSection } from './sections/FiscalSection';
import { HistorySection } from './sections/HistorySection';
import { ImagesSection } from './sections/ImagesSection';
import { InventorySection } from './sections/InventorySection';
import { MlmSection } from './sections/MlmSection';
import { PricesSection } from './sections/PricesSection';
import { SeoSection } from './sections/SeoSection';
import { StoreSection } from './sections/StoreSection';
import { TranslationsSection } from './sections/TranslationsSection';

const SECTION_COMPONENT: Record<ProductSectionId, () => ReactNode> = {
  basica: () => <BasicSection />,
  contenido: () => <ContentSection />,
  traducciones: () => <TranslationsSection />,
  tienda: () => <StoreSection />,
  seo: () => <SeoSection />,
  imagenes: () => <ImagesSection />,
  precios: () => <PricesSection />,
  fiscal: () => <FiscalSection />,
  componentes: () => <ComponentsSection />,
  inventario: () => <InventorySection />,
  mlm: () => <MlmSection />,
  historial: () => <HistorySection />,
};

const WITH_COMPONENTS = ['kit', 'pack', 'promotional'];

interface ProductFormShellProps {
  mode: 'create' | 'edit';
  productId?: string;
}

function listHref(): string {
  if (typeof window === 'undefined') return '/admin/productos';
  try {
    const qs = sessionStorage.getItem(PRODUCTS_LIST_RETURN_KEY);
    return qs ? `/admin/productos?${qs}` : '/admin/productos';
  } catch {
    return '/admin/productos';
  }
}

export function ProductFormShell({ mode, productId = '' }: ProductFormShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const permissions = useProductPermissions();
  const isEdit = mode === 'edit';

  const productQuery = useAdminProduct(productId, isEdit);
  const product = isEdit ? (productQuery.data ?? null) : null;
  const refetchProduct = productQuery.refetch;
  const storefront = useStorefrontStatus(productId, isEdit);
  const rowHealth = useProductRowHealth(productId, product?.code);
  const patchMutation = usePatchAdminProduct(productId);
  const invalidateDerived = useInvalidateProductDerived(productId);

  const readOnly = isEdit ? !permissions.canUpdate : !permissions.canCreate;

  // ---------- Secciones disponibles y activa ----------
  const sections = useMemo(() => {
    if (!isEdit) return PRODUCT_SECTIONS.filter((s) => CREATE_SECTIONS.includes(s.id));
    const withComponents = WITH_COMPONENTS.includes(product?.productType ?? '');
    return PRODUCT_SECTIONS.filter((s) => s.id !== 'componentes' || withComponents);
  }, [isEdit, product?.productType]);

  const requested = searchParams.get('seccion');
  const active: ProductSectionId =
    isProductSectionId(requested) && sections.some((s) => s.id === requested) ? requested : sections[0].id;

  // Una sección visitada se queda montada (oculta) para no perder ediciones.
  const [visited, setVisited] = useState<ProductSectionId[]>([active]);
  if (!visited.includes(active)) setVisited([...visited, active]);

  const goToSection = useCallback(
    (id: ProductSectionId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('seccion', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [pathname, router, searchParams],
  );

  // ---------- Registro de secciones y cambios sin guardar ----------
  const registry = useRef(new Map<ProductSectionId, SectionHandle>());
  const [dirtyMap, setDirtyMap] = useState<Partial<Record<ProductSectionId, boolean>>>({});

  const registerSection = useCallback((id: ProductSectionId, handle: SectionHandle) => {
    registry.current.set(id, handle);
    return () => {
      if (registry.current.get(id) === handle) registry.current.delete(id);
    };
  }, []);

  const setSectionDirty = useCallback((id: ProductSectionId, dirty: boolean) => {
    setDirtyMap((prev) => (Boolean(prev[id]) === dirty ? prev : { ...prev, [id]: dirty }));
  }, []);

  const dirtySections = useMemo(
    () => PRODUCT_SECTIONS.map((s) => s.id).filter((id) => dirtyMap[id]),
    [dirtyMap],
  );
  const hasUnsaved = dirtySections.length > 0;
  const leaveGuard = useLeaveGuard(hasUnsaved && !readOnly);

  // ---------- Escrituras ----------
  const expectedUpdatedAt = useRef<string | undefined>(undefined);
  useEffect(() => {
    expectedUpdatedAt.current = product?.updatedAt;
  }, [product?.updatedAt]);

  const currentSlug = product?.slug ?? null;

  const notifyWrite = useCallback(() => {
    invalidateDerived();
    void productsAdminService.revalidateCatalog([currentSlug]);
  }, [currentSlug, invalidateDerived]);

  const patchProduct = useCallback(
    async (dto: AdminUpdateProductDto) => {
      try {
        const updated = await patchMutation.mutateAsync({ ...dto, expectedUpdatedAt: expectedUpdatedAt.current });
        expectedUpdatedAt.current = updated.updatedAt;
        invalidateDerived();
        if (dto.slug) queryClient.invalidateQueries({ queryKey: productsAdminKeys.slugHistory(productId) });
        void productsAdminService.revalidateCatalog([currentSlug, updated.slug]);
        return updated;
      } catch (err) {
        // Otra persona guardó antes: se trae su versión (sin pisar lo que el usuario está editando).
        if (productAdminErrorCode(err) === 'PRD_STALE') void refetchProduct();
        throw err;
      }
    },
    [currentSlug, invalidateDerived, patchMutation, productId, queryClient, refetchProduct],
  );

  const [isSavingAll, setIsSavingAll] = useState(false);
  const saveAll = useCallback(async () => {
    setIsSavingAll(true);
    const failed: ProductSectionId[] = [];
    try {
      // Secuencial: cada PATCH usa el `updatedAt` que dejó el anterior.
      for (const id of dirtySections) {
        const handle = registry.current.get(id);
        if (!handle) continue;
        const ok = await handle.save();
        if (!ok) failed.push(id);
      }
    } finally {
      setIsSavingAll(false);
    }
    if (failed.length > 0) {
      toast.warning(`Quedaron sin guardar: ${failed.map((id) => SECTION_LABEL[id]).join(', ')}`);
      goToSection(failed[0]);
    }
  }, [dirtySections, goToSection]);

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const discardAll = () => {
    for (const id of dirtySections) registry.current.get(id)?.discard();
    setConfirmDiscard(false);
  };

  // ---------- Alta ----------
  const [isCreating, setIsCreating] = useState(false);
  const createProduct = async () => {
    setIsCreating(true);
    try {
      let payload: Partial<CreateProductDto> = {};
      for (const section of sections) {
        const part = await registry.current.get(section.id)?.collectCreate?.();
        if (part === null) {
          toast.error(`Revisa los campos marcados en "${section.label}"`);
          goToSection(section.id);
          return;
        }
        payload = { ...payload, ...(part ?? {}) };
      }
      if (!payload.code || !payload.name) {
        toast.error('Nombre y clave son obligatorios');
        goToSection('basica');
        return;
      }
      const created = await productsService.createProduct({ ...payload, code: payload.code, name: payload.name });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productsAdminKeys.lists() });
      toast.success('Producto creado. Ahora captura sus precios.');
      router.push(`/admin/productos/${created.id}/editar?seccion=precios`);
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo crear el producto'));
      if (productAdminErrorCode(err) === 'PRD_CODE_TAKEN') goToSection('basica');
    } finally {
      setIsCreating(false);
    }
  };

  // ---------- Diálogos del encabezado ----------
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [activeDialogOpen, setActiveDialogOpen] = useState(false);

  const contextValue = useMemo<ProductFormContextValue>(
    () => ({
      mode,
      productId,
      product,
      readOnly,
      patchProduct,
      notifyWrite,
      registerSection,
      setSectionDirty,
      goToSection,
    }),
    [mode, productId, product, readOnly, patchProduct, notifyWrite, registerSection, setSectionDirty, goToSection],
  );

  // ---------- Estados de carga / error ----------
  if (isEdit && productQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8" role="status" aria-label="Cargando producto">
        <div className="mx-auto max-w-7xl space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <Skeleton className="hidden h-96 lg:block" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (isEdit && !product) {
    const notFound = productAdminErrorCode(productQuery.error) === null;
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
          <TriangleAlert className="mx-auto mb-4 h-12 w-12 text-red-600" aria-hidden />
          <h1 className="mb-2 text-xl font-bold text-gray-900">No se pudo abrir el producto</h1>
          <p className="mb-6 text-sm text-gray-700">
            {productAdminErrorMessage(
              productQuery.error,
              notFound ? 'El producto no existe o no tienes acceso a él.' : 'Ocurrió un error al cargarlo.',
            )}
          </p>
          <div className="flex justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => void refetchProduct()}>
              Reintentar
            </Button>
            <Button type="button" onClick={() => router.push(listHref())}>
              Volver a Productos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProductFormContext.Provider value={contextValue}>
      <div className={`min-h-screen bg-gray-50 ${hasUnsaved && isEdit ? 'pb-32 sm:pb-24' : 'pb-10'}`}>
        <ProductHeader
          mode={mode}
          product={product}
          rowHealth={rowHealth.data}
          storefront={storefront.data}
          storefrontLoading={storefront.isLoading}
          canCreate={permissions.canCreate}
          canUpdate={permissions.canUpdate}
          canDelete={permissions.canDelete}
          isCreating={isCreating}
          onBack={() => leaveGuard.guardedPush(listHref())}
          onCreate={() => void createProduct()}
          onDuplicate={() => setDuplicateOpen(true)}
          onToggleActive={() => setActiveDialogOpen(true)}
          onGoToSection={goToSection}
        />

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {readOnly ? (
            <div className="mb-4">
              <ReadOnlyNotice />
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <SectionNav items={sections} active={active} dirty={isEdit ? dirtyMap : {}} onSelect={goToSection} />

            <div className="min-w-0">
              {sections.map((section) => {
                // En el alta TODAS las secciones se montan: el POST reúne sus valores.
                const mounted = !isEdit || visited.includes(section.id);
                if (!mounted) return null;
                return (
                  <section
                    key={section.id}
                    id={`seccion-${section.id}`}
                    aria-label={section.label}
                    hidden={section.id !== active}
                  >
                    {SECTION_COMPONENT[section.id]()}
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        {isEdit && !readOnly ? (
          <UnsavedBar
            dirtySections={dirtySections}
            isSavingAll={isSavingAll}
            onSaveAll={() => void saveAll()}
            onDiscardAll={() => setConfirmDiscard(true)}
            onGoTo={goToSection}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Descartar cambios"
        description={`Se perderán los cambios sin guardar en: ${dirtySections.map((id) => SECTION_LABEL[id]).join(', ')}.`}
        confirmLabel="Descartar cambios"
        destructive
        onConfirm={discardAll}
      />

      <ConfirmDialog
        open={!!leaveGuard.pendingHref}
        onOpenChange={(open) => {
          if (!open) leaveGuard.cancelLeave();
        }}
        title="Tienes cambios sin guardar"
        description={`Si sales ahora se pierden los cambios en: ${dirtySections.map((id) => SECTION_LABEL[id]).join(', ')}.`}
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        destructive
        onConfirm={leaveGuard.confirmLeave}
      />

      {product ? (
        <>
          <DuplicateProductDialog
            source={duplicateOpen ? { id: product.id, code: product.code, name: product.name } : null}
            onOpenChange={(open) => {
              if (!open) setDuplicateOpen(false);
            }}
          />
          <ProductActiveDialog
            target={
              activeDialogOpen
                ? { id: product.id, code: product.code, name: product.name, slug: product.slug, isActive: product.isActive }
                : null
            }
            onOpenChange={(open) => {
              if (!open) setActiveDialogOpen(false);
            }}
            onDone={() => void refetchProduct()}
          />
        </>
      ) : null}
    </ProductFormContext.Provider>
  );
}
