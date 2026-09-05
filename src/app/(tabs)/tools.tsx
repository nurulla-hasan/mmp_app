import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Map,
  Layers,
  Globe,
  Scaling,
  PenLine,
  MoveDiagonal,
  Calculator,
  Ruler,
  ChevronRight,
  ArrowRight,
} from 'lucide-react-native';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { PageSectionHeader, PageWrapper } from '../../components/common/page-layout';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { FEATURED_TOOL } from '../../constants/tools';

const SPECIALIZED_TOOLS = [
  {
    id: 'mouza-map-studio',
    title: 'মৌজা ম্যাপ স্টুডিও',
    description: 'C.S ও B.S ম্যাপ align করে cleanup, text/mark edit করুন এবং শেষে ব্যবহারযোগ্য sheet তৈরি করুন।',
    route: '/(tools)/land-measurement',
    badge: 'বেটা',
    badgeVariant: 'warning' as const,
    icon: Layers,
    color: '#059669',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
  {
    id: 'mouza-geo-studio',
    title: 'মৌজা জিও স্টুডিও',
    description: 'মৌজা ম্যাপকে বাস্তব পৃথিবীর অবস্থানের সঙ্গে align করে Google Earth-এর জন্য KMZ তৈরি করুন।',
    route: '/(tools)/mouza-geo',
    badge: 'বেটা',
    badgeVariant: 'warning' as const,
    icon: Globe,
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.12)',
  },
  {
    id: 'pantagraph',
    title: 'ম্যাপ তুলনা ও প্যান্টাগ্রাফ',
    description: 'সাবেক ও হাল ম্যাপ আপলোড করে matching point বসিয়ে অবস্থান, rotation ও scale মিলিয়ে তুলনা করুন।',
    route: '/(tools)/pantagraph',
    badge: 'নতুন',
    badgeVariant: 'pro' as const,
    icon: Scaling,
    color: '#0891b2',
    bg: 'rgba(6, 182, 212, 0.12)',
  },
  {
    id: 'tracer',
    title: 'ডিজিটাল ম্যাপ ট্রেসিং',
    description: 'পুরানো মৌজা ম্যাপের দাগের সীমানা ও দাগ নম্বর ট্রেস করে পরিষ্কার digital vector map তৈরি করুন।',
    route: '/(tools)/tracer',
    badge: 'নতুন',
    badgeVariant: 'pro' as const,
    icon: PenLine,
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.12)',
  },
];

const CALCULATION_TOOLS = [
  {
    id: 'unit-converter',
    title: 'জমির একক রূপান্তর',
    description: 'শতক, কাঠা, বিঘা, একর, বর্গফুট, বর্গমিটার ও হেক্টরে জমির পরিমাণ নিখুঁত রূপান্তর করুন।',
    route: '/(tools)/unit-converter',
    badge: 'ফ্রি',
    badgeVariant: 'free' as const,
    icon: MoveDiagonal,
    color: '#9333ea',
    bg: 'rgba(147, 51, 234, 0.12)',
  },
  {
    id: 'inheritance-calculator',
    title: 'জমি বণ্টন ক্যালকুলেটর',
    description: 'মোট জমি ও অংশীদারদের অনুপাত অনুযায়ী প্রত্যেকের প্রাপ্য জমির পরিমাণ নির্ণয় করুন।',
    route: '/(tools)/inheritance',
    badge: 'ফ্রি',
    badgeVariant: 'free' as const,
    icon: Calculator,
    color: '#e11d48',
    bg: 'rgba(225, 29, 72, 0.12)',
  },
  {
    id: 'scale-guide',
    title: 'মৌজা ম্যাপ স্কেল গাইড',
    description: '১৬″ = ১ মাইল, ৩২″ বা ৬৪″ স্কেলের মানচিত্র হিসাব ও স্কেল ক্যালিব্রেশনের নিয়ম।',
    route: '/(tools)/scale-guide',
    badge: 'ফ্রি',
    badgeVariant: 'free' as const,
    icon: Ruler,
    color: '#4f46e5',
    bg: 'rgba(79, 70, 229, 0.12)',
  },
];

