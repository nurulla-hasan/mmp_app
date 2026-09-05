import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

/**
 * Shared layout rhythm for normal content screens.
 * Full-screen canvases, auth flows and modal workspaces may intentionally opt out.
 */
export const PAGE_LAYOUT = {
  horizontal: 14,
  top: 14,
  bottom: 28,
  floatingNavOverhang: 22,
  gap: 12,
  compactGap: 8,
  sectionGap: 12,
  sectionPadding: 14,
  radius: 14,
  introIconSize: 40,
  introIconRadius: 11,
} as const;

export const PAGE_BOTTOM_WITH_FLOATING_NAV =
  PAGE_LAYOUT.bottom + PAGE_LAYOUT.floatingNavOverhang;

export function hasStandaloneFloatingBottomNav(pathname: string) {
  return (
    pathname === '/pricing' ||
    pathname === '/join-as-surveyor' ||
    pathname === '/surveyor-profile' ||
    pathname.startsWith('/surveyors/')
  );
}

export function hasFloatingBottomNav(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/surveyors' ||
    pathname === '/tools' ||
    pathname === '/profile' ||
    hasStandaloneFloatingBottomNav(pathname)
  );
}

/**
 * Single source of truth for mobile bottom content clearance.
 * Screens with the app's floating bottom nav reserve its visual overhang.
 * Other normal pages reserve the device system-navigation / gesture inset.
 */
export function usePageBottomPadding(bottomPadding?: number) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (bottomPadding !== undefined) return bottomPadding;

  return hasFloatingBottomNav(pathname)
    ? PAGE_BOTTOM_WITH_FLOATING_NAV
    : PAGE_LAYOUT.bottom + insets.bottom;
}

/**
 * Use this for FlatList/FlashList screens that cannot render through PageWrapper.
 * Keeping the list insets here prevents list pages from slowly drifting away from
 * the same outer spacing used by ordinary ScrollView pages.
 */
export const PAGE_CONTENT_INSETS = {
  paddingHorizontal: PAGE_LAYOUT.horizontal,
  paddingTop: PAGE_LAYOUT.top,
  paddingBottom: PAGE_LAYOUT.bottom,
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
  bottomPadding,
  showsVerticalScrollIndicator = false,
  ...props
}: PageWrapperProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const resolvedBottomPadding = usePageBottomPadding(bottomPadding);

  return (
    <ScrollView
      {...props}
      style={[styles.page, { backgroundColor: colors.background }, style]}
      contentContainerStyle={[
        styles.content,
        { gap, paddingTop: topPadding, paddingBottom: resolvedBottomPadding },
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

type PageIntroProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact native page intro used below a Stack header. It deliberately avoids
 * duplicating the navigation title and keeps icon/title/copy spacing identical
 * across feature-entry screens.
 */
export function PageIntro({ title, description, icon, action, style }: PageIntroProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  return (
    <SectionWrapper
      style={[
        styles.intro,
        {
          backgroundColor: `${colors.primary}0A`,
          borderColor: `${colors.primary}25`,
        },
        style,
      ]}
    >
      {icon ? (
        <View style={[styles.introIcon, { backgroundColor: `${colors.primary}14` }]}>
          {icon}
        </View>
      ) : null}

      <View style={styles.introCopy}>
        <Text style={[styles.introTitle, { color: colors.text }]}>{title}</Text>
        {description ? (
          <Text style={[styles.introDescription, { color: colors.textMuted }]}>
            {description}
          </Text>
        ) : null}
      </View>

      {action ? <View style={styles.introAction}>{action}</View> : null}
    </SectionWrapper>
  );
}

type PageSectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Semantic section heading for content pages. The section itself owns no card
 * padding; it only standardizes heading hierarchy and spacing between sections.
 */
export function PageSectionHeader({
  title,
  subtitle,
  icon,
  action,
  style,
}: PageSectionHeaderProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionHeadingCopy}>
        <View style={styles.sectionTitleRow}>
          {icon}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {action ? <View style={styles.sectionAction}>{action}</View> : null}
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
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  introIcon: {
    width: PAGE_LAYOUT.introIconSize,
    height: PAGE_LAYOUT.introIconSize,
    borderRadius: PAGE_LAYOUT.introIconRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { flex: 1, gap: 2 },
  introTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: Fonts.headingBold,
  },
  introDescription: {
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: Fonts.sansRegular,
  },
  introAction: { alignItems: 'flex-end', justifyContent: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: PAGE_LAYOUT.compactGap,
    paddingHorizontal: 2,
  },
  sectionHeadingCopy: { flex: 1, gap: 1 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: Fonts.headingBold,
  },
  sectionSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    fontFamily: Fonts.sansRegular,
  },
  sectionAction: { alignItems: 'flex-end', justifyContent: 'flex-end' },
});
