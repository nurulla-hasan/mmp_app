import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, LogIn, UserPlus, UserCheck } from 'lucide-react-native';
import { Button } from '../../components/ui/button';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { useProfile } from '../../hooks/queries/use-profile';
import { SuccessToast } from '../../lib/utils';
import { ProfileHeaderCard } from '../../components/profile/profile-header-card';
import { PersonalInfoCard } from '../../components/profile/personal-info-card';
import { ActivityCard } from '../../components/profile/activity-card';
import { AccountSettingsCard } from '../../components/profile/account-settings-card';
import { ProfileEditModal } from '../../components/profile/profile-edit-modal';
import { ChangePasswordModal } from '../../components/profile/change-password-modal';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  const { user: cachedUser, isAuthenticated, logout } = useAuthStore();
  const { data: serverUser } = useProfile();
  const user = serverUser ?? cachedUser;

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'লগআউট',
      'আপনি কি নিশ্চিত যে আপনার অ্যাকাউন্ট থেকে লগআউট করতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'হ্যাঁ, লগআউট',
          style: 'destructive',
          onPress: async () => {
            await logout();
            SuccessToast('সফলভাবে লগআউট করা হয়েছে।');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {isAuthenticated && user ? (
        <>
          <ProfileHeaderCard
            user={user}
            onEditPress={() => setEditModalVisible(true)}
          />

          <PersonalInfoCard
            user={user}
            onEditPress={() => setEditModalVisible(true)}
          />

          <ActivityCard />

          <AccountSettingsCard
            onChangePasswordPress={() => setPasswordModalVisible(true)}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.logoutBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fecaca',
              },
            ]}
            onPress={handleLogout}
          >
            <LogOut size={15} color='#ef4444' />
            <Text style={styles.logoutBtnText}>লগআউট করুন</Text>
          </TouchableOpacity>

          <ProfileEditModal
            visible={editModalVisible}
            onClose={() => setEditModalVisible(false)}
            user={user}
          />

          <ChangePasswordModal
            visible={passwordModalVisible}
            onClose={() => setPasswordModalVisible(false)}
            hasPassword={user.hasPassword ?? true}
          />
        </>
      ) : (
        <View
          style={[
            styles.guestCard,
            {
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: isDark ? '#1f2937' : '#e2e8f0',
            },
          ]}
        >
          <View style={[styles.guestIconCircle, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
            <UserCheck size={36} color='#16a34a' />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>
            আপনার প্রোফাইলে প্রবেশ করুন
          </Text>
          <Text style={[styles.guestSubtitle, { color: colors.textMuted }]}>
            আপনার সংরক্ষিত প্রজেক্ট, হিসাব ও প্রোফাইল ব্যবস্থাপনা করতে লগইন করুন।
          </Text>

          <View style={styles.guestActionsRow}>
            <Button
              title='সাইন ইন করুন'
              variant='primary'
              size='md'
              onPress={() => router.push('/(auth)/login')}
              icon={<LogIn size={14} color='#ffffff' />}
              style={{ flex: 1 }}
            />
            <Button
              title='নতুন অ্যাকাউন্ট'
              variant='outline'
              size='md'
              onPress={() => router.push('/(auth)/register')}
              icon={<UserPlus size={14} color={colors.text} />}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 32,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
  },
  guestCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  guestTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  guestActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
});
