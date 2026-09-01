import { Pressable, type ViewStyle } from 'react-native';

import { HIT_SLOP, useTheme } from '@/theme';

import { Text } from './Text';

export interface TextLinkProps {
  label: string;
  onPress: () => void;
  align?: 'left' | 'center';
  style?: ViewStyle;
}

/**
 * A tappable inline link.
 *
 * Deliberately a Pressable rather than expo-router's <Link asChild>: asChild
 * clones the child with press props, which needs the child to forward a ref,
 * and this keeps navigation an explicit router call at the call site.
 */
export function TextLink({ label, onPress, align = 'left', style }: TextLinkProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        align === 'center' && { alignSelf: 'center' },
        pressed && { opacity: 0.6 },
        style,
      ]}
    >
      <Text variant="caption" style={{ color: colors.primary }}>
        {label}
      </Text>
    </Pressable>
  );
}
