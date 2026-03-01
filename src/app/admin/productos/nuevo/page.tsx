'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCreateProduct, useCategories } from '@/hooks/useProducts';
import type { CreateProductDto } from '@/types/product';
import { ProductType, KitType } from '@/types/product';
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
    // Classification
    productType: 'finished_good' as string,
    categoryId: '',
    unitId: '',
    brand: 'Tonic Life',
    kitType: '',
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
    // UI-only fields
    imageUrl: '',
    videoUrl: '',
    usageInstructions: '',
    usageFormat: '',
    ingredients: '',
    warnings: '',
  });

  const [healthBenefits, setHealthBenefits] = useState<string[]>(['']);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

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

  const addHealthBenefit = () => setHealthBenefits([...healthBenefits, '']);
  const removeHealthBenefit = (index: number) => setHealthBenefits(healthBenefits.filter((_, i) => i !== index));
  const updateHealthBenefit = (index: number, value: string) => {
    const updated = [...healthBenefits];
    updated[index] = value;
    setHealthBenefits(updated);
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
      categoryId: formData.categoryId || undefined,
      unitId: formData.unitId || undefined,
      brand: formData.brand || undefined,
      productType: formData.productType as ProductType || undefined,
      kitType: formData.kitType ? (formData.kitType as KitType) : undefined,
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
            <Card padding="none">
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
                    <label className={labelClass}>Descripcion Corta</label>
                    <textarea
                      name="shortName"
                      rows={3}
                      value={formData.shortName}
                      onChange={handleChange}
                      className={`${inputClass} resize-none`}
                      placeholder="Descripcion breve para listados (max. 160 caracteres)"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Descripcion Completa</label>
                    <textarea
                      name="description"
                      rows={6}
                      value={formData.description}
                      onChange={handleChange}
                      className={`${inputClass} resize-none`}
                      placeholder="Descripcion detallada del producto"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Classification */}
            <Card padding="none">
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
                      <label className={labelClass}>Tipo de Kit</label>
                      <SearchableSelect
                        options={[
                          { value: 'basico', label: 'Basico' },
                          { value: 'premium', label: 'Premium' },
                          { value: 'preferente', label: 'Preferente' },
                        ]}
                        value={formData.kitType}
                        onChange={(val) => setFormData(prev => ({ ...prev, kitType: val }))}
                        showAllOption={true}
                        allLabel="Seleccionar tipo de kit"
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing & MLM */}
            <Card padding="none">
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
            <Card padding="none">
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

            {/* Usage & Health */}
            <Card padding="none">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Uso y Salud</h2>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Instrucciones de Uso</label>
                    <textarea
                      name="usageInstructions"
                      rows={3}
                      value={formData.usageInstructions}
                      onChange={handleChange}
                      className={`${inputClass} resize-none`}
                      placeholder="Ej: Tomar 2 capsulas al dia con alimentos"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Formato de Uso</label>
                    <input
                      type="text"
                      name="usageFormat"
                      value={formData.usageFormat}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Ej: Capsulas, Polvo, Liquido"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ingredientes</label>
                    <textarea
                      name="ingredients"
                      rows={3}
                      value={formData.ingredients}
                      onChange={handleChange}
                      className={`${inputClass} resize-none`}
                      placeholder="Lista de ingredientes del producto"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Advertencias</label>
                    <textarea
                      name="warnings"
                      rows={3}
                      value={formData.warnings}
                      onChange={handleChange}
                      className={`${inputClass} resize-none`}
                      placeholder="Advertencias y contraindicaciones"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Benefits */}
            <Card padding="none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Beneficios de Salud</h2>
                  <button
                    type="button"
                    onClick={addHealthBenefit}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-[#3E667D] text-white rounded-lg hover:bg-[#6ba625]"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {healthBenefits.map((benefit, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => updateHealthBenefit(index, e.target.value)}
                        className={`flex-1 ${inputClass}`}
                        placeholder="Ej: Aumenta masa muscular magra"
                      />
                      {healthBenefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHealthBenefit(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SEO */}
            <Card padding="none">
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
                  <div>
                    <label className={labelClass}>Meta Description</label>
                    <input
                      type="text"
                      name="metaDescription"
                      value={formData.metaDescription}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Descripcion para motores de busqueda"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card padding="none">
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
                  <div>
                    <label className={labelClass}>Orden de Aparicion</label>
                    <input
                      type="number"
                      name="sortOrder"
                      value={formData.sortOrder}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card padding="none">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Media</h2>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>URL de Imagen Principal</label>
                    <input
                      type="url"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>URL de Video</label>
                    <input
                      type="url"
                      name="videoUrl"
                      value={formData.videoUrl}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2">Arrastra imagenes aqui o</p>
                    <button
                      type="button"
                      className="text-sm text-[#3E667D] font-medium hover:underline"
                    >
                      Seleccionar archivos
                    </button>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG hasta 5MB</p>
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
