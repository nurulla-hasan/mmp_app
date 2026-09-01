import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Home, MapPin, Ruler, Layers, User } from 'lucide-react-native';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const currentRouteName = state.routes[state.index]?.name;

  return (
    <View style={[styles.tabBarContainer, { backgroundColor: colors.tabBarBg, borderTopColor: colors.tabBarBorder }]}>
      {/* 1. Home */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.tabItem}
        onPress={() => navigation.navigate('index')}
      >
        <Home
          size={20}
          color={currentRouteName === 'index' ? colors.primary : colors.textMuted}
          strokeWidth={currentRouteName === 'index' ? 2.4 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: colors.textMuted },
            currentRouteName === 'index' && { color: colors.primary, fontFamily: Fonts.headingBold },
          ]}
        >
          হোম
        </Text>
      </TouchableOpacity>

      {/* 2. Surveyors */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.tabItem}
        onPress={() => navigation.navigate('surveyors')}
      >
        <MapPin
          size={20}
          color={currentRouteName === 'surveyors' ? colors.primary : colors.textMuted}
          strokeWidth={currentRouteName === 'surveyors' ? 2.4 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: colors.textMuted },
            currentRouteName === 'surveyors' && { color: colors.primary, fontFamily: Fonts.headingBold },
          ]}
        >
          সার্ভেয়ার
        </Text>
      </TouchableOpacity>

      {/* 3. Center Elevated Floating Button (Land Tools) */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.centerButtonWrapper}
        onPress={() => router.push('/land-measurement')}
      >
        <View style={[styles.centerFloatingButton, { backgroundColor: colors.primary, borderColor: colors.tabBarBg }]}>
          <Ruler size={22} color='#ffffff' strokeWidth={2.4} />
        </View>
        <Text style={[styles.centerLabel, { color: colors.text }]}>ল্যান্ড টুলস</Text>
      </TouchableOpacity>

      {/* 4. Tools Hub */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.tabItem}
        onPress={() => navigation.navigate('tools')}
      >
        <Layers
          size={20}
          color={currentRouteName === 'tools' ? colors.primary : colors.textMuted}
          strokeWidth={currentRouteName === 'tools' ? 2.4 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: colors.textMuted },
            currentRouteName === 'tools' && { color: colors.primary, fontFamily: Fonts.headingBold },
          ]}
        >
          টুলস হাব
        </Text>
      </TouchableOpacity>

      {/* 5. Profile */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.tabItem}
        onPress={() => navigation.navigate('profile')}
      >
        <User
          size={20}
          color={currentRouteName === 'profile' ? colors.primary : colors.textMuted}
          strokeWidth={currentRouteName === 'profile' ? 2.4 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: colors.textMuted },
            currentRouteName === 'profile' && { color: colors.primary, fontFamily: Fonts.headingBold },
          ]}
        >
          প্রোফাইল
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 58,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.headingSemiBold,
    marginTop: -1,
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  centerFloatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  centerLabel: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    marginTop: 2,
  },
});
