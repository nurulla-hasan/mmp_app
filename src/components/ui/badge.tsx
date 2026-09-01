import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Fonts } from '../../constants/typography';

interface BadgeProps {
  label: string;
  variant?: 'pro' | 'free' | 'warning' | 'neutral';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', style, textStyle }) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'pro':
        return styles.badgePro;
      case 'free':
        return styles.badgeFree;
      case 'warning':
        return styles.badgeWarning;
      default:
        return styles.badgeNeutral;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'pro':
        return styles.textPro;
      case 'free':
        return styles.textFree;
      case 'warning':
        return styles.textWarning;
      default:
        return styles.textNeutral;
    }
  };

  return (
    <View style={[styles.base, getBadgeStyle(), style]}>
      <Text style={[styles.text, getTextStyle(), textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    letterSpacing: -0.2,
  },
  badgePro: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderWidth: 0.8,
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  textPro: {
    color: '#16a34a',
  },
  badgeFree: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderWidth: 0.8,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  textFree: {
    color: '#2563eb',
  },
  badgeWarning: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 0.8,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  textWarning: {
    color: '#d97706',
  },
  badgeNeutral: {
    backgroundColor: '#f1f5f9',
    borderWidth: 0.8,
    borderColor: '#e2e8f0',
  },
  textNeutral: {
    color: '#64748b',
  },
});
