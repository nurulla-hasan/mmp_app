import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export function useSkeletonPulse(active = true) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!active) {
      opacity.setValue(0.72);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.92, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.48, duration: 650, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, opacity]);

  return opacity;
}

export function LoadingSkeleton({
  opacity,
  color,
  style,
}: {
  opacity: Animated.Value;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return <Animated.View style={[styles.block, { backgroundColor: color, opacity }, style]} />;
}

const styles = StyleSheet.create({
  block: { borderRadius: 6 },
});
