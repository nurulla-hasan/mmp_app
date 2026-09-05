import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ProAccessGate } from '../../components/subscription/pro-access-gate';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

export default function ToolsLayout() {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProAccessGate>
        <Stack
          screenOptions={{
            animation: 'slide_from_right',
            gestureEnabled: true,
            headerStyle: { backgroundColor: colors.surface },
            headerTitleStyle: { fontFamily: Fonts.headingBold, color: colors.text, fontSize: 15 },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name='unit-converter' options={{ title: 'জমির একক রূপান্তর' }} />
          <Stack.Screen name='inheritance' options={{ title: 'জমি বণ্টন ক্যালকুলেটর' }} />
          <Stack.Screen name='scale-guide' options={{ title: 'ম্যাপ স্কেল গাইড' }} />
          <Stack.Screen name='land-measurement' options={{ headerShown: false }} />
          <Stack.Screen name='mouza-geo' options={{ headerShown: false }} />
          <Stack.Screen name='pantagraph' options={{ title: 'ম্যাপ তুলনা ও প্যান্টাগ্রাফ' }} />
          <Stack.Screen name='tracer' options={{ title: 'ডিজিটাল ট্রেসার' }} />
        </Stack>
      </ProAccessGate>
    </GestureHandlerRootView>
  );
}
