import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

interface ProAvatarRingProps {
  size: number;
  strokeWidth?: number;
  children: React.ReactNode;
  isPro?: boolean;
}

/**
 * ProAvatarRing
 * Replicates web's multicolor conic gradient ring for Pro / Subscribed users.
 * Colors: #FF2E93, #FF8A00, #FFDD00, #00E676, #00B0FF, #9C27B0, #FF2E93
 */
export const ProAvatarRing: React.FC<ProAvatarRingProps> = ({
  size,
  strokeWidth = size >= 64 ? 2.5 : 2,
  children,
  isPro = true,
}) => {
  if (!isPro) {
    return <>{children}</>;
  }

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const innerPadding = strokeWidth + 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* SVG Multicolor Gradient Ring */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id='proAvatarGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
            <Stop offset='0%' stopColor='#FF2E93' />
            <Stop offset='20%' stopColor='#FF8A00' />
            <Stop offset='40%' stopColor='#FFDD00' />
            <Stop offset='60%' stopColor='#00E676' />
            <Stop offset='80%' stopColor='#00B0FF' />
            <Stop offset='90%' stopColor='#9C27B0' />
            <Stop offset='100%' stopColor='#FF2E93' />
          </LinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke='url(#proAvatarGradient)'
          strokeWidth={strokeWidth}
          fill='none'
        />
      </Svg>

      {/* Inner Avatar Content */}
      <View
        style={{
          width: size - innerPadding * 2,
          height: size - innerPadding * 2,
          borderRadius: (size - innerPadding * 2) / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});

