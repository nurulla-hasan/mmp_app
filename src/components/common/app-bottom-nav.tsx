import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Layers, MapPin, Ruler, User, type LucideIcon } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

export type AppBottomNavKey = 'index' | 'surveyors' | 'tools' | 'profile';

export const APP_BOTTOM_NAV_LAYOUT = {
  baseHeight: 58,
  baseBottomPadding: 4,
  centerOverhang: 22,
} as const;

type Props = {
  activeKey?: AppBottomNavKey;
  onNavigate?: (key: AppBottomNavKey) => void;
};

export function AppBottomNav({ activeKey, onNavigate }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const navigate = (key: AppBottomNavKey) => {
    if (onNavigate) {
      onNavigate(key);
      return;
    }

    if (key === 'index') router.replace('/(tabs)');
    else if (key === 'surveyors') router.replace('/(tabs)/surveyors');
    else if (key === 'tools') router.replace('/(tabs)/tools');
    else router.replace('/(tabs)/profile');
  };

  const item = (key: AppBottomNavKey, label: string, Icon: LucideIcon) => {
    const active = activeKey === key;
    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.75}
        style={styles.tabItem}
        onPress={() => navigate(key)}
      >
        <Icon
          size={20}
          color={active ? colors.primary : colors.textMuted}
          strokeWidth={active ? 2.4 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: active ? colors.primary : colors.textMuted },
            active && { fontFamily: Fonts.headingBold },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.tabBarShell,
        {
          height:
            APP_BOTTOM_NAV_LAYOUT.baseHeight +
            APP_BOTTOM_NAV_LAYOUT.centerOverhang +
            insets.bottom,
        },
      ]}
    >
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            height: APP_BOTTOM_NAV_LAYOUT.baseHeight + insets.bottom,
            paddingBottom: APP_BOTTOM_NAV_LAYOUT.baseBottomPadding + insets.bottom,
          },
        ]}
      >
        {item('index', 'হোম', Home)}
        {item('surveyors', 'সার্ভেয়ার', MapPin)}

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.centerButtonWrapper}
          onPress={() => router.push('/land-measurement')}
        >
          <View
            style={[
              styles.centerFloatingButton,
              { backgroundColor: colors.primary, borderColor: colors.tabBarBg },
            ]}
          >
            <Ruler size={22} color='#ffffff' strokeWidth={2.4} />
          </View>
          <Text style={[styles.centerLabel, { color: colors.text }]}>ল্যান্ড টুলস</Text>
        </TouchableOpacity>

        {item('tools', 'টুলস হাব', Layers)}
        {item('profile', 'প্রোফাইল', User)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarShell: {
    justifyContent: 'flex-end',
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingHorizontal: 8,
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
    marginTop: -APP_BOTTOM_NAV_LAYOUT.centerOverhang,
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
