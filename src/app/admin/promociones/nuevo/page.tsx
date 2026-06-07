'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreateProduct } from '@/hooks/useProducts';
import { ProductType } from '@/types/product';
import type { CreateProductDto } from '@/types/product';

export default function NuevaPromocionPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  const [form, setForm] = useState({
    code: '',
    name: '',
    shortName: '',
    description: '',
    longDescription: '',
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

    const dto: CreateProductDto = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      shortName: form.shortName.trim() || undefined,
      description: form.description.trim() || undefined,
      longDescription: form.longDescription.trim() || undefined,
      productType: ProductType.PROMOTIONAL,
      // Promos no generan puntos ni comisiones — se canjean por puntos del periodo.
      pointsValue: 0,
      businessVolume: 0,
      qualifiesForCommission: false,
      // El descuento de stock se hace siempre desde componentes (BoM).
      // El campo kitDeductsInventory aplica a kits; para promos el backend
      // detecta product_type='promotional' y descuenta componentes igual.
      kitDeductsInventory: true,
      tracksInventory: false,
      isVisibleEcommerce: form.isVisibleEcommerce,
      isFeatured: form.isFeatured,
      availableInPos: form.availableInPos,
      isActive: form.isActive,
    };

    try {
      const created = await createProduct.mutateAsync(dto);
      toast.success('Promoción creada. Ahora agrega componentes y reglas de canje por país.');
      router.push(`/admin/promociones/${created.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear la promoción';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/admin/productos?tab=promociones" className="inline-flex items-center text-white/80 hover:text-white mb-3 text-sm">
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver a Promociones
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <SparklesIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Nueva Promoción</h1>
          </div>
          <p className="text-base text-white/80">
            Define los datos básicos. Después agregas los componentes y las reglas de canje por país.
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
                  placeholder="PROMO99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D] uppercase font-mono"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Identificador único (ej. PROMO99, PROMO100)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Promo 4 Mil Puntos Mayo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre corto</label>
              <input
                type="text"
                value={form.shortName}
                onChange={(e) => handleChange('shortName', e.target.value)}
                placeholder="Promo 4M Mayo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                placeholder="Promoción canjeable al alcanzar el umbral de puntos del periodo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción tienda en línea</label>
              <textarea
                value={form.longDescription}
                onChange={(e) => handleChange('longDescription', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Visibilidad</h2>

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
              <span className="text-sm font-medium text-gray-700">Visible en tienda en línea</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => handleChange('isFeatured', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Destacar</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Promoción activa</span>
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/admin/productos?tab=promociones">
            <Button variant="ghost">Cancelar</Button>
          </Link>
          <Button type="submit" variant="default" disabled={createProduct.isPending}>
            {createProduct.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Crear promoción
          </Button>
        </div>
      </form>
    </div>
  );
}
