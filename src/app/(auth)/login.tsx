import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Mail, Lock, User, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

import { Input } from '../../components/ui/input';
import { AuthService } from '../../services/auth-service';
import { GoogleAuthService } from '../../services/google-auth-service';
import { useAuthStore } from '../../stores/auth-store';
import { SuccessToast, ErrorToast } from '../../lib/utils';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import type { AuthTokens } from '../../types/auth';

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox='0 0 24 24' accessibilityLabel='Google'>
      <Path
        fill='#4285F4'
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
      />
      <Path
        fill='#34A853'
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      />
      <Path
        fill='#FBBC05'
        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'
      />
      <Path
        fill='#EA4335'
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
      />
    </Svg>
  );
}

function getSafeCallbackUrl(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return null;
  }
  return value;
}

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: 'login' | 'register';
    callbackUrl?: string;
  }>();
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { setSession } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  useEffect(() => {
    if (params.tab === 'register') {
      setActiveTab('register');
    } else {
      setActiveTab('login');
    }
  }, [params.tab]);

  const navigateAfterAuth = () => {
    if (callbackUrl) {
      router.replace(callbackUrl as never);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const finishSession = async (tokens: AuthTokens, message: string) => {
    await setSession(tokens);
    SuccessToast(message);
    navigateAfterAuth();
  };

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
        await finishSession(res.data, 'লগইন সফল হয়েছে!');
      } else {
        if (res.message?.includes('ভেরিফাই') || res.message?.toLowerCase().includes('verify')) {
          ErrorToast(res.message);
          router.push({
            pathname: '/(auth)/verify-code',
            params: {
              email: email.trim(),
              ...(callbackUrl ? { callbackUrl } : {}),
            },
          });
          return;
        }
        ErrorToast(res.message || 'লগইন করা যায়নি। সঠিক তথ্য দিন।');
      }
    } catch (err: unknown) {
      ErrorToast(err instanceof Error ? err.message : 'লগইন করার সময় সমস্যা হয়েছে।');
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
          params: {
            email: email.trim(),
            ...(callbackUrl ? { callbackUrl } : {}),
          },
        });
      } else {
        ErrorToast(res.message || 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।');
      }
    } catch (err: unknown) {
      ErrorToast(err instanceof Error ? err.message : 'নিবন্ধন করার সময় সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const result = await GoogleAuthService.signIn();

      if (result.type === 'cancel') return;

      if (result.type === 'error') {
        ErrorToast(result.message);
        return;
      }

      await finishSession(result.tokens, 'Google দিয়ে সাইন ইন সফল হয়েছে!');
    } catch (err: unknown) {
      ErrorToast(
        err instanceof Error ? err.message : 'Google দিয়ে সাইন ইন করার সময় সমস্যা হয়েছে।'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const isBusy = loading || googleLoading;

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

          <View style={styles.heroSection}>
            <View style={styles.logoBadgeContainer}>
              <View style={styles.logoGlow} />
              <Image source={require('../../../assets/logo.png')} style={styles.heroLogo} />
            </View>

            <Text style={[styles.brandTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              মৌজা ম্যাপ প্রো
            </Text>
            <Text style={[styles.brandSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              স্মার্ট ডিজিটাল ল্যান্ড রেকর্ডস ও জমি পরিমাপ প্ল্যাটফর্ম
            </Text>
          </View>

          <View
            style={[
              styles.segmentContainer,
              { backgroundColor: isDark ? '#131b2e' : '#e2e8f0' },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isBusy}
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
                    color:
                      activeTab === 'login'
                        ? isDark
                          ? '#ffffff'
                          : '#0f172a'
                        : isDark
                          ? '#94a3b8'
                          : '#64748b',
                    fontFamily: activeTab === 'login' ? Fonts.headingBold : Fonts.sansMedium,
                  },
                ]}
              >
                সাইন ইন
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isBusy}
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
                    color:
                      activeTab === 'register'
                        ? isDark
                          ? '#ffffff'
                          : '#0f172a'
                        : isDark
                          ? '#94a3b8'
                          : '#64748b',
                    fontFamily: activeTab === 'register' ? Fonts.headingBold : Fonts.sansMedium,
                  },
                ]}
              >
                নতুন অ্যাকাউন্ট
              </Text>
            </TouchableOpacity>
          </View>

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
              placeholder={
                activeTab === 'register'
                  ? 'কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড'
                  : 'আপনার পাসওয়ার্ড দিন'
              }
              isPassword
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              leftIcon={<Lock size={18} color={isDark ? '#94a3b8' : '#64748b'} />}
            />

            {activeTab === 'login' ? (
              <TouchableOpacity
                style={styles.forgotBtn}
                disabled={isBusy}
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

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.primaryActionBtn, isBusy && { opacity: 0.65 }]}
              onPress={activeTab === 'login' ? handleLogin : handleRegister}
              disabled={isBusy}
              accessibilityState={{ busy: loading, disabled: isBusy }}
            >
              {loading ? <ActivityIndicator size='small' color='#ffffff' /> : null}
              <Text style={styles.primaryActionBtnText}>
                {loading
                  ? activeTab === 'login'
                    ? 'সাইন ইন হচ্ছে...'
                    : 'অ্যাকাউন্ট তৈরি হচ্ছে...'
                  : activeTab === 'login'
                    ? 'সাইন ইন করুন'
                    : 'নিবন্ধন সম্পন্ন করুন'}
              </Text>
            </TouchableOpacity>

            <View style={styles.oauthDividerRow}>
              <View style={[styles.oauthDividerLine, { backgroundColor: isDark ? '#293449' : '#e2e8f0' }]} />
              <Text style={[styles.oauthDividerText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                অথবা
              </Text>
              <View style={[styles.oauthDividerLine, { backgroundColor: isDark ? '#293449' : '#e2e8f0' }]} />
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              disabled={isBusy}
              style={[
                styles.googleButton,
                {
                  backgroundColor: isDark ? '#131b2e' : '#ffffff',
                  borderColor: isDark ? '#293449' : '#dbe3ec',
                },
                isBusy && { opacity: 0.65 },
              ]}
              onPress={handleGoogleLogin}
              accessibilityState={{ busy: googleLoading, disabled: isBusy }}
            >
              {googleLoading ? (
                <ActivityIndicator size='small' color='#16a34a' />
              ) : (
                <GoogleIcon />
              )}
              <Text style={[styles.googleButtonText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                {googleLoading ? 'Google সাইন ইন হচ্ছে...' : 'Google দিয়ে চালিয়ে যান'}
              </Text>
            </TouchableOpacity>

            <View style={styles.switchHelpRow}>
              <Text style={[styles.switchHelpText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {activeTab === 'login' ? 'অ্যাকাউন্ট নেই?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}
              </Text>
              <TouchableOpacity
                disabled={isBusy}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexGrow: 1,
    justifyContent: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
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
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trustBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: '#16a34a',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoBadgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
  },
  heroLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  brandTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  brandSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 15,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 2.5,
    borderRadius: 8,
    marginBottom: 10,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentTabText: {
    fontSize: 12,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  forgotText: {
    color: '#16a34a',
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
  },
  registerBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
    backgroundColor: 'rgba(22, 163, 74, 0.06)',
    padding: 6,
    borderRadius: 6,
  },
  benefitText: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    flex: 1,
  },
  primaryActionBtn: {
    backgroundColor: '#16a34a',
    height: 36,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
  oauthDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginVertical: 11,
  },
  oauthDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  oauthDividerText: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
  },
  googleButton: {
    height: 38,
    borderWidth: 1,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  googleButtonText: {
    fontSize: 12,
    fontFamily: Fonts.sansMedium,
  },
  switchHelpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  switchHelpText: {
    fontSize: 11.5,
    fontFamily: Fonts.sansRegular,
  },
  switchHighlight: {
    color: '#16a34a',
    fontSize: 11.5,
    fontFamily: Fonts.sansBold,
  },
  securityFooter: {
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
  },
  securityFooterText: {
    fontSize: 10,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
  },
});
