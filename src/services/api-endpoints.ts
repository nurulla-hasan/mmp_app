// Central API contract used by the mobile app.
// Keep endpoint strings here so services never drift from the backend contract.
// Mobile intentionally exposes only USER/SURVEYOR-facing subscription endpoints.

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login', register: '/auth/register', verifyEmail: '/auth/verify-email',
    resendOtp: '/auth/resend-otp', forgotPassword: '/auth/forgot-password',
    resendResetOtp: '/auth/resend-reset-otp', resetPassword: '/auth/reset-password',
    refreshToken: '/auth/refresh-token', logout: '/auth/logout', me: '/auth/me',
    changePassword: '/auth/change-password',
  },
  users: { profileImage: '/users/profile-image' },
  catalog: { districts: '/districts', services: '/services' },
  surveyors: {
    root: '/surveyor',
    bySlug: (slug: string) => `/surveyor/${encodeURIComponent(slug)}`,
    profile: '/surveyor/profile',
  },
  reviews: { root: '/reviews', testimonials: '/reviews/testimonials' },
  plans: {
    root: '/plans',
    byId: (id: string) => `/plans/${encodeURIComponent(id)}`,
  },
  subscriptions: {
    paymentNumbers: '/subscribers/payment-numbers',
    manualCheckout: '/subscribers/manual-checkout',
    mySubscription: '/subscribers/my-subscription',
  },
  calculations: {
    root: '/calculations',
    byId: (id: string) => `/calculations/${id}`,
    stats: { me: '/calculations/stats/me', incrementPlot: '/calculations/stats/increment-plot' },
  },
} as const;
