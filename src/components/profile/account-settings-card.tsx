import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Moon, Sun, KeyRound } from 'lucide-react-native';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';

interface AccountSettingsCardProps {
  onChangePasswordPress: () => void;
}

export const AccountSettingsCard: React.FC<AccountSettingsCardProps> = ({
  onChangePasswordPress,
}) => {
  const { theme, toggleTheme } = useThemeStore();
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
      <Text style={[styles.cardTitle, { color: colors.text }]}>অ্যাকাউন্ট সেটিংস</Text>

      <View style={styles.contentCol}>
        {/* Row 1: Theme Mode */}
        <View style={styles.settingRow}>
          <View style={styles.leftCol}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              {isDark ? (
                <Moon size={15} color='#94a3b8' />
              ) : (
                <Sun size={15} color='#f59e0b' />
              )}
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>থিম মোড</Text>
              <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
                লাইট বা ডার্ক মোড বেছে নিন
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#cbd5e1', true: '#16a34a' }}
            thumbColor='#ffffff'
          />
        </View>

        {/* Separator Divider */}
        <View style={[styles.separator, { backgroundColor: isDark ? '#1f2937' : '#e2e8f0' }]} />

        {/* Row 2: Security */}
        <View style={styles.settingRow}>
          <View style={styles.leftCol}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <KeyRound size={15} color='#94a3b8' />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>নিরাপত্তা</Text>
              <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
                পাসওয়ার্ড পরিবর্তন করুন
              </Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.actionOutlineBtn,
              {
                backgroundColor: isDark ? '#131b2e' : '#f8fafc',
                borderColor: isDark ? '#1f2937' : '#cbd5e1',
              },
            ]}
            onPress={onChangePasswordPress}
          >
            <Text style={[styles.actionOutlineBtnText, { color: colors.text }]}>পরিবর্তন</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
  },
  contentCol: {
    gap: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  separator: {
    height: 1,
    width: '100%',
  },
  actionOutlineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionOutlineBtnText: {
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
  },
});

