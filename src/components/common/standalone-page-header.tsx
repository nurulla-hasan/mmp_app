import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

type StandalonePageHeaderProps = {
  title: string;
};

/**
 * Compact back-navigation header for standalone pages.
 * Its 52px content bar mirrors AppHeader's mobile height and surface treatment.
 */
export function StandalonePageHeader({ title }: StandalonePageHeaderProps) {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel='পেছনে যান'
          style={styles.backButton}
          onPress={goBack}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2.1} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.trailingSpace} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    borderBottomWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 15.5,
    lineHeight: 21,
    fontFamily: Fonts.headingBold,
    letterSpacing: -0.2,
  },
  trailingSpace: {
    width: 36,
    height: 36,
  },
});
