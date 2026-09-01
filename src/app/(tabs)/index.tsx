import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Map,
  Layers,
  Globe,
  Scaling,
  PenLine,
  FileSpreadsheet,
  Phone,
  Briefcase,
  Star,
  FolderKanban,
} from 'lucide-react-native';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

const SAVED_PLOT_PROJECTS = [
  {
    id: '1',
    name: 'দিনাজপুর সদর জমি (দাগ ৪২৮)',
    scale: '১৬″ = ১ মাইল',
    plots: 3,
    area: '৪২.৭৫ শতাংশ',
    status: 'সম্পন্ন',
    statusVariant: 'pro' as const,
  },
  {
    id: '2',
    name: 'বিরল গ্রামের খতিয়ান প্লট',
    scale: '৩২″ = ১ মাইল',
    plots: 2,
    area: '১৮.৪০ শতাংশ',
    status: 'খসড়া',
    statusVariant: 'warning' as const,
  },
  {
    id: '3',
    name: 'পারিবারিক জমি ভাগ-বাটোয়ারা',
    scale: '১৬″ = ১ মাইল',
    plots: 5,
    area: '৬৫.২০ শতাংশ',
    status: 'সম্পন্ন',
    statusVariant: 'pro' as const,
  },
];

const TOP_SURVEYORS = [
  {
    id: '1',
    name: 'মো. হাবিবুর রহমান',
    location: 'দিনাজপুর সদর',
    rating: '৪.৯',
    exp: '১৫+ বছর',
    verified: true,
  },
  {
    id: '2',
    name: 'আব্দুল করিম পাটোয়ারী',
    location: 'মিরপুর, ঢাকা',
    rating: '৫.০',
    exp: '১০+ বছর',
    verified: true,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── 1. Hero Action Banner (Primary CTA for Land Measurement) ─── */}
      <View style={[styles.heroCard, { backgroundColor: colors.heroBg, borderColor: colors.heroBorder }]}>
        <View style={styles.heroHeader}>
          <View style={styles.proTag}>
            <Sparkles size={12} color='#22c55e' />
            <Text style={styles.proTagText}>MOUZA MAP PRO</Text>
          </View>
          <Badge label='v2.0 LIVE' variant='pro' />
        </View>

        <Text style={styles.heroTitle}>ডিজিটাল মৌজা ম্যাপ ও জমি পরিমাপ</Text>
        <Text style={[styles.heroSubtitle, { color: colors.heroSubtitle }]}>
          ম্যাপে সরাসরি দাগ এঁকে শতক, কাঠা ও একরে নিখুঁত ক্ষেত্রফল হিসাব ও দাগ বণ্টন করুন।
        </Text>

        <View style={styles.heroActionRow}>
          <Button
            title='ম্যাপে জমি মাপুন'
            size='md'
            onPress={() => router.push('/(tools)/land-measurement')}
            style={styles.heroBtn}
            icon={<Map size={15} color='#fff' />}
          />
          <Button
            title='একক রূপান্তর'
            variant='outline'
            size='md'
            onPress={() => router.push('/(tools)/unit-converter')}
            style={styles.heroBtnOutline}
            textStyle={{ color: '#ffffff' }}
          />
        </View>
      </View>

      {/* ─── 2. অন্যান্য টুলস (Exact 4 Specialized Tools: Title & Badge Only) ─── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>অন্যান্য টুলস</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/tools')} activeOpacity={0.7}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>সব টুলস →</Text>
        </TouchableOpacity>
      </View>

      {/* Row 1: মৌজা ম্যাপ স্টুডিও + মৌজা জিও স্টুডিও */}
      <View style={styles.grid}>
        {/* Tool 1: মৌজা ম্যাপ স্টুডিও */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push('/(tools)/land-measurement')}
        >
          <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <Layers size={19} color='#059669' strokeWidth={2} />
          </View>
          <View style={styles.toolTextCol}>
            <Text style={[styles.toolTitle, { color: colors.text }]}>ম্যাপ স্টুডিও</Text>
            <Badge label='বেটা' variant='warning' />
          </View>
        </TouchableOpacity>

        {/* Tool 2: মৌজা জিও স্টুডিও */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push('/(tools)/land-measurement')}
        >
          <View style={[styles.iconBox, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
            <Globe size={19} color='#16a34a' strokeWidth={2} />
          </View>
          <View style={styles.toolTextCol}>
            <Text style={[styles.toolTitle, { color: colors.text }]}>মৌজা জিও</Text>
            <Badge label='বেটা' variant='warning' />
          </View>
        </TouchableOpacity>
      </View>

      {/* Row 2: ম্যাপ তুলনা ও প্যান্টাগ্রাফ + ডিজিটাল ম্যাপ ট্রেসিং */}
      <View style={styles.grid}>
        {/* Tool 3: ম্যাপ তুলনা ও প্যান্টাগ্রাফ */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push('/(tools)/pantagraph')}
        >
          <View style={[styles.iconBox, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
            <Scaling size={19} color='#0891b2' strokeWidth={2} />
          </View>
          <View style={styles.toolTextCol}>
            <Text style={[styles.toolTitle, { color: colors.text }]}>প্যান্টাগ্রাফ</Text>
            <Badge label='নতুন' variant='pro' />
          </View>
        </TouchableOpacity>

        {/* Tool 4: ডিজিটাল ম্যাপ ট্রেসিং */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push('/(tools)/tracer')}
        >
          <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <PenLine size={19} color='#d97706' strokeWidth={2} />
          </View>
          <View style={styles.toolTextCol}>
            <Text style={[styles.toolTitle, { color: colors.text }]}>ম্যাপ ট্রেসিং</Text>
            <Badge label='নতুন' variant='pro' />
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── 3. সংরক্ষিত প্রজেক্ট তালিকা ─── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <FolderKanban size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>সংরক্ষিত প্রজেক্ট তালিকা</Text>
        </View>
        <Text style={[styles.recentCountText, { color: colors.textMuted }]}>৩টি প্রজেক্ট</Text>
      </View>

      <View style={styles.savedProjectsList}>
        {SAVED_PLOT_PROJECTS.map((project) => (
          <TouchableOpacity
            key={project.id}
            activeOpacity={0.8}
            style={[styles.savedProjectCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => router.push('/(tools)/land-measurement')}
          >
            <View style={styles.savedProjectLeft}>
              <View style={[styles.fileIconBox, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
                <FileSpreadsheet size={18} color='#16a34a' />
              </View>
              <View style={styles.savedProjectDetails}>
                <Text style={[styles.savedProjectName, { color: colors.text }]} numberOfLines={1}>
                  {project.name}
                </Text>
                <View style={styles.savedProjectMeta}>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>স্কেল: {project.scale}</Text>
                  <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>{project.plots}টি প্লট</Text>
                </View>
              </View>
            </View>

            <View style={styles.savedProjectRight}>
              <Text style={[styles.savedProjectArea, { color: colors.text }]}>{project.area}</Text>
              <Badge label={project.status} variant={project.statusVariant} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── 4. ভেরিফাইড সার্ভেয়ার ─── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>ভেরিফাইড সার্ভেয়ার</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/surveyors')} activeOpacity={0.7}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>সকল সার্ভেয়ার →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.surveyorsGrid}>
        {TOP_SURVEYORS.map((s) => (
          <View
            key={s.id}
            style={[styles.surveyorMiniCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <View style={styles.surveyorMiniHeader}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarChar}>{s.name.charAt(3) || 'আ'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.surveyorMiniName, { color: colors.text }]} numberOfLines={1}>{s.name}</Text>
                <Text style={[styles.surveyorMiniLocation, { color: colors.textMuted }]}>{s.location}</Text>
              </View>
            </View>

            <View style={[styles.surveyorMiniFooter, { borderTopColor: colors.border }]}>
              <View style={styles.ratingBadge}>
                <Star size={10} color='#f59e0b' fill='#f59e0b' />
                <Text style={[styles.ratingText, { color: colors.textMuted }]}>{s.rating} • {s.exp}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                style={[styles.callMiniBtn, { backgroundColor: colors.primary }]}
              >
                <Phone size={11} color='#ffffff' />
                <Text style={styles.callMiniBtnText}>কল</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* ─── 5. সার্ভেয়ার ক্যারিয়ার ব্যানার ─── */}
      <View style={[styles.careerBanner, { backgroundColor: theme === 'dark' ? '#064e3b25' : '#f0fdf4', borderColor: theme === 'dark' ? '#064e3b' : '#bbf7d0' }]}>
        <View style={styles.careerBannerLeft}>
          <View style={[styles.careerIconCircle, { backgroundColor: theme === 'dark' ? '#064e3b' : '#dcfce7' }]}>
            <Briefcase size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.careerTitle, { color: theme === 'dark' ? '#4ade80' : '#15803d' }]}>
              আপনি কি পেশাদার সার্ভেয়ার?
            </Text>
            <Text style={[styles.careerDesc, { color: theme === 'dark' ? '#86efac' : '#166534' }]}>
              আমাদের প্ল্যাটফর্মে ভেরিফাইড আমিন হিসেবে যোগ দিয়ে সরাসরি নতুন ক্লায়েন্ট পান।
            </Text>
          </View>
        </View>
        <Button
          title='সার্ভেয়ার হিসেবে যোগ দিন'
          size='sm'
          variant='primary'
          onPress={() => router.push('/(tabs)/surveyors')}
          style={{ alignSelf: 'flex-start', marginTop: 4 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proTagText: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    lineHeight: 18,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  heroBtn: {
    flex: 1,
  },
  heroBtnOutline: {
    flex: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
  },
  sectionSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    marginTop: 1,
  },
  seeAllText: {
    fontSize: 11.5,
    fontFamily: Fonts.headingSemiBold,
  },
  recentCountText: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  toolCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTextCol: {
    flex: 1,
    gap: 3,
    alignItems: 'flex-start',
  },
  toolTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  toolDesc: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    lineHeight: 14,
  },
  savedProjectsList: {
    gap: 8,
  },
  savedProjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  savedProjectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedProjectDetails: {
    flex: 1,
    gap: 2,
  },
  savedProjectName: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  savedProjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
  },
  metaDot: {
    fontSize: 10.5,
  },
  savedProjectRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  savedProjectArea: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  surveyorsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  surveyorMiniCard: {
    flex: 1,
    padding: 10,
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  surveyorMiniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
  },
  surveyorMiniName: {
    fontSize: 11.5,
    fontFamily: Fonts.headingBold,
  },
  surveyorMiniLocation: {
    fontSize: 9.5,
    fontFamily: Fonts.sansRegular,
  },
  surveyorMiniFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
  },
  callMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  callMiniBtnText: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
  },
  careerBanner: {
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  careerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  careerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careerTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
  },
  careerDesc: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    lineHeight: 15,
  },
});
