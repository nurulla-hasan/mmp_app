export interface ToolItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  isPro: boolean;
  iconName: string;
  category: 'calculation' | 'map' | 'guide';
}

export const TOOLS_LIST: ToolItem[] = [
  {
    id: 'land-measurement',
    title: 'মৌজা ম্যাপ ও জমি পরিমাপ',
    subtitle: 'Land Measurement',
    description: 'মৌজা ম্যাপে দাগ এঁকে নিখুঁত শতক ও বর্গফুটে ক্ষেত্রফল পরিমাপ ও দাগ বণ্টন।',
    route: '/(tools)/land-measurement',
    isPro: true,
    iconName: 'Map',
    category: 'map',
  },
  {
    id: 'pantagraph',
    title: 'ম্যাপ তুলনা ও প্যান্টাগ্রাফ',
    subtitle: 'Pantagraph Tool',
    description: 'সাবেক ও হাল ম্যাপ এক ক্লিকে সুপারইম্পোজ করে সঠিক এলাইনমেন্ট ও তুলনা।',
    route: '/(tools)/pantagraph',
    isPro: true,
    iconName: 'Scaling',
    category: 'map',
  },
  {
    id: 'tracer',
    title: 'ডিজিটাল ম্যাপ ট্রেসিং',
    subtitle: 'Vector Tracer',
    description: 'ঝাপসা পুরানো ম্যাপ থেকে দাগের সীমানা ও দাগ নম্বর ভেক্টরে ট্রেস করুন।',
    route: '/(tools)/tracer',
    isPro: true,
    iconName: 'PenLine',
    category: 'map',
  },
  {
    id: 'unit-converter',
    title: 'জমির একক রূপান্তর',
    subtitle: 'Unit Converter',
    description: 'শতক, কাঠা, বিঘা, একর, বর্গফুট ও হেক্টরে তাৎক্ষণিক সঠিক রূপান্তর।',
    route: '/(tools)/unit-converter',
    isPro: false,
    iconName: 'MoveDiagonal',
    category: 'calculation',
  },
  {
    id: 'inheritance-calculator',
    title: 'জমি বণ্টন ক্যালকুলেটর',
    subtitle: 'Inheritance Splitter',
    description: 'মোট জমি ও অংশীদারদের প্রাপ্য হিস্যা অনুযায়ী সহজে জমি বণ্টন করুন।',
    route: '/(tools)/inheritance',
    isPro: false,
    iconName: 'Calculator',
    category: 'calculation',
  },
  {
    id: 'scale-guide',
    title: 'ম্যাপ স্কেল গাইড ও টিউটোরিয়াল',
    subtitle: 'Scale Guide',
    description: 'মৌজা ম্যাপে ১৬ ইঞ্চি = ১ মাইল ও কাস্টম স্কেল সেট করার নিখুঁত পদ্ধতি।',
    route: '/(tools)/scale-guide',
    isPro: false,
    iconName: 'Ruler',
    category: 'guide',
  },
];
