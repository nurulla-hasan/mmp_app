import React from 'react';
import { Stack } from 'expo-router';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

export default function AuthLayout() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#090d16' : '#ffffff',
        },
        headerTitleStyle: {
          fontFamily: Fonts.headingBold,
          fontSize: 16,
          color: isDark ? '#f8fafc' : '#0f172a',
        },
        headerTintColor: isDark ? '#f8fafc' : '#0f172a',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name='login'
        options={{
          title: 'সাইন ইন',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='register'
        options={{
          title: 'নিবন্ধন',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='verify-code'
        options={{
          title: 'কোড যাচাই করুন',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name='forgot-password'
        options={{
          title: 'পাসওয়ার্ড পুনরুদ্ধার',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name='reset-password'
        options={{
          title: 'নতুন পাসওয়ার্ড সেট করুন',
          headerShown: true,
        }}
      />
    </Stack>
  );
}

