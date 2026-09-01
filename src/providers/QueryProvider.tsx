// ─────────────────────────────────────────────────────────────────────────────
// QueryProvider.tsx
//
// TanStack Query + AsyncStorage persistence setup.
// Wraps the application root layout.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from '../lib/query-client';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        buster: 'mmp-v1',
        maxAge: 10 * 60 * 1000,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
