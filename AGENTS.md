# Mouza Map Pro Mobile App

## Quick Start

```bash
npm run start       # Start Expo development server
npm run android     # Start on Android emulator / physical device
npm run ios         # Start on iOS simulator
npm run web         # Start Web preview
```

**Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript 5 (strict mode), Expo Router, Zustand 5, TanStack Query 5, AsyncStorage, Expo SecureStore, React Native SVG, Lucide React Native, React Native Safe Area Context.

---

## 📂 Architecture & Routing (Expo Router)

```text
src/
├── app/                      # Expo Router screens; composition/navigation only
├── components/
│   ├── ui/                   # Design-system primitives
│   └── common/               # Shared cross-screen/layout components
├── hooks/
│   ├── queries/              # TanStack Query server-state reads
│   └── mutations/            # TanStack Query writes + targeted invalidation
├── services/
│   ├── api-client.ts         # Generic mobile HTTP/auth boundary
│   ├── api-endpoints.ts      # Central backend endpoint contract
│   ├── session-storage.ts    # Token + cached identity persistence
│   └── *-service.ts          # Domain API services
├── stores/                   # Client/session/UI state only (Zustand)
├── lib/                      # Shared framework-independent helpers
├── features/
│   └── land-measurement/     # Measurement workspace/domain feature
└── types/                    # Domain and shared API contracts
```

---

## 🔌 API & Server-State Rules

Keep the same separation-of-responsibility philosophy as the MMP web frontend, adapted to React Native:

```text
Screen / Component
      ↓
Query or Mutation Hook
      ↓
Domain Service
      ↓
apiFetch
      ↓
Backend
```

- Screens/components must not scatter direct `fetch()` calls.
- Backend paths live in `services/api-endpoints.ts`; services should not duplicate endpoint strings.
- Every `apiFetch` call must explicitly declare `auth: 'auth' | 'none'`.
- Shared API response types live in `types/api.ts`; auth types stay auth-domain focused.
- Query hooks unwrap `ApiResult<T>` into domain data before giving it to UI code.
- Mutation hooks must unwrap inside `mutationFn`. API failures therefore use TanStack Query's `onError` path rather than pretending to be successful mutations.
- Invalidate only the query-key families affected by a mutation; do not use blanket refreshes as a default.
- Preserve response metadata when pagination needs it; otherwise return clean domain data to screens.
- TanStack Query owns remote/server state. Zustand is for session identity and true client/UI state, not duplicated API caches.
- Auth token rotation belongs inside the mobile HTTP/session boundary. Parallel 401s share one refresh request and retry once.
- Native access/refresh tokens belong in Expo SecureStore. Cached non-sensitive user identity and persisted query cache may use AsyncStorage.
- Keep upload/download/native-file concerns specialized when their transport differs from normal JSON API calls.

---

## 🎨 Design System & Layout Rules

- **Primary Color:** `#16A34A` (Emerald / Bangla Green)
- **Neutral Dark:** `#0F172A` (Navy Slate)
- **Background Light:** `#F8FAFC`
- **Cards:** rounded surfaces, subtle border, consistent theme tokens
- **Badges:** `PRO` (Emerald), `ফ্রি` (Blue), `সেরা অফার` (Orange/Amber)
- Normal content screens should use shared layout primitives/tokens from `components/common/page-layout.tsx` rather than inventing page-specific outer spacing.
- Consistency means the same visual rhythm and component family, not forcing every screen to use an identical numeric gap. Full-screen canvases, auth flows and modal workspaces may intentionally use specialized layouts.
- Page-level spacing, section-level spacing and component-local spacing are separate responsibilities. Avoid solving one layer by adding arbitrary padding to another.
- Reuse UI primitives for buttons, cards, inputs, badges and loading states before creating one-off visual variants.
