import { Stack } from 'expo-router';
import { ProAccessGate } from '../../components/subscription/pro-access-gate';
import { Fonts } from '../../constants/typography';

export default function ToolsLayout() {
  return (
    <ProAccessGate>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { fontFamily: Fonts.headingBold, color: '#0f172a', fontSize: 15 },
          headerTintColor: '#0f172a',
        }}
      >
        <Stack.Screen name='unit-converter' options={{ title: 'জমির একক রূপান্তর' }} />
        <Stack.Screen name='inheritance' options={{ title: 'জমি বণ্টন ক্যালকুলেটর' }} />
        <Stack.Screen name='scale-guide' options={{ title: 'ম্যাপ স্কেল গাইড' }} />
        <Stack.Screen name='land-measurement' options={{ headerShown: false }} />
        <Stack.Screen name='pantagraph' options={{ title: 'ম্যাপ তুলনা ও প্যান্টাগ্রাফ' }} />
        <Stack.Screen name='tracer' options={{ title: 'ডিজিটাল ট্রেসার' }} />
      </Stack>
    </ProAccessGate>
  );
}
