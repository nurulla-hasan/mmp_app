import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AuthTokens, TAuthUser } from '../types/auth';

// Secrets live in the platform-backed encrypted store. Non-sensitive cached
// identity data remains in AsyncStorage so normal app hydration stays simple.
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'mmp_access_token',
  REFRESH_TOKEN: 'mmp_refresh_token',
  USER: '@mmp_auth_user',
} as const;

const LEGACY_TOKEN_KEYS = {
  ACCESS_TOKEN: '@mmp_access_token',
  REFRESH_TOKEN: '@mmp_refresh_token',
} as const;

export type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

async function migrateLegacyTokens(): Promise<StoredTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(LEGACY_TOKEN_KEYS.ACCESS_TOKEN),
    AsyncStorage.getItem(LEGACY_TOKEN_KEYS.REFRESH_TOKEN),
  ]);

  if (accessToken) {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  }
  if (refreshToken) {
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  if (accessToken || refreshToken) {
    await AsyncStorage.multiRemove([
      LEGACY_TOKEN_KEYS.ACCESS_TOKEN,
      LEGACY_TOKEN_KEYS.REFRESH_TOKEN,
    ]);
  }

  return { accessToken, refreshToken };
}

export const SessionStorage = {
  async getTokens(): Promise<StoredTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
    ]);

    if (accessToken || refreshToken) {
      return { accessToken, refreshToken };
    }

    // Existing installs previously stored tokens in AsyncStorage. Migrate once
    // without forcing those users to sign in again.
    return migrateLegacyTokens();
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    ]);

    // Keep legacy plaintext keys absent after any successful session write.
    await AsyncStorage.multiRemove([
      LEGACY_TOKEN_KEYS.ACCESS_TOKEN,
      LEGACY_TOKEN_KEYS.REFRESH_TOKEN,
    ]);
  },

  async getCachedUser(): Promise<TAuthUser | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as TAuthUser;
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      return null;
    }
  },

  async setCachedUser(user: TAuthUser | null): Promise<void> {
    if (!user) {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
      AsyncStorage.removeItem(LEGACY_TOKEN_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(LEGACY_TOKEN_KEYS.REFRESH_TOKEN),
    ]);
  },
};
