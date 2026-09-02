import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';
import { LoadingSkeleton, useSkeletonPulse } from '../ui/loading-skeleton';

function useSkeletonTheme() {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const opacity = useSkeletonPulse();
  return { colors, opacity };
}

function Block({
  opacity,
  color,
  width,
  height,
  radius = 7,
}: {
  opacity: ReturnType<typeof useSkeletonPulse>;
  color: string;
  width: number | `${number}%`;
  height: number;
  radius?: number;
}) {
  return <LoadingSkeleton opacity={opacity} color={color} style={{ width, height, borderRadius: radius }} />;
}

function SurveyorCardSkeleton({ opacity, color, borderColor }: { opacity: ReturnType<typeof useSkeletonPulse>; color: string; borderColor: string }) {
  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={styles.row}>
        <Block opacity={opacity} color={color} width={54} height={54} radius={27} />
        <View style={styles.flexGap}>
          <Block opacity={opacity} color={color} width='48%' height={15} />
          <Block opacity={opacity} color={color} width='72%' height={10} />
          <View style={styles.inlineGap}>
            <Block opacity={opacity} color={color} width={92} height={10} />
            <Block opacity={opacity} color={color} width={72} height={10} />
          </View>
        </View>
      </View>
      <View style={styles.inlineGap}>
        <Block opacity={opacity} color={color} width={110} height={25} radius={7} />
        <Block opacity={opacity} color={color} width={96} height={25} radius={7} />
      </View>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Block opacity={opacity} color={color} width={92} height={16} />
        <Block opacity={opacity} color={color} width={78} height={32} radius={8} />
      </View>
    </View>
  );
}

export function SurveyorListSkeleton() {
  const { colors, opacity } = useSkeletonTheme();
  return (
    <View style={styles.listGap}>
      {[0, 1, 2].map((item) => (
        <SurveyorCardSkeleton key={item} opacity={opacity} color={colors.skeleton} borderColor={colors.border} />
      ))}
    </View>
  );
}

export function SurveyorDetailSkeleton() {
  const { colors, opacity } = useSkeletonTheme();
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { borderColor: colors.border }]}>
        <View style={styles.row}>
          <Block opacity={opacity} color={colors.skeleton} width={72} height={72} radius={36} />
          <View style={styles.flexGap}>
            <Block opacity={opacity} color={colors.skeleton} width='62%' height={18} />
            <Block opacity={opacity} color={colors.skeleton} width='78%' height={11} />
            <Block opacity={opacity} color={colors.skeleton} width='55%' height={11} />
          </View>
        </View>
        <Block opacity={opacity} color={colors.skeletonSoft} width='100%' height={38} radius={8} />
        <View style={styles.inlineGap}>
          <Block opacity={opacity} color={colors.skeleton} width='48%' height={38} radius={8} />
          <Block opacity={opacity} color={colors.skeleton} width='48%' height={38} radius={8} />
        </View>
      </View>
      {[0, 1, 2].map((section) => (
        <View key={section} style={[styles.card, { borderColor: colors.border }]}>
          <Block opacity={opacity} color={colors.skeleton} width='38%' height={16} />
          <Block opacity={opacity} color={colors.skeletonSoft} width='100%' height={48} radius={8} />
          <Block opacity={opacity} color={colors.skeletonSoft} width='100%' height={48} radius={8} />
        </View>
      ))}
    </View>
  );
}

export function CalculationListSkeleton() {
  const { colors, opacity } = useSkeletonTheme();
  return (
    <View style={styles.listGap}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={[styles.card, { borderColor: colors.border }]}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Block opacity={opacity} color={colors.skeleton} width='42%' height={16} />
            <Block opacity={opacity} color={colors.skeleton} width={72} height={14} />
          </View>
          <Block opacity={opacity} color={colors.skeletonSoft} width='68%' height={10} />
          <Block opacity={opacity} color={colors.skeletonSoft} width='52%' height={10} />
          <View style={styles.inlineGap}>
            <Block opacity={opacity} color={colors.skeleton} width={84} height={28} radius={7} />
            <Block opacity={opacity} color={colors.skeleton} width={84} height={28} radius={7} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SurveyorProfileSkeleton() {
  const { colors, opacity } = useSkeletonTheme();
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.flexGap}>
        <Block opacity={opacity} color={colors.skeleton} width='58%' height={18} />
        <Block opacity={opacity} color={colors.skeletonSoft} width='76%' height={10} />
      </View>
      {[0, 1, 2].map((section) => (
        <View key={section} style={[styles.card, { borderColor: colors.border }]}>
          <Block opacity={opacity} color={colors.skeleton} width='34%' height={15} />
          <Block opacity={opacity} color={colors.skeletonSoft} width='100%' height={44} radius={8} />
          <Block opacity={opacity} color={colors.skeletonSoft} width='100%' height={44} radius={8} />
          {section > 0 ? <Block opacity={opacity} color={colors.skeletonSoft} width='82%' height={44} radius={8} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 14, paddingBottom: 32, gap: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flexGap: { flex: 1, gap: 8 },
  inlineGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listGap: { gap: 10, paddingTop: 4 },
});
