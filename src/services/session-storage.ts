import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthTokens, TAuthUser } from '../types/auth';

// Preserve the existing public storage-key contract for compatibility. Native
// auth secrets themselves are stored under SecureStore-safe keys (SecureStore
// does not allow "@" in key names).
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@mmp_access_token',
  REFRESH_TOKEN: '@mmp_refresh_token',
  USER: '@mmp_auth_user',
} as const;

const SECURE_TOKEN_KEYS = {
  ACCESS_TOKEN: 'mmp_access_token',
  REFRESH_TOKEN: 'mmp_refresh_token',
} as const;

export type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

const isWeb = Platform.OS === 'web';

async function getNativeTokens(): Promise<StoredTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(SECURE_TOKEN_KEYS.ACCESS_TOKEN),
    SecureStore.getItemAsync(SECURE_TOKEN_KEYS.REFRESH_TOKEN),
  ]);

  return { accessToken, refreshToken };
}

async function getAsyncStorageTokens(): Promise<StoredTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
    AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
  ]);

  return { accessToken, refreshToken };
}

async function migrateLegacyNativeTokens(): Promise<StoredTokens> {
  const tokens = await getAsyncStorageTokens();

  if (tokens.accessToken) {
    await SecureStore.setItemAsync(SECURE_TOKEN_KEYS.ACCESS_TOKEN, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(SECURE_TOKEN_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }

  if (tokens.accessToken || tokens.refreshToken) {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]);
  }

  return tokens;
}

export const SessionStorage = {
  async getTokens(): Promise<StoredTokens> {
    // The mobile app's web preview has no native SecureStore implementation.
    if (isWeb) return getAsyncStorageTokens();

    const tokens = await getNativeTokens();
    if (tokens.accessToken || tokens.refreshToken) return tokens;

    // Existing native installs previously stored tokens in AsyncStorage.
    // Migrate once without forcing those users to sign in again.
    return migrateLegacyNativeTokens();
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    if (isWeb) {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
      ]);
      return;
    }

    await Promise.all([
      SecureStore.setItemAsync(SECURE_TOKEN_KEYS.ACCESS_TOKEN, tokens.accessToken),
      SecureStore.setItemAsync(SECURE_TOKEN_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    ]);

    // Keep legacy plaintext keys absent after any successful native session write.
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
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
    const nativeClear = isWeb
      ? Promise.resolve()
      : Promise.all([
          SecureStore.deleteItemAsync(SECURE_TOKEN_KEYS.ACCESS_TOKEN),
          SecureStore.deleteItemAsync(SECURE_TOKEN_KEYS.REFRESH_TOKEN),
        ]).then(() => undefined);

    await Promise.all([
      nativeClear,
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
      AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  },
};
