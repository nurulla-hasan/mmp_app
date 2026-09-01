import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Fonts } from '../../constants/typography';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const router = useRouter();

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { width: 30, height: 30, fontSize: 14 };
      case 'lg':
        return { width: 44, height: 44, fontSize: 18 };
      case 'md':
      default:
        return { width: 36, height: 36, fontSize: 16 };
    }
  };

  const dim = getDimensions();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push('/(tabs)')}
      style={styles.container}
    >
      <Image
        source={require('../../../assets/logo.png')}
        style={{ width: dim.width, height: dim.height, resizeMode: 'contain', borderRadius: 8 }}
      />
      {showText && (
        <Text style={[styles.title, { fontSize: dim.fontSize }]}>
          মৌজা ম্যাপ প্রো
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
    letterSpacing: -0.2,
  },
});

