import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react-native';
import { Input } from '../../components/ui/input';
import { AuthService } from '../../services/auth-service';
import { SuccessToast, ErrorToast } from '../../lib/utils';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('একটি বৈধ ইমেইল ঠিকানা দিন।');
      return;
    }

    setError('');
    try {
      setLoading(true);
      const res = await AuthService.forgotPassword({ email: email.trim() });
      if (res.success) {
        SuccessToast('পাসওয়ার্ড রিসেট কোড আপনার ইমেইলে পাঠানো হয়েছে।');
        router.push({
          pathname: '/(auth)/reset-password',
          params: { email: email.trim() },
        });
      } else {
        ErrorToast(res.message || 'কোড পাঠানো যায়নি। ইমেইলটি পরীক্ষা করুন।');
      }
    } catch (err: any) {
      ErrorToast(err?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          {/* Top Bar Back Button */}
          <TouchableOpacity
            style={[
              styles.backBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
              },
            ]}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          >
            <ArrowLeft size={18} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <KeyRound size={36} color='#16a34a' />
              <KeyRound size={24} color='#16a34a' />
            </View>
            <Text style={[styles.title, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              পাসওয়ার্ড পুনরুদ্ধার
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              আপনার নিবন্ধিত ইমেইল ঠিকানা দিন। আমরা আপনাকে পাসওয়ার্ড রিসেট করার জন্য একটি কোড পাঠাব।
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: isDark ? '#1f2937' : '#e2e8f0',
              },
            ]}
          >
            <Input
              label='ইমেইল ঠিকানা'
              placeholder='you@example.com'
              keyboardType='email-address'
              autoCapitalize='none'
              value={email}
              onChangeText={setEmail}
              error={error}
              leftIcon={<Mail size={18} color={isDark ? '#94a3b8' : '#64748b'} />}
            />

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.primaryActionBtn, loading && { opacity: 0.7 }]}
              onPress={handleSendCode}
              disabled={loading}
            >
              <Text style={styles.primaryActionBtnText}>
                {loading ? 'কোড পাঠানো হচ্ছে...' : 'রিসেট কোড পাঠান'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginBtn}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.backToLoginText}>লগইনে ফিরে যান</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexGrow: 1,
    justifyContent: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    marginBottom: 6,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  primaryActionBtn: {
    backgroundColor: '#16a34a',
    height: 48,
    borderRadius: 12,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
    marginTop: 6,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
  backToLoginBtn: {
    alignItems: 'center',
    marginTop: 18,
    marginTop: 14,
  },
  backToLoginText: {
    color: '#16a34a',
    fontSize: 13,
    fontSize: 12,
    fontFamily: Fonts.sansBold,
  },
});
