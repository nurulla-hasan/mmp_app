import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Fonts } from '../../../../constants/typography';

interface CanvasMagnifierProps {
  x: number;
  y: number;
  visible: boolean;
}

export const CanvasMagnifier: React.FC<CanvasMagnifierProps> = ({ x, y, visible }) => {
  if (!visible) return null;

  // Render floating loupe ~60px above touch point
  return (
    <View
      pointerEvents='none'
      style={[
        styles.loupeContainer,
        {
          left: Math.max(10, x - 45),
          top: Math.max(10, y - 90),
        },
      ]}
    >
      <View style={styles.loupeCircle}>
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
        <View style={styles.centerDot} />
      </View>
      <View style={styles.pointerTriangle} />
      <View style={styles.coordBadge}>
        <Text style={styles.coordText}>
          {Math.round(x)}, {Math.round(y)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loupeContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 9999,
  },
  loupeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  crosshairH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(22, 163, 74, 0.4)',
  },
  crosshairV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(22, 163, 74, 0.4)',
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#16a34a',
    marginTop: -1,
  },
  coordBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  coordText: {
    fontSize: 9,
    fontFamily: Fonts.sansMedium,
    color: '#ffffff',
  },
});

