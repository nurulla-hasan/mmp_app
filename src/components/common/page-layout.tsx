import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';

/**
 * Shared layout rhythm for normal content screens.
 * Full-screen canvases, auth flows and modal workspaces may intentionally opt out.
 */
export const PAGE_LAYOUT = {
  horizontal: 14,
  top: 14,
  bottom: 28,
  gap: 12,
  sectionGap: 12,
  sectionPadding: 14,
  radius: 14,
} as const;

type PageWrapperProps = ScrollViewProps & {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  gap?: number;
  topPadding?: number;
  bottomPadding?: number;
};

export function PageWrapper({
  children,
  style,
  contentContainerStyle,
  contentStyle,
  gap = PAGE_LAYOUT.gap,
  topPadding = PAGE_LAYOUT.top,
  bottomPadding = PAGE_LAYOUT.bottom,
  showsVerticalScrollIndicator = false,
  ...props
}: PageWrapperProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  return (
    <ScrollView
      {...props}
      style={[styles.page, { backgroundColor: colors.background }, style]}
      contentContainerStyle={[
        styles.content,
        { gap, paddingTop: topPadding, paddingBottom: bottomPadding },
        contentContainerStyle,
        contentStyle,
      ]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      {children}
    </ScrollView>
  );
}

type SectionWrapperProps = ViewProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  bordered?: boolean;
};

export function SectionWrapper({
  children,
  style,
  padded = true,
  bordered = true,
  ...props
}: SectionWrapperProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  return (
    <View
      {...props}
      style={[
        styles.section,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          borderWidth: bordered ? 1 : 0,
          padding: padded ? PAGE_LAYOUT.sectionPadding : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    paddingHorizontal: PAGE_LAYOUT.horizontal,
  },
  section: {
    borderRadius: PAGE_LAYOUT.radius,
    gap: PAGE_LAYOUT.sectionGap,
  },
});
