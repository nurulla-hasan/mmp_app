import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthTokens, TAuthUser } from '../types/auth';

// Native secrets live in the platform-backed encrypted store. Non-sensitive
// cached identity data remains in AsyncStorage. The Expo web preview keeps its
// tokens in AsyncStorage because SecureStore is a native-only facility.
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

const isWeb = Platform.OS === 'web';

async function getNativeTokens(): Promise<StoredTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
    SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
  ]);

  return { accessToken, refreshToken };
}

async function getWebTokens(): Promise<StoredTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(LEGACY_TOKEN_KEYS.ACCESS_TOKEN),
    AsyncStorage.getItem(LEGACY_TOKEN_KEYS.REFRESH_TOKEN),
  ]);

  return { accessToken, refreshToken };
}

async function migrateLegacyNativeTokens(): Promise<StoredTokens> {
  const tokens = await getWebTokens();

  if (tokens.accessToken) {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }

  if (tokens.accessToken || tokens.refreshToken) {
    await AsyncStorage.multiRemove([
      LEGACY_TOKEN_KEYS.ACCESS_TOKEN,
      LEGACY_TOKEN_KEYS.REFRESH_TOKEN,
    ]);
  }

  return tokens;
}

export const SessionStorage = {
  async getTokens(): Promise<StoredTokens> {
    if (isWeb) return getWebTokens();

    const tokens = await getNativeTokens();
    if (tokens.accessToken || tokens.refreshToken) return tokens;

    // Existing native installs previously stored tokens in AsyncStorage.
    // Migrate once without forcing those users to sign in again.
    return migrateLegacyNativeTokens();
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    if (isWeb) {
      await Promise.all([
        AsyncStorage.setItem(LEGACY_TOKEN_KEYS.ACCESS_TOKEN, tokens.accessToken),
        AsyncStorage.setItem(LEGACY_TOKEN_KEYS.REFRESH_TOKEN, tokens.refreshToken),
      ]);
      return;
    }

    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    ]);

    // Keep legacy plaintext keys absent after any successful native session write.
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
    const nativeClear = isWeb
      ? Promise.resolve()
      : Promise.all([
          SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
          SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        ]).then(() => undefined);

    await Promise.all([
      nativeClear,
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
      AsyncStorage.removeItem(LEGACY_TOKEN_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(LEGACY_TOKEN_KEYS.REFRESH_TOKEN),
    ]);
  },
};
