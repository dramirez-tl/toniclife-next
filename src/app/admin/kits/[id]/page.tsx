'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  GiftIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKit } from '@/hooks/useKits';
import { useProducts, useUpdateProduct } from '@/hooks/useProducts';
import {
  KitType,
  KitPosition,
  KIT_POSITION_LABEL,
} from '@/types/product';
import { ProductPricesSection } from '@/components/admin/products/ProductPricesSection';
import { ProductInventoryByBranch } from '@/components/admin/products/ProductInventoryByBranch';
import { ProductMediaSection } from '@/components/admin/products/ProductMediaSection';
import { KitBonusesSection } from '@/components/admin/products/KitBonusesSection';
import { ProductComponentsSection } from '@/components/admin/products/ProductComponentsSection';

type Tab =
  | 'general'
  | 'componentes'
  | 'precios'
  | 'bonos'
  | 'inventario'
  | 'media';

const TAB_LABELS: Record<Tab, string> = {
  general: 'General',
  componentes: 'Componentes',
  precios: 'Precios y Fiscal',
  bonos: 'Bono de inscripción',
  inventario: 'Inventario',
  media: 'Imágenes y ficha',
};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export default function EditarKitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: kit, isLoading: kitLoading } = useKit(id);
  const updateProduct = useUpdateProduct();

  const [activeTab, setActiveTab] = useState<Tab>('general');

  // -------- datos del kit --------
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');
  const [kitPosition, setKitPosition] = useState<KitPosition | ''>('');
  const [isEnrollmentKit, setIsEnrollmentKit] = useState(false);
  const [kitType, setKitType] = useState<KitType | ''>('');
  const [kitDeductsInventory, setKitDeductsInventory] = useState(true);
  const [qualifiesForCommission, setQualifiesForCommission] = useState(true);
  const [availableInPos, setAvailableInPos] = useState(true);
  const [isVisibleEcommerce, setIsVisibleEcommerce] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [satProductCode, setSatProductCode] = useState('');
  const [satUnitCode, setSatUnitCode] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (kit) {
      setCode(kit.code);
      setName(kit.name);
      setShortName(kit.shortName ?? '');
      setDescription(kit.description ?? '');
      setKitPosition((kit.kitPosition as KitPosition) || '');
      setIsEnrollmentKit(kit.isEnrollmentKit ?? false);
      setKitType((kit.kitType as KitType) || '');
      setKitDeductsInventory(kit.kitDeductsInventory ?? false);
      setQualifiesForCommission(kit.qualifiesForCommission ?? true);
      setAvailableInPos(kit.availableInPos ?? true);
      setIsVisibleEcommerce(kit.isVisibleEcommerce ?? true);
      setIsFeatured(kit.isFeatured ?? false);
      setSatProductCode(kit.satProductCode ?? '');
      setSatUnitCode(kit.satUnitCode ?? '');
      setIsActive(kit.isActive);
    }
  }, [kit]);

  // Validación inline de código único (excluye el kit actual)
  const trimmedCode = code.trim();
  const { data: codeMatches } = useProducts(
    trimmedCode.length >= 2 ? { search: trimmedCode, limit: 10 } : { limit: 0 },
  );
  const codeConflict =
    trimmedCode.length >= 2
      ? (codeMatches?.data ?? []).find(
          (p) =>
            (p.code ?? '').toUpperCase() === trimmedCode.toUpperCase() &&
            p.id !== kit?.id,
        )
      : undefined;
  const codeTaken = !!codeConflict;

  const handleSaveDetails = async () => {
    if (!kit) return;
    if (!code.trim()) {
      toast.error('El código es requerido');
      return;
    }
    if (/\s/.test(code)) {
      toast.error('El código no debe contener espacios');
      return;
    }
    if (codeTaken) {
      toast.error('Ya existe un producto/kit con ese código');
      return;
    }
    if (isEnrollmentKit && !kitPosition) {
      toast.error('Un kit de inscripción requiere posición (Básico, Premium o Preferente)');
      return;
    }
    try {
      await updateProduct.mutateAsync({
        id: kit.id,
        dto: {
          code: code.trim().toUpperCase(),
          name,
          // null (no undefined): vaciar el campo debe BORRARLO en BD.
          shortName: shortName.trim() || null,
          description: description.trim() || null,
          kitPosition: (kitPosition || undefined) as KitPosition | undefined,
          isEnrollmentKit,
          kitType: (kitType || undefined) as KitType | undefined,
          kitDeductsInventory,
          qualifiesForCommission,
          availableInPos,
          isVisibleEcommerce,
          isFeatured,
          satProductCode: satProductCode.trim() || undefined,
          satUnitCode: satUnitCode.trim() || undefined,
          isActive,
        },
      });
      toast.success('Datos del kit actualizados');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al actualizar';
      toast.error(msg);
    }
  };

  if (kitLoading || !kit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="size-5 animate-spin" /> Cargando kit...
        </div>
      </div>
    );
  }

  const inventoryDefaults = {
    minStockAlert: parseFloat(kit.minStockAlert ?? '0') || 0,
    maxStockLevel: parseFloat(kit.maxStockLevel ?? '0') || 0,
    reorderPoint: parseFloat(kit.reorderPoint ?? '0') || 0,
    reorderQuantity: parseFloat(kit.reorderQuantity ?? '0') || 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <Link href="/admin/productos?tab=kits" className="inline-flex items-center text-white/80 hover:text-white mb-3 text-sm">
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver a Kits
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <GiftIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">{kit.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 pb-2">
            <span className="bg-white/15 px-3 py-1 rounded text-sm font-mono">{kit.code}</span>
            {kit.kitPosition && (
              <span className="bg-white/15 px-3 py-1 rounded text-sm">
                Posición: {KIT_POSITION_LABEL[kit.kitPosition as KitPosition] || kit.kitPosition}
              </span>
            )}
            <span className={`px-3 py-1 rounded text-sm ${kit.isActive ? 'bg-emerald-400/20 text-emerald-50' : 'bg-white/15'}`}>
              {kit.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-white/20 overflow-x-auto" role="tablist">
            {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
              const isActiveTab = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActiveTab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    isActiveTab
                      ? 'border-white text-white'
                      : 'border-transparent text-white/70 hover:text-white hover:border-white/40'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ===== GENERAL ===== */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Datos del kit</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Código <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                      placeholder="KBC02"
                      className={`w-full px-3 py-2 border rounded-md font-mono uppercase focus:outline-none focus:ring-2 ${
                        codeTaken ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-[#3E667D]'
                      }`}
                    />
                    {codeTaken ? (
                      <p className="mt-1 text-xs text-red-600">
                        Ya existe un producto/kit con el código “{trimmedCode}”. Usa otro.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Identificador único, sin espacios. Es la clave por la que se busca en el POS.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>
                      Posición {isEnrollmentKit && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={kitPosition}
                      onChange={(e) => setKitPosition(e.target.value as KitPosition | '')}
                      className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-400`}
                      disabled={!isEnrollmentKit}
                    >
                      <option value="">Sin posición</option>
                      <option value={KitPosition.BASIC}>{KIT_POSITION_LABEL.basic}</option>
                      <option value={KitPosition.PREMIUM}>{KIT_POSITION_LABEL.premium}</option>
                      <option value={KitPosition.PREFERRED}>{KIT_POSITION_LABEL.preferred}</option>
                    </select>
                    {!isEnrollmentKit && (
                      <p className="text-xs text-gray-500 mt-1">Solo aplica para kits de inscripción</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Nombre</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Nombre corto</label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    maxLength={100}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Modo de costeo</label>
                  <select
                    value={kitType}
                    onChange={(e) => setKitType(e.target.value as KitType | '')}
                    className={inputClass}
                  >
                    <option value="">Sin definir</option>
                    <option value={KitType.FIXED}>Fijo (precio propio)</option>
                    <option value={KitType.DYNAMIC}>Dinámico (suma de componentes)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Modo de costeo del kit: fijo (precio propio) o dinámico (descuenta inventario de componentes)</p>
                </div>

                {/* Datos fiscales (SAT) */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos SAT (México)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Clave Producto SAT</label>
                      <input
                        type="text"
                        value={satProductCode}
                        onChange={(e) => setSatProductCode(e.target.value)}
                        placeholder="c_ClaveProdServ"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Clave Unidad SAT</label>
                      <input
                        type="text"
                        value={satUnitCode}
                        onChange={(e) => setSatUnitCode(e.target.value)}
                        placeholder="c_ClaveUnidad"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="default"
                    onClick={handleSaveDetails}
                    disabled={updateProduct.isPending || codeTaken}
                  >
                    {updateProduct.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    <CheckIcon className="h-4 w-4" />
                    Guardar datos
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar: configuración / banderas */}
            <Card className="lg:col-span-1">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Configuración y visibilidad</h2>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnrollmentKit}
                    onChange={(e) => setIsEnrollmentKit(e.target.checked)}
                    className="h-4 w-4 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Kit de inscripción de distribuidor</span>
                    <p className="text-xs text-gray-500">
                      Vender este kit en POS abre el alta de distribuidor y paga bono al sponsor. Requiere posición.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kitDeductsInventory}
                    onChange={(e) => setKitDeductsInventory(e.target.checked)}
                    className="h-4 w-4 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Descontar inventario de componentes</span>
                    <p className="text-xs text-gray-500">Al vender el kit, se descuenta stock de cada componente.</p>
                  </div>
                </label>

                <div className="border-t pt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={qualifiesForCommission} onChange={(e) => setQualifiesForCommission(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-gray-700">Genera comisiones MLM</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={availableInPos} onChange={(e) => setAvailableInPos(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-gray-700">Disponible en POS</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isVisibleEcommerce} onChange={(e) => setIsVisibleEcommerce(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-gray-700">Visible en tienda en línea</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-gray-700">Destacado</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm font-medium text-gray-700">Kit activo</span>
                  </label>
                </div>

                <div className="border-t pt-4 text-xs text-gray-500">
                  <p>El ID y las fechas se gestionan automáticamente. Recuerda pulsar <strong>Guardar datos</strong> tras cambiar algo.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== COMPONENTES (compositor compartido con el editor de producto) ===== */}
        {activeTab === 'componentes' && (
          <ProductComponentsSection
            productId={id}
            deductsInventory={kitDeductsInventory}
            noun="kit"
          />
        )}

        {/* ===== PRECIOS Y FISCAL ===== */}
        {activeTab === 'precios' && (
          <div className="max-w-4xl">
            <ProductPricesSection productId={id} />
          </div>
        )}

        {/* ===== BONO DE INSCRIPCIÓN ===== */}
        {activeTab === 'bonos' && (
          <div className="max-w-4xl">
            <KitBonusesSection kitId={id} isEnrollmentKit={isEnrollmentKit} />
          </div>
        )}

        {/* ===== INVENTARIO ===== */}
        {activeTab === 'inventario' && (
          <ProductInventoryByBranch productId={id} defaults={inventoryDefaults} />
        )}

        {/* ===== IMÁGENES Y FICHA ===== */}
        {activeTab === 'media' && (
          <div className="max-w-4xl">
            <ProductMediaSection productId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
