import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /** Remove the internal padding, for cards that lay out their own rows. */
  flush?: boolean;
}

export function Card({ children, onPress, style, flush }: CardProps) {
  const { colors, radius, spacing } = useTheme();

  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: flush ? 0 : spacing.lg,
  };

  if (!onPress) {
    return <View style={[styles.card, base, style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        base,
        pressed && { backgroundColor: colors.surfaceAlt },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
