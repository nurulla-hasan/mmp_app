import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Fonts } from '../../constants/typography';

interface BadgeProps {
  label: string;
  variant?: 'pro' | 'free' | 'warning' | 'neutral' | 'success';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', style, textStyle }) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'pro':
      case 'success':
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
      case 'success':
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
    paddingHorizontal: 5.5,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 0.6,
  },
  text: {
    fontSize: 9.5,
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  badgePro: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  textPro: {
    color: '#16a34a',
  },
  badgeFree: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: 'rgba(37, 99, 235, 0.25)',
  },
  textFree: {
    color: '#2563eb',
  },
  badgeWarning: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: 'rgba(217, 119, 6, 0.25)',
  },
  textWarning: {
    color: '#d97706',
  },
  badgeNeutral: {
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  textNeutral: {
    color: '#64748b',
  },
});
