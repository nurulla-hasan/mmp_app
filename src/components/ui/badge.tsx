import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';

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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgePro: {
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
  },
  textPro: {
    color: '#059669',
  },
  badgeFree: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  textFree: {
    color: '#2563eb',
  },
  badgeWarning: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  textWarning: {
    color: '#d97706',
  },
  badgeNeutral: {
    backgroundColor: '#f1f5f9',
  },
  textNeutral: {
    color: '#475569',
  },
});
