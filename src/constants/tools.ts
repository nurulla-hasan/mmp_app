export interface ToolItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  isPro: boolean;
  badge?: string;
  badgeVariant?: 'pro' | 'free' | 'warning' | 'neutral';
  iconName: string;
  category: 'core' | 'specialized' | 'calculation';
  features?: string[];
}

export const FEATURED_TOOL: ToolItem = {
  id: 'land-measurement',
  title: 'মৌজা ম্যাপ ও জমি পরিমাপ',
  subtitle: 'Land Measurement',
  description: 'মৌজা ম্যাপ আপলোড করে Plot আঁকুন, জমির পরিমাণ হিসাব করুন এবং প্রয়োজন হলে Plot ভাগ করুন।',
  route: '/land-measurement',
  isPro: true,
  badge: 'প্রধান টুল',
  badgeVariant: 'pro',
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
    subtitle: 'Mouza Studio',
    description: 'C.S ও B.S ম্যাপ align করে cleanup, text/mark edit করুন এবং শেষে ব্যবহারযোগ্য sheet তৈরি করুন।',
    route: '/land-measurement',
    isPro: true,
    badge: 'বেটা',
    badgeVariant: 'warning',
    iconName: 'Layers',
    category: 'specialized',
  },
  {
    id: 'mouza-geo-studio',
    title: 'মৌজা জিও স্টুডিও',
    subtitle: 'Geo Studio',
    description: 'মৌজা ম্যাপকে বাস্তব পৃথিবীর অবস্থানের সঙ্গে align করে Google Earth-এর জন্য KMZ তৈরি করুন।',
    route: '/land-measurement',
    isPro: true,
    badge: 'বেটা',
    badgeVariant: 'warning',
    iconName: 'Globe',
    category: 'specialized',
  },
  {
    id: 'pantagraph',
    title: 'ম্যাপ তুলনা ও প্যান্টাগ্রাফ',
    subtitle: 'Pantagraph',
    description: 'সাবেক ও হাল ম্যাপ আপলোড করে matching point বসিয়ে অবস্থান, rotation ও scale মিলিয়ে তুলনা করুন।',
    route: '/pantagraph',
    isPro: true,
    badge: 'নতুন',
    badgeVariant: 'pro',
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
    description: 'ঝাপসা পুরানো ম্যাপ থেকে দাগের সীমানা ও দাগ নম্বর ভেক্টরে ট্রেস করুন।',
    route: '/tracer',
    isPro: true,
    badge: 'নতুন',
    badgeVariant: 'pro',
    iconName: 'PenLine',
    category: 'specialized',
  },
  {
    id: 'unit-converter',
    title: 'জমির একক রূপান্তর',
    subtitle: 'Unit Converter',
    description: 'শতক, কাঠা, বিঘা, একর, বর্গফুট ও হেক্টরে তাৎক্ষণিক সঠিক রূপান্তর।',
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
    description: 'মোট জমি ও অংশীদারদের প্রাপ্য হিস্যা অনুযায়ী সহজে জমি বণ্টন করুন।',
    route: '/inheritance',
    isPro: false,
    badge: 'ফ্রি',
    badgeVariant: 'free',
    iconName: 'Calculator',
    category: 'calculation',
  },
];
