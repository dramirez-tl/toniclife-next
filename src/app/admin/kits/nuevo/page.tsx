'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, GiftIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCreateProduct } from '@/hooks/useProducts';
import { ProductType, KitType, KitPosition, KIT_POSITION_LABEL } from '@/types/product';
import type { CreateProductDto } from '@/types/product';

export default function NuevoKitPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  const [form, setForm] = useState({
    code: '',
    name: '',
    shortName: '',
    description: '',
    kitPosition: '' as KitPosition | '',
    kitType: KitType.PREMIUM, // 'basico' / 'premium' / 'preferente' (modo costeo)
    isEnrollmentKit: true,
    kitDeductsInventory: true,
    qualifiesForCommission: true,
    isVisibleEcommerce: true,
    isFeatured: false,
    availableInPos: true,
    isActive: true,
  });

  const handleChange = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Código y nombre son requeridos');
      return;
    }
    if (form.isEnrollmentKit && !form.kitPosition) {
      toast.error('Un kit de inscripción requiere posición (Básico, Premium o Preferente)');
      return;
    }

    const dto: CreateProductDto = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      shortName: form.shortName.trim() || undefined,
      description: form.description.trim() || undefined,
      productType: ProductType.KIT,
      kitType: form.kitType,
      kitPosition: form.kitPosition || undefined,
      isEnrollmentKit: form.isEnrollmentKit,
      kitDeductsInventory: form.kitDeductsInventory,
      qualifiesForCommission: form.qualifiesForCommission,
      isVisibleEcommerce: form.isVisibleEcommerce,
      isFeatured: form.isFeatured,
      availableInPos: form.availableInPos,
      isActive: form.isActive,
    };

    try {
      const created = await createProduct.mutateAsync(dto);
      toast.success('Kit creado. Ahora añade sus componentes y precios.');
      router.push(`/admin/kits/${created.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear el kit';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/admin/kits" className="inline-flex items-center text-white/80 hover:text-white mb-3 text-sm">
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver a Kits
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <GiftIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Nuevo Kit</h1>
          </div>
          <p className="text-base text-white/80">
            Define los datos básicos. Después agregas componentes y precios por país.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Datos generales</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="KBM10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D] uppercase font-mono"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Identificador único (ej. KBM10, KPM01)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posición {form.isEnrollmentKit && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={form.kitPosition}
                  onChange={(e) => handleChange('kitPosition', e.target.value as KitPosition)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D] disabled:bg-gray-100 disabled:text-gray-400"
                  required={form.isEnrollmentKit}
                  disabled={!form.isEnrollmentKit}
                >
                  <option value="">Seleccionar...</option>
                  <option value={KitPosition.BASIC}>{KIT_POSITION_LABEL.basic}</option>
                  <option value={KitPosition.PREMIUM}>{KIT_POSITION_LABEL.premium}</option>
                  <option value={KitPosition.PREFERENTE}>{KIT_POSITION_LABEL.preferente}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {form.isEnrollmentKit
                    ? 'Rango asignado al inscribirse con este kit'
                    : 'Solo aplica para kits de inscripción'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Kit Básico México"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre corto</label>
              <input
                type="text"
                value={form.shortName}
                onChange={(e) => handleChange('shortName', e.target.value)}
                placeholder="Kit Básico MX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                placeholder="Kit de inicio para inscripción..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Configuración del kit</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modo de costeo</label>
              <select
                value={form.kitType}
                onChange={(e) => handleChange('kitType', e.target.value as KitType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
              >
                <option value={KitType.BASICO}>Básico (costeo)</option>
                <option value={KitType.PREMIUM}>Premium (costeo)</option>
                <option value={KitType.PREFERENTE}>Preferente (costeo)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Categoría usada por reglas de comisiones</p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isEnrollmentKit}
                onChange={(e) => handleChange('isEnrollmentKit', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Kit de inscripción de distribuidor</span>
                <p className="text-xs text-gray-500">
                  Cuando está marcado, vender este kit en POS abre el flujo de alta de distribuidor y paga bono al sponsor. Requiere posición.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.kitDeductsInventory}
                onChange={(e) => handleChange('kitDeductsInventory', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Descontar inventario de componentes</span>
                <p className="text-xs text-gray-500">Al vender este kit, se descuenta stock de cada producto componente</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.qualifiesForCommission}
                onChange={(e) => handleChange('qualifiesForCommission', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Genera comisiones MLM</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.availableInPos}
                onChange={(e) => handleChange('availableInPos', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Disponible en Punto de Venta (POS)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isVisibleEcommerce}
                onChange={(e) => handleChange('isVisibleEcommerce', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Visible en e-commerce público</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Kit activo</span>
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/admin/kits">
            <Button variant="ghost">Cancelar</Button>
          </Link>
          <Button type="submit" variant="primary" isLoading={createProduct.isPending}>
            Crear kit
          </Button>
        </div>
      </form>
    </div>
  );
}
