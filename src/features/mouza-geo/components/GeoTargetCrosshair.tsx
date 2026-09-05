import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

export const GeoTargetCrosshair = memo(function GeoTargetCrosshair() {
  return (
    <View pointerEvents='none' style={styles.root}>
      <View style={[styles.shadowLine, styles.horizontalShadow]} />
      <View style={[styles.shadowLine, styles.verticalShadow]} />
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
});
