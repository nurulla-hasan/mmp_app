import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  X,
  ArrowRight,
  Calculator,
} from 'lucide-react-native';
import { CalculationCard } from '../components/calculations/calculation-card';
import { CalculationEmptyState } from '../components/calculations/calculation-empty-state';
import { useCalculations } from '../hooks/queries/use-calculations';
import { Fonts } from '../constants/typography';
import { Colors } from '../constants/colors';
import { useThemeStore } from '../stores/theme-store';
import { useAuthStore } from '../stores/auth-store';

export default function CalculationsScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const { isAuthenticated } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search input 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── TanStack Query: auto-cached, refetch on invalidation ─────────────────
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

  // handleDeleted: TanStack Query optimistic delete is done inside the card mutation
  // We don't need local state — queryClient.invalidateQueries auto-syncs the list

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Navbar Header */}
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor='#16a34a' />
        }
      >
        {/* Search Box */}
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

        {/* Loading Spinner */}
        {isLoading && calculations.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color='#16a34a' />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              ক্যালকুলেশন লোড হচ্ছে...
            </Text>
          </View>
        ) : calculations.length === 0 ? (
          <CalculationEmptyState searchTerm={searchTerm} />
        ) : (
          <View style={styles.listContainer}>
            {calculations.map((calc) => (
              <CalculationCard
                key={calc.id}
                calculation={calc}
              />
            ))}
          </View>
        )}

        {/* Bottom CTA Banner (Web Aligned) */}
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
          <ArrowRight size={16} color='#16a34a' />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  headerTitleCol: {
    flex: 1,
    gap: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
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
  clearSearchBtn: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: Fonts.sansMedium,
  },
  listContainer: {
    gap: 10,
  },
  bottomCtaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  ctaTextCol: {
    flex: 1,
    gap: 2,
  },
  ctaTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
  },
  ctaSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
  },
});

