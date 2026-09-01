import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import {
  CalendarDays,
  ShieldCheck,
  Sparkles,
  Camera,
  Edit3,
  MapPin,
} from 'lucide-react-native';
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
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderColor: isDark ? '#1f2937' : '#e2e8f0',
        },
      ]}
    >
      <View style={styles.centerCol}>
        {/* Profile Avatar Upload with Native Cropper */}
        <View style={{ marginBottom: 10 }}>
          <ProfileAvatarUpload
            src={user.imageUrl}
            name={user.name}
            isPro={user.isSubscribed}
            size='xl'
          />
        </View>

        {/* User Name & Email */}
        <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
        <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user.email}</Text>

        {/* Badges Row (Role + Subscription) */}
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

        {/* Location & Joined Date Info */}
        <View style={styles.metaCol}>
          {hasLocation ? (
            <View style={styles.metaRow}>
              <MapPin size={12} color='#16a34a' />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {locationText}
              </Text>
            </View>
          ) : null}

          {user.createdAt ? (
            <View style={styles.metaRow}>
              <CalendarDays size={12} color='#16a34a' />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                যোগদান: {formatJoinedDate(user.createdAt)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Edit Profile Action Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.editBtn,
          {
            backgroundColor: isDark ? '#131b2e' : '#f8fafc',
            borderColor: isDark ? '#1f2937' : '#e2e8f0',
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
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  centerCol: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  proAvatarBorder: {
    borderColor: '#f59e0b',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 26,
    fontFamily: Fonts.headingBold,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111827',
  },
  userName: {
    fontSize: 16.5,
    fontFamily: Fonts.headingBold,
    marginBottom: 1,
  },
  userEmail: {
    fontSize: 11.5,
    fontFamily: Fonts.sansRegular,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
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
    gap: 4,
    alignItems: 'center',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 7,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
});

