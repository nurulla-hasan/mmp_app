export const QUERY_KEYS = {
  ME: 'me', USERS: 'users', SERVICES: 'services', SURVEYORS: 'surveyors',
  CALCULATIONS: 'calculations', REVIEWS: 'reviews', PLANS: 'plans',
  BROADCASTS: 'broadcasts', DISTRICTS: 'districts',
} as const;

export const STALE_TIME = {
  FIVE_MINUTES: 5 * 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

export const queryKeys = {
  profile: {
    all: [QUERY_KEYS.ME] as const,
    me: () => [QUERY_KEYS.ME, 'detail'] as const,
    stats: () => [QUERY_KEYS.ME, 'stats'] as const,
  },
  calculations: {
    all: [QUERY_KEYS.CALCULATIONS] as const,
    lists: () => [QUERY_KEYS.CALCULATIONS, 'list'] as const,
    list: (searchTerm?: string) => [QUERY_KEYS.CALCULATIONS, 'list', searchTerm ?? ''] as const,
    detail: (id: string) => [QUERY_KEYS.CALCULATIONS, 'detail', id] as const,
  },
  surveyors: {
    all: [QUERY_KEYS.SURVEYORS] as const,
    lists: () => [QUERY_KEYS.SURVEYORS, 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => [QUERY_KEYS.SURVEYORS, 'list', filters] as const,
    infinite: (filters: Record<string, unknown> = {}) => [QUERY_KEYS.SURVEYORS, 'infinite', filters] as const,
    detail: (slug: string) => [QUERY_KEYS.SURVEYORS, 'detail', slug] as const,
    myProfile: () => [QUERY_KEYS.SURVEYORS, 'my-profile'] as const,
  },
  services: {
    all: [QUERY_KEYS.SERVICES] as const,
    list: () => [QUERY_KEYS.SERVICES, 'list'] as const,
  },
  reviews: {
    all: [QUERY_KEYS.REVIEWS] as const,
    bySurveyor: (slug: string) => [QUERY_KEYS.REVIEWS, 'surveyor', slug] as const,
  },
  plans: { all: [QUERY_KEYS.PLANS] as const, list: () => [QUERY_KEYS.PLANS, 'list'] as const },
  districts: { all: [QUERY_KEYS.DISTRICTS] as const, list: () => [QUERY_KEYS.DISTRICTS, 'list'] as const },
} as const;
