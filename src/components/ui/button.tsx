import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'warning';

export type ButtonSize = 'default' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  children,
  onPress,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const getVariantStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          btn: {
            backgroundColor: theme === 'dark' ? '#1e293b' : '#0f172a',
            borderColor: 'transparent',
          },
          text: { color: '#ffffff' },
        };
      case 'outline':
        return {
          btn: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: { color: colors.text },
        };
      case 'ghost':
        return {
          btn: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
          text: { color: colors.text },
        };
      case 'destructive':
        return {
          btn: {
            backgroundColor: '#ef4444',
            borderColor: 'transparent',
          },
          text: { color: '#ffffff' },
        };
      case 'warning':
        return {
          btn: {
            backgroundColor: 'rgba(217, 119, 6, 0.12)',
            borderWidth: 1,
            borderColor: 'rgba(217, 119, 6, 0.3)',
          },
          text: { color: '#d97706' },
        };
      case 'primary':
      case 'default':
      default:
        return {
          btn: {
            backgroundColor: colors.primary,
            borderColor: 'transparent',
          },
          text: { color: '#ffffff' },
        };
    }
  };

  const getSizeStyle = (): { btn: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'icon':
        return {
          btn: {
            width: 32,
            height: 32,
            width: 28,
            height: 28,
            paddingHorizontal: 0,
            paddingVertical: 0,
            borderRadius: 8,
            borderRadius: 6,
          },
          text: { fontSize: 13 },
          text: { fontSize: 12 },
        };
      case 'sm':
        return {
          btn: {
            height: 32,
            paddingHorizontal: 10,
            borderRadius: 8,
            height: 28,
            paddingHorizontal: 8,
            borderRadius: 6,
          },
          text: { fontSize: 11.5 },
          text: { fontSize: 11 },
        };
      case 'lg':
        return {
          btn: {
            height: 44,
            paddingHorizontal: 20,
            borderRadius: 10,
            height: 38,
            paddingHorizontal: 16,
            borderRadius: 6,
          },
          text: { fontSize: 14.5 },
          text: { fontSize: 13 },
        };
      case 'md':
      case 'default':
      default:
        return {
          btn: {
            height: 38,
            paddingHorizontal: 14,
            borderRadius: 8,
            height: 34,
            paddingHorizontal: 12,
            borderRadius: 6,
          },
          text: { fontSize: 13 },
          text: { fontSize: 12 },
        };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyle();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        variantStyle.btn,
        sizeStyle.btn,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'default' || variant === 'primary' || variant === 'secondary' ? '#fff' : colors.primary}
          size='small'
        />
      ) : (
        <>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          {title ? (
            <Text
              style={[
                styles.baseText,
                variantStyle.text,
                sizeStyle.text,
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : (
            children
          )}
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
    gap: 6,
  },
  baseText: {
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: -0.2,
    fontFamily: Fonts.sansMedium,
    letterSpacing: -0.1,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
