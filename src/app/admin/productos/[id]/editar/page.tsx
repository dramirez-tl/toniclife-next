'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProduct, useUpdateProduct, useCategories } from '@/hooks/useProducts';
import type { UpdateProductDto } from '@/types/product';
import { ProductType, KitPosition } from '@/types/product';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ProductPricesSection } from '@/components/admin/products/ProductPricesSection';
import { ProductInventoryByBranch } from '@/components/admin/products/ProductInventoryByBranch';
import { ProductMediaSection } from '@/components/admin/products/ProductMediaSection';
import { selectUser } from '@/store/slices/authSlice';

// Confirmation info for sensitive toggles
const SENSITIVE_TOGGLE_INFO: Record<string, { title: string; onMessage: string; offMessage: string; warning: string }> = {
  tracksInventory: {
    title: 'Controla Inventario',
    onMessage: 'Se activará el control de inventario. El sistema comenzará a llevar el conteo de existencias y las ventas descontarán stock automáticamente.',
    offMessage: 'Se desactivará el control de inventario. El sistema dejará de rastrear existencias y las ventas no afectarán el stock.',
    warning: 'Este cambio afecta cómo el sistema gestiona las existencias de este producto en todas las sucursales.',
  },
  tracksLots: {
    title: 'Controla Lotes',
    onMessage: 'Se activará el control por lotes. Cada entrada de inventario requerirá número de lote y fecha de caducidad.',
    offMessage: 'Se desactivará el control por lotes. Ya no se podrá rastrear la trazabilidad por lote ni las fechas de caducidad.',
    warning: 'Este cambio afecta la trazabilidad del producto. Las entradas de inventario existentes conservan sus datos de lote.',
  },
};

