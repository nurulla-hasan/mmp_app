import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Fonts } from '../../../../constants/typography';
import { useTileProgressStore } from '../../store/useTileProgressStore';

export function MapTileProgressOverlay() {
  const status = useTileProgressStore((state) => state.status);
  const completed = useTileProgressStore((state) => state.completed);
  const total = useTileProgressStore((state) => state.total);
  const reset = useTileProgressStore((state) => state.reset);

  const percentage = useMemo(() => {
    if (status === 'ready') return 100;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
  }, [completed, status, total]);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    const timer = setTimeout(reset, 1400);
    return () => clearTimeout(timer);
  }, [reset, status]);

  if (status === 'idle') return null;

  const label = status === 'preparing'
    ? 'Preparing map...'
    : status === 'generating'
      ? 'Generating tiles...'
      : 'Map optimized';

  return (
    <View pointerEvents='none' style={styles.host}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.labelRow}>
            {status === 'ready' ? <Check size={13} color='#22c55e' strokeWidth={2.5} /> : null}
            <Text style={styles.label}>{label}</Text>
          </View>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percentage}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    zIndex: 18,
    alignItems: 'center',
  },
  card: {
    width: 240,
    maxWidth: '76%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(15,15,15,0.94)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  label: {
    color: '#f8fafc',
    fontFamily: Fonts.headingSemiBold,
    fontSize: 11.5,
  },
  percentage: {
    color: '#22c55e',
    fontFamily: Fonts.headingBold,
    fontSize: 10.5,
  },
  track: {
    height: 4,
    marginTop: 9,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(148,163,184,0.24)',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
});
