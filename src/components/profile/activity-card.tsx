import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Calculator, Star, ArrowRight } from 'lucide-react-native';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';

export const ActivityCard: React.FC = () => {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderColor: isDark ? '#1f2937' : '#e2e8f0',
        },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>আমার কার্যক্রম</Text>

      <View style={styles.list}>
        {/* Item 1: Calculations */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.activityItem,
            {
              backgroundColor: isDark ? '#131b2e' : '#f8fafc',
              borderColor: isDark ? '#1f2937' : '#e2e8f0',
            },
          ]}
          onPress={() => router.push('/land-measurement')}
        >
          <View style={styles.leftCol}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
              <Calculator size={15} color='#16a34a' />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>
                সেভ করা ক্যালকুলেশন
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
                সংরক্ষিত ক্যালকুলেশন দেখুন
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>দেখুন</Text>
            <ArrowRight size={12} color='#16a34a' />
          </View>
        </TouchableOpacity>

        {/* Item 2: Favorite Surveyors */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.activityItem,
            {
              backgroundColor: isDark ? '#131b2e' : '#f8fafc',
              borderColor: isDark ? '#1f2937' : '#e2e8f0',
            },
          ]}
          onPress={() => router.push('/(tabs)/surveyors')}
        >
          <View style={styles.leftCol}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Star size={15} color='#d97706' fill='#d97706' />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>
                পছন্দের সার্ভেয়ার
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
                ফেভারিট সার্ভেয়ার দেখুন
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>দেখুন</Text>
            <ArrowRight size={12} color='#16a34a' />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
  },
  list: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
  itemTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
  itemSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 6,
  },
  actionText: {
    color: '#16a34a',
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
  },
});

