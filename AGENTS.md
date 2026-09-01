# Mouza Map Pro Mobile App

## Quick Start

```bash
npm run start       # Start Expo development server
npm run android     # Start on Android emulator / physical device via Expo Go
npm run ios         # Start on iOS simulator
npm run web         # Start Web preview
```

**Stack:** Expo SDK 57, React Native 0.86, React 19, TypeScript 5 (strict mode), Expo Router, Zustand 5, Lucide React Native, React Native Safe Area Context.

---

## 📂 Architecture & Routing (Expo Router)

```text
src/
├── app/                      # Expo Router (File-based navigation)
│   ├── _layout.tsx           # Root Stack, SafeAreaProvider & StatusBar
│   ├── index.tsx             # Entry redirect -> /(tabs)
│   ├── pricing.tsx           # Modal for Subscription plans & bKash/Nagad checkout
│   │
│   ├── (tabs)/               # Bottom Tab Navigator (Height 60, Green/Dark theme)
│   │   ├── _layout.tsx
│   │   ├── index.tsx         # Dashboard Home (Hero card, quick tools, stats)
│   │   ├── tools.tsx         # Tools Hub (All 7 tools & scale guide)
│   │   ├── surveyors.tsx     # Surveyor Directory & WhatsApp connect
│   │   └── profile.tsx       # User / Surveyor profile & membership badge
│   │
│   ├── (tools)/              # Standalone Tool Workspaces (Header Stack)
│   │   ├── _layout.tsx
│   │   ├── land-measurement.tsx  # Map plot measurement
│   │   ├── pantagraph.tsx        # C.S/B.S Map comparison
│   │   ├── tracer.tsx            # Digital vector tracer
│   │   ├── unit-converter.tsx    # Land Unit Converter (Interactive Calculator)
│   │   ├── inheritance.tsx       # Farayez calculation
│   │   └── scale-guide.tsx       # 16" = 1 mile Scale tutorial
│   │
│   └── (auth)/               # Auth flows
│       └── _layout.tsx
│
├── components/
│   ├── ui/                   # Design system primitives (Button, Card, Badge, Input)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   └── common/               # Shared cross-screen components
│
├── constants/
│   ├── colors.ts             # Light & Dark theme color tokens (Bangla Green #16A34A)
│   └── tools.ts              # Tool items metadata, icons, categories & routes
│
├── lib/
│   ├── utils.ts              # cn() style merging utility
│   └── calculations.ts       # Land calculations (Shotok, Katha, Bigha, Acre, SqFt)
│
├── stores/                   # Zustand global stores
└── types/                    # TypeScript interfaces
```

---

## 🎨 Design System & Theme Rules

- **Primary Color:** `#16A34A` (Emerald / Bangla Green)
- **Neutral Dark:** `#0F172A` (Navy Slate)
- **Background Light:** `#F8FAFC`
- **Cards:** Rounded 16px, subtle 1px border (`#E2E8F0`), soft shadow
- **Badges:** `PRO` (Emerald), `ফ্রি` (Blue), `সেরা অফার` (Orange/Amber)

