import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, ArrowLeft, Mail, RefreshCw } from 'lucide-react-native';
import { AuthService } from '../../services/auth-service';
import { useAuthStore } from '../../stores/auth-store';
import { SuccessToast, ErrorToast, toBengaliDigits } from '../../lib/utils';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

function getSafeCallbackUrl(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return null;
  }
  return value;
}

export default function VerifyCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; callbackUrl?: string }>();
  const email = params.email || '';
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);

  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { setSession } = useAuthStore();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const textInputRef = useRef<TextInput>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      ErrorToast('কোডটি ৬ সংখ্যার হতে হবে।');
      return;
    }

    if (!email) {
      ErrorToast('ইমেইল ঠিকানা পাওয়া যায়নি। আবার লগইন করুন।');
      return;
    }

    try {
      setLoading(true);
      const res = await AuthService.verifyEmail({
        email,
        otp: otp.trim(),
      });

      if (res.success && res.data) {
        await setSession(res.data);
        SuccessToast('ইমেইল সফলভাবে যাচাই হয়েছে!');
        router.replace((callbackUrl || '/(tabs)') as never);
      } else {
        ErrorToast(res.message || 'ভুল বা মেয়াদোত্তীর্ণ কোড।');
      }
    } catch (err: any) {
      ErrorToast(err?.message || 'যাচাই করার সময় সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    try {
      setResending(true);
      const res = await AuthService.resendOtp({ email });
      if (res.success) {
        SuccessToast('নতুন কোড আপনার ইমেইলে পাঠানো হয়েছে।');
        setOtp('');
        startTimer();
      } else {
        ErrorToast(res.message || 'কোড পাঠানো যায়নি। কিছুক্ষণ পর চেষ্টা করুন।');
      }
    } catch (err: any) {
      ErrorToast(err?.message || 'কোড পুনরায় পাঠানোর সময় সমস্যা হয়েছে।');
    } finally {
      setResending(false);
    }
  };

  const otpDigits = otp.split('');

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
              <ShieldCheck size={24} color='#16a34a' />
            </View>
            <Text style={[styles.title, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              কোড যাচাই করুন
            </Text>
            <View style={styles.emailBadge}>
              <Mail size={13} color='#16a34a' />
              <Text style={styles.emailBadgeText} numberOfLines={1}>
                {email || 'আপনার ইমেইল'}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              উপরে প্রদর্শিত ইমেইলে পাঠানো ৬ সংখ্যার ওটিপি কোডটি নিচে প্রবেশ করান।
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
            <TouchableOpacity
              activeOpacity={1}
              style={styles.pinBoxesRow}
              onPress={() => textInputRef.current?.focus()}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = otpDigits[index] || '';
                const isCurrent = otp.length === index;
                const isFilled = digit !== '';

                return (
                  <View
                    key={index}
                    style={[
                      styles.pinBox,
                      {
                        backgroundColor: isDark ? '#131b2e' : '#f8fafc',
                        borderColor: isCurrent
                          ? '#16a34a'
                          : isFilled
                            ? isDark
                              ? '#334155'
                              : '#cbd5e1'
                            : isDark
                              ? '#1f2937'
                              : '#e2e8f0',
                      },
                      isCurrent && styles.pinBoxActive,
                    ]}
                  >
                    <Text style={[styles.pinDigit, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                      {digit}
                    </Text>
                  </View>
                );
              })}

              <TextInput
                ref={textInputRef}
                value={otp}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtp(cleaned);
                }}
                keyboardType='number-pad'
                maxLength={6}
                style={styles.hiddenInput}
                autoFocus
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.verifyBtn, (loading || otp.length !== 6) && { opacity: 0.6 }]}
              onPress={handleVerify}
              disabled={loading || otp.length !== 6}
              accessibilityState={{ busy: loading, disabled: loading || otp.length !== 6 }}
            >
              {loading ? <ActivityIndicator size='small' color='#ffffff' /> : null}
              <Text style={styles.verifyBtnText}>
                {loading ? 'যাচাই করা হচ্ছে...' : 'কোড যাচাই করুন'}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <View style={styles.timerBadge}>
                  <Text style={[styles.countdownText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    পুনরায় কোড পাঠানোর সময়:{' '}
                    <Text style={{ fontFamily: Fonts.sansBold, color: '#16a34a' }}>
                      {toBengaliDigits(countdown)} সেকেন্ড
                    </Text>
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleResend}
                  disabled={resending}
                  accessibilityState={{ busy: resending, disabled: resending }}
                >
                  {resending ? (
                    <ActivityIndicator size='small' color='#16a34a' />
                  ) : (
                    <RefreshCw size={14} color='#16a34a' />
                  )}
                  <Text style={styles.resendLink}>
                    {resending ? 'পাঠানো হচ্ছে...' : 'কোড পাননি? আবার পাঠান'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    marginBottom: 4,
    textAlign: 'center',
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  emailBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    color: '#16a34a',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  pinBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
  },
  pinBox: {
    width: 38,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxActive: {
    borderColor: '#16a34a',
    elevation: 2,
  },
  pinDigit: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
  verifyBtn: {
    backgroundColor: '#16a34a',
    height: 36,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  timerBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  countdownText: {
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendLink: {
    color: '#16a34a',
    fontSize: 12,
    fontFamily: Fonts.sansBold,
  },
});
