export type TPlanBillingCycle =
  | 'MONTHLY'
  | 'SIX_MONTHS'
  | 'YEARLY'
  | 'LIFETIME'
  | 'CUSTOM';

export type TPlan = {
  id: string;
  name: string;
  code: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  discountBadge?: string | null;
  durationDays: number;
  billingCycle: TPlanBillingCycle;
  tools: string[];
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PlanQuery = {
  isActive?: 'true' | 'false' | 'all';
  sortBy?: 'sortOrder' | 'price_asc' | 'price_desc' | 'newest';
};
