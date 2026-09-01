// ─────────────────────────────────────────────────────────────────────────────
// query-keys.ts
//
// Centralized TanStack Query keys factory.
// Aligned with web's CACHE_TAGS and CACHE_TIME definitions.
// ─────────────────────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  ME: 'me',
  USERS: 'users',
  SERVICES: 'services',
  SURVEYORS: 'surveyors',
  CALCULATIONS: 'calculations',
  REVIEWS: 'reviews',
  PLANS: 'plans',
  BROADCASTS: 'broadcasts',
  DISTRICTS: 'districts',
} as const;

// ─── Stale Time (in ms) — aligned with web CACHE_TIME ────────────────────────
export const STALE_TIME = {
  FIVE_MINUTES: 5 * 60 * 1000,   // 300s
  HOUR: 60 * 60 * 1000,          // 3600s
  DAY: 24 * 60 * 60 * 1000,      // 86400s
} as const;

// ─── Type-safe Query Key Factory ─────────────────────────────────────────────
export const queryKeys = {
  //
  // ── Profile (web: CACHE_TAGS.ME) ──────────────────────────────────────────
  //
  profile: {
    all: [QUERY_KEYS.ME] as const,
    me: () => [QUERY_KEYS.ME, 'detail'] as const,
    stats: () => [QUERY_KEYS.ME, 'stats'] as const,
  },

  //
  // ── Calculations (web: CACHE_TAGS.CALCULATIONS) ──────────────────────────
  //
  calculations: {
    all: [QUERY_KEYS.CALCULATIONS] as const,
    lists: () => [QUERY_KEYS.CALCULATIONS, 'list'] as const,
    list: (searchTerm?: string) =>
      [QUERY_KEYS.CALCULATIONS, 'list', searchTerm ?? ''] as const,
    detail: (id: string) =>
      [QUERY_KEYS.CALCULATIONS, 'detail', id] as const,
  },

  //
  // ── Surveyors (web: CACHE_TAGS.SURVEYORS) ────────────────────────────────
  //
  surveyors: {
    all: [QUERY_KEYS.SURVEYORS] as const,
    lists: () => [QUERY_KEYS.SURVEYORS, 'list'] as const,
    list: (district?: string, search?: string) =>
      [QUERY_KEYS.SURVEYORS, 'list', district ?? '', search ?? ''] as const,
    detail: (id: string) =>
      [QUERY_KEYS.SURVEYORS, 'detail', id] as const,
  },

  //
  // ── Plans (web: CACHE_TAGS.PLANS) ────────────────────────────────────────
  //
  plans: {
    all: [QUERY_KEYS.PLANS] as const,
    list: () => [QUERY_KEYS.PLANS, 'list'] as const,
  },

  //
  // ── Districts ─────────────────────────────────────────────────────────────
  //
  districts: {
    all: [QUERY_KEYS.DISTRICTS] as const,
    list: () => [QUERY_KEYS.DISTRICTS, 'list'] as const,
  },
} as const;
