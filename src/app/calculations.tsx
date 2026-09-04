import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, X, ArrowRight } from 'lucide-react-native';
import { CalculationCard } from '../components/calculations/calculation-card';
import { CalculationEmptyState } from '../components/calculations/calculation-empty-state';
import { PageWrapper, PAGE_LAYOUT } from '../components/common/page-layout';
import { CalculationListSkeleton } from '../components/common/page-loading-skeletons';
import { useCalculations } from '../hooks/queries/use-calculations';
import { Fonts } from '../constants/typography';
import { Colors } from '../constants/colors';
import { useThemeStore } from '../stores/theme-store';

export default function CalculationsScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: calculations = [],
    isLoading,
    refetch,
  } = useCalculations(debouncedSearch || undefined);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.navbar, { borderBottomColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.backBtn,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            },
          ]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        >
          <ArrowLeft size={16} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>সংরক্ষিত ক্যালকুলেশন</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            আপনার সংরক্ষিত জমি পরিমাপ ও দাগের হিসাবসমূহ
          </Text>
        </View>
      </View>

      <PageWrapper
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: isDark ? '#1f2937' : '#e2e8f0',
            },
          ]}
        >
          <Search size={15} color={colors.textMuted} />
          <TextInput
            placeholder='নাম বা ম্যাপ খুঁজুন...'
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearchBtn}>
              <X size={13} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {isLoading && calculations.length === 0 ? (
          <CalculationListSkeleton />
        ) : calculations.length === 0 ? (
          <CalculationEmptyState searchTerm={searchTerm} />
        ) : (
          <View style={styles.listContainer}>
            {calculations.map((calc) => (
              <CalculationCard key={calc.id} calculation={calc} />
            ))}
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.bottomCtaBanner,
            {
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: isDark ? '#1f2937' : '#e2e8f0',
            },
          ]}
          onPress={() => router.push('/land-measurement')}
        >
          <View style={styles.ctaTextCol}>
            <Text style={[styles.ctaTitle, { color: colors.text }]}>পরিমাপ টুলস খুলুন</Text>
            <Text style={[styles.ctaSubtitle, { color: colors.textMuted }]}>
              নতুন জমি ক্যালকুলেশন ও প্লট ড্রয়িং শুরু করুন।
            </Text>
          </View>
          <ArrowRight size={16} color={colors.primary} />
        </TouchableOpacity>
      </PageWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAGE_LAYOUT.horizontal,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: { flex: 1, gap: 1 },
  headerTitle: { fontSize: 16, fontFamily: Fonts.headingBold },
  headerSubtitle: { fontSize: 11, fontFamily: Fonts.sansRegular },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
  clearSearchBtn: { padding: 4 },
  listContainer: { gap: 10 },
  bottomCtaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: PAGE_LAYOUT.sectionPadding,
    borderRadius: PAGE_LAYOUT.radius,
    borderWidth: 1,
    marginTop: 4,
  },
  ctaTextCol: { flex: 1, gap: 2 },
  ctaTitle: { fontSize: 13.5, fontFamily: Fonts.headingBold },
  ctaSubtitle: { fontSize: 11, fontFamily: Fonts.sansRegular },
});
