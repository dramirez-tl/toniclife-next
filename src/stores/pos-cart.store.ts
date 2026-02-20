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
  setCustomer: (customerId?: string, customerName?: string, customerRfc?: string) => void;
  setDiscount: (discountPercent?: number, discountAmount?: number, discountReason?: string) => void;
  setRequiresInvoice: (requiresInvoice: boolean) => void;
  setNotes: (notes?: string) => void;
  recalculateTotals: () => void;
}

const TAX_RATE = 0.16; // 16% IVA

const initialCart: PosCart = {
  items: [],
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  requiresInvoice: false,
};

const calculateItemTotal = (item: PosCartItem): PosCartItem => {
  const lineSubtotal = item.unitPrice * item.quantity;
  let lineDiscount = 0;

  if (item.discountPercent) {
    lineDiscount = lineSubtotal * (item.discountPercent / 100);
  } else if (item.discountAmount) {
    lineDiscount = item.discountAmount * item.quantity;
  }

  const subtotal = lineSubtotal - lineDiscount;
  const total = subtotal; // Tax is calculated on cart level

  return {
    ...item,
    subtotal,
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

  const taxableAmount = subtotal - globalDiscount;
  const taxAmount = taxableAmount * TAX_RATE;
  const total = taxableAmount + taxAmount;

  return {
    ...cart,
    subtotal,
    discountAmount: globalDiscount || undefined,
    taxAmount,
    total: Math.max(0, total),
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
            // Update existing item quantity
            newItems = state.cart.items.map((item, index) => {
              if (index === existingIndex) {
                const updated = {
                  ...item,
                  quantity: item.quantity + quantity,
                };
                return calculateItemTotal(updated);
              }
              return item;
            });
          } else {
            // Add new item
            const newItem: PosCartItem = calculateItemTotal({
              productId: product.id,
              productSku: product.sku,
              productName: product.name,
              productImage: product.imageUrl,
              quantity,
              unitPrice: product.basePrice,
              subtotal: 0,
              total: 0,
              stock: product.stock,
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
              const updated = { ...item, quantity };
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

      setCustomer: (customerId, customerName, customerRfc) => {
        set((state) => ({
          cart: {
            ...state.cart,
            customerId,
            customerName,
            customerRfc,
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
    }),
    {
      name: 'pos-cart-storage',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
