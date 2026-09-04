import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  User,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  CalendarDays,
  Edit,
} from 'lucide-react-native';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';
import type { TAuthUser } from '../../types/auth';

interface PersonalInfoCardProps {
  user: TAuthUser;
  onEditPress: () => void;
}

export const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({
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

  const address =
    user.upazila || user.district
      ? `${user.upazila ? `${user.upazila}, ` : ''}${user.district || ''}`
      : 'যুক্ত করা হয়নি';

  const infoRows = [
    [
      {
        icon: User,
        label: 'পূর্ণ নাম',
        value: user.name || 'N/A',
      },
      {
        icon: Mail,
        label: 'ইমেইল অ্যাড্রেস',
        value: user.email || 'N/A',
      },
    ],
    [
      {
        icon: Phone,
        label: 'ফোন নম্বর',
        value: user.phone || 'যুক্ত করা হয়নি',
      },
      {
        icon: MessageCircle,
        label: 'WhatsApp নম্বর',
        value: user.whatsappNumber || 'যুক্ত করা হয়নি',
      },
    ],
    [
      {
        icon: MapPin,
        label: 'বর্তমান ঠিকানা',
        value: address,
      },
      {
        icon: CalendarDays,
        label: 'অ্যাকাউন্ট তৈরি',
        value: user.createdAt ? formatJoinedDate(user.createdAt) : 'N/A',
      },
    ],
  ];

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
      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>ব্যক্তিগত ও যোগাযোগ তথ্য</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.editActionBtn} onPress={onEditPress}>
          <Edit size={12} color='#16a34a' />
          <Text style={styles.editActionText}>এডিট</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridContainer}>
        {infoRows.map((pair, rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {pair.map((item, colIdx) => {
              const Icon = item.icon;
              const isEmail = item.icon === Mail;

              return (
                <View
                  key={colIdx}
                  style={[
                    styles.infoItemBox,
                    {
                      backgroundColor: isDark ? '#131b2e' : '#f8fafc',
                      borderColor: isDark ? '#1f2937' : '#e2e8f0',
                    },
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
                    <Icon size={14} color='#16a34a' />
                  </View>
                  <View style={styles.infoTextCol}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: colors.text },
                        isEmail && styles.emailValue,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={isEmail}
                      minimumFontScale={isEmail ? 0.68 : 1}
                    >
                      {item.value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  editActionText: {
    color: '#16a34a',
    fontSize: 11.5,
    fontFamily: Fonts.sansBold,
  },
  gridContainer: {
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  infoItemBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 52,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.sansRegular,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
  },
  emailValue: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
});
