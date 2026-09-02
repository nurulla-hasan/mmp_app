import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import {
  NotoSansBengali_400Regular,
  NotoSansBengali_500Medium,
  NotoSansBengali_600SemiBold,
  NotoSansBengali_700Bold,
} from '@expo-google-fonts/noto-sans-bengali';
import { BroadcastAnnouncementModal } from '../components/broadcasts/broadcast-announcement-modal';
import { Colors } from '../constants/colors';
import { useThemeStore } from '../stores/theme-store';
import { useAuthStore } from '../stores/auth-store';
import { QueryProvider } from '../providers/QueryProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const { initializeAuth } = useAuthStore();
  const [fontsLoaded] = useFonts({
    HindSiliguri_400Regular,
    HindSiliguri_500Medium,
    HindSiliguri_600SemiBold,
    HindSiliguri_700Bold,
    NotoSansBengali_400Regular,
    NotoSansBengali_500Medium,
    NotoSansBengali_600SemiBold,
    NotoSansBengali_700Bold,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <SafeAreaProvider>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
              freezeOnBlur: true,
              contentStyle: { backgroundColor: colors.background },
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              headerTitleStyle: {
                fontFamily: 'HindSiliguri_700Bold',
                fontSize: 16,
                color: colors.text,
              },
            }}
          >
            {/* Main Tab Group */}
            <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
            {/* Tools Group */}
            <Stack.Screen name='(tools)' options={{ headerShown: false }} />
            {/* Auth Group */}
            <Stack.Screen name='(auth)' options={{ headerShown: false }} />

            {/* Standalone Screens with Centralized Header */}
            <Stack.Screen
              name='calculations'
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name='pricing'
              options={{
                headerShown: true,
                title: 'সাবস্ক্রিপশন প্ল্যানস',
              }}
            />
            <Stack.Screen
              name='join-as-surveyor'
              options={{
                headerShown: true,
                title: 'সার্ভেয়ার হিসেবে যোগ দিন',
              }}
            />
            <Stack.Screen
              name='surveyor-profile'
              options={{
                headerShown: true,
                title: 'সার্ভেয়ার প্রোফাইল',
              }}
            />
            <Stack.Screen
              name='surveyors/[slug]'
              options={{
                headerShown: true,
                title: 'সার্ভেয়ার প্রোফাইল',
              }}
            />
          </Stack>
          <BroadcastAnnouncementModal />
        </SafeAreaProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
