import React from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Map,
  Layers,
  Globe,
  Scaling,
  PenLine,
  FileSpreadsheet,
  Briefcase,
  FolderKanban,
  ChevronRight,
  Calculator,
  Plus,
  Wrench,
  BadgeCheck,
} from 'lucide-react-native';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { SurveyorCard } from '../../components/surveyors/surveyor-card';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { useAuthStore } from '../../stores/auth-store';
import { useCalculations } from '../../hooks/queries/use-calculations';
import { useSurveyors } from '../../hooks/queries/use-surveyors';
import { useMapStore } from '../../features/land-measurement/store/useMapStore';
import { calculatePolygonData } from '../../features/land-measurement/utils/calculations';
import { PLOT_COLOR_PALETTE } from '../../features/land-measurement/utils/canvas';
import { toBengaliDigits, SuccessToast } from '../../lib/utils';
import type { TCalculation, Point } from '../../types/calculation';
import type { PlotRecord } from '../../features/land-measurement/types/map';

type HomeColors = (typeof Colors)['light'];

function SkeletonBlock({
  colors,
  opacity,
  style,
}: {
  colors: HomeColors;
  opacity: Animated.Value;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      style={[
        styles.skeletonBlock,
        { backgroundColor: colors.skeleton, opacity },
        style,
      ]}
    />
  );
}

