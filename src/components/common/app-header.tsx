import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Map, Bell, Crown } from 'lucide-react-native';
import { Fonts } from '../../constants/typography';
import { Badge } from '../ui/badge';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showProBadge?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = 'মৌজা ম্যাপ প্রো',
  subtitle = 'ডিজিটাল ল্যান্ড প্ল্যাটফর্ম',
  showProBadge = true,
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Brand & Logo */}
      <View style={styles.leftSection}>
        <View style={styles.logoBox}>
          <Map size={20} color='#ffffff' strokeWidth={2.2} />
        </View>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>{title}</Text>
            {showProBadge && <Badge label='PRO' variant='pro' />}
          </View>
          <Text style={styles.brandSubtitle}>{subtitle}</Text>
        </View>
      </View>

      {/* Right Actions */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.proPill}
          onPress={() => router.push('/pricing')}
        >
          <Crown size={14} color='#d97706' />
          <Text style={styles.proPillText}>আপগ্রেড</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn}>
          <Bell size={18} color='#334155' />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  textCol: {
    gap: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
    marginTop: -2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proPillText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
    color: '#d97706',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
});

