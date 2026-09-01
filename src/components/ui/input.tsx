import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  isPassword = false,
  containerStyle,
  style,
  ...props
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderColor: error
              ? '#ef4444'
              : isFocused
              ? '#16a34a'
              : isDark
              ? '#334155'
              : '#e2e8f0',
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.textInput,
            { color: isDark ? '#f8fafc' : '#0f172a' },
            style,
          ]}
          placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            style={styles.rightIconBtn}
            onPress={() => setShowPassword((prev) => !prev)}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={18} color={isDark ? '#94a3b8' : '#64748b'} />
            ) : (
              <Eye size={18} color={isDark ? '#94a3b8' : '#64748b'} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    width: '100%',
  },
  label: {
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
    marginBottom: 3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 9,
    height: 38,
  },
  leftIconContainer: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 12.5,
    fontFamily: Fonts.sansRegular,
  },
  rightIconBtn: {
    padding: 2,
    marginLeft: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
  },
  helperText: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
  },
});

