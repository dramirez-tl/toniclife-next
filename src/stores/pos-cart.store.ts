// stores/pos-cart.store.ts - Zustand store for POS cart state
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PosCart, PosCartItem, QuickProduct } from '@/types/pos';

interface PosCartStore {
  cart: PosCart;
  // Actions
  addItem: (product: QuickProduct, quantity?: number) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setCustomer: (customerId?: string, customerName?: string, customerRfc?: string, priceTypeId?: string) => void;
  setPublicPrice: (isPublic: boolean) => void;
  setDiscount: (discountPercent?: number, discountAmount?: number, discountReason?: string) => void;
  setRequiresInvoice: (requiresInvoice: boolean) => void;
  setNotes: (notes?: string) => void;
  recalculateTotals: () => void;
  refreshItemPrices: (prices: Array<{ productId: string; price: number; points: number; businessValue: number }>) => void;
}

const DEFAULT_TAX_RATE = 0; // No tax by default — API sends correct rate per country

const initialCart: PosCart = {
  items: [],
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  totalPoints: 0,
  totalBusinessVolume: 0,
  requiresInvoice: false,
};

const calculateItemTotal = (item: PosCartItem): PosCartItem => {
  const lineAmount = item.unitPrice * item.quantity;
  let lineDiscount = 0;

  if (item.discountPercent) {
    lineDiscount = lineAmount * (item.discountPercent / 100);
  } else if (item.discountAmount) {
    lineDiscount = item.discountAmount * item.quantity;
  }

  const afterDiscount = lineAmount - lineDiscount;
  const taxRate = item.taxRate ?? DEFAULT_TAX_RATE;

  let subtotal: number;
  let taxAmount: number;

  if (item.isIncludedInPrice) {
    // Tax is already included in unitPrice — extract it
    subtotal = afterDiscount / (1 + taxRate);
    taxAmount = afterDiscount - subtotal;
  } else {
    // Tax is on top of unitPrice
    subtotal = afterDiscount;
    taxAmount = subtotal * taxRate;
  }

  const total = subtotal + taxAmount;

  return {
    ...item,
    subtotal,
    taxAmount,
    total,
    discountAmount: lineDiscount,
  };
};

const calculateCartTotals = (cart: PosCart): PosCart => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

  let globalDiscount = 0;
  if (cart.discountPercent) {
    globalDiscount = subtotal * (cart.discountPercent / 100);
  } else if (cart.discountAmount) {
    globalDiscount = cart.discountAmount;
  }

  // Recalculate per-item tax proportionally when there's a global discount
  let taxAmount: number;
  if (globalDiscount > 0 && subtotal > 0) {
    const discountFactor = 1 - (globalDiscount / subtotal);
    taxAmount = cart.items.reduce((sum, item) => {
      const rate = item.taxRate ?? DEFAULT_TAX_RATE;
      return sum + (item.subtotal * discountFactor * rate);
    }, 0);
  } else {
    taxAmount = cart.items.reduce((sum, item) => sum + item.taxAmount, 0);
  }

  const total = (subtotal - globalDiscount) + taxAmount;

  const totalPoints = cart.items.reduce((sum, item) => sum + (item.points * item.quantity), 0);
  const totalBusinessVolume = cart.items.reduce((sum, item) => sum + (item.businessVolume * item.quantity), 0);

  return {
    ...cart,
    subtotal,
    discountAmount: globalDiscount || undefined,
    taxAmount,
    total: Math.max(0, total),
    totalPoints,
    totalBusinessVolume,
  };
};

