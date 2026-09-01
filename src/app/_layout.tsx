import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style='dark' />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen name='(tools)' options={{ headerShown: false }} />
        <Stack.Screen name='pricing' options={{ presentation: 'modal', headerShown: true, title: 'সাবস্ক্রিপশন প্ল্যানস' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
