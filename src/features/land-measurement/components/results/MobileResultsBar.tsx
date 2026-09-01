import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, Ruler } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { calculatePolygonData } from '../../utils/calculations';
import { toBengaliDigits } from '../../../../lib/utils';
import { Fonts } from '../../../../constants/typography';

export function MobileResultsBar() {
  const scale = useMapStore((state) => state.scale);
  const plotPoints = useMapStore((state) => state.plotPoints);
  const plots = useMapStore((state) => state.plots);
  const finishPlot = useMapStore((state) => state.finishPlot);

  const liveResults = useMemo(
    () => (scale && plotPoints.length >= 3 ? calculatePolygonData(plotPoints, scale) : null),
    [plotPoints, scale],
  );
  const latestResults = liveResults ?? plots.at(-1)?.results ?? null;
  const totalShotok = plots.reduce((total, plot) => total + plot.results.shotok, 0);
  const canFinish = plotPoints.length >= 3;

  return (
    <View style={styles.wrapper}>
      <View style={styles.iconBox}>
        <Ruler size={17} color='#22c55e' />
      </View>
      <View style={styles.primaryResult}>
        <Text style={styles.label}>{liveResults ? 'চলতি প্লট' : 'সর্বশেষ ফলাফল'}</Text>
        <Text style={styles.value}>
          {latestResults ? `${toBengaliDigits(latestResults.shotok.toFixed(3))} শতক` : '—'}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.totalResult}>
        <Text style={styles.label}>মোট {toBengaliDigits(plots.length)} প্লট</Text>
        <Text style={styles.totalValue}>{toBengaliDigits(totalShotok.toFixed(3))} শতক</Text>
      </View>
      {canFinish && (
        <TouchableOpacity activeOpacity={0.75} style={styles.finishButton} onPress={finishPlot}>
          <Check size={16} color='#ffffff' strokeWidth={3} />
          <Text style={styles.finishText}>শেষ</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 82,
    left: 10,
    right: 10,
    zIndex: 19,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
  },
  iconBox: {
    width: 34,
    height: 34,
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  primaryResult: {
    minWidth: 83,
  },
  totalResult: {
    flex: 1,
  },
  label: {
    color: '#94a3b8',
    fontFamily: Fonts.headingMedium,
    fontSize: 9.5,
  },
  value: {
    marginTop: -1,
    color: '#ffffff',
    fontFamily: Fonts.headingBold,
    fontSize: 14,
  },
  totalValue: {
    marginTop: -1,
    color: '#cbd5e1',
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 32,
    marginHorizontal: 10,
    backgroundColor: '#334155',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#16a34a',
  },
  finishText: {
    color: '#ffffff',
    fontFamily: Fonts.headingBold,
    fontSize: 11,
  },
});
