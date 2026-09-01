import { Tabs } from 'expo-router';
import { Layers, MapPin, User, LayoutDashboard } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.headingSemiBold,
          fontSize: 11,
          marginTop: -2,
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          height: 52,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontFamily: Fonts.headingBold,
          fontSize: 16,
          color: '#0f172a',
        },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          headerShown: false,
          title: 'হোম',
          tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name='tools'
        options={{
          title: 'টুলস হাব',
          tabBarIcon: ({ color }) => <Layers size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name='surveyors'
        options={{
          title: 'সার্ভেয়ার ডিরেক্টরি',
          tabBarIcon: ({ color }) => <MapPin size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'ইউজার প্রোফাইল',
          tabBarIcon: ({ color }) => <User size={20} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