export default function ToolsHubScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  return (
    <PageWrapper>
      <TouchableOpacity activeOpacity={0.88} onPress={() => router.push(FEATURED_TOOL.route as any)}>
        <View style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: theme === 'dark' ? '#064e3b' : 'rgba(22, 163, 74, 0.35)' }]}>
          <View style={styles.featuredTopRow}>
            <View style={styles.featuredIconBox}><Map size={24} color='#16a34a' strokeWidth={2.2} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.badgeRow}><Text style={[styles.featuredTitle, { color: colors.text }]}>{FEATURED_TOOL.title}</Text><Badge label='PRO' variant='pro' /><Badge label='প্রধান টুল' variant='free' /></View>
              <Text style={[styles.featuredDesc, { color: colors.textMuted }]}>{FEATURED_TOOL.description}</Text>
            </View>
          </View>
          <View style={[styles.featurePillsRow, { borderTopColor: colors.border }]}>{FEATURED_TOOL.features?.map((pill) => <View key={pill} style={[styles.featurePill, { backgroundColor: theme === 'dark' ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}><Text style={[styles.featurePillText, { color: colors.textMuted }]}>{pill}</Text></View>)}</View>
          <Button title='টুলটি ব্যবহার করুন' size='sm' variant='primary' onPress={() => router.push(FEATURED_TOOL.route as any)} icon={<ArrowRight size={14} color='#fff' />} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>

      <PageSectionHeader title='বিশেষায়িত ল্যান্ড টুলস' subtitle='ম্যাপ এলাইনমেন্ট, ট্রেসিং, প্যান্টাগ্রাফ ও জিওরেফারেন্স' />
      <View style={styles.toolsList}>{SPECIALIZED_TOOLS.map((tool) => { const IconComp = tool.icon; return <TouchableOpacity key={tool.id} activeOpacity={0.8} style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => router.push(tool.route as any)}><View style={[styles.toolIconBox, { backgroundColor: tool.bg }]}><IconComp size={20} color={tool.color} strokeWidth={2} /></View><View style={styles.toolTextCol}><View style={styles.toolTitleRow}><Text style={[styles.toolTitle, { color: colors.text }]}>{tool.title}</Text><Badge label={tool.badge} variant={tool.badgeVariant} /></View><Text style={[styles.toolDesc, { color: colors.textMuted }]} numberOfLines={2}>{tool.description}</Text></View><ChevronRight size={16} color={colors.textMuted} /></TouchableOpacity>; })}</View>

      <PageSectionHeader title='ভূমি হিসাব ও ইউটিলিটি টুলস' subtitle='একক রূপান্তর, ফারায়েজ হিস্যা বণ্টন ও স্কেল গাইড' />
      <View style={styles.toolsList}>{CALCULATION_TOOLS.map((tool) => { const IconComp = tool.icon; return <TouchableOpacity key={tool.id} activeOpacity={0.8} style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => router.push(tool.route as any)}><View style={[styles.toolIconBox, { backgroundColor: tool.bg }]}><IconComp size={20} color={tool.color} strokeWidth={2} /></View><View style={styles.toolTextCol}><View style={styles.toolTitleRow}><Text style={[styles.toolTitle, { color: colors.text }]}>{tool.title}</Text><Badge label={tool.badge} variant={tool.badgeVariant} /></View><Text style={[styles.toolDesc, { color: colors.textMuted }]} numberOfLines={2}>{tool.description}</Text></View><ChevronRight size={16} color={colors.textMuted} /></TouchableOpacity>; })}</View>
    </PageWrapper>
  );
}

const styles = StyleSheet.create({
  featuredCard: { borderRadius: 14, padding: 15, borderWidth: 1.5, gap: 12, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  featuredTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featuredIconBox: { width: 44, height: 44, borderRadius: 11, backgroundColor: 'rgba(22, 163, 74, 0.12)', borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.25)', alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  featuredTitle: { fontSize: 15.5, fontFamily: Fonts.headingBold },
  featuredDesc: { fontSize: 11.5, fontFamily: Fonts.sansRegular, lineHeight: 16, marginTop: 2 },
  featurePillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, borderTopWidth: 1, paddingTop: 10 },
  featurePill: { paddingHorizontal: 7.5, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  featurePillText: { fontSize: 10, fontFamily: Fonts.sansMedium },
  toolsList: { gap: 9 },
  toolCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 11 },
  toolIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toolTextCol: { flex: 1, gap: 2 },
  toolTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolTitle: { fontSize: 13, fontFamily: Fonts.headingBold },
  toolDesc: { fontSize: 10.5, fontFamily: Fonts.sansRegular, lineHeight: 14.5 },
});
