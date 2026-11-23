import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type { CartItem, Product } from '../types';

const STORAGE_KEY = 'qrresto_cart_storage_v1';

interface CartState {
  // Carts keyed by qrToken so scanning another table doesn't mix carts
  carts: Record<string, CartItem[]>;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  addItem: (qrToken: string, product: Product, quantity?: number, note?: string) => void;
  updateQuantity: (qrToken: string, productId: string, delta: number) => void;
  removeItem: (qrToken: string, productId: string) => void;
  clearCart: (qrToken: string) => void;

  getItems: (qrToken: string) => CartItem[];
  getItemCount: (qrToken: string) => number;
  getTotalAmount: (qrToken: string) => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  carts: {},
  isHydrated: false,

  hydrate: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        set({ carts: JSON.parse(data), isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  addItem: (qrToken: string, product: Product, quantityOrNote?: number | string, noteArg?: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}

    const qtyToAdd = typeof quantityOrNote === 'number' ? Math.max(1, quantityOrNote) : 1;
    const note = typeof quantityOrNote === 'string' ? quantityOrNote : noteArg;

    const carts = { ...get().carts };
    const currentItems = carts[qrToken] ? [...carts[qrToken]] : [];
    const existingIndex = currentItems.findIndex((i) => i.product._id === product._id);

    if (existingIndex > -1) {
      currentItems[existingIndex] = {
        ...currentItems[existingIndex],
        quantity: currentItems[existingIndex].quantity + qtyToAdd,
        note: note !== undefined ? note : currentItems[existingIndex].note,
      };
    } else {
      currentItems.push({
        product,
        quantity: qtyToAdd,
        note,
      });
    }

    carts[qrToken] = currentItems;
    set({ carts });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(carts)).catch(() => {});
  },

  updateQuantity: (qrToken: string, productId: string, delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}

    const carts = { ...get().carts };
    const currentItems = carts[qrToken] ? [...carts[qrToken]] : [];
    const index = currentItems.findIndex((i) => i.product._id === productId);

    if (index > -1) {
      const newQty = currentItems[index].quantity + delta;
      if (newQty <= 0) {
        currentItems.splice(index, 1);
      } else {
        currentItems[index] = {
          ...currentItems[index],
          quantity: newQty,
        };
      }
      carts[qrToken] = currentItems;
      set({ carts });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(carts)).catch(() => {});
    }
  },

  removeItem: (qrToken: string, productId: string) => {
    const carts = { ...get().carts };
    if (!carts[qrToken]) return;
    carts[qrToken] = carts[qrToken].filter((i) => i.product._id !== productId);
    set({ carts });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(carts)).catch(() => {});
  },

  clearCart: (qrToken: string) => {
    const carts = { ...get().carts };
    delete carts[qrToken];
    set({ carts });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(carts)).catch(() => {});
  },

  getItems: (qrToken: string) => {
    return get().carts[qrToken] || [];
  },

  getItemCount: (qrToken: string) => {
    const items = get().carts[qrToken] || [];
    return items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getTotalAmount: (qrToken: string) => {
    const items = get().carts[qrToken] || [];
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },
}));
