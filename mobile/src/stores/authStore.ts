import { create } from 'zustand';
import { api } from '../services/api';
import {
  saveAuthToken,
  getAuthToken,
  removeAuthToken,
  saveStoredUser,
  getStoredUser,
  removeStoredUser,
} from '../services/storage';
import type { User, Role } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.login(username, password);
      await saveAuthToken(data.accessToken);
      await saveStoredUser(data.user);
      set({ user: data.user, token: data.accessToken, isLoading: false, error: null });
      return true;
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Identifiants invalides';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await removeAuthToken();
    await removeStoredUser();
    set({ user: null, token: null, error: null });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await getAuthToken();
      const user = await getStoredUser<User>();
      if (token && user) {
        set({ token, user, isLoading: false });
        // Refresh me in background
        api
          .me()
          .then((freshUser) => {
            set({ user: freshUser });
            saveStoredUser(freshUser);
          })
          .catch(() => {
            // Token might have expired
          });
      } else {
        set({ token: null, user: null, isLoading: false });
      }
    } catch {
      set({ token: null, user: null, isLoading: false });
    }
  },

  hasRole: (roles: Role[]) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role);
  },
}));
