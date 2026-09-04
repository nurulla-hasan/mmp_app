import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
});
