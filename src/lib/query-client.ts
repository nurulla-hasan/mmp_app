// ─────────────────────────────────────────────────────────────────────────────
// query-client.ts
//
// Global TanStack QueryClient configuration.
// ─────────────────────────────────────────────────────────────────────────────

import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { STALE_TIME } from './query-keys';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime: aligned with web's CACHE_TIME.FIVE_MINUTES (5 min)
      staleTime: STALE_TIME.FIVE_MINUTES,

      // gcTime: garbage collection timer (10 min)
      gcTime: 10 * 60 * 1000,

      // retry: retry once on failure, except for 401 and 404
      retry: (failureCount, error: any) => {
        if (error?.statusCode === 404 || error?.statusCode === 401) return false;
        return failureCount < 1;
      },

      // Disable window focus refetch for React Native
      refetchOnWindowFocus: false,

      // Automatically refetch when network reconnects
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ─── AsyncStorage Persister ──────────────────────────────────────────────────
// Persists query cache across app launches.
//
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: '@mmp_query_cache',
  throttleTime: 1000,
});
