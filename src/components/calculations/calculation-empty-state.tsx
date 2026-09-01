import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Calculator, ArrowRight } from 'lucide-react-native';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';

interface CalculationEmptyStateProps {
  searchTerm?: string;
}

export const CalculationEmptyState: React.FC<CalculationEmptyStateProps> = ({
  searchTerm,
}) => {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#111827' : '#f8fafc',
          borderColor: isDark ? '#1f2937' : '#e2e8f0',
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
        <Calculator size={32} color={colors.textMuted} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        {searchTerm
          ? `"${searchTerm}" এর সাথে মিল রেখে কোনো পরিমাপ পাওয়া যায়নি`
          : 'এখনও কোনো ক্যালকুলেশন সংরক্ষণ করা হয়নি'}
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {searchTerm
          ? 'ভিন্ন কোনো নাম বা ম্যাপ ফাইলের নাম দিয়ে আবার অনুসন্ধান করুন।'
          : 'টুলসে গিয়ে ম্যাপ আপলোড করে প্লট আঁকুন এবং পরিমাপ সেভ করুন।'}
      </Text>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.actionBtn}
        onPress={() => router.push('/land-measurement')}
      >
        <Text style={styles.actionBtnText}>নতুন পরিমাপ শুরু করুন</Text>
        <ArrowRight size={13} color='#ffffff' />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginTop: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: Fonts.sansMedium,
  },
});

