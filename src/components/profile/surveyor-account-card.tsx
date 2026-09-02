import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, BadgeCheck, Briefcase, ChevronRight, Clock } from 'lucide-react-native';
import { Badge } from '../ui/badge';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import type { TAuthUser } from '../../types/auth';

interface SurveyorAccountCardProps {
  user: TAuthUser;
  onPress: () => void;
}

export const SurveyorAccountCard: React.FC<SurveyorAccountCardProps> = ({ user, onPress }) => {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const profile = user.surveyorProfile;
  const status = profile?.verificationStatus;

  const title =
    status === 'APPROVED'
      ? 'সার্ভেয়ার প্রোফাইল ম্যানেজ করুন'
      : status === 'PENDING'
        ? 'সার্ভেয়ার আবেদন যাচাইাধীন'
        : status === 'REJECTED'
          ? 'সার্ভেয়ার আবেদন দেখুন'
          : 'সার্ভেয়ার হিসেবে যোগ দিন';

  const description =
    status === 'APPROVED'
      ? 'সেবা, মূল্য ও কাজের এলাকা আপডেট করুন'
      : status === 'PENDING'
        ? 'আপনার আবেদনের বর্তমান অবস্থা দেখুন'
        : status === 'REJECTED'
          ? profile?.adminNote || 'আবেদনের অবস্থা ও নির্দেশনা দেখুন'
          : 'পেশাদার প্রোফাইল তৈরি করে নতুন ক্লায়েন্ট পান';

  const Icon =
    status === 'APPROVED'
      ? BadgeCheck
      : status === 'PENDING'
        ? Clock
        : status === 'REJECTED'
          ? AlertTriangle
          : Briefcase;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: `${colors.primary}12` }]}>
        <Icon
          size={18}
          color={
            status === 'REJECTED'
              ? '#ef4444'
              : status === 'PENDING'
                ? '#d97706'
                : colors.primary
          }
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {status ? (
            <Badge
              label={
                status === 'APPROVED'
                  ? 'অনুমোদিত'
                  : status === 'PENDING'
                    ? 'যাচাইাধীন'
                    : 'প্রত্যাখ্যাত'
              }
              variant={status === 'APPROVED' ? 'success' : 'warning'}
            />
          ) : null}
        </View>
        <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
          {description}
        </Text>
      </View>

      <ChevronRight size={17} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  title: { fontSize: 12.5, fontFamily: Fonts.headingBold },
  description: { fontSize: 10.5, lineHeight: 15, fontFamily: Fonts.sansRegular },
});
