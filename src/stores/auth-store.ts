import { create } from 'zustand';
import { AuthService } from '../services/auth-service';
import { SessionStorage } from '../services/session-storage';
import {
  subscribeSessionExpired,
  subscribeTokensRefreshed,
} from '../services/auth-events';
import { clearQueryCache } from '../lib/query-client';
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
  fetchCurrentUser: () => Promise<TAuthUser | null>;
  refreshUser: () => Promise<void>;
  clearLocalSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const emptySessionState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
} as const;

const MOBILE_APP_ROLE_ERROR =
  'এই মোবাইল অ্যাপটি শুধু সাধারণ ব্যবহারকারী ও সার্ভেয়ারদের জন্য। অ্যাডমিন প্যানেল ওয়েবে ব্যবহার করুন।';

const isMobileAppUser = (user: TAuthUser) =>
  user.role === 'USER' || user.role === 'SURVEYOR';

export const useAuthStore = create<AuthState>((set, get) => ({
  ...emptySessionState,
  isLoading: true,

  initializeAuth: async () => {
    set({ isLoading: true });

    try {
      const [tokens, cachedUser] = await Promise.all([
        SessionStorage.getTokens(),
        SessionStorage.getCachedUser(),
      ]);

      const hasStoredSession = Boolean(tokens.accessToken || tokens.refreshToken);

      if (!hasStoredSession) {
        await SessionStorage.setCachedUser(null);
        set({ ...emptySessionState, isLoading: false });
        return;
      }

      // Never hydrate an admin identity into the mobile UI, even briefly.
      if (cachedUser && !isMobileAppUser(cachedUser)) {
        await Promise.all([SessionStorage.clear(), clearQueryCache()]);
        set({ ...emptySessionState, isLoading: false });
        return;
      }

      // Hydrate immediately for a fast startup, then validate against /auth/me.
      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: cachedUser,
        isAuthenticated: true,
      });

      await get().fetchCurrentUser();
    } catch {
      // Storage/network failures should not crash app startup.
    } finally {
      set({ isLoading: false });
    }
  },

  setSession: async (tokens: AuthTokens, user?: TAuthUser) => {
    // A fresh login/verification can represent a different account. Remove all
    // persisted server-state before hydrating the new identity.
    await clearQueryCache();

    if (user && !isMobileAppUser(user)) {
      await SessionStorage.clear();
      set({ ...emptySessionState, isLoading: false });
      throw new Error(MOBILE_APP_ROLE_ERROR);
    }

    await SessionStorage.setTokens(tokens);

    if (user) {
      await SessionStorage.setCachedUser(user);
    } else {
      // Never show a previous account while the new session is resolving.
      await SessionStorage.setCachedUser(null);
    }

    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user ?? null,
      isAuthenticated: true,
    });

    if (!user) {
      await get().fetchCurrentUser();
    }
  },

  setUser: async (user: TAuthUser) => {
    if (!isMobileAppUser(user)) {
      await get().clearLocalSession();
      throw new Error(MOBILE_APP_ROLE_ERROR);
    }

    await SessionStorage.setCachedUser(user);
    set({ user, isAuthenticated: true });
  },

  fetchCurrentUser: async () => {
    const res = await AuthService.getMe();

    if (res.success && res.data?.user) {
      if (!isMobileAppUser(res.data.user)) {
        await get().clearLocalSession();
        throw new Error(MOBILE_APP_ROLE_ERROR);
      }

      await get().setUser(res.data.user);
      return res.data.user;
    }

    if (res.statusCode === 401) {
      await get().clearLocalSession();
    }

    return null;
  },

  refreshUser: async () => {
    await get().fetchCurrentUser();
  },

  clearLocalSession: async () => {
    await Promise.all([SessionStorage.clear(), clearQueryCache()]);
    set({ ...emptySessionState, isLoading: false });
  },

  logout: async () => {
    // Backend logout is best-effort; local session removal must always succeed.
    try {
      await AuthService.logout();
    } finally {
      await get().clearLocalSession();
    }
  },
}));

// Keep Zustand's in-memory session synchronized with token rotation performed
// inside the HTTP client, without introducing an api-client <-> store cycle.
subscribeTokensRefreshed((tokens) => {
  useAuthStore.setState({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    isAuthenticated: true,
  });
});

subscribeSessionExpired(() => {
  void useAuthStore.getState().clearLocalSession();
});
