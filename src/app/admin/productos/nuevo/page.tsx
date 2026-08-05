'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreateProduct, useCategories } from '@/hooks/useProducts';
import type { CreateProductDto } from '@/types/product';
import { ProductType, KitPosition } from '@/types/product';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function NuevoProductoAdminPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();
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
    // English (tienda EN; vacío usa el español)
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
    // E-commerce
    isVisibleEcommerce: true,
    isFeatured: false,
    // SEO
    metaTitle: '',
    metaDescription: '',
    // Status
    isActive: true,
    sortOrder: '0',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      toast.error('Por favor completa los campos requeridos: Nombre y Codigo');
      return;
    }

    const dto: CreateProductDto = {
      code: formData.code,
      barcode: formData.barcode || undefined,
      name: formData.name,
      shortName: formData.shortName || undefined,
      description: formData.description || undefined,
      longDescription: formData.longDescription || undefined,
      nameEn: formData.nameEn || undefined,
      shortNameEn: formData.shortNameEn || undefined,
      descriptionEn: formData.descriptionEn || undefined,
      longDescriptionEn: formData.longDescriptionEn || undefined,
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
      slug: formData.slug || undefined,
      metaTitle: formData.metaTitle || undefined,
      metaDescription: formData.metaDescription || undefined,
      sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : undefined,
      isActive: formData.isActive,
    };

    createProduct.mutate(dto, {
      onSuccess: () => {
        toast.success('Producto creado exitosamente');
        router.push('/admin/productos');
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || error?.message || 'Error al crear el producto';
        toast.error(typeof message === 'string' ? message : 'Error al crear el producto');
      },
    });
  };

  const inputClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3E667D]';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/productos"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nuevo Producto</h1>
                <p className="text-gray-600">Completa la informacion del producto</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/productos"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                onClick={handleSubmit}
                disabled={createProduct.isPending}
                className="px-6 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#002855] transition-colors disabled:opacity-50"
              >
                {createProduct.isPending ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="p-0">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Informacion Basica</h2>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Nombre del Producto *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Ej: Proteina Vegana Chocolate"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Codigo *</label>
                      <input
                        type="text"
                        name="code"
                        required
                        value={formData.code}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="TL-PROT-001"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Slug (URL)</label>
                      <input
                        type="text"
                        name="slug"
                        value={formData.slug}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="proteina-vegana-chocolate"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Nombre Corto</label>
                    <input
                      type="text"
                      name="shortName"
                      maxLength={100}
                      value={formData.shortName}
                      onChange={handleChange}
                      className={inputClass}
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
                        maxLength={100}
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
                        { value: 'kit', label: 'Kit / Paquete (con componentes)' },
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
                    <p className="col-span-2 text-xs text-gray-500">
                      Guarda el producto y carga su composición en la pestaña{' '}
                      <strong>Componentes</strong> al editarlo.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing & MLM */}
            <Card className="p-0">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">MLM y Fiscal</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Puntos Personales</label>
                    <input
                      type="number"
                      name="pointsValue"
                      step="0.01"
                      value={formData.pointsValue}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Volumen de Negocio</label>
                    <input
                      type="number"
                      name="businessVolume"
                      step="0.01"
                      value={formData.businessVolume}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Clave Producto SAT</label>
                    <input
                      type="text"
                      name="satProductCode"
                      value={formData.satProductCode}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="c_ClaveProdServ"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Clave Unidad SAT</label>
                    <input
                      type="text"
                      name="satUnitCode"
                      value={formData.satUnitCode}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="c_ClaveUnidad"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isTaxExempt"
                        id="isTaxExempt"
                        checked={formData.isTaxExempt}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded"
                      />
                      <label htmlFor="isTaxExempt" className="ml-2 text-sm text-gray-700">
                        Exento de impuestos
                      </label>
                    </div>
                  </div>
                  {formData.productType === 'kit' && (
                    <div className="col-span-2">
                      <div className="flex items-center">
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card className="p-0">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Inventario y Fisica</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Alerta Existencias Mínimas</label>
                    <input
                      type="number"
                      name="minStockAlert"
                      step="0.01"
                      value={formData.minStockAlert}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Existencias Máximas</label>
                    <input
                      type="number"
                      name="maxStockLevel"
                      step="0.01"
                      value={formData.maxStockLevel}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Punto de Reorden</label>
                    <input
                      type="number"
                      name="reorderPoint"
                      step="0.01"
                      value={formData.reorderPoint}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Cantidad de Reorden</label>
                    <input
                      type="number"
                      name="reorderQuantity"
                      step="0.01"
                      value={formData.reorderQuantity}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Peso (kg)</label>
                    <input
                      type="number"
                      name="weightKg"
                      step="0.001"
                      value={formData.weightKg}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0.000"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Volumen (cm3)</label>
                    <input
                      type="number"
                      name="volumeCm3"
                      step="0.01"
                      value={formData.volumeCm3}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
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
                    <input
                      type="text"
                      name="metaTitle"
                      value={formData.metaTitle}
                      onChange={handleChange}
                      className={inputClass}
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
            {/* Status */}
            <Card className="p-0">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Estado y Visibilidad</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                      Producto Activo
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isVisibleEcommerce"
                      id="isVisibleEcommerce"
                      checked={formData.isVisibleEcommerce}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded"
                    />
                    <label htmlFor="isVisibleEcommerce" className="ml-2 text-sm text-gray-700">
                      Visible en E-commerce
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded"
                    />
                    <label htmlFor="isFeatured" className="ml-2 text-sm text-gray-700">
                      Producto Destacado
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="tracksInventory"
                      id="tracksInventory"
                      checked={formData.tracksInventory}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded"
                    />
                    <label htmlFor="tracksInventory" className="ml-2 text-sm text-gray-700">
                      Controla Inventario
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="tracksLots"
                      id="tracksLots"
                      checked={formData.tracksLots}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded"
                    />
                    <label htmlFor="tracksLots" className="ml-2 text-sm text-gray-700">
                      Controla Lotes
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="qualifiesForCommission"
                      id="qualifiesForCommission"
                      checked={formData.qualifiesForCommission}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#3E667D] focus:ring-[#3E667D] border-gray-300 rounded"
                    />
                    <label htmlFor="qualifiesForCommission" className="ml-2 text-sm text-gray-700">
                      Califica para Comisiones
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </form>
      </div>
    </div>
  );
}
