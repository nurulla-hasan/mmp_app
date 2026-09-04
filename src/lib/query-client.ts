import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { ApiRequestError } from './api-result';
import { STALE_TIME } from './query-keys';

export const QUERY_CACHE_STORAGE_KEY = '@mmp_query_cache';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.FIVE_MINUTES,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        const statusCode =
          error instanceof ApiRequestError ? error.statusCode : undefined;

        if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
          return false;
        }

        return failureCount < 1;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_STORAGE_KEY,
  throttleTime: 1000,
});

export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await AsyncStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
}
