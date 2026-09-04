import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CalendarDays,
  ShieldCheck,
  Sparkles,
  Edit3,
  MapPin,
} from 'lucide-react-native';
import { PAGE_LAYOUT } from '../common/page-layout';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';
import type { TAuthUser } from '../../types/auth';

import { ProfileAvatarUpload } from './profile-avatar-upload';

interface ProfileHeaderCardProps {
  user: TAuthUser;
  onEditPress: () => void;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  user,
  onEditPress,
}) => {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const hasLocation = Boolean(user.upazila || user.district);
  const locationText = [user.upazila, user.district].filter(Boolean).join(', ');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.centerCol}>
        <View style={styles.avatarWrap}>
          <ProfileAvatarUpload
            src={user.imageUrl}
            name={user.name}
            isPro={user.isSubscribed}
            size='lg'
          />
        </View>

        <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
        <Text
          style={[styles.userEmail, { color: colors.textMuted }]}
          numberOfLines={1}
          ellipsizeMode='middle'
        >
          {user.email}
        </Text>

        <View style={styles.badgesRow}>
          <View
            style={[
              styles.badgeOutline,
              {
                backgroundColor: isDark ? '#131b2e' : '#f8fafc',
                borderColor: isDark ? '#1f2937' : '#cbd5e1',
              },
            ]}
          >
            <ShieldCheck size={11} color={colors.textMuted} />
            <Text style={[styles.badgeText, { color: colors.text }]}>{user.role}</Text>
          </View>

          {user.isSubscribed ? (
            <View style={styles.proBadge}>
              <Sparkles size={11} color='#d97706' />
              <Text style={styles.proBadgeText}>সাবস্ক্রাইবড</Text>
            </View>
          ) : (
            <View
              style={[
                styles.badgeOutline,
                {
                  backgroundColor: isDark ? '#131b2e' : '#f8fafc',
                  borderColor: isDark ? '#1f2937' : '#cbd5e1',
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.textMuted }]}>ফ্রি মেম্বার</Text>
            </View>
          )}
        </View>

        <View style={styles.metaCol}>
          {hasLocation ? (
            <View style={styles.metaRow}>
              <MapPin size={12} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {locationText}
              </Text>
            </View>
          ) : null}

          {user.createdAt ? (
            <View style={styles.metaRow}>
              <CalendarDays size={12} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                যোগদান: {formatJoinedDate(user.createdAt)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.editBtn,
          {
            backgroundColor: isDark ? '#131b2e' : '#f8fafc',
            borderColor: colors.cardBorder,
          },
        ]}
        onPress={onEditPress}
      >
        <Edit3 size={13} color={colors.text} />
        <Text style={[styles.editBtnText, { color: colors.text }]}>প্রোফাইল এডিট</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: PAGE_LAYOUT.radius,
    borderWidth: 1,
    padding: PAGE_LAYOUT.sectionPadding,
    gap: 10,
  },
  centerCol: {
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: 7,
  },
  userName: {
    fontSize: 16.5,
    lineHeight: 21,
    fontFamily: Fonts.headingBold,
    marginBottom: 0,
  },
  userEmail: {
    maxWidth: '88%',
    fontSize: 10.5,
    lineHeight: 15,
    fontFamily: Fonts.sansRegular,
    marginBottom: 7,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
  },
  badgeOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10.5,
    fontFamily: Fonts.sansMedium,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderColor: 'rgba(217, 119, 6, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  proBadgeText: {
    color: '#d97706',
    fontSize: 10.5,
    fontFamily: Fonts.sansMedium,
  },
  metaCol: {
    gap: 3,
    alignItems: 'center',
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Fonts.sansRegular,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 12,
    fontFamily: Fonts.sansMedium,
  },
});
