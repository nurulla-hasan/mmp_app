import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Crown,
  Sparkles,
  User,
  Mail,
  Phone,
  MapPin,
  LogOut,
  LogIn,
  UserPlus,
  ShieldCheck,
  Calendar,
} from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Fonts } from '../../constants/typography';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { Colors } from '../../constants/colors';
import { SuccessToast } from '../../lib/utils';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'লগআউট',
      'আপনি কি নিশ্চিত যে লগআউট করতে চান?',
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
          {/* 1. Logged In User Card */}
          <Card style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.userInfoCol}>
              <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user.email}</Text>
              <View style={styles.badgesRow}>
                <Badge
                  label={user.isSubscribed ? 'প্রো মেম্বার' : 'ফ্রি মেম্বার'}
                  variant={user.isSubscribed ? 'pro' : 'free'}
                />
                {user.role === 'SURVEYOR' && (
                  <Badge label='সার্ভেয়ার' variant='warning' />
                )}
                {user.role === 'ADMIN' && (
                  <Badge label='অ্যাডমিন' variant='neutral' />
                )}
              </View>
            </View>
          </Card>

          {/* 2. User Info Details Card */}
          <Card style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardSectionTitle, { color: colors.text }]}>প্রোফাইল বিবরণ</Text>

            <View style={styles.detailItem}>
              <Mail size={16} color={colors.textMuted} />
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>ইমেইল</Text>
                <Text style={[styles.detailVal, { color: colors.text }]}>{user.email}</Text>
              </View>
              {user.emailVerified ? (
                <ShieldCheck size={16} color='#16a34a' />
              ) : null}
            </View>

            {user.phone ? (
              <View style={styles.detailItem}>
                <Phone size={16} color={colors.textMuted} />
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>মোবাইল নম্বর</Text>
                  <Text style={[styles.detailVal, { color: colors.text }]}>{user.phone}</Text>
                </View>
              </View>
            ) : null}

            {user.district || user.upazila ? (
              <View style={styles.detailItem}>
                <MapPin size={16} color={colors.textMuted} />
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>ঠিকানা</Text>
                  <Text style={[styles.detailVal, { color: colors.text }]}>
                    {[user.upazila, user.district].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </View>
            ) : null}
          </Card>

          {/* 3. Upgrade Banner (if not subscribed) */}
          {!user.isSubscribed && (
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeHeader}>
                <Crown size={18} color='#fbbf24' />
                <Text style={styles.upgradeTitle}>প্রো মেম্বারশিপে আপগ্রেড করুন</Text>
              </View>
              <Text style={styles.upgradeDesc}>
                আনলিমিটেড জমি পরিমাপ, প্যান্টাগ্রাফ ও ডিজিটাল ট্রেসিং টুলসের সম্পূর্ণ অ্যাক্সেস পান।
              </Text>
              <Button
                title='প্ল্যান ও অফার দেখুন'
                size='sm'
                onPress={() => router.push('/pricing')}
                style={{ backgroundColor: '#16a34a', marginTop: 4 }}
                icon={<Sparkles size={13} color='#fff' />}
              />
            </View>
          )}

          {/* 4. Logout Action */}
          <Button
            title='লগআউট করুন'
            variant='destructive'
            size='md'
            onPress={handleLogout}
            icon={<LogOut size={16} color='#ffffff' />}
            style={{ marginTop: 6 }}
          />
        </>
      ) : (
        /* Guest / Not Logged In View */
        <View style={styles.guestContainer}>
          <Card style={[styles.guestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.guestIconCircle}>
              <User size={36} color='#16a34a' />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>আপনার অ্যাকাউন্ট নেই</Text>
            <Text style={[styles.guestSubtitle, { color: colors.textMuted }]}>
              আপনার জমির পরিমাপ, মৌজা ম্যাপ এবং কাস্টম প্রজেক্ট সেভ রাখতে সাইন ইন করুন।
            </Text>

            <View style={styles.guestActionCol}>
              <Button
                title='সাইন ইন করুন'
                variant='primary'
                size='lg'
                onPress={() => router.push('/(auth)/login')}
                icon={<LogIn size={16} color='#ffffff' />}
                style={{ width: '100%' }}
              />

              <Button
                title='নতুন অ্যাকাউন্ট তৈরি করুন'
                variant='outline'
                size='lg'
                onPress={() => router.push('/(auth)/register')}
                icon={<UserPlus size={16} color='#16a34a' />}
                style={{ width: '100%' }}
              />
            </View>
          </Card>
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
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
  },
  userInfoCol: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detailsCard: {
    padding: 14,
    gap: 12,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
  },
  detailVal: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    marginTop: 1,
  },
  upgradeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upgradeTitle: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
  },
  upgradeDesc: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    color: '#94a3b8',
    lineHeight: 16,
  },
  guestContainer: {
    paddingTop: 20,
  },
  guestCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  guestIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    marginBottom: 6,
  },
  guestSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  guestActionCol: {
    width: '100%',
    gap: 10,
  },
});
