import React, { type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const KEYBOARD_SAFE_LAYOUT = {
  safeAreaGap: 10,
  modalBottomPadding: 16,
  sheetBottomPadding: 16,
} as const;

type KeyboardSafeViewProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Shared keyboard behavior for forms and modal content.
 * iOS shifts content with padding while Android shrinks the available height,
 * matching the usable viewport instead of letting the keyboard cover actions.
 */
export function KeyboardSafeView({ children, style }: KeyboardSafeViewProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={style}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

/**
 * Keeps bottom-sheet/card content above gesture and 3-button navigation.
 * The base padding preserves the visual rhythm when the device inset is small.
 */
export function useModalSafeBottomPadding(
  basePadding = KEYBOARD_SAFE_LAYOUT.modalBottomPadding,
) {
  const { bottom } = useSafeAreaInsets();
  return Math.max(basePadding, bottom + KEYBOARD_SAFE_LAYOUT.safeAreaGap);
}
