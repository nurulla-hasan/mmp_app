import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

export const GeoTargetCrosshair = memo(function GeoTargetCrosshair() {
  return (
    <View pointerEvents='none' style={styles.root}>
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
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  line: { position: 'absolute', backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 2, elevation: 2 },
  horizontal: { width: 46, height: 2 },
  vertical: { width: 2, height: 46 },
  ring: { width: 20, height: 20, borderRadius: 10, borderWidth: 2.5, borderColor: '#2563eb', backgroundColor: 'rgba(255,255,255,0.18)' },
  dot: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#dc2626' },
});
