import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Polygon, Text as SvgText } from 'react-native-svg';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Fonts } from '../../../constants/typography';
import { Colors } from '../../../constants/colors';

type Props = {
  mapHeading: number;
  onResetNorth: () => void;
  theme: 'light' | 'dark';
};

function getHeadingCardinal(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
}

function calculateAzimuth(x: number, y: number): number {
  let angle = Math.atan2(-x, y) * (180 / Math.PI);
  if (angle < 0) {
    angle += 360;
  }
  return angle;
}

export function CompassButton({ mapHeading, onResetNorth, theme }: Props) {
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  const [displayDeg, setDisplayDeg] = useState(0);
  const currentAngleRef = useRef(0);
  const lastTextTimeRef = useRef(0);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Ultra-Fast 60Hz Hardware Magnetometer Listener
  useEffect(() => {
    let active = true;
    let sensorSub: { remove: () => void } | null = null;

    void (async () => {
      try {
        const isAvailable = await Magnetometer.isAvailableAsync();

        if (isAvailable && active) {
          Magnetometer.setUpdateInterval(16);

          sensorSub = Magnetometer.addListener((data) => {
            if (!active || !data) return;
            const heading = calculateAzimuth(data.x, data.y);
            const raw = Math.round(heading);

            // Instant 0ms Needle Rotation
            if (Math.abs(mapHeading) <= 1) {
              const target = -raw;
              let diff = (target - currentAngleRef.current) % 360;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              const nextAngle = currentAngleRef.current + diff;
              currentAngleRef.current = nextAngle;

              rotateAnim.setValue(nextAngle);
            }

            // Throttled Text Update
            const now = Date.now();
            if (now - lastTextTimeRef.current > 50) {
              lastTextTimeRef.current = now;
              setDisplayDeg(raw);
            }
          });
          return;
        }

        // Fallback: Location.watchHeadingAsync
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.granted && active) {
          sensorSub = await Location.watchHeadingAsync((headingData) => {
            if (!active) return;
            const current =
              headingData.trueHeading >= 0
                ? headingData.trueHeading
                : headingData.magHeading;
            if (typeof current === 'number' && Number.isFinite(current)) {
              const raw = Math.round(current);
              if (Math.abs(mapHeading) <= 1) {
                const target = -raw;
                let diff = (target - currentAngleRef.current) % 360;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                const nextAngle = currentAngleRef.current + diff;
                currentAngleRef.current = nextAngle;
                rotateAnim.setValue(nextAngle);
              }
              const now = Date.now();
              if (now - lastTextTimeRef.current > 50) {
                lastTextTimeRef.current = now;
                setDisplayDeg(raw);
              }
            }
          });
        }
      } catch {
        // Ignored
      }
    })();

    return () => {
      active = false;
      sensorSub?.remove();
    };
  }, [mapHeading, rotateAnim]);

  // Sync when user drags / rotates map manually on screen
  useEffect(() => {
    if (Math.abs(mapHeading) > 1) {
      const target = -mapHeading;
      let diff = (target - currentAngleRef.current) % 360;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      const nextAngle = currentAngleRef.current + diff;
      currentAngleRef.current = nextAngle;

      rotateAnim.setValue(nextAngle);
      setDisplayDeg(Math.round(mapHeading));
    }
  }, [mapHeading, rotateAnim]);

  const activeAngle = Math.abs(mapHeading) > 1 ? mapHeading : displayDeg;
  const isRotated = Math.abs(activeAngle) > 2;
  const cardinal = getHeadingCardinal(activeAngle);

  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [-7200, 7200],
    outputRange: ['-7200deg', '7200deg'],
  });

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onResetNorth}
        style={[
          styles.dialContainer,
          {
            backgroundColor: isDark
              ? 'rgba(15, 23, 42, 0.94)'
              : 'rgba(255, 255, 255, 0.96)',
            borderColor: isRotated
              ? 'rgba(34, 197, 94, 0.65)'
              : isDark
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(0, 0, 0, 0.1)',
          },
        ]}
      >
        {/* Subtle Background Dial Ring (Fixed 48x48) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="48" height="48" viewBox="0 0 48 48">
            <Circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              strokeWidth="1"
            />
            <Circle
              cx="24"
              cy="24"
              r="17"
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
              strokeWidth="0.8"
              strokeDasharray="1.5 2.5"
            />
          </Svg>
        </View>

        {/* Flawlessly Symmetrical Rotating 3D Compass Needle + N/S */}
        <Animated.View
          style={[
            styles.needleLayer,
            {
              transform: [{ rotate: rotateInterpolation }],
            },
          ]}
        >
          <Svg width="48" height="48" viewBox="0 0 48 48">
            {/* North 'N' Typography */}
            <SvgText
              x="24"
              y="9"
              textAnchor="middle"
              fill="#ef4444"
              fontSize="7.5"
              fontWeight="900"
            >
              N
            </SvgText>

            {/* South 'S' Typography */}
            <SvgText
              x="24"
              y="44.5"
              textAnchor="middle"
              fill={isDark ? '#64748b' : '#94a3b8'}
              fontSize="6"
              fontWeight="700"
            >
              S
            </SvgText>

            {/* North Needle (Solid Base + 3D Shadow Half) */}
            <Polygon points="24,11 29,24 19,24" fill="#ef4444" />
            <Polygon points="24,11 29,24 24,24" fill="#b91c1c" />

            {/* South Needle (Solid Base + 3D Shadow Half) */}
            <Polygon
              points="24,37 29,24 19,24"
              fill={isDark ? '#cbd5e1' : '#94a3b8'}
            />
            <Polygon
              points="24,37 29,24 24,24"
              fill={isDark ? '#64748b' : '#475569'}
            />

            {/* Precision Center Pivot */}
            <Circle
              cx="24"
              cy="24"
              r="3.2"
              fill="#0f172a"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            <Circle cx="24" cy="24" r="1.3" fill="#22c55e" />
          </Svg>
        </Animated.View>
      </TouchableOpacity>

      {/* Floating Degree Pill */}
      <View
        style={[
          styles.degreePill,
          {
            backgroundColor: isDark
              ? 'rgba(15, 23, 42, 0.9)'
              : 'rgba(255, 255, 255, 0.94)',
            borderColor: isRotated
              ? 'rgba(34, 197, 94, 0.45)'
              : isDark
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        <Text
          style={[
            styles.degreeText,
            {
              color: isRotated ? colors.primary : colors.text,
            },
          ]}
        >
          {Math.round(((activeAngle % 360) + 360) % 360)}° {cardinal}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 3,
  },
  dialContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  needleLayer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  degreePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 99,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  degreeText: {
    fontSize: 8.5,
    fontFamily: Fonts.headingBold,
    textAlign: 'center',
  },
});

