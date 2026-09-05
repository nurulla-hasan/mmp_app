import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  offsetY?: number;
};

export const GeoTargetCrosshair = memo(function GeoTargetCrosshair({ offsetY = 0 }: Props) {
  return (
    <View
      pointerEvents='none'
      style={[styles.root, { transform: [{ translateY: offsetY }] }]}
    >
      <View style={[styles.halo, styles.horizontalHalo]} />
      <View style={[styles.halo, styles.verticalHalo]} />
      <View style={[styles.line, styles.horizontal]} />
      <View style={[styles.line, styles.vertical]} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  halo: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.28,
    shadowRadius: 1.5,
    elevation: 2,
  },
  horizontalHalo: { width: 32, height: 4.5 },
  verticalHalo: { width: 4.5, height: 32 },
  line: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: '#2563eb',
  },
  horizontal: { width: 29, height: 1.8 },
  vertical: { width: 1.8, height: 29 },
});
