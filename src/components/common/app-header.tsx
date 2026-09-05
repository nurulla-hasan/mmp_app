import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Search, LogIn } from 'lucide-react-native';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';
import { useAuthStore } from '../../stores/auth-store';
import { useActiveBroadcasts } from '../../hooks/queries/use-broadcasts';
import { Button } from '../ui/button';
import { ProAvatarRing } from '../ui/pro-avatar-ring';
import { BroadcastCenterModal } from '../broadcasts/broadcast-center-modal';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = 'মৌজা ম্যাপ প্রো',
  subtitle,
  showSearch = false,
}) => {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { user, isAuthenticated } = useAuthStore();
  const colors = Colors[theme];
  const broadcastsQuery = useActiveBroadcasts();
  const broadcasts = broadcastsQuery.data ?? [];
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const displaySubtitle = subtitle || (title === 'মৌজা ম্যাপ প্রো' ? 'ডিজিটাল ল্যান্ড প্ল্যাটফর্ম' : 'মৌজা ম্যাপ প্রো');

  const openNotifications = () => {
    setNotificationsOpen(true);
    void broadcastsQuery.refetch();
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.brandRow}
          onPress={() => router.push('/(tabs)')}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
          />
          <View style={styles.brandTextCol}>
            <Text style={[styles.brandTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>{displaySubtitle}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityRole='button'
            accessibilityLabel='নোটিফিকেশন দেখুন'
            onPress={openNotifications}
            style={[styles.notificationButton, { backgroundColor: colors.iconBtnBg }]}
          >
            <Bell size={16} color={colors.textMuted} strokeWidth={2} />
            {broadcasts.length > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {broadcasts.length > 9 ? '9+' : broadcasts.length}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {isAuthenticated && user ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <ProAvatarRing size={36} strokeWidth={1.75} isPro={user.isSubscribed}>
                <View style={styles.headerAvatarBtn}>
                  {user.imageUrl ? (
                    <Image
                      source={{ uri: user.imageUrl }}
                      style={styles.headerAvatarImg}
                    />
                  ) : (
                    <Text style={styles.headerAvatarText}>
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  )}
                </View>
              </ProAvatarRing>
            </TouchableOpacity>
          ) : (
            <Button
              variant='outline'
              size='sm'
              title='লগইন'
              onPress={() => router.push('/(auth)/login')}
              icon={<LogIn size={13} color='#16a34a' strokeWidth={2} />}
            />
          )}
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Search size={15} color={colors.textMuted} strokeWidth={2.2} />
            <TextInput
              placeholder='মৌজা, দাগ নম্বর বা সার্ভেয়ার খুঁজুন...'
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              editable={true}
            />
          </View>
        </View>
      )}

      <BroadcastCenterModal
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        broadcasts={broadcasts}
        loading={broadcastsQuery.isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    borderBottomWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  brandTextCol: {
    gap: 0.5,
    flex: 1,
  },
  brandTitle: {
    fontSize: 15.5,
    fontFamily: Fonts.headingBold,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    marginTop: -2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  notificationButton: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    lineHeight: 10,
    fontFamily: Fonts.sansBold,
  },
  headerAvatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerAvatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Fonts.headingBold,
  },
  searchContainer: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    paddingVertical: 0,
  },
});
