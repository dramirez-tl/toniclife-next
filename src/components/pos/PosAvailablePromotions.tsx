// components/pos/PosAvailablePromotions.tsx
//
// Strip horizontal arriba del catalogo del POS que muestra las promociones
// canjeables HOY para el distribuidor seleccionado, segun los puntos
// personales acumulados en el periodo abierto.
//
// Aparece automaticamente cuando:
//   - Hay un distribuidor seleccionado (no precio publico).
//   - Hay un pais resuelto (branchCountryId).
//   - El distribuidor ya alcanzo el umbral de al menos UNA promo activa.
//
// Al hacer clic en "Agregar al carrito":
//   - La promo se mete al carrito como un item con precio 0 y puntos 0.
//   - Al cobrar, el backend revalida elegibilidad y descuenta stock de los
//     componentes (no del promo en si).
//   - Si la regla tiene consumes_points=true, el backend descuenta los
//     puntos del periodo al completar el pago.

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { SparklesIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAvailablePromotionsForCustomer, promotionKeys } from '@/hooks/usePromotions';
import { usePosCartStore } from '@/stores/pos-cart.store';
import type { QuickProduct } from '@/types/pos';
import type { AvailablePromotionForCustomer } from '@/types/promotion';

interface PosAvailablePromotionsProps {
  customerId: string;
  countryId: string;
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

export function PosAvailablePromotions({
  customerId,
  countryId,
}: PosAvailablePromotionsProps) {
  const queryClient = useQueryClient();
  const { data: promos, isLoading } = useAvailablePromotionsForCustomer(
    customerId,
    countryId,
  );
  const addItem = usePosCartStore((s) => s.addItem);
  const cartItems = usePosCartStore((s) => s.cart.items);

  // No mostrar nada mientras carga (evita parpadeo en cada cambio de cliente).
  if (isLoading) return null;

  // No mostrar la strip si no hay promos canjeables.
  if (!promos || promos.length === 0) return null;

  const handleAdd = (promo: AvailablePromotionForCustomer) => {
    const alreadyInCart = cartItems.some((it) => it.productId === promo.productId);
    if (alreadyInCart) {
      toast.info(`${promo.code} ya está en el carrito`);
      return;
    }

    const item: QuickProduct = {
      id: promo.productId,
      sku: promo.code,
      name: promo.name,
      slug: promo.code.toLowerCase(),
      basePrice: 0,
      points: 0,
      businessVolume: 0,
      taxRate: 0,
      isIncludedInPrice: false,
      isActive: true,
      productType: 'promotional',
      // Sin tope de stock: la promo descuenta componentes, no a si misma.
      stock: undefined,
    };

    addItem(item, 1);

    // Invalidar el listado de disponibles: si la regla consume puntos al
    // canjear, agregar la promo NO descuenta puntos aun (eso pasa al
    // completar el pago), asi que el cache sigue siendo valido. Pero si la
    // venta se completa despues, el listener de invalidacion en page.tsx
    // tras processPayment lo refresca.
    void queryClient;

    toast.success(`${promo.code} agregada — canje al cobrar`);
  };

  return (
    <div className="mb-3 px-3 py-2.5 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <SparklesIcon className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">
          Promociones disponibles para canje
        </span>
        <span className="text-xs text-amber-700/70">
          ({promos.length}) · {fmt(promos[0].currentPoints)} pts acumulados
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {promos.map((promo) => (
          <button
            key={promo.productId}
            type="button"
            onClick={() => handleAdd(promo)}
            className="flex-shrink-0 group flex items-center gap-3 px-3 py-2 bg-white border border-amber-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all min-w-[240px] text-left"
          >
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-700">
                  {promo.code}
                </span>
                {promo.consumesPoints && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                    Descuenta {fmt(promo.minPointsRequired)} pts
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-800 truncate">
                {promo.name}
              </p>
              <p className="text-xs text-gray-500">
                Requiere {fmt(promo.minPointsRequired)} pts
              </p>
            </div>
            <PlusCircleIcon className="h-6 w-6 text-amber-600 group-hover:text-amber-700 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
