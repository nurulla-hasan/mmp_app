import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Mail,
  Lock,
  User,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { AuthService } from '../../services/auth-service';
import { useAuthStore } from '../../stores/auth-store';
import { SuccessToast, ErrorToast } from '../../lib/utils';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: 'login' | 'register' }>();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { setSession } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  useEffect(() => {
    if (params.tab === 'register') {
      setActiveTab('register');
    } else {
      setActiveTab('login');
    }
  }, [params.tab]);

  const validate = () => {
    const errs: { name?: string; email?: string; password?: string } = {};

    if (activeTab === 'register') {
      if (!name.trim() || name.trim().length < 2) {
        errs.name = 'নাম কমপক্ষে ২ অক্ষরের হতে হবে।';
      }
    }

    if (!email.trim()) {
      errs.email = 'একটি বৈধ ইমেইল ঠিকানা দিন।';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'সঠিক ইমেইল ফরম্যাট দিন।';
    }

    if (!password) {
      errs.password = 'পাসওয়ার্ড প্রয়োজন।';
    } else if (activeTab === 'register' && password.length < 8) {
      errs.password = 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।';
    } else if (activeTab === 'login' && password.length < 6) {
      errs.password = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await AuthService.login({ email: email.trim(), password });

      if (res.success && res.data) {
        await setSession(res.data);
        SuccessToast('লগইন সফল হয়েছে!');
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      } else {
        if (res.message?.includes('ভেরিফাই') || res.message?.toLowerCase().includes('verify')) {
          ErrorToast(res.message);
          router.push({
            pathname: '/(auth)/verify-code',
            params: { email: email.trim() },
          });
          return;
        }
        ErrorToast(res.message || 'লগইন করা যায়নি। সঠিক তথ্য দিন।');
      }
    } catch (err: any) {
      ErrorToast(err?.message || 'লগইন করার সময় সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await AuthService.register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (res.success) {
        SuccessToast('অ্যাকাউন্ট তৈরি হয়েছে! আপনার ইমেইল যাচাই করুন।');
        router.push({
          pathname: '/(auth)/verify-code',
          params: { email: email.trim() },
        });
      } else {
        ErrorToast(res.message || 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      ErrorToast(err?.message || 'নিবন্ধন করার সময় সমস্যা হয়েছে।');
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
          {/* Top Bar Floating Back Button */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[
                styles.backBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                },
              ]}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            >
              <ArrowLeft size={18} color={isDark ? '#f8fafc' : '#0f172a'} />
            </TouchableOpacity>

            <View style={styles.trustBadge}>
              <ShieldCheck size={14} color='#16a34a' />
              <Text style={styles.trustBadgeText}>১০০% নিরাপদ প্ল্যাটফর্ম</Text>
            </View>
          </View>

          {/* Premium Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.logoBadgeContainer}>
              <View style={styles.logoGlow} />
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.heroLogo}
              />
            </View>

            <Text style={[styles.brandTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              মৌজা ম্যাপ প্রো
            </Text>
            <Text style={[styles.brandSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              স্মার্ট ডিজিটাল ল্যান্ড রেকর্ডস ও জমি পরিমাপ প্ল্যাটফর্ম
            </Text>
          </View>

          {/* Segmented Pill Selector (Sign In vs Register) */}
          <View
            style={[
              styles.segmentContainer,
              {
                backgroundColor: isDark ? '#131b2e' : '#e2e8f0',
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.segmentTab,
                activeTab === 'login' && {
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
              onPress={() => {
                setActiveTab('login');
                setErrors({});
              }}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  {
                    color: activeTab === 'login'
                      ? (isDark ? '#ffffff' : '#0f172a')
                      : (isDark ? '#94a3b8' : '#64748b'),
                    fontFamily: activeTab === 'login' ? Fonts.headingBold : Fonts.sansMedium,
                  },
                ]}
              >
                সাইন ইন
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.segmentTab,
                activeTab === 'register' && {
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
              onPress={() => {
                setActiveTab('register');
                setErrors({});
              }}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  {
                    color: activeTab === 'register'
                      ? (isDark ? '#ffffff' : '#0f172a')
                      : (isDark ? '#94a3b8' : '#64748b'),
                    fontFamily: activeTab === 'register' ? Fonts.headingBold : Fonts.sansMedium,
                  },
                ]}
              >
                নতুন অ্যাকাউন্ট
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: isDark ? '#1f2937' : '#e2e8f0',
              },
            ]}
          >
            {activeTab === 'register' && (
              <Input
                label='আপনার পূর্ণ নাম'
                placeholder='যেমন: মো. আরিফুল ইসলাম'
                value={name}
                onChangeText={setName}
                error={errors.name}
                leftIcon={<User size={18} color={isDark ? '#94a3b8' : '#64748b'} />}
              />
            )}

            <Input
              label='ইমেইল ঠিকানা'
              placeholder='you@example.com'
              keyboardType='email-address'
              autoCapitalize='none'
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              leftIcon={<Mail size={18} color={isDark ? '#94a3b8' : '#64748b'} />}
            />

            <Input
              label='পাসওয়ার্ড'
              placeholder={activeTab === 'register' ? 'কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড' : 'আপনার পাসওয়ার্ড দিন'}
              isPassword
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              leftIcon={<Lock size={18} color={isDark ? '#94a3b8' : '#64748b'} />}
            />

            {activeTab === 'login' ? (
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={styles.forgotText}>পাসওয়ার্ড ভুলে গেছেন?</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.registerBenefitRow}>
                <CheckCircle2 size={14} color='#16a34a' />
                <Text style={[styles.benefitText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  অ্যাকাউন্ট তৈরি করলেই সকল ফ্রি টুলের আনলিমিটেড ব্যবহার
                </Text>
              </View>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.primaryActionBtn, loading && { opacity: 0.7 }]}
              onPress={activeTab === 'login' ? handleLogin : handleRegister}
              disabled={loading}
            >
              <Text style={styles.primaryActionBtnText}>
                {loading
                  ? (activeTab === 'login' ? 'সাইন ইন হচ্ছে...' : 'অ্যাকাউন্ট তৈরি হচ্ছে...')
                  : (activeTab === 'login' ? 'সাইন ইন করুন' : 'নিবন্ধন সম্পন্ন করুন')}
              </Text>
            </TouchableOpacity>

            {/* Switch Helper */}
            <View style={styles.switchHelpRow}>
              <Text style={[styles.switchHelpText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {activeTab === 'login' ? 'অ্যাকাউন্ট নেই?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab(activeTab === 'login' ? 'register' : 'login');
                  setErrors({});
                }}
              >
                <Text style={styles.switchHighlight}>
                  {activeTab === 'login' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Security Badges */}
          <View style={styles.securityFooter}>
            <Text style={[styles.securityFooterText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
              বাংলাদেশ ভূমি সংস্কার ও মৌজা পরিমাপ স্ট্যান্ডার্ড অনুযায়ী তৈরি
            </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexGrow: 1,
    justifyContent: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trustBadgeText: {
    fontSize: 11,
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: '#16a34a',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginBottom: 12,
  },
  logoBadgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginBottom: 6,
  },
  logoGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(22, 163, 74, 0.25)',
    filter: 'blur(10px)',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
  },
  heroLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    width: 36,
    height: 36,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  brandTitle: {
    fontSize: 24,
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    letterSpacing: -0.3,
    marginBottom: 4,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  brandSubtitle: {
    fontSize: 12.5,
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
    maxWidth: 240,
    lineHeight: 15,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
    padding: 2.5,
    borderRadius: 8,
    marginBottom: 10,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderRadius: 6,
  },
  segmentTabText: {
    fontSize: 13.5,
    fontSize: 12,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginBottom: 10,
  },
  forgotText: {
    color: '#16a34a',
    fontSize: 12.5,
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
  },
  registerBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    gap: 5,
    marginBottom: 12,
    backgroundColor: 'rgba(22, 163, 74, 0.06)',
    padding: 8,
    borderRadius: 8,
    padding: 6,
    borderRadius: 6,
  },
  benefitText: {
    fontSize: 11.5,
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    flex: 1,
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
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
  switchHelpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    gap: 4,
    marginTop: 12,
  },
  switchHelpText: {
    fontSize: 12.5,
    fontSize: 11.5,
    fontFamily: Fonts.sansRegular,
  },
  switchHighlight: {
    color: '#16a34a',
    fontSize: 12.5,
    fontSize: 11.5,
    fontFamily: Fonts.sansBold,
  },
  securityFooter: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  securityFooterText: {
    fontSize: 11,
    fontSize: 10,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
  },
});
