import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors } from '../constants/colors';
import { Fonts } from '../constants/typography';
import { useThemeStore } from '../stores/theme-store';

/**
 * Native Google OAuth returns to `mouzamappro://oauth?code=...`.
 *
 * `openAuthSessionAsync` consumes the callback URL to finish PKCE token exchange,
 * while Expo Router also receives the same deep link. Keeping a real `/oauth`
 * route prevents Router from briefly showing its Unmatched Route screen during
 * the hand-off. The login screen remains responsible for exchanging the code,
 * storing the session and navigating to the requested destination.
 */
export default function OAuthCallbackScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  useEffect(() => {
    // Safety fallback for a callback opened without an active auth session
    // (for example, an old/dead deep link). Normal Google sign-in completes
    // well before this and the login flow replaces this route automatically.
    const timeout = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 15_000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size='small' color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Google দিয়ে সাইন ইন হচ্ছে...</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>একটু অপেক্ষা করুন</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Fonts.headingSemiBold,
  },
  subtitle: {
    fontSize: 10.5,
    textAlign: 'center',
    fontFamily: Fonts.sansRegular,
  },
});
