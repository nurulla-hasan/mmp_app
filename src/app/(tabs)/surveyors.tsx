import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Briefcase, Search, SlidersHorizontal, Users } from 'lucide-react-native';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { SurveyorCard } from '../../components/surveyors/surveyor-card';
import { SurveyorFilterModal } from '../../components/surveyors/surveyor-filter-modal';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { useInfiniteSurveyors, useSurveyorDistricts, useSurveyorServices } from '../../hooks/queries/use-surveyors';
import type { SurveyorQuery } from '../../types/surveyor';

type FilterState = Pick<SurveyorQuery, 'district' | 'service' | 'rating' | 'experienceMin' | 'sortBy'>;

export default function SurveyorsScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const queryFilters = useMemo(
    () => ({ ...filters, searchTerm: debouncedSearch || undefined, limit: 10 }),
    [filters, debouncedSearch]
  );

  const surveyorQuery = useInfiniteSurveyors(queryFilters);
  const { data: districts = [] } = useSurveyorDistricts();
  const { data: services = [] } = useSurveyorServices();

  const surveyors = useMemo(
    () => surveyorQuery.data?.pages.flatMap((page) => page.surveyors) ?? [],
    [surveyorQuery.data]
  );
  const meta = surveyorQuery.data?.pages[0]?.meta;
  const activeFilterCount = [filters.district, filters.service, filters.rating, filters.experienceMin, filters.sortBy].filter(Boolean).length;

  const header = (
    <View style={styles.headerArea}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>সার্ভেয়ার ডিরেক্টরি</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {meta ? `${meta.total} জন ভেরিফাইড সার্ভেয়ার` : 'এলাকাভিত্তিক অভিজ্ঞ ও ভেরিফাইড আমিন খুঁজুন'}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/join-as-surveyor')}
          style={[styles.joinButton, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
        >
          <Briefcase size={14} color={colors.primary} />
          <Text style={[styles.joinText, { color: colors.primary }]}>যোগ দিন</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder='নাম, এলাকা বা সেবা দিয়ে খুঁজুন...'
          returnKeyType='search'
          leftIcon={<Search size={16} color={colors.textMuted} />}
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setFilterOpen(true)}
          style={[
            styles.filterButton,
            {
              borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
              backgroundColor: activeFilterCount > 0 ? `${colors.primary}12` : colors.card,
            },
          ]}
        >
          <SlidersHorizontal size={16} color={activeFilterCount > 0 ? colors.primary : colors.textMuted} />
          {activeFilterCount > 0 ? <Text style={[styles.filterCount, { color: colors.primary }]}>{activeFilterCount}</Text> : null}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={surveyors}
        keyExtractor={(item, index) => item.id || item.slug || String(index)}
        renderItem={({ item }) => <SurveyorCard surveyor={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        keyboardShouldPersistTaps='handled'
        refreshControl={
          <RefreshControl
            refreshing={surveyorQuery.isRefetching && !surveyorQuery.isFetchingNextPage}
            onRefresh={() => surveyorQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          surveyorQuery.isLoading ? (
            <View style={styles.centerState}><ActivityIndicator color={colors.primary} /><Text style={[styles.stateText, { color: colors.textMuted }]}>সার্ভেয়ার লোড হচ্ছে...</Text></View>
          ) : surveyorQuery.isError ? (
            <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Users size={28} color='#ef4444' />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>সার্ভেয়ার লোড করা যায়নি</Text>
              <Text style={[styles.stateText, { color: colors.textMuted }]}>ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।</Text>
              <Button title='আবার চেষ্টা করুন' size='sm' onPress={() => surveyorQuery.refetch()} />
            </View>
          ) : (
            <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Users size={28} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>কোনো সার্ভেয়ার খুঁজে পাওয়া যায়নি</Text>
              <Text style={[styles.stateText, { color: colors.textMuted }]}>ভিন্ন শব্দে অনুসন্ধান করুন অথবা ফিল্টার রিসেট করুন।</Text>
            </View>
          )
        }
        ListFooterComponent={
          surveyors.length > 0 && surveyorQuery.hasNextPage ? (
            <View style={styles.footerLoader}>
              <Button
                title={surveyorQuery.isFetchingNextPage ? 'লোড হচ্ছে...' : 'আরও সার্ভেয়ার দেখুন'}
                variant='outline'
                loading={surveyorQuery.isFetchingNextPage}
                onPress={() => surveyorQuery.fetchNextPage()}
              />
            </View>
          ) : <View style={{ height: 14 }} />
        }
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (surveyorQuery.hasNextPage && !surveyorQuery.isFetchingNextPage) void surveyorQuery.fetchNextPage();
        }}
      />

      <SurveyorFilterModal
        visible={filterOpen}
        value={filters}
        districts={districts}
        services={services}
        totalResults={meta?.total}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  headerArea: { gap: 12, marginBottom: 13 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, fontFamily: Fonts.headingBold },
  subtitle: { fontSize: 10.5, fontFamily: Fonts.sansRegular, marginTop: 1 },
  joinButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 34 },
  joinText: { fontSize: 11, fontFamily: Fonts.sansMedium },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterButton: { width: 40, height: 38, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterCount: { position: 'absolute', top: 1, right: 4, fontSize: 8, fontFamily: Fonts.headingBold },
  centerState: { paddingVertical: 70, alignItems: 'center', gap: 8 },
  stateText: { fontSize: 11, fontFamily: Fonts.sansRegular, textAlign: 'center' },
  emptyCard: { marginTop: 30, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 13.5, fontFamily: Fonts.headingBold },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
