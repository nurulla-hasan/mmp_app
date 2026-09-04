import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Calculator, Search, X, ArrowRight } from 'lucide-react-native';
import { CalculationCard } from '../components/calculations/calculation-card';
import { CalculationEmptyState } from '../components/calculations/calculation-empty-state';
import {
  PAGE_LAYOUT,
  PageIntro,
  PageWrapper,
} from '../components/common/page-layout';
import { CalculationListSkeleton } from '../components/common/page-loading-skeletons';
import { useCalculations } from '../hooks/queries/use-calculations';
import { Fonts } from '../constants/typography';
import { Colors } from '../constants/colors';
import { useThemeStore } from '../stores/theme-store';

export default function CalculationsScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

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
    <PageWrapper
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <PageIntro
        icon={<Calculator size={20} color={colors.primary} />}
        title='আপনার সংরক্ষিত হিসাব'
        description='সেভ করা জমি পরিমাপ, দাগের হিসাব ও ম্যাপভিত্তিক ক্যালকুলেশন এক জায়গা থেকে দেখুন।'
      />

      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
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
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
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
  );
}

const styles = StyleSheet.create({
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
