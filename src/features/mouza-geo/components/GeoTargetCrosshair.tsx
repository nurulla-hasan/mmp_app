import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

export const GeoTargetCrosshair = memo(function GeoTargetCrosshair() {
  return (
    <View pointerEvents='none' style={styles.root}>
      <View style={[styles.shadowLine, styles.horizontalShadow]} />
      <View style={[styles.shadowLine, styles.verticalShadow]} />
      <View style={[styles.line, styles.horizontal]} />
      <View style={[styles.line, styles.vertical]} />
      <View style={styles.ring} />
      <View style={styles.dot} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  shadowLine: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: 'rgba(15,23,42,0.48)',
  },
  horizontalShadow: { width: 38, height: 4 },
  verticalShadow: { width: 4, height: 38 },
  line: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  horizontal: { width: 36, height: 1.5 },
  vertical: { width: 1.5, height: 36 },
  ring: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
});
