export type BroadcastType = 'INFO' | 'WARNING' | 'PROMO' | 'MAINTENANCE';

export type BroadcastTarget = 'ALL' | 'USERS' | 'SURVEYORS' | 'PRO_USERS';

export interface TBroadcast {
  id: string;
  title: string;
  message: string;
  type: BroadcastType;
  target: BroadcastTarget;
  linkUrl?: string | null;
  linkText?: string | null;
  isActive: boolean;
  isPinned: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
