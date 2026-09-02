import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens, TAuthUser } from '../types/auth';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@mmp_access_token',
  REFRESH_TOKEN: '@mmp_refresh_token',
  USER: '@mmp_auth_user',
} as const;

export type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

export const SessionStorage = {
  async getTokens(): Promise<StoredTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
    ]);

    return { accessToken, refreshToken };
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
      AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
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
      AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
    ]);
  },
};