function ProjectsSkeleton({
  colors,
  opacity,
}: {
  colors: HomeColors;
  opacity: Animated.Value;
}) {
  return (
    <View style={styles.savedProjectsList}>
      {[0, 1, 2].map((item) => (
        <View
          key={`project-skeleton-${item}`}
          style={[
            styles.skeletonProjectCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.skeletonProjectLeft}>
            <SkeletonBlock
              colors={colors}
              opacity={opacity}
              style={styles.skeletonProjectIcon}
            />
            <View style={styles.skeletonProjectText}>
              <SkeletonBlock
                colors={colors}
                opacity={opacity}
                style={styles.skeletonProjectTitle}
              />
              <SkeletonBlock
                colors={colors}
                opacity={opacity}
                style={[styles.skeletonProjectMeta, { backgroundColor: colors.skeletonSoft }]}
              />
            </View>
          </View>
          <View style={styles.skeletonProjectRight}>
            <SkeletonBlock
              colors={colors}
              opacity={opacity}
              style={styles.skeletonProjectArea}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function SurveyorsSkeleton({
  colors,
  opacity,
}: {
  colors: HomeColors;
  opacity: Animated.Value;
}) {
  return (
    <View style={styles.featuredSurveyorList}>
      {[0, 1].map((item) => (
        <View
          key={`surveyor-skeleton-${item}`}
          style={[
            styles.skeletonSurveyorCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.skeletonSurveyorTop}>
            <SkeletonBlock
              colors={colors}
              opacity={opacity}
              style={styles.skeletonAvatar}
            />
            <View style={styles.skeletonSurveyorText}>
              <SkeletonBlock
                colors={colors}
                opacity={opacity}
                style={styles.skeletonSurveyorName}
              />
              <SkeletonBlock
                colors={colors}
                opacity={opacity}
                style={[styles.skeletonSurveyorLine, { backgroundColor: colors.skeletonSoft }]}
              />
              <SkeletonBlock
                colors={colors}
                opacity={opacity}
                style={[styles.skeletonSurveyorLineShort, { backgroundColor: colors.skeletonSoft }]}
              />
            </View>
          </View>
          <View style={styles.skeletonSurveyorChips}>
            <SkeletonBlock colors={colors} opacity={opacity} style={styles.skeletonChip} />
            <SkeletonBlock colors={colors} opacity={opacity} style={styles.skeletonChipWide} />
            <SkeletonBlock colors={colors} opacity={opacity} style={styles.skeletonChip} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const {
    data: allCalculations = [],
    isLoading: loadingCalculations,
    isRefetching: refetchingCalculations,
    refetch: refetchCalculations,
  } = useCalculations();
  const realCalculations = allCalculations.slice(0, 3);

  const featuredSurveyorsQuery = useSurveyors({ limit: 2 });
  const featuredSurveyors = featuredSurveyorsQuery.data?.surveyors ?? [];
  const { isAuthenticated } = useAuthStore();

  const skeletonOpacity = React.useRef(new Animated.Value(0.48)).current;

  React.useEffect(() => {
    if (!loadingCalculations && !featuredSurveyorsQuery.isLoading) {
      skeletonOpacity.setValue(0.7);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.92,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.48,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [featuredSurveyorsQuery.isLoading, loadingCalculations, skeletonOpacity]);

  const refreshHome = () => {
    void refetchCalculations();
    void featuredSurveyorsQuery.refetch();
  };

  const handleOpenCalculation = (calculation: TCalculation) => {
    const scaleValue = calculation.scalePxPerUnit || null;
    if (scaleValue) {
      useMapStore.getState().setScale(scaleValue);
    }

    const loadedPlots: PlotRecord[] = (calculation.plots || []).map((p, idx) => {
      let rawPoints: Point[] = [];
      if (Array.isArray(p.points)) {
        rawPoints = p.points as Point[];
      } else if (typeof p.points === 'string') {
        try {
          rawPoints = JSON.parse(p.points);
        } catch {
          rawPoints = [];
        }
      }

      const results = calculatePolygonData(rawPoints, scaleValue);
      return {
        id: p.id || `${Date.now()}-${idx}`,
        name: p.plotNumber || `প্লট ${toBengaliDigits(idx + 1)}`,
        points: rawPoints,
        results: results || {
          sqft: 0,
          shotok: Number(p.areaShotok) || 0,
          katha: Number(p.areaKatha) || 0,
          lengths: [],
          perimeter: 0,
        },
        color: PLOT_COLOR_PALETTE[idx % PLOT_COLOR_PALETTE.length],
      };
    });

    useMapStore.getState().setPlots(loadedPlots);
    SuccessToast(`\"${calculation.name}\" পরিমাপ লোড হয়েছে!`);
    router.push('/land-measurement');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refetchingCalculations || featuredSurveyorsQuery.isRefetching}
          onRefresh={refreshHome}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.heroBg, borderColor: colors.heroBorder },
        ]}
      >
        <View style={styles.heroHeader}>
          <View style={styles.proTag}>
            <Sparkles size={12} color={colors.primary} />
            <Text style={[styles.proTagText, { color: colors.primary }]}>MOUZA MAP PRO</Text>
          </View>
          <Badge label='v2.0 LIVE' variant='pro' />
        </View>

        <Text style={[styles.heroTitle, { color: colors.heroTitle }]}>ডিজিটাল মৌজা ম্যাপ ও জমি পরিমাপ</Text>
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
            title='স্কেল গাইড'
            variant='outline'
            size='md'
            onPress={() => router.push('/(tools)/scale-guide')}
            style={[
              styles.heroBtnOutline,
              {
                borderColor: colors.heroSecondaryBorder,
                backgroundColor: colors.heroSecondaryBg,
              },
            ]}
            textStyle={{ color: colors.heroSecondaryText }}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Wrench size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>অন্যান্য টুলস</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/tools')} activeOpacity={0.7}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>সব টুলস →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
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

      <View style={styles.grid}>
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

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <FolderKanban size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>সংরক্ষিত প্রজেক্ট তালিকা</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.seeAllRow}
          onPress={() => router.push('/calculations')}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>সব প্রজেক্ট</Text>
          <ChevronRight size={13} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loadingCalculations ? (
        <ProjectsSkeleton colors={colors} opacity={skeletonOpacity} />
      ) : !isAuthenticated ? (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.emptyProjectCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push('/(auth)/login')}
        >
          <FolderKanban size={22} color={colors.textMuted} />
          <View style={styles.flexText}>
            <Text style={[styles.emptyProjectTitle, { color: colors.text }]}>আপনার প্রজেক্ট দেখতে লগইন করুন</Text>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              ক্লাউডে সংরক্ষিত সমস্ত দাগ ও পরিমাপের হিসাব পেতে সাইন ইন করুন।
            </Text>
          </View>
          <ChevronRight size={15} color={colors.textMuted} />
        </TouchableOpacity>
      ) : realCalculations.length === 0 ? (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.emptyProjectCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push('/land-measurement')}
        >
          <Calculator size={22} color={colors.primary} />
          <View style={styles.flexText}>
            <Text style={[styles.emptyProjectTitle, { color: colors.text }]}>এখনও কোনো প্রজেক্ট সংরক্ষণ করা হয়নি</Text>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              ম্যাপে দাগ এঁকে পরিমাপ সংরক্ষণ করতে এখানে ট্যাপ করুন।
            </Text>
          </View>
          <Plus size={15} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.savedProjectsList}>
          {realCalculations.map((project) => {
            const plotCount = project.plots?.length || 0;
            const totalShotok = (project.plots || []).reduce(
              (sum, p) => sum + (Number(p.areaShotok) || 0),
              0,
            );
            const scaleDisplay = project.scalePxPerUnit
              ? `১ px ≈ ${(1 / project.scalePxPerUnit).toFixed(1)} ft`
              : 'লিংক স্কেল';

            return (
              <TouchableOpacity
                key={project.id}
                activeOpacity={0.8}
                style={[styles.savedProjectCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => handleOpenCalculation(project)}
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
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{scaleDisplay}</Text>
                      <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {toBengaliDigits(plotCount)}টি প্লট
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.savedProjectRight}>
                  {totalShotok > 0 ? (
                    <Text style={[styles.savedProjectArea, { color: colors.text }]}>
                      {toBengaliDigits(totalShotok.toFixed(2))} শতাংশ
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {featuredSurveyorsQuery.isLoading || featuredSurveyors.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <BadgeCheck size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>ভেরিফাইড সার্ভেয়ার</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/surveyors')} activeOpacity={0.7}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>সকল সার্ভেয়ার →</Text>
            </TouchableOpacity>
          </View>

          {featuredSurveyorsQuery.isLoading ? (
            <SurveyorsSkeleton colors={colors} opacity={skeletonOpacity} />
          ) : (
            <View style={styles.featuredSurveyorList}>
              {featuredSurveyors.map((surveyor) => (
                <SurveyorCard key={surveyor.id || surveyor.slug} surveyor={surveyor} compact />
              ))}
            </View>
          )}
        </>
      ) : null}

      <View
        style={[
          styles.careerBanner,
          {
            backgroundColor: theme === 'dark' ? '#064e3b25' : '#f0fdf4',
            borderColor: theme === 'dark' ? '#064e3b' : '#bbf7d0',
          },
        ]}
      >
        <View style={styles.careerBannerLeft}>
          <View
            style={[
              styles.careerIconCircle,
              { backgroundColor: theme === 'dark' ? '#064e3b' : '#dcfce7' },
            ]}
          >
            <Briefcase size={20} color={colors.primary} />
          </View>
          <View style={styles.flexText}>
            <Text
              style={[
                styles.careerTitle,
                { color: theme === 'dark' ? '#4ade80' : '#15803d' },
              ]}
            >
              আপনি কি পেশাদার সার্ভেয়ার?
            </Text>
            <Text
              style={[
                styles.careerDesc,
                { color: theme === 'dark' ? '#86efac' : '#166534' },
              ]}
            >
              আমাদের প্ল্যাটফর্মে ভেরিফাইড আমিন হিসেবে যোগ দিয়ে সরাসরি নতুন ক্লায়েন্ট পান।
            </Text>
          </View>
        </View>
        <Button
          title='সার্ভেয়ার হিসেবে যোগ দিন'
          size='sm'
          variant='primary'
          onPress={() => router.push('/join-as-surveyor')}
          style={styles.careerButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, gap: 12, paddingBottom: 28 },
  flexText: { flex: 1, gap: 2 },
  heroCard: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
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
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proTagText: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    lineHeight: 18,
  },
  heroActionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  heroBtn: { flex: 1 },
  heroBtnOutline: { flex: 1, borderWidth: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14.5, fontFamily: Fonts.headingBold },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 11.5, fontFamily: Fonts.headingSemiBold },
  grid: { flexDirection: 'row', gap: 10 },
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
  toolTextCol: { flex: 1, gap: 3, alignItems: 'flex-start' },
  toolTitle: { fontSize: 12.5, fontFamily: Fonts.headingBold },
  savedProjectsList: { gap: 8 },
  emptyProjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyProjectTitle: { fontSize: 12.5, fontFamily: Fonts.headingBold },
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
  savedProjectDetails: { flex: 1, gap: 2 },
  savedProjectName: { fontSize: 12.5, fontFamily: Fonts.headingBold },
  savedProjectMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 10.5, fontFamily: Fonts.sansRegular },
  metaDot: { fontSize: 10.5 },
  savedProjectRight: { alignItems: 'flex-end', gap: 3 },
  savedProjectArea: { fontSize: 12.5, fontFamily: Fonts.headingBold },
  featuredSurveyorList: { gap: 8 },
  careerBanner: {
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  careerBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  careerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careerTitle: { fontSize: 13.5, fontFamily: Fonts.headingBold },
  careerDesc: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    lineHeight: 15,
  },
  careerButton: { alignSelf: 'flex-start', marginTop: 4 },
  skeletonBlock: { borderRadius: 6 },
  skeletonProjectCard: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  skeletonProjectLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  skeletonProjectIcon: { width: 36, height: 36, borderRadius: 8 },
  skeletonProjectText: { flex: 1, gap: 7 },
  skeletonProjectTitle: { width: '58%', height: 12 },
  skeletonProjectMeta: { width: '76%', height: 9 },
  skeletonProjectRight: { width: 78, alignItems: 'flex-end' },
  skeletonProjectArea: { width: 70, height: 12 },
  skeletonSurveyorCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 11,
  },
  skeletonSurveyorTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  skeletonAvatar: { width: 46, height: 46, borderRadius: 23 },
  skeletonSurveyorText: { flex: 1, gap: 7 },
  skeletonSurveyorName: { width: '52%', height: 13 },
  skeletonSurveyorLine: { width: '78%', height: 9 },
  skeletonSurveyorLineShort: { width: '46%', height: 9 },
  skeletonSurveyorChips: { flexDirection: 'row', gap: 6 },
  skeletonChip: { width: 58, height: 20, borderRadius: 6 },
  skeletonChipWide: { width: 82, height: 20, borderRadius: 6 },
});
