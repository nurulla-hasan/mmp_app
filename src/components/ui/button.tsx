import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.btnSecondary;
      case 'outline':
        return styles.btnOutline;
      case 'ghost':
        return styles.btnGhost;
      case 'primary':
      default:
        return styles.btnPrimary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return styles.textOutline;
      case 'secondary':
        return styles.textSecondary;
      case 'primary':
      default:
        return styles.textPrimary;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getButtonStyle(),
        styles[`size_${size}`],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#fff' : Colors.light.primary}
          size='small'
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.baseText, getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 6,
  },
  baseText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  btnPrimary: {
    backgroundColor: '#16a34a',
  },
  textPrimary: {
    color: '#ffffff',
  },
  btnSecondary: {
    backgroundColor: '#0f172a',
  },
  textSecondary: {
    color: '#ffffff',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  textOutline: {
    color: '#16a34a',
  },
  size_sm: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  size_md: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  size_lg: {
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  disabled: {
    opacity: 0.5,
  },
});
