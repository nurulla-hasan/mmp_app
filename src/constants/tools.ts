export interface ToolItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  externalUrl?: string;
  isPro: boolean;
  badge?: string;
  badgeVariant?: 'pro' | 'free' | 'warning' | 'neutral';
  secondaryBadge?: string;
  secondaryBadgeVariant?: 'pro' | 'free' | 'warning' | 'neutral';
  iconName: string;
  category: 'core' | 'specialized' | 'calculation';
  features?: string[];
}

export const COMING_SOON_TOOL_IDS: readonly string[] = [];

export function isToolComingSoon(toolId: string) {
  return COMING_SOON_TOOL_IDS.includes(toolId);
}

export const FEATURED_TOOL: ToolItem = {
  id: 'land-measurement',
  title: 'মৌজা ম্যাপ ও জমি পরিমাপ',
  subtitle: 'Land Measurement',
  description: 'মৌজা ম্যাপ আপলোড করে Plot আঁকুন, জমির পরিমাণ হিসাব করুন এবং প্রয়োজন হলে Plot ভাগ করুন।',
  route: '/land-measurement',
  isPro: true,
  badge: 'PRO',
  badgeVariant: 'pro',
  secondaryBadge: 'প্রধান টুল',
  secondaryBadgeVariant: 'free',
  iconName: 'Map',
  category: 'core',
  features: [
    'ম্যাপ/PDF আপলোড',
    'স্কেল সেট',
    'Plot আঁকা ও ক্ষেত্রফল',
    'একাধিক Plot ভাগ',
    'মোট হিসাব',
    'PDF/Print রিপোর্ট',
  ],
};

export const OTHER_CORE_TOOLS: ToolItem[] = [
  {
    id: 'mouza-map-studio',
    title: 'মৌজা ম্যাপ স্টুডিও',
    subtitle: 'Mouza Map Studio',
    description: 'C.S ও B.S ম্যাপ align করে cleanup, text/mark edit করুন এবং শেষে ব্যবহারযোগ্য sheet তৈরি করুন।',
    route: '/land-measurement',
    externalUrl: 'https://mouzamappro.com/tools/mouza-map-studio',
    isPro: true,
    badge: 'PRO',
    badgeVariant: 'pro',
    secondaryBadge: 'বেটা',
    secondaryBadgeVariant: 'warning',
    iconName: 'Layers',
    category: 'specialized',
  },
  {
    id: 'mouza-geo-studio',
    title: 'মৌজা জিও স্টুডিও',
    subtitle: 'Mouza Geo Studio',
    description: 'মৌজা ম্যাপকে বাস্তব পৃথিবীর অবস্থানের সঙ্গে align করে Google Earth-এর জন্য KMZ তৈরি করুন।',
    route: '/land-measurement',
    externalUrl: 'https://mouzamappro.com/tools/mouza-geo-studio',
    isPro: true,
    badge: 'PRO',
    badgeVariant: 'pro',
    secondaryBadge: 'বেটা',
    secondaryBadgeVariant: 'warning',
    iconName: 'Globe',
    category: 'specialized',
  },
  {
    id: 'kmz-viewer',
    title: 'মৌজা জিও ভিউয়ার',
    subtitle: 'Mouza Geo Viewer',
    description: 'Google Earth-এর KMZ/KML import করে image overlay, point, line ও polygon সরাসরি map-এ দেখুন।',
    route: '/kmz-viewer',
    isPro: false,
    badge: 'ফ্রি',
    badgeVariant: 'free',
    secondaryBadge: 'নতুন',
    secondaryBadgeVariant: 'warning',
    iconName: 'Globe',
    category: 'specialized',
  },
  {
    id: 'pantagraph',
    title: 'ম্যাপ তুলনা ও প্যান্টাগ্রাফ',
    subtitle: 'Pantagraph',
    description: 'সাবেক ও হাল ম্যাপ আপলোড করে matching point বসিয়ে অবস্থান, rotation ও scale মিলিয়ে তুলনা করুন।',
    route: '/pantagraph',
    externalUrl: 'https://mouzamappro.com/tools/pantagraph',
    isPro: true,
    badge: 'PRO',
    badgeVariant: 'pro',
    secondaryBadge: 'নতুন',
    secondaryBadgeVariant: 'warning',
    iconName: 'Scaling',
    category: 'specialized',
  },
];

export const ALL_TOOLS_LIST: ToolItem[] = [
  FEATURED_TOOL,
  ...OTHER_CORE_TOOLS,
  {
    id: 'tracer',
    title: 'ডিজিটাল ম্যাপ ট্রেসিং',
    subtitle: 'Vector Tracer',
    description: 'পুরানো মৌজা ম্যাপের দাগের সীমানা ও দাগ নম্বর ট্রেস করে পরিষ্কার digital vector map তৈরি করুন।',
    route: '/tracer',
    externalUrl: 'https://mouzamappro.com/tools/tracer',
    isPro: true,
    badge: 'PRO',
    badgeVariant: 'pro',
    secondaryBadge: 'নতুন',
    secondaryBadgeVariant: 'warning',
    iconName: 'PenLine',
    category: 'specialized',
  },
  {
    id: 'unit-converter',
    title: 'জমির একক রূপান্তর',
    subtitle: 'Unit Converter',
    description: 'শতক, কাঠা, বিঘা, একর, বর্গফুট, বর্গমিটার ও হেক্টরে জমির পরিমাণ রূপান্তর করুন।',
    route: '/unit-converter',
    isPro: false,
    badge: 'ফ্রি',
    badgeVariant: 'free',
    iconName: 'MoveDiagonal',
    category: 'calculation',
  },
  {
    id: 'inheritance-calculator',
    title: 'জমি বণ্টন ক্যালকুলেটর',
    subtitle: 'Inheritance Splitter',
    description: 'মোট জমি ও অংশীদারদের অনুপাত অনুযায়ী প্রত্যেকের প্রাপ্য জমির পরিমাণ নির্ণয় করুন।',
    route: '/(tools)/inheritance',
    isPro: false,
    badge: 'ফ্রি',
    badgeVariant: 'free',
    iconName: 'Calculator',
    category: 'calculation',
  },
  {
    id: 'scale-guide',
    title: 'মৌজা ম্যাপ স্কেল গাইড',
    subtitle: 'Scale Guide',
    description: '১৬″ = ১ মাইল, ৩২″ বা ৬৪″ স্কেলের মানচিত্র হিসাব ও স্কেল ক্যালিব্রেশনের নিয়ম।',
    route: '/(tools)/scale-guide',
    isPro: false,
    badge: 'ফ্রি',
    badgeVariant: 'free',
    iconName: 'Ruler',
    category: 'calculation',
  },
];