export default function EditarProductoAdminPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const currentUser = useSelector(selectUser);

  const { data: product, isLoading, isError } = useProduct(id);
  const updateProduct = useUpdateProduct();
  const { data: categories, isLoading: categoriesLoading } = useCategories({ isActive: true });

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    code: '',
    barcode: '',
    shortName: '',
    slug: '',
    description: '',
    longDescription: '',
    // i18n (inglés)
    nameEn: '',
    shortNameEn: '',
    descriptionEn: '',
    longDescriptionEn: '',
    // Classification
    productType: 'finished_good' as string,
    categoryId: '',
    unitId: '',
    brand: 'Tonic Life',
    kitPosition: '',
    kitDeductsInventory: false,
    // MLM
    pointsValue: '',
    businessVolume: '',
    qualifiesForCommission: true,
    // Tax / SAT
    satProductCode: '',
    satUnitCode: '',
    taxRuleId: '',
    isTaxExempt: false,
    // Inventory
    tracksInventory: true,
    tracksLots: false,
    minStockAlert: '',
    maxStockLevel: '',
    reorderPoint: '',
    reorderQuantity: '',
    // Physical
    weightKg: '',
    volumeCm3: '',
    // E-commerce / POS
    isVisibleEcommerce: true,
    isFeatured: false,
    availableInPos: true,
    // SEO
    metaTitle: '',
    metaDescription: '',
    // Status
    isActive: true,
    sortOrder: '0',
  });

  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'precios' | 'inventario'>('general');
  const [isInitialized, setIsInitialized] = useState(false);

  // Confirmation modal for sensitive toggles (tracksInventory / tracksLots)
  const [pendingToggle, setPendingToggle] = useState<{ field: string; newValue: boolean } | null>(null);

  // Pre-fill form when product data loads
  useEffect(() => {
    if (product && !isInitialized) {
      setFormData({
        name: product.name || '',
        code: product.code || '',
        barcode: product.barcode || '',
        shortName: product.shortName || '',
        slug: product.slug || '',
        description: product.description || '',
        longDescription: product.longDescription || '',
        nameEn: product.nameEn || '',
        shortNameEn: product.shortNameEn || '',
        descriptionEn: product.descriptionEn || '',
        longDescriptionEn: product.longDescriptionEn || '',
        productType: product.productType || 'finished_good',
        categoryId: product.categoryId || '',
        unitId: product.unitId || '',
        brand: product.brand || 'Tonic Life',
        kitPosition: product.kitPosition || '',
        kitDeductsInventory: product.kitDeductsInventory ?? false,
        pointsValue: product.pointsValue?.toString() || '',
        businessVolume: product.businessVolume?.toString() || '',
        qualifiesForCommission: product.qualifiesForCommission ?? true,
        satProductCode: product.satProductCode || '',
        satUnitCode: product.satUnitCode || '',
        taxRuleId: product.taxRuleId || '',
        isTaxExempt: product.isTaxExempt ?? false,
        tracksInventory: product.tracksInventory ?? true,
        tracksLots: product.tracksLots ?? false,
        minStockAlert: product.minStockAlert?.toString() || '',
        maxStockLevel: product.maxStockLevel?.toString() || '',
        reorderPoint: product.reorderPoint?.toString() || '',
        reorderQuantity: product.reorderQuantity?.toString() || '',
        weightKg: product.weightKg?.toString() || '',
        volumeCm3: product.volumeCm3?.toString() || '',
        isVisibleEcommerce: product.isVisibleEcommerce ?? true,
        isFeatured: product.isFeatured ?? false,
        availableInPos: product.availableInPos ?? true,
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        isActive: product.isActive ?? true,
        sortOrder: product.sortOrder?.toString() || '0',
      });
      setIsInitialized(true);
    }
  }, [product, isInitialized]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // Intercept sensitive toggles — require confirmation
    if (type === 'checkbox' && SENSITIVE_TOGGLE_INFO[name]) {
      setPendingToggle({ field: name, newValue: checked });
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Auto-generate slug from name
    if (name === 'name') {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }

    // Auto-set kitDeductsInventory based on productType
    if (name === 'productType') {
      setFormData(prev => ({
        ...prev,
        kitDeductsInventory: value === 'kit' ? prev.kitDeductsInventory : false,
      }));
    }
  };

  const confirmToggle = () => {
    if (!pendingToggle) return;
    setFormData(prev => ({ ...prev, [pendingToggle.field]: pendingToggle.newValue }));
    const info = SENSITIVE_TOGGLE_INFO[pendingToggle.field];
    toast.success(`${info.title} ${pendingToggle.newValue ? 'activado' : 'desactivado'} — recuerda guardar los cambios`);
    setPendingToggle(null);
  };

  const cancelToggle = () => setPendingToggle(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      toast.error('Por favor completa los campos requeridos: Nombre y Codigo');
      return;
    }

    const dto: UpdateProductDto = {
      code: formData.code,
      // Campos de texto opcionales: null (no undefined) para que vaciar
      // el campo BORRE el valor en BD en lugar de dejarlo como estaba.
      barcode: formData.barcode || null,
      name: formData.name,
      shortName: formData.shortName || null,
      description: formData.description || null,
      longDescription: formData.longDescription || null,
      nameEn: formData.nameEn || null,
      shortNameEn: formData.shortNameEn || null,
      descriptionEn: formData.descriptionEn || null,
      longDescriptionEn: formData.longDescriptionEn || null,
      categoryId: formData.categoryId || undefined,
      unitId: formData.unitId || undefined,
      brand: formData.brand || undefined,
      productType: formData.productType as ProductType || undefined,
      kitPosition: formData.kitPosition
        ? (formData.kitPosition as KitPosition)
        : undefined,
      kitDeductsInventory: formData.kitDeductsInventory,
      pointsValue: formData.pointsValue ? parseFloat(formData.pointsValue) : undefined,
      businessVolume: formData.businessVolume ? parseFloat(formData.businessVolume) : undefined,
      qualifiesForCommission: formData.qualifiesForCommission,
      satProductCode: formData.satProductCode || undefined,
      satUnitCode: formData.satUnitCode || undefined,
      taxRuleId: formData.taxRuleId || undefined,
      isTaxExempt: formData.isTaxExempt,
      tracksInventory: formData.tracksInventory,
      tracksLots: formData.tracksLots,
      minStockAlert: formData.minStockAlert ? parseFloat(formData.minStockAlert) : undefined,
      maxStockLevel: formData.maxStockLevel ? parseFloat(formData.maxStockLevel) : undefined,
      reorderPoint: formData.reorderPoint ? parseFloat(formData.reorderPoint) : undefined,
      reorderQuantity: formData.reorderQuantity ? parseFloat(formData.reorderQuantity) : undefined,
      weightKg: formData.weightKg ? parseFloat(formData.weightKg) : undefined,
      volumeCm3: formData.volumeCm3 ? parseFloat(formData.volumeCm3) : undefined,
      isVisibleEcommerce: formData.isVisibleEcommerce,
      isFeatured: formData.isFeatured,
      availableInPos: formData.availableInPos,
      slug: formData.slug || undefined,
      metaTitle: formData.metaTitle || undefined,
      metaDescription: formData.metaDescription || undefined,
      sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : undefined,
      isActive: formData.isActive,
    };

    updateProduct.mutate(
      { id, dto },
      {
        onSuccess: () => {
          toast.success('Producto actualizado exitosamente');
        },
        onError: (error: any) => {
          const message = error?.response?.data?.message || error?.message || 'Error al actualizar el producto';
          toast.error(typeof message === 'string' ? message : 'Error al actualizar el producto');
        },
      }
    );
  };

  const inputClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3E667D]';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2';

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-[#3E667D] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Cargando producto...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || (!isLoading && !product)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Producto no encontrado</h2>
            <p className="text-gray-600 mb-6">
              No se pudo encontrar el producto solicitado. Es posible que haya sido eliminado.
            </p>
            <Link href="/admin/productos">
              <Button variant="default">Volver a Productos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Editar Producto</h1>
                <p className="text-gray-600">{product?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/productos"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </Link>
              {activeTab !== 'media' && (
                <Button
                  variant="default"
                  onClick={handleSubmit}
                  disabled={updateProduct.isPending}
                >
                  {updateProduct.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['general', 'media', 'precios', 'inventario'] as const).map((tab) => {
            const labels = { general: 'General', media: 'Imágenes y ficha', precios: 'Precios y Fiscal', inventario: 'Inventario' };
            return (
              <Button
                key={tab}
                type="button"
                variant="ghost"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
                  activeTab === tab
                    ? 'bg-white border border-gray-200 border-b-white text-[#3E667D]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {labels[tab]}
              </Button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ===== TAB: GENERAL ===== */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card className="p-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Informacion Basica</h2>
                    <div className="space-y-4">
                      <div>
                        <label className={labelClass}>Nombre del Producto *</label>
                        <Input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Ej: Proteina Vegana Chocolate"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Codigo *</label>
                          <Input
                            type="text"
                            name="code"
                            required
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="TL-PROT-001"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Slug (URL)</label>
                          <Input
                            type="text"
                            name="slug"
                            value={formData.slug}
                            onChange={handleChange}
                            placeholder="proteina-vegana-chocolate"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Nombre Corto</label>
                        <Input
                          type="text"
                          name="shortName"
                          maxLength={100}
                          value={formData.shortName}
                          onChange={handleChange}
                          placeholder="Nombre breve para listados y tickets"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Descripcion</label>
                        <textarea
                          name="description"
                          rows={4}
                          value={formData.description}
                          onChange={handleChange}
                          className={`${inputClass} resize-none`}
                          placeholder="Descripcion breve del producto"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Descripcion larga (tienda en linea)</label>
                        <textarea
                          name="longDescription"
                          rows={6}
                          value={formData.longDescription}
                          onChange={handleChange}
                          className={`${inputClass} resize-none`}
                          placeholder="Descripcion detallada para la ficha de producto en e-commerce"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Traducciones (inglés) — tienda EN; vacío usa el español */}
                <Card className="p-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Traducciones (inglés)</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Para la tienda en inglés. Si lo dejas vacío, se muestra el texto en español.
                    </p>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Nombre (EN)</label>
                          <input
                            type="text"
                            name="nameEn"
                            value={formData.nameEn}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Product name in English"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Nombre corto (EN)</label>
                          <input
                            type="text"
                            name="shortNameEn"
                            value={formData.shortNameEn}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Short name in English"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Descripción (EN)</label>
                        <textarea
                          name="descriptionEn"
                          rows={3}
                          value={formData.descriptionEn}
                          onChange={handleChange}
                          className={`${inputClass} resize-none`}
                          placeholder="Short description in English"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Descripción larga (EN)</label>
                        <textarea
                          name="longDescriptionEn"
                          rows={6}
                          value={formData.longDescriptionEn}
                          onChange={handleChange}
                          className={`${inputClass} resize-none`}
                          placeholder="Detailed product description in English"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Classification */}
                <Card className="p-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Clasificacion</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Tipo de Producto</label>
                        <SearchableSelect
                          options={[
                            { value: 'finished_good', label: 'Producto Terminado' },
                            { value: 'raw_material', label: 'Materia Prima' },
                            { value: 'kit', label: 'Kit' },
                            { value: 'promotional', label: 'Promocional' },
                            { value: 'virtual', label: 'Virtual' },
                            { value: 'service', label: 'Servicio' },
                          ]}
                          value={formData.productType}
                          onChange={(val) => {
                            setFormData(prev => ({
                              ...prev,
                              productType: val,
                              kitDeductsInventory: val === 'kit' ? prev.kitDeductsInventory : false,
                            }));
                          }}
                          showAllOption={false}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Categoria</label>
                        <SearchableSelect
                          options={categories?.map((cat) => ({ value: cat.id, label: cat.name })) || []}
                          value={formData.categoryId}
                          onChange={(val) => setFormData(prev => ({ ...prev, categoryId: val }))}
                          showAllOption={true}
                          allLabel="Seleccionar categoria"
                          className="w-full"
                        />
                      </div>
                      {formData.productType === 'kit' && (
                        <div>
                          <label className={labelClass}>Posición del kit (rango)</label>
                          <SearchableSelect
                            options={[
                              { value: 'basic', label: 'Básico' },
                              { value: 'premium', label: 'Premium' },
                              { value: 'preferred', label: 'Preferente' },
                            ]}
                            value={formData.kitPosition}
                            onChange={(val) => setFormData(prev => ({ ...prev, kitPosition: val }))}
                            showAllOption={true}
                            allLabel="Seleccionar posición"
                            className="w-full"
                          />
                        </div>
                      )}
                      {formData.productType === 'kit' && (
                        <div className="col-span-2 flex items-center">
                          <input
                            type="checkbox"
                            name="kitDeductsInventory"
                            id="kitDeductsInventory"
                            checked={formData.kitDeductsInventory}
                            onChange={handleChange}
                            className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded"
                          />
                          <label htmlFor="kitDeductsInventory" className="ml-2 text-sm text-gray-700">
                            El kit deduce inventario de componentes
                          </label>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* SEO */}
                <Card className="p-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">SEO</h2>
                    <div className="space-y-4">
                      <div>
                        <label className={labelClass}>Meta Titulo</label>
                        <Input
                          type="text"
                          name="metaTitle"
                          value={formData.metaTitle}
                          onChange={handleChange}
                          placeholder="Max. 60 caracteres"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Meta Descripcion</label>
                        <textarea
                          name="metaDescription"
                          rows={3}
                          value={formData.metaDescription}
                          onChange={handleChange}
                          className={`${inputClass} resize-none`}
                          placeholder="Max. 160 caracteres"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Status & Visibility */}
                <Card className="p-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Estado y Visibilidad</h2>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded" />
                        <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">Producto Activo</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" name="isVisibleEcommerce" id="isVisibleEcommerce" checked={formData.isVisibleEcommerce} onChange={handleChange} className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded" />
                        <label htmlFor="isVisibleEcommerce" className="ml-2 text-sm text-gray-700">Visible en E-commerce</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" name="isFeatured" id="isFeatured" checked={formData.isFeatured} onChange={handleChange} className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded" />
                        <label htmlFor="isFeatured" className="ml-2 text-sm text-gray-700">Producto Destacado</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" name="qualifiesForCommission" id="qualifiesForCommission" checked={formData.qualifiesForCommission} onChange={handleChange} className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded" />
                        <label htmlFor="qualifiesForCommission" className="ml-2 text-sm text-gray-700">Califica para Comisiones</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" name="availableInPos" id="availableInPos" checked={formData.availableInPos} onChange={handleChange} className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded" />
                        <label htmlFor="availableInPos" className="ml-2 text-sm text-gray-700">Disponible en POS</label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Info */}
                {product && (
                  <Card className="p-0">
                    <CardContent className="p-6">
                      <h2 className="text-lg font-bold text-gray-900 mb-4">Informacion del Registro</h2>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>ID:</span>
                          <span className="font-mono text-xs">{product.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Creado:</span>
                          <span>{new Date(product.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Actualizado:</span>
                          <span>{new Date(product.updatedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ===== TAB: MEDIA (imágenes + ficha técnica) ===== */}
          {activeTab === 'media' && product && (
            <div className="max-w-4xl">
              <ProductMediaSection productId={id} />
            </div>
          )}

          {/* ===== TAB: PRECIOS ===== */}
          {activeTab === 'precios' && (
            <div className="space-y-6 max-w-4xl">
              {/* Precios por País */}
              {product && (
                <ProductPricesSection
                  productId={id}
                  satProductCode={formData.satProductCode}
                  satUnitCode={formData.satUnitCode}
                  onSatFieldChange={handleChange}
                />
              )}
            </div>
          )}

          {/* ===== TAB: INVENTARIO ===== */}
          {activeTab === 'inventario' && (
            <div className="space-y-6">
              {/* Inventory Defaults & Physical */}
              <Card className="p-0 max-w-4xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-6">Configuracion de Inventario</h2>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Propiedades Físicas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Peso (kg)</label>
                      <Input type="number" name="weightKg" step="0.001" value={formData.weightKg} onChange={handleChange} placeholder="0.000" />
                    </div>
                    <div>
                      <label className={labelClass}>Volumen (cm3)</label>
                      <Input type="number" name="volumeCm3" step="0.01" value={formData.volumeCm3} onChange={handleChange} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-8 mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-1.5">
                      <input type="checkbox" name="tracksInventory" id="tracksInventoryTab" checked={formData.tracksInventory} onChange={handleChange} className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded" />
                      <label htmlFor="tracksInventoryTab" className="text-sm text-gray-700">Controla Inventario</label>
                      <div className="relative group">
                        <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-[#3E667D] cursor-help" />
                        <div className="absolute left-6 top-0 z-30 hidden group-hover:block w-72">
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                            <p className="font-semibold mb-1">Controla Inventario</p>
                            <p className="text-gray-300 mb-2">Cuando esta activo, el sistema lleva el conteo de existencias de este producto en cada sucursal. Las ventas descuentan stock automaticamente.</p>
                            <div className="border-t border-gray-700 pt-1.5 mt-1.5">
                              <p className="text-yellow-300 font-medium text-[11px] uppercase tracking-wide mb-0.5">Ejemplo</p>
                              <p className="text-gray-300">Un suplemento fisico como &quot;Omega 3&quot; debe tener control de inventario. Un servicio como &quot;Consulta nutricional&quot; no lo necesita.</p>
                            </div>
                            <div className="absolute -left-1.5 top-2 w-3 h-3 bg-gray-900 rotate-45" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input type="checkbox" name="tracksLots" id="tracksLotsTab" checked={formData.tracksLots} onChange={handleChange} className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded" />
                      <label htmlFor="tracksLotsTab" className="text-sm text-gray-700">Controla Lotes</label>
                      <div className="relative group">
                        <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-[#3E667D] cursor-help" />
                        <div className="absolute left-6 top-0 z-30 hidden group-hover:block w-72">
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                            <p className="font-semibold mb-1">Controla Lotes</p>
                            <p className="text-gray-300 mb-2">Cuando esta activo, cada entrada de inventario se registra con un numero de lote y fecha de caducidad. Permite rastrear de que lote proviene cada unidad vendida.</p>
                            <div className="border-t border-gray-700 pt-1.5 mt-1.5">
                              <p className="text-yellow-300 font-medium text-[11px] uppercase tracking-wide mb-0.5">Ejemplo</p>
                              <p className="text-gray-300">Suplementos con fecha de caducidad como &quot;Colageno Hidrolizado - Lote L2025-03A, Cad: 2026-09&quot;. Si hay un retiro, puedes identificar las unidades afectadas por lote.</p>
                            </div>
                            <div className="absolute -left-1.5 top-2 w-3 h-3 bg-gray-900 rotate-45" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inventario por Sucursal */}
              {product && (
                <ProductInventoryByBranch
                  productId={id}
                  defaults={{
                    minStockAlert: parseFloat(formData.minStockAlert) || 0,
                    maxStockLevel: parseFloat(formData.maxStockLevel) || 0,
                    reorderPoint: parseFloat(formData.reorderPoint) || 0,
                    reorderQuantity: parseFloat(formData.reorderQuantity) || 0,
                  }}
                />
              )}
            </div>
          )}
        </form>
      </div>

      {/* Confirmation modal for sensitive inventory toggles */}
      {pendingToggle && (() => {
        const info = SENSITIVE_TOGGLE_INFO[pendingToggle.field];
        const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Usuario';
        const userEmail = currentUser?.email || '';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              {/* Header */}
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3">
                <ShieldExclamationIcon className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-gray-900">Confirmar cambio</h3>
                  <p className="text-xs text-gray-500">{info.title}</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    pendingToggle.newValue
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {pendingToggle.newValue ? 'Activar' : 'Desactivar'}
                  </span>
                  <span className="text-sm text-gray-700 font-medium">{info.title}</span>
                </div>

                <p className="text-sm text-gray-600">
                  {pendingToggle.newValue ? info.onMessage : info.offMessage}
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                    {info.warning}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-1">Responsable del cambio</p>
                  <p className="text-sm font-medium text-gray-800">{userName}</p>
                  {userEmail && <p className="text-xs text-gray-500">{userEmail}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelToggle}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant={pendingToggle.newValue ? 'success' : 'destructive'}
                  onClick={confirmToggle}
                >
                  {pendingToggle.newValue ? 'Sí, activar' : 'Sí, desactivar'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
