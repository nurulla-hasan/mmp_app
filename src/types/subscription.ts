import type { TPlan } from './plan';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
export type PaymentMethod = 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK' | 'MANUAL';

export type TSubscription = {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  paymentMethod: string;
  transactionId: string;
  senderPhone?: string | null;
  amountPaid: number;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  plan: TPlan;
};

export type PaymentNumbersResponse = {
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  instructions: string;
};

export type MySubscriptionResponse = {
  activeSubscription: TSubscription | null;
  pendingSubscription: TSubscription | null;
  isSubscribed: boolean;
};

export type ManualCheckoutPayload = {
  planId: string;
  paymentMethod: PaymentMethod;
  senderPhone: string;
  transactionId: string;
};
