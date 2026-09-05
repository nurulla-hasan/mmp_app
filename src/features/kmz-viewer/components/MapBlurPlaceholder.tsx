import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Layers, Loader2, Sparkles } from 'lucide-react-native';
import { Fonts } from '../../../constants/typography';

// Low-resolution blurry satellite tile (Bangladesh / Bengal region overview)
// Stays cached / ultra-lightweight (~18KB) to give immediate Google Earth blurry appearance
const SATELLITE_BLUR_PREVIEW =
  'https://mt1.google.com/vt/lyrs=y&x=26&y=14&z=5';

const STANDARD_BLUR_PREVIEW =
  'https://mt1.google.com/vt/lyrs=m&x=26&y=14&z=5';

type Props = {
  isReady: boolean;
  mapStyle?: 'hybrid' | 'standard';
};

export function MapBlurPlaceholder({ isReady, mapStyle = 'hybrid' }: Props) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing radar glow effect
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    // Subtle spinner rotation
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    );
    spinLoop.start();

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulseAnim, spinAnim]);

  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isReady, fadeAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const previewUri =
    mapStyle === 'hybrid' ? SATELLITE_BLUR_PREVIEW : STANDARD_BLUR_PREVIEW;

  return (
    <Animated.View
      pointerEvents={isReady ? 'none' : 'auto'}
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Blurry Low-Res Map Backdrop */}
      <Image
        source={{ uri: previewUri }}
        style={styles.blurImage}
        resizeMode="cover"
        blurRadius={12}
      />

      {/* Dark Slate Vignette / Gradient Mesh Overlay */}
      <View style={styles.meshOverlay} />

      {/* Modern Radar / Coordinate Grid lines */}
      <View style={styles.gridContainer}>
        <View style={[styles.gridLine, styles.gridH1]} />
        <View style={[styles.gridLine, styles.gridH2]} />
        <View style={[styles.gridLine, styles.gridV1]} />
        <View style={[styles.gridLine, styles.gridV2]} />
        <View style={styles.crosshairCenter} />
      </View>

      {/* Sleek Floating Glassmorphic Status Pill */}
      <View style={styles.statusPill}>
        <Animated.View style={[styles.radarDot, { opacity: pulseAnim }]} />
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Loader2 size={13} color="#22c55e" />
        </Animated.View>
        <Text style={styles.statusText}>
          {mapStyle === 'hybrid'
            ? 'স্যাটেলাইট ম্যাপ লোড হচ্ছে...'
            : 'ম্যাপ লোড হচ্ছে...'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0f1d',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  blurImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.15 }], // Scale up slightly to prevent blur edge clipping
    opacity: 0.85,
  },
  meshOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 29, 0.48)',
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    borderColor: 'rgba(34, 197, 94, 0.08)',
    borderStyle: 'dashed',
  },
  gridH1: {
    top: '35%',
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  gridH2: {
    top: '65%',
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  gridV1: {
    left: '35%',
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
  },
  gridV2: {
    left: '65%',
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
  },
  crosshairCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 24,
    height: 24,
    marginTop: -12,
    marginLeft: -12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderRadius: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  radarDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  statusText: {
    color: '#f8fafc',
    fontSize: 12,
    fontFamily: Fonts.sansMedium,
  },
});
