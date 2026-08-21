import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MIN_TOUCH_SIZE, useTheme } from '@/theme';

import { Text } from './Text';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Rendered on the left — an icon or avatar. */
  leading?: ReactNode;
  /** Rendered on the right, before the chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  destructive,
}: ListItemProps) {
  const { colors, spacing } = useTheme();

  const body = (
    <>
      {leading ? <View>{leading}</View> : null}
      <View style={styles.text}>
        <Text variant="body" tone={destructive ? 'danger' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null}
    </>
  );

  const style = {
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  };

  if (!onPress) {
    return <View style={[styles.row, style]}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        style,
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, gap: 2 },
});
