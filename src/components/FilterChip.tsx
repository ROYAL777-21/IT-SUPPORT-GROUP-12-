import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface FilterChipProps {
  /** A string, or a node when the chip shows something richer like a badge. */
  label: ReactNode;
  selected: boolean;
  onPress: () => void;
  /** Shown as a trailing count, e.g. the number of open tickets. */
  count?: number;
}

export function FilterChip({ label, selected, onPress, count }: FilterChipProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primaryTint : pressed ? colors.surfaceAlt : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.xs,
        },
      ]}
    >
      {typeof label === 'string' ? (
        <Text variant="caption" style={{ color: selected ? colors.primary : colors.textMuted }}>
          {label}
        </Text>
      ) : (
        label
      )}

      {typeof count === 'number' ? (
        <Text variant="caption" style={{ color: selected ? colors.primary : colors.textFaint }}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
});
