import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/auth-service';
import { STORAGE_KEYS } from '../services/api-client';
import type { TAuthUser, AuthTokens } from '../types/auth';

interface AuthState {
  user: TAuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  initializeAuth: () => Promise<void>;
  setSession: (tokens: AuthTokens, user?: TAuthUser) => Promise<void>;
  setUser: (user: TAuthUser) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const [accessToken, refreshToken, cachedUserStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (!accessToken) {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      let cachedUser: TAuthUser | null = null;
      if (cachedUserStr) {
        try {
          cachedUser = JSON.parse(cachedUserStr);
        } catch {
          // Ignore parse error
        }
      }

      set({
        accessToken,
        refreshToken,
        user: cachedUser,
        isAuthenticated: true,
        isLoading: false,
      });

      // Background fetch fresh user data
      get().fetchCurrentUser();
    } catch {
      set({ isLoading: false });
    }
  },

  setSession: async (tokens: AuthTokens, user?: TAuthUser) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
        user ? AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)) : Promise.resolve(),
      ]);

      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: user || null,
        isAuthenticated: true,
      });

      if (!user) {
        await get().fetchCurrentUser();
      }
    } catch {
      // Storage error
    }
  },

  setUser: async (user: TAuthUser) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      set({ user });
    } catch {
      // Storage error
    }
  },

  fetchCurrentUser: async () => {
    try {
      const res = await AuthService.getMe();
      if (res.success && res.data?.user) {
        await get().setUser(res.data.user);
      }
    } catch {
      // Failed to refresh profile
    }
  },

  logout: async () => {
    try {
      // Best-effort backend logout
      AuthService.logout().catch(() => {});
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    } catch {
      // Storage error
    }
  },
}));

