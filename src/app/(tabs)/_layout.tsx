import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../components/common/custom-tab-bar';
import { AppHeader } from '../../components/common/app-header';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        header: ({ options, route }) => (
          <AppHeader
            title={options.title}
            showSearch={route.name === 'index'}
          />
        ),
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'মৌজা ম্যাপ প্রো',
        }}
      />
      <Tabs.Screen
        name='surveyors'
        options={{
          title: 'সার্ভেয়ার ডিরেক্টরি',
        }}
      />
      <Tabs.Screen
        name='tools'
        options={{
          title: 'টুলস হাব',
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'ইউজার প্রোফাইল',
        }}
      />
    </Tabs>
  );
}
