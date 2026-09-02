import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useMySubscription } from '../../hooks/queries/use-subscriptions';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';

const PRO_TOOL_SCREENS = new Set([
  'land-measurement',
  'pantagraph',
  'tracer',
  'mouza-map-studio',
  'mouza-geo-studio',
]);

interface ProAccessGateProps {
  children: React.ReactNode;
}

export function ProAccessGate({ children }: ProAccessGateProps) {
  const router = useRouter();
  const segments = useSegments() as string[];
  const currentScreen = segments[segments.length - 1] ?? '';
  const isProTool = PRO_TOOL_SCREENS.has(currentScreen);

  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const subscriptionQuery = useMySubscription();

  const liveSubscriptionResolved =
    Boolean(subscriptionQuery.data) || subscriptionQuery.isError;
  const hasProAccess = subscriptionQuery.data
    ? subscriptionQuery.data.isSubscribed
    : subscriptionQuery.isError
      ? user?.isSubscribed === true
      : false;

  useEffect(() => {
    if (!isProTool || authLoading) return;

    // Web parity: Pro routes are private. Guests go to login with a safe
    // callback route, then return to the originally requested tool after auth.
    if (!isAuthenticated) {
      router.replace({
        pathname: '/(auth)/login',
        params: { callbackUrl: `/(tools)/${currentScreen}` },
      });
      return;
    }

    // Do not decide from a possibly stale cached user while the live
    // /my-subscription request is still resolving.
    if (!liveSubscriptionResolved) return;

    // Web parity: authenticated Free users are redirected to /pricing.
    if (!hasProAccess) {
      router.replace('/pricing');
    }
  }, [
    authLoading,
    currentScreen,
    hasProAccess,
    isAuthenticated,
    isProTool,
    liveSubscriptionResolved,
    router,
  ]);

  if (!isProTool) {
    return <>{children}</>;
  }

  if (
    authLoading ||
    !isAuthenticated ||
    !liveSubscriptionResolved ||
    !hasProAccess
  ) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Pro access যাচাই হচ্ছে...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: 24,
  },
  loadingText: {
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
    textAlign: 'center',
  },
});
