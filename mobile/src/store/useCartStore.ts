import { create } from 'zustand';
import apiClient from '../api/client';

export interface CartItem {
  id: number;
  cart_id: number;
  variant_id: number;
  qty: number;
  variant_label: string;
  unit_price: number;
  sku: string;
  product_id: number;
  product_name: string;
  origin: string;
  thumbnail?: string;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  selectedStoreId: number;
  selectedStoreName: string;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (variantId: number, qty?: number) => Promise<void>;
  updateQty: (itemId: number, qty: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  setSelectedStore: (storeId: number, storeName: string) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  totalItems: 0,
  selectedStoreId: 1, // Default store: 63 Yên Lãng
  selectedStoreName: 'Klever Fruit 63 Yên Lãng (Đống Đa)',
  isLoading: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const res = await apiClient.get('/v1/cart');
      const { items, subtotal, totalItems } = res.data.data;
      set({ items, subtotal, totalItems, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (variantId: number, qty: number = 1) => {
    await apiClient.post('/v1/cart/items', { variantId, qty });
    await get().fetchCart();
  },

  updateQty: async (itemId: number, qty: number) => {
    await apiClient.put(`/v1/cart/items/${itemId}`, { qty });
    await get().fetchCart();
  },

  removeItem: async (itemId: number) => {
    await apiClient.delete(`/v1/cart/items/${itemId}`);
    await get().fetchCart();
  },

  clearCart: async () => {
    await apiClient.delete('/v1/cart');
    set({ items: [], subtotal: 0, totalItems: 0 });
  },

  setSelectedStore: (storeId: number, storeName: string) => {
    set({ selectedStoreId: storeId, selectedStoreName: storeName });
  },
}));
