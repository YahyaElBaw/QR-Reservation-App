import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthToken } from './storage';
import type {
  User,
  RestaurantTable,
  Category,
  Product,
  Ticket,
  PaymentMethod,
  Stats,
  ApiError,
  PaginatedList,
} from '../types';

const API_STORAGE_KEY = 'qrresto_api_base_url_v1';

const getInitialBaseUrl = (): string => {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location.hostname
  ) {
    return `http://${window.location.hostname}:3000/api/v1`;
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return 'http://192.168.1.128:3000/api/v1';
};

export let API_BASE_URL = getInitialBaseUrl();

// Hydrate saved URL from storage asynchronously
AsyncStorage.getItem(API_STORAGE_KEY).then((saved) => {
  if (saved && typeof saved === 'string' && saved.startsWith('http')) {
    API_BASE_URL = saved;
    http.defaults.baseURL = saved;
  }
}).catch(() => {});

export function setApiBaseUrl(newUrl: string): void {
  API_BASE_URL = newUrl;
  http.defaults.baseURL = newUrl;
  AsyncStorage.setItem(API_STORAGE_KEY, newUrl).catch(() => {});
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const errorData = error.response?.data;
    const normalizedError: ApiError = {
      statusCode: error.response?.status || 500,
      code: errorData?.code || 'NETWORK_ERROR',
      message: errorData?.message || error.message || 'Une erreur inattendue est survenue',
      details: errorData?.details || [],
    };
    return Promise.reject(normalizedError);
  },
);

export const api = {
  // Public customer endpoints
  publicTable: async (qrToken: string, deviceId?: string) => {
    const res = await http.get<{
      table: RestaurantTable;
      activeTicket: Ticket | null;
      isOwner?: boolean;
      lockedToOtherDevice?: boolean;
    }>(`/public/tables/${qrToken}`, {
      params: deviceId ? { deviceId } : undefined,
    });
    return res.data;
  },

  publicCategories: async () => {
    const res = await http.get<{ data: Category[] } | Category[]>('/public/categories');
    return Array.isArray(res.data) ? res.data : res.data.data;
  },

  publicProducts: async (categoryId?: string): Promise<Product[]> => {
    const res = await http.get<{ data: Product[] } | Product[]>('/public/products', {
      params: categoryId ? { categoryId } : undefined,
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
  },

  publicOrder: async (
    qrToken: string,
    data: {
      deviceId: string;
      items: { productId: string; quantity: number; note?: string }[];
    },
  ) => {
    const res = await http.post<Ticket>(`/public/tables/${qrToken}/orders`, data);
    return res.data;
  },

  publicTicket: async (qrToken: string) => {
    const res = await http.get<Ticket | null>(`/public/tables/${qrToken}/ticket`);
    return res.data;
  },

  // Staff Authentication
  login: async (username: string, password: string) => {
    const res = await http.post<{ accessToken: string; user: User }>('/auth/login', {
      username,
      password,
    });
    return res.data;
  },

  me: async () => {
    const res = await http.get<User>('/auth/me');
    return res.data;
  },

  // Staff endpoints
  tables: async () => {
    const res = await http.get<PaginatedList<RestaurantTable> | RestaurantTable[]>('/tables', {
      params: { limit: 100 },
    });
    return Array.isArray(res.data) ? res.data : res.data.data;
  },

  tickets: async (params?: { status?: string; tableId?: string }) => {
    const res = await http.get<PaginatedList<Ticket> | Ticket[]>('/tickets', {
      params: { limit: 100, ...params },
    });
    return Array.isArray(res.data) ? res.data : res.data.data;
  },

  ticket: async (id: string) => {
    const res = await http.get<Ticket>(`/tickets/${id}`);
    return res.data;
  },

  addTicketItem: async (
    ticketId: string,
    data: { productId: string; quantity: number; note?: string },
  ) => {
    const res = await http.post<Ticket>(`/tickets/${ticketId}/items`, data);
    return res.data;
  },

  updateTicketItem: async (ticketId: string, itemId: string, quantity: number) => {
    const res = await http.patch<Ticket>(`/tickets/${ticketId}/items/${itemId}`, { quantity });
    return res.data;
  },

  deleteTicketItem: async (ticketId: string, itemId: string) => {
    const res = await http.delete<Ticket>(`/tickets/${ticketId}/items/${itemId}`);
    return res.data;
  },

  payTicket: async (ticketId: string, method: PaymentMethod) => {
    const res = await http.post<Ticket>(`/tickets/${ticketId}/pay`, { method });
    return res.data;
  },

  closeTicket: async (ticketId: string) => {
    const res = await http.post<Ticket>(`/tickets/${ticketId}/close`);
    return res.data;
  },

  updateProductAvailability: async (productId: string, available: boolean) => {
    const res = await http.patch<Product>(`/products/${productId}/availability`, { available });
    return res.data;
  },

  products: async (categoryId?: string) => {
    const res = await http.get<PaginatedList<Product> | Product[]>('/products', {
      params: { limit: 100, ...(categoryId ? { categoryId } : {}) },
    });
    return Array.isArray(res.data) ? res.data : res.data.data;
  },

  stats: async (from?: string, to?: string) => {
    const res = await http.get<Stats>('/dashboard/stats', {
      params: { from, to },
    });
    return res.data;
  },
};