export const usePosCartStore = create<PosCartStore>()(
  persist(
    (set, get) => ({
      cart: initialCart,

      addItem: (product: QuickProduct, quantity = 1) => {
        set((state) => {
          const existingIndex = state.cart.items.findIndex(
            (item) => item.productId === product.id
          );

          let newItems: PosCartItem[];

          if (existingIndex >= 0) {
            // Update existing item quantity (cap at stock if known)
            newItems = state.cart.items.map((item, index) => {
              if (index === existingIndex) {
                let newQty = item.quantity + quantity;
                if (item.stock != null && newQty > item.stock) {
                  newQty = item.stock;
                }
                if (newQty === item.quantity) return item; // no change
                const updated = { ...item, quantity: newQty };
                return calculateItemTotal(updated);
              }
              return item;
            });
          } else {
            // Add new item (cap quantity at available stock)
            const cappedQty = (product.stock != null && quantity > product.stock) ? product.stock : quantity;
            const newItem: PosCartItem = calculateItemTotal({
              productId: product.id,
              productSku: product.sku,
              productName: product.name,
              productImage: product.imageUrl,
              quantity: cappedQty,
              unitPrice: product.basePrice,
              taxRate: product.taxRate ?? DEFAULT_TAX_RATE,
              isIncludedInPrice: product.isIncludedInPrice ?? false,
              taxAmount: 0,
              subtotal: 0,
              total: 0,
              stock: product.stock,
              points: product.points ?? 0,
              businessVolume: product.businessVolume ?? 0,
            });
            newItems = [...state.cart.items, newItem];
          }

          const newCart = calculateCartTotals({ ...state.cart, items: newItems });
          return { cart: newCart };
        });
      },

      updateItemQuantity: (productId: string, quantity: number) => {
        set((state) => {
          if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            const newItems = state.cart.items.filter(
              (item) => item.productId !== productId
            );
            const newCart = calculateCartTotals({ ...state.cart, items: newItems });
            return { cart: newCart };
          }

          const newItems = state.cart.items.map((item) => {
            if (item.productId === productId) {
              // Cap at stock if known
              const cappedQty = (item.stock != null && quantity > item.stock)
                ? item.stock
                : quantity;
              const updated = { ...item, quantity: cappedQty };
              return calculateItemTotal(updated);
            }
            return item;
          });

          const newCart = calculateCartTotals({ ...state.cart, items: newItems });
          return { cart: newCart };
        });
      },

      removeItem: (productId: string) => {
        set((state) => {
          const newItems = state.cart.items.filter(
            (item) => item.productId !== productId
          );
          const newCart = calculateCartTotals({ ...state.cart, items: newItems });
          return { cart: newCart };
        });
      },

      clearCart: () => {
        set({ cart: initialCart });
      },

      setCustomer: (customerId, customerName, customerRfc, priceTypeId) => {
        set((state) => ({
          cart: {
            ...state.cart,
            customerId,
            customerName,
            customerRfc,
            priceTypeId,
            isPublicPrice: false,
          },
        }));
      },

      setPublicPrice: (isPublic) => {
        set((state) => ({
          cart: {
            ...state.cart,
            isPublicPrice: isPublic,
            // Clear customer when switching to public price
            ...(isPublic ? { customerId: undefined, customerName: undefined, customerRfc: undefined, priceTypeId: undefined } : {}),
          },
        }));
      },

      setDiscount: (discountPercent, discountAmount, discountReason) => {
        set((state) => {
          const newCart = calculateCartTotals({
            ...state.cart,
            discountPercent,
            discountAmount,
            discountReason,
          });
          return { cart: newCart };
        });
      },

      setRequiresInvoice: (requiresInvoice) => {
        set((state) => ({
          cart: {
            ...state.cart,
            requiresInvoice,
          },
        }));
      },

      setNotes: (notes) => {
        set((state) => ({
          cart: {
            ...state.cart,
            notes,
          },
        }));
      },

      recalculateTotals: () => {
        set((state) => ({
          cart: calculateCartTotals(state.cart),
        }));
      },

      refreshItemPrices: (prices) => {
        set((state) => {
          const priceMap = new Map(prices.map((p) => [p.productId, p]));
          const newItems = state.cart.items.map((item) => {
            const newPrice = priceMap.get(item.productId);
            if (!newPrice) return item;
            const updated = {
              ...item,
              unitPrice: newPrice.price,
              points: newPrice.points,
              businessVolume: newPrice.businessValue,
            };
            return calculateItemTotal(updated);
          });
          const newCart = calculateCartTotals({ ...state.cart, items: newItems });
          return { cart: newCart };
        });
      },
    }),
    {
      name: 'pos-cart-storage',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
